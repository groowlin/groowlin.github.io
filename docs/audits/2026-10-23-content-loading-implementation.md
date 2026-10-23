# Реализация пунктов 3 и 4 аудита загрузки

Дата завершения: 23 октября 2026. Изменения находятся в рабочей копии; публикация и коммит не выполнялись.

## Результат

### 3. Inter в WOFF2

- `app/layout.tsx` использует `app/fonts/inter/Inter-Variable.woff2` вместо TTF.
- Размер файла: **876 576 → 350 460 байт**, уменьшение примерно на 60%. Это размеры файлов, не измерение HTTP transfer или времени загрузки.
- Исходный TTF и `OFL.txt` сохранены. Сайт публикует WOFF2; неиспользуемый исходник из `app/fonts` не копируется в public.
- FontTools сравнил glyph order, Unicode mapping, horizontal metrics, variation axes, контуры всех глифов и hinting; также совпали исходные данные проверенных таблиц вариаций, shaping, имен и метрик. Сохранены 2 933 глифа, 2 849 Unicode entries, оси `opsz` и `wght`. Subsetting не применялся.
- Сохранены local hosting, `display: swap`, CSS variable и диапазон веса. В итоговом HTML подтвержден preload с `type="font/woff2"`.

### 4. Отложенная загрузка клиентского кода

- `GalleryLightbox.tsx` оставляет постоянные SSR inline media, scope registration и refs. `GalleryLightboxRuntime.tsx` загружается по намерению открыть/активации; исходная галерея при этом не заменяется.
- Через границу передается обычный запрос открытия с revision. Устаревшие запросы при unmount/смене контента и более новом открытии отбрасываются. Runtime остается смонтированным после первой загрузки, включая завершение closing portal.
- Inline/home renderer отделен от modal progressive-video renderer; общие расчеты вынесены в чистый `media-layout.ts`.
- Общий image preload cache сохраняет правила пунктов 1–2: нет idle-загрузки всех full и мобильной цепочки `@2x → full`.
- Debug defaults/types находятся отдельно от UI; панель имеет собственный динамический import.
- MDX и short-case slot используют одну обертку PortfolioMotionDemo с прежним layout/reveal shell. Сцены загружаются у существующей intersection-границы. После ошибки возможны ограниченные повторные попытки по восстановлению сети/возврату во вкладку; listeners очищаются при unmount.
- Игры имеют отдельную клиентскую границу `GamesExperienceEntry` с SSR-enabled dynamic import. Одного условного серверного import оказалось недостаточно: первый экспорт показал игровую оболочку в начальном чанке. После добавления клиентской границы этого включения нет.
- При `ENABLE_GAMES=true` SSR сохраняет три изображения маскота и frame. `DeferredGameModeShell` загружает игровое тело по намерению/активации или восстановлению открытой сессии; измерение frame дожидается commit runtime.

## Факты о полученном экспорте

В окончательном экспорте `ENABLE_GAMES=false` код с характерными маркерами lightbox image layers, debug panel, GamesExperience и Pixel Perfect находится в отдельных чанках, отсутствующих среди начальных script URL проверенных страниц. Код сцен PortfolioMotionDemo также находится в отдельном чанке; начальный wrapper содержит только загрузчик.

Дополнительных уникальных script preload URL вне учтенного начального набора на этих страницах не обнаружено. Это анализ HTML/RSC/JS артефактов, а не запись браузерной сети.

| Страница | Найденный прежний экспорт: modern JS, байт | Итог: modern JS, байт | Прежний локальный gzip, байт | Итоговый локальный gzip, байт |
|---|---:|---:|---:|---:|
| `/` | 899 333 | 730 627 | 269 260 | 222 869 |
| `/about` | 740 773 | 686 613 | 222 453 | 208 914 |
| `/work/portfoliocase` | 739 821 | 685 661 | 221 978 | 208 557 |
| `/work/familia` | 739 821 | 685 661 | 221 978 | 208 557 |
| 404 | 736 899 | 682 739 | 221 031 | 207 492 |

Условия сравнения: прежний экспорт существовал до этого этапа, отдельная контрольная сборка исходной рабочей копии не выполнялась. В рабочей копии есть другие пользовательские изменения. Поэтому разницу нельзя целиком приписать только этой правке. Учтены уникальные внешние scripts без `noModule`, без inline scripts и внешней аналитики. Gzip вычислен локально; фактическое HTTP-сжатие и CWV не измерялись.

## Выполненные проверки

- `pnpm typecheck` — успешно, включая окончательную клиентскую границу игр.
- `pnpm build` с `ENABLE_GAMES=true` — успешно; в HTML найдены все три mascot PNG и frame, игрового тела в SSR нет.
- Окончательный `pnpm build` с `ENABLE_GAMES=false` — успешно; все семь кейсов экспортированы, маршрутов `admin/api/preview` в prerender manifest нет. Окончательный `out` оставлен с выключенными играми, как в production workflow.
- `node --test components/games/experience-lifecycle.test.mjs` — **17/17 успешно**.
- ESLint измененных TS/TSX-файлов — **0 ошибок**, 2 hook-dependency warnings в GamesEntry и GalleryLightboxRuntime. Новая GamesExperienceEntry и окончательный импорт главной также проверены отдельным целевым запуском.
- Полный `pnpm lint` запускался и не прошел: после устранения ошибок в собственной части остаются обнаруженные ошибки в не затронутых этим этапом `components/home/HomeShowcase.tsx:186` (`set-state-in-effect`) и `components/sections/WorkShortSummaryToggle.tsx:318` (`immutability`, обращение к функции до объявления). Эти сторонние UI-правки не переписывались. Полный lint не заявляется прошедшим.
- Техническое сравнение данных TTF/WOFF2 — успешно.
- Независимое read-only ревью основной реализации не нашло blocker/major; найденный minor с retry demo исправлен. Добавленная после ревью финальная игровая граница проверена типизацией, целевым ESLint и экспортами обоих флагов.

Основание запусков: новые модульные границы/import resolution и разрешение WOFF2 через `next/font` могут повлиять на сборку. Браузерные/визуальные проверки не запускались. Сценарии первого клика, отказа chunk, фокус и анимации не воспроизводились в браузере; чтение кода и сборка не подменяют такую проверку.

## Файлы этого этапа

Изменены:

- `app/layout.tsx`, `app/page.tsx`.
- `components/media/GalleryLightbox.tsx`, `components/media/MediaPlaceholder.tsx`, `components/media/LightboxMotionDebugPanel.tsx`.
- `components/games/GamesEntry.tsx`.
- `components/sections/PortfolioMotionDemo.tsx`.
- `design-system-spec.md`.
- `docs/specs/case-blocks-reference.md`, `docs/specs/games.md`, `docs/specs/site-and-pages-mdx-structure.md`, `docs/specs/portfolio-case-json-structure.md`.
- `portfolio-structure.json`, `portoflio-structure.json`.

Созданы:

- `app/fonts/inter/Inter-Variable.woff2`.
- `components/media/GalleryLightboxRuntime.tsx`, `components/media/ModalMediaPlaceholder.tsx`, `components/media/lightbox-image-preload.ts`, `components/media/lightbox-motion-settings.ts`, `components/media/media-layout.ts`.
- `components/games/DeferredGameModeShell.tsx`, `components/games/GamesExperienceEntry.tsx`.
- `components/sections/PortfolioMotionDemoRuntime.tsx`.
- Этот отчет.

Некоторые измененные файлы уже содержали пользовательские правки до начала этапа. Перечень выше описывает только файлы, в которые внесены изменения этого этапа, а не весь текущий `git diff`.

Дополнительно прочитаны полностью или фрагментами: `AGENTS.md`, `.codex/skills/feature-reviewer/SKILL.md`, `package.json`, `.gitignore`, `tsconfig.json`, `tsconfig.typecheck.json`, `eslint.config.mjs`, `app/fonts/inter/OFL.txt`, `lib/features.ts`, `lib/content/{mdx-components.tsx,types.ts}`, `app/work/[slug]/page.tsx`, `app/not-found.tsx`, `components/media/{GalleryLightboxScope,LightboxImageLayers}.tsx`, `components/sections/{WorkArticle,WorkShortSummaryToggle}.tsx`, `components/games/{GameFrame,GameModeShell}.tsx`, `components/games/experience-lifecycle.ts`, `components/games/experience-lifecycle.test.mjs`, исходный шрифт и существующие export/manifests. Исследование Silvio дополнительно охватывало соответствующие импорты HomeShowcase/MDX и профильные правила.

## Инструменты и технологии

- MCP Codex App: `load_workspace_dependencies` для расположения bundled Python.
- Субагенты: Silvio/explorer — исследование и независимое read-only ревью; Christopher/worker — реализация разделения кода.
- Skill: [feature-reviewer](../../.codex/skills/feature-reviewer/SKILL.md).
- Python, FontTools 4.60.1 и Brotli; конвертер установлен только во временный игнорируемый `.cache/font-conversion`, зависимости сайта не менялись. [Документация FontTools WOFF2](https://fonttools.readthedocs.io/en/latest/ttLib/woff2.html).
- React 19, Next.js 16.1.6, TypeScript, ESLint, pnpm, Node.js `fs/vm/zlib`, PowerShell, Git, `rg`. Динамические границы сверены с [документацией Next.js](https://nextjs.org/docs/app/guides/lazy-loading) и [React lazy](https://react.dev/reference/react/lazy); установленный стек не обновлялся.
- Context7 в инструментах сессии отсутствовал; использованы указанные первичные источники и текущий код проекта.
- Диагностические JSON и одноразовый анализатор сохранены в игнорируемых `.cache`/`node_modules/.cache`; это не код сайта.
