---
name: portfolio-analytics
description: Analyze aggregated portfolio analytics snapshots, compare compatible periods, and prepare evidence-based reports. Use for Yandex Metrica reports in docs/analytics; do not infer motivation or causal impact from traffic alone.
---

# Portfolio Analytics

Use aggregated snapshots from `docs/analytics/reports/` and `docs/analytics/reports/automated/`. Read existing baselines and tracking documentation before comparison.

## Rules

- Separate observations, calculations, hypotheses, and recommendations.
- Compare only periods with compatible duration, filters, counter, sampling, goal definitions, and tracking contract.
- Record release markers and tracking changes that affect interpretation.
- Lead with absolute counts when samples are small; flag unstable percentages.
- Treat missing events as a technical or behavioral question, not proof of a cause.
- Do not infer user motivation, usability, or portfolio quality from aggregated traffic.
- Do not expose tokens or commit raw Logs API data.

To collect a new aggregate snapshot, use `pnpm analytics:collect -- --days 28`. Report material anomalies, missing signals, comparability limits, and questions for follow-up.
