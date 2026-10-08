# Автоматизация аналитики портфолио

## Назначение

`pnpm analytics:collect` получает только агрегированные данные через Yandex Metrica Reporting API и сохраняет нормализованный JSON и Markdown в `docs/analytics/reports/automated/`. Logs API и сырые пользовательские события не выгружаются.

## Локальный запуск

Задайте переменные окружения, не добавляя токен в репозиторий:

```text
YANDEX_METRICA_TOKEN=<OAuth token with metrika:read>
YANDEX_METRICA_COUNTER_ID=<counter id>
```

Опционально укажите `ANALYTICS_TRACKING_CONTRACT_VERSION` и `ANALYTICS_RELEASE_MARKER`, чтобы последующие сравнения учитывали изменение трекинга и дату релиза.

```bash
pnpm analytics:collect -- --days 28
pnpm analytics:collect -- --date1 2026-09-01 --date2 2026-09-28
```

Скрипт собирает общие показатели, страницы, страницы входа, источники, устройства, операционные системы, дневную динамику и доступные цели. Отчёт не делает причинных продуктовых выводов.

## GitHub Actions

Workflow `.github/workflows/analytics.yml` запускается вручную и первого числа каждого месяца. Настройте:

- repository secret `YANDEX_METRICA_TOKEN`;
- repository variable `YANDEX_METRICA_COUNTER_ID`;
- опциональные variables `ANALYTICS_TRACKING_CONTRACT_VERSION` и `ANALYTICS_RELEASE_MARKER`.

Workflow создаёт отдельную ветку и pull request с агрегированным отчётом. Он не пишет напрямую в основную ветку.

## Интерпретация

Используйте `$portfolio-analytics`. Сравнивайте только периоды с одинаковыми длительностью, фильтрами, составом целей, sampling и tracking contract. При малой выборке опирайтесь на абсолютные значения; проценты не считаются устойчивым продуктовым сигналом.

## Безопасность

- OAuth-токен хранится только в локальном окружении или GitHub Secrets.
- Не добавляйте токен в `.env.example`, отчёты или логи.
- Не коммитьте выгрузки Logs API и другие неагрегированные данные.
- Перед публикацией PR проверяйте, что отчёт не содержит приватных параметров URL.
