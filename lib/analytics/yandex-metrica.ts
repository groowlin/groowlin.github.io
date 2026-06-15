export const ANALYTICS_DISABLE_STORAGE_KEY = "portfolio.analytics.disabled";
const ANALYTICS_DISABLE_COOKIE_KEY = "portfolio_analytics_disabled";

type Primitive = string | number | boolean;
export type MetricaGoalParams = Record<string, Primitive | null | undefined>;

type QueuedMetricaCall = () => void;

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
    __portfolioAnalyticsQueue?: QueuedMetricaCall[];
    portfolioAnalytics?: {
      disable: () => void;
      enable: () => void;
      isDisabled: () => boolean;
    };
  }
}

function parseCounterId(value: string | undefined) {
  if (!value) {
    return null;
  }

  const counterId = Number(value);
  return Number.isInteger(counterId) && counterId > 0 ? counterId : null;
}

function sanitizeGoalParams(params?: MetricaGoalParams) {
  if (!params) {
    return undefined;
  }

  const sanitized = Object.entries(params).reduce<Record<string, Primitive | null>>((accumulator, [key, value]) => {
    if (value === undefined) {
      return accumulator;
    }

    accumulator[key] = value;
    return accumulator;
  }, {});

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function runOrQueue(callback: QueuedMetricaCall) {
  if (typeof window === "undefined" || isAnalyticsDisabled()) {
    return;
  }

  if (typeof window.ym === "function") {
    callback();
    return;
  }

  window.__portfolioAnalyticsQueue ??= [];
  window.__portfolioAnalyticsQueue.push(callback);
}

function isLocalEnvironment(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isLocalhostTrackingEnabled() {
  return process.env.NEXT_PUBLIC_YANDEX_METRICA_ALLOW_LOCALHOST === "true";
}

export function getYandexMetricaCounterId() {
  return parseCounterId(process.env.NEXT_PUBLIC_YANDEX_METRICA_ID);
}

export function isAnalyticsDisabled() {
  if (typeof window === "undefined") {
    return true;
  }

  if (isLocalEnvironment(window.location.hostname) && !isLocalhostTrackingEnabled()) {
    return true;
  }

  try {
    if (window.localStorage.getItem(ANALYTICS_DISABLE_STORAGE_KEY) === "1") {
      return true;
    }
  } catch {
    // Ignore storage failures and fall back to cookie checks below.
  }

  return document.cookie.split("; ").some((cookie) => cookie === `${ANALYTICS_DISABLE_COOKIE_KEY}=1`);
}

export function setAnalyticsDisabled(disabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (disabled) {
      window.localStorage.setItem(ANALYTICS_DISABLE_STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(ANALYTICS_DISABLE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures and continue with cookie-based fallback.
  }

  document.cookie = `${ANALYTICS_DISABLE_COOKIE_KEY}=${disabled ? "1" : "0"}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

export function flushQueuedMetricaCalls() {
  if (typeof window === "undefined" || typeof window.ym !== "function") {
    return;
  }

  const queue = window.__portfolioAnalyticsQueue;
  if (!queue || queue.length === 0) {
    return;
  }

  window.__portfolioAnalyticsQueue = [];
  for (const callback of queue) {
    callback();
  }
}

export function trackMetricaGoal(goal: string, params?: MetricaGoalParams) {
  const counterId = getYandexMetricaCounterId();
  if (!counterId) {
    return;
  }

  runOrQueue(() => {
    window.ym?.(counterId, "reachGoal", goal, sanitizeGoalParams(params));
  });
}

export function trackMetricaHit(url: string, title?: string, params?: MetricaGoalParams) {
  const counterId = getYandexMetricaCounterId();
  if (!counterId) {
    return;
  }

  runOrQueue(() => {
    window.ym?.(counterId, "hit", url, {
      title,
      params: sanitizeGoalParams(params)
    });
  });
}

export function getCurrentPath() {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function getCaseSlugFromHref(href: string) {
  if (!href.startsWith("/work/")) {
    return null;
  }

  const pathname = href.endsWith("/") ? href.slice(0, -1) : href;
  const slug = pathname.split("/").at(-1)?.trim();
  return slug ? slug : null;
}
