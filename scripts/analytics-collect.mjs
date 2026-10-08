#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const API = "https://api-metrika.yandex.net";

function parseArgs(argv) {
  const args = { days: 28, outputDir: "docs/analytics/reports/automated" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) throw new Error(`Unknown argument: ${arg}`);
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    args[key] = value;
    i += 1;
  }
  args.days = Number(args.days);
  if (!Number.isInteger(args.days) || args.days < 1) throw new Error("--days must be a positive integer");
  return args;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function defaultDates(days) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { date1: isoDate(start), date2: isoDate(end) };
}

async function apiFetch(endpoint, token, params = {}) {
  const url = new URL(endpoint, API);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { headers: { Authorization: `OAuth ${token}` } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${endpoint} returned ${response.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

function dimensionNames(row) {
  return (row.dimensions ?? []).map((item) => item.name ?? item.id ?? "");
}

function tableRows(report) {
  return (report.data ?? []).map((row) => ({ dimensions: dimensionNames(row), metrics: row.metrics ?? [] }));
}

function markdownTable(headers, rows) {
  if (!rows.length) return "_Нет данных._";
  const safe = (value) => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
  return [
    `| ${headers.map(safe).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(safe).join(" | ")} |`),
  ].join("\n");
}

function metricValue(report, index) {
  return report.totals?.[index] ?? report.data?.[0]?.metrics?.[index] ?? null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = process.env.YANDEX_METRICA_TOKEN;
  const counterId = process.env.YANDEX_METRICA_COUNTER_ID;
  if (!token || !counterId) throw new Error("Set YANDEX_METRICA_TOKEN and YANDEX_METRICA_COUNTER_ID");
  const defaults = defaultDates(args.days);
  const date1 = args.date1 ?? defaults.date1;
  const date2 = args.date2 ?? defaults.date2;
  const common = { ids: counterId, date1, date2, accuracy: "full" };

  const reports = {};
  const specs = {
    summary: { metrics: "ym:s:pageviews,ym:s:visits,ym:s:users,ym:s:avgVisitDurationSeconds,ym:s:pageDepth,ym:s:bounceRate" },
    pages: { dimensions: "ym:pv:URL", metrics: "ym:pv:pageviews", limit: 100, sort: "-ym:pv:pageviews" },
    landingPages: { dimensions: "ym:s:startURL", metrics: "ym:s:visits", limit: 100, sort: "-ym:s:visits" },
    sources: { dimensions: "ym:s:trafficSource", metrics: "ym:s:visits,ym:s:users", limit: 50, sort: "-ym:s:visits" },
    devices: { dimensions: "ym:s:deviceCategory", metrics: "ym:s:visits,ym:s:users", limit: 20, sort: "-ym:s:visits" },
    operatingSystems: { dimensions: "ym:s:operatingSystem", metrics: "ym:s:visits,ym:s:users", limit: 50, sort: "-ym:s:visits" },
  };
  for (const [name, spec] of Object.entries(specs)) {
    reports[name] = await apiFetch("/stat/v1/data", token, { ...common, ...spec });
  }
  reports.daily = await apiFetch("/stat/v1/data/bytime", token, {
    ...common,
    metrics: "ym:s:pageviews,ym:s:visits,ym:s:users",
    group: "day",
  });

  let goals = [];
  const goalReports = [];
  try {
    const goalResponse = await apiFetch(`/management/v1/counter/${encodeURIComponent(counterId)}/goals`, token);
    goals = goalResponse.goals ?? [];
    for (const goal of goals) {
      const id = goal.id;
      if (!id) continue;
      const metrics = [`ym:s:goal${id}reaches`, `ym:s:goal${id}visits`, `ym:s:goal${id}users`, `ym:s:goal${id}conversionRate`].join(",");
      try {
        const report = await apiFetch("/stat/v1/data", token, { ...common, metrics });
        goalReports.push({ id, name: goal.name ?? String(id), type: goal.type ?? null, metrics: report.totals ?? [], sampled: report.sampled ?? false });
      } catch (error) {
        goalReports.push({ id, name: goal.name ?? String(id), error: error.message });
      }
    }
  } catch (error) {
    goalReports.push({ error: `Goals were not collected: ${error.message}` });
  }

  const snapshot = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    counterId,
    period: { date1, date2, days: Math.round((Date.parse(date2) - Date.parse(date1)) / 86400000) + 1 },
    source: "Yandex Metrica Reporting API (aggregated data only)",
    comparability: {
      accuracyRequested: "full",
      trackingContractVersion: process.env.ANALYTICS_TRACKING_CONTRACT_VERSION ?? null,
      releaseMarker: process.env.ANALYTICS_RELEASE_MARKER ?? null,
      filters: "none",
    },
    reports,
    goals: goalReports,
    privacy: { rawLogsIncluded: false },
  };

  const summaryLabels = ["Просмотры", "Визиты", "Посетители", "Среднее время, сек", "Глубина", "Отказы, %"];
  const summaryRows = summaryLabels.map((label, index) => [label, metricValue(reports.summary, index)]);
  const section = (title, report) => {
    const rows = tableRows(report).map((row) => [...row.dimensions, ...row.metrics]);
    const dimCount = report.query?.dimensions?.length ?? (rows[0]?.length ? 1 : 0);
    const metricCount = report.query?.metrics?.length ?? Math.max(1, (rows[0]?.length ?? 1) - dimCount);
    return `## ${title}\n\n${markdownTable([...Array(dimCount).fill("Измерение"), ...Array(metricCount).fill("Значение")], rows)}`;
  };
  const goalRows = goalReports.filter((goal) => goal.id).map((goal) => [goal.name, goal.id, ...(goal.metrics ?? []), goal.error ?? ""]);
  const warnings = Object.entries(reports)
    .filter(([, report]) => report?.sampled || report?.contains_sensitive_data)
    .map(([name, report]) => `- ${name}: sampled=${Boolean(report.sampled)}, contains_sensitive_data=${Boolean(report.contains_sensitive_data)}`);
  const markdown = `# Автоматический срез Яндекс.Метрики: ${date1}—${date2}\n\n` +
    `## Контекст\n\n- Счётчик: \`${counterId}\`\n- Период: ${snapshot.period.days} дней\n- Сформирован: ${snapshot.generatedAt}\n- Источник: агрегированный Reporting API; сырые логи не выгружались.\n- Версия tracking contract: ${snapshot.comparability.trackingContractVersion ?? "не указана"}\n- Маркер релиза: ${snapshot.comparability.releaseMarker ?? "не указан"}\n\n` +
    `Проценты и изменения следует интерпретировать только при сопоставимых периодах, фильтрах, целях и достаточной выборке. Этот файл фиксирует наблюдения, но не доказывает причины поведения.\n\n` +
    `## Общие показатели\n\n${markdownTable(["Показатель", "Значение"], summaryRows)}\n\n` +
    `${section("Страницы", reports.pages)}\n\n${section("Страницы входа", reports.landingPages)}\n\n${section("Источники", reports.sources)}\n\n${section("Устройства", reports.devices)}\n\n${section("Операционные системы", reports.operatingSystems)}\n\n` +
    `## Цели\n\n${markdownTable(["Цель", "ID", "Достижения", "Целевые визиты", "Целевые посетители", "Конверсия", "Ошибка"], goalRows)}\n\n` +
    `## Ограничения API\n\n${warnings.length ? warnings.join("\n") : "- API не сообщил о sampling или ограниченном раскрытии в полученных отчётах."}\n`;

  const outputDir = path.resolve(args.outputDir);
  await fs.mkdir(outputDir, { recursive: true });
  const stem = `${date1}--${date2}-metrica`;
  await Promise.all([
    fs.writeFile(path.join(outputDir, `${stem}.json`), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8"),
    fs.writeFile(path.join(outputDir, `${stem}.md`), markdown, "utf8"),
  ]);
  console.log(`analytics:collect: wrote ${path.relative(process.cwd(), outputDir).replaceAll("\\", "/")}/${stem}.{json,md}`);
}

main().catch((error) => {
  console.error(`analytics:collect: ${error.message}`);
  process.exitCode = 1;
});
