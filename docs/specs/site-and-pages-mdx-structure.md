# Site and Static Pages MDX Structure

## 1. Purpose
Контракт для:
- глобальных настроек сайта (`content/site/home.mdx`);
- navigation top-card (`content/site/top-card-*.mdx`);
- статических страниц (`content/pages/about.mdx`);
- страницы `404`, рендерящейся в кейсовом шаблоне (`content/pages/not-found.mdx`).

## 2. Home Settings (`content/site/home.mdx`)

### Frontmatter (required)
- `title: string`
- `seo.siteUrl: string (url)`
- `seo.siteName: string`
- `seo.defaultTitle: string`
- `seo.defaultDescription: string`

### Frontmatter (optional)
- `seo.robotsIndexByDefault: boolean` — default `true` при отсутствии.
- `subtitle: string`
- `itemStickers: Record<workSlug, NonEmptyArray<internalSvgPath>>`
- `gameItems: Record<gameSlug, { label: string, subtitle: string }>`
- `plannedItems: Record<plannedSlug, { label: string, subtitle: string, statusLabel: string }>` — будущие кейсы без страницы и собственного preview; все строки непустые, slug соответствует общему формату списка.
- `seo.defaultOgImage: string`
- `seo.faviconUrl: string`

### Item sticker mapping
- `itemStickers` настраивает sticker только для элементов списка главной; frontmatter кейсов не меняется.
- Ключ — work slug, который обязательно должен присутствовать среди slug в body этого же `home.mdx`.
- Значение — непустой массив внутренних путей; каждый путь начинается с `/` и заканчивается на `.svg`.
- HomeShowcase рендерит SVG справа сверху у элемента параллельно годовой скобке слева. Один SVG статичен, несколько сменяются по порядку каждые 200ms; активирование сбрасывает кадр, деактивирование останавливает таймер. Сохранены hover/focus, reveal-ready, задержка появления 280ms и opacity/blur 700ms, поворот -15deg и parallax 50%; на mobile оба слоя скрыты. Скобка/год появляются без дополнительной задержки за 1120ms. Их совместное движение от курсора рассчитывается по общему блоку года независимо от активного кейса; сглаживание, амплитуда и reduced-motion fallback определены в [каноническом разделе Home showcase motion дизайн-системы](../../design-system-spec.md#home-showcase-motion).
- Отсутствие ключа означает отсутствие sticker-конфигурации у опубликованного элемента; отображение года от itemStickers не зависит. Будущие кейсы из `plannedItems` используют только первый стикер из `itemStickers.globus` при сборке, без смены кадров и копирования путей в собственные записи.
- Несуществующий в body ключ считается ошибкой контракта и останавливает загрузку.

```yaml
itemStickers:
  portfoliocase:
    - "/media/cases/portfoliocase/sticker-codex.svg"
    - "/media/cases/portfoliocase/sticker-puffy-sparkle-darker-violet.svg"
    - "/media/cases/portfoliocase/sticker-github.svg"
    - "/media/cases/portfoliocase/sticker-segmented-circle.svg"
    - "/media/cases/portfoliocase/sticker-puffy-star-darker-yellow.svg"
  globus:
    - "/media/cases/globus/sticker-clock-neutral.svg"
```

### Body
- Управляет табами и секциями списка кейсов на главной.
- Формат:
  - табы разделяются строкой `---`;
  - первая строка каждого таба обязательна: `## Название таба`;
  - внутри таба `### Заголовок секции` начинает новую секцию;
  - далее следует список slug: `- my-case-slug`;
  - список до первого `###` поддерживается как секция без заголовка.
- Порядок табов в файле определяет направление переключения в UI; первый таб открыт по умолчанию.
- На mobile горизонтальный swipe в области на всю ширину экрана ниже вкладок переключает соседнюю вкладку без зацикливания: влево — следующая, вправо — предыдущая. Область включает отступ до списка, строки и пустое пространство до нижнего края viewport; контент не сдвигается. Порог, фиксация направления и подавление synthetic click определены в [Home showcase motion](../../design-system-spec.md#home-showcase-motion). Вертикальная прокрутка, обычные ссылки и keyboard activation сохраняются; controls и вложенные прокручиваемые widgets исключены. Используется общий путь активации вкладки с существующими анимациями и sessionStorage.
- Любая активация вкладки, включая повторное нажатие и быстрый возврат, сразу сбрасывает состояние кейса: пузырь, год, стикеры и preview исчезают без таймера закрытия и exit fade, текст возвращается в исходное положение без transition. Восстановление hover требует следующего допустимого hover/focus кейса в активной панели; возврат на вкладку сам по себе его не восстанавливает. Каноническое правило: [Home showcase motion](../../design-system-spec.md#home-showcase-motion).
- Внутри вкладки кейсы перечисляются по убыванию года; при одинаковом годе сохраняется текущий авторский порядок. Порядок задаётся строками body, без автоматической сортировки.
- В текущем `home.mdx` каждый таб содержит один список без заголовка секции; прежние `###` сохранены однострочными MDX-комментариями `{/* ### Заголовок */}`. «Опыт»: `goldenapple`, `zvuk`, `medicine`, `familia`; «Авторское»: `portfoliocase` (2026), по убыванию года с сохранением авторского порядка внутри года. Globus, VK и анонсы `media-and-gallery`, `mini-games`, `content-automation` временно скрыты однострочными MDX-комментариями; существующие файлы кейсов, маршруты и медиа сохранены. Конфигурации `plannedItems` и `itemStickers.globus` сохранены YAML-комментариями: активные ключи этих полей должны присутствовать среди slug body. Игры доступны через маскота независимого `GamesExperience` только при `ENABLE_GAMES=true`. Серверный флаг `lib/features.ts` по умолчанию отключён; GitHub Pages явно задаёт `ENABLE_GAMES=false`. В отключённой сборке `app/page.tsx` исключает все `gameItems` и анонс `mini-games`, если он восстановлен, не монтирует `GamesExperience` и маскота; layout не добавляет игровой bootstrap. Флаг не восстанавливает закомментированные элементы. Валидация MDX и механизм фильтрации в сборщике списка страницы сохраняются.
- Метрики кейсов — разрешённые renderer-owned строки `HOME_METRIC_LABELS` из HomeShowcase; они отображаются текстовыми группами без разделителей, с декоративной иконкой роста перед каждой метрикой, без чипов и года в метаданных. Иконка и её оформление заданы в [Home showcase motion](../../design-system-spec.md#home-showcase-motion). Набор подписей VK задан в каноническом разделе [Home showcase motion](../../design-system-spec.md#home-showcase-motion). `subtitle` кейса не выводится как роль/формат на главной; период используется для группировки годовой скобки.
- Globus сейчас закомментирован на главной. При восстановлении действует сохранённое исключение: заголовок использует второстепенный цвет из [Home showcase motion](../../design-system-spec.md#home-showcase-motion). Карточка сохраняет hover, preview и стикер, использует обычный курсор-стрелку (`cursor: default`) и не открывает кейс с главной; связь `/work/globus` сохранена в комментарии кода. Подробная страница доступна по прямому адресу.
- Источник карточек и preview кейсов остается `content/work/*.mdx` (`published` only).
- Если задано необязательное поле `gameItems`, его элементы перечисляются в body как обычные slug. Они показывают `label` и `subtitle` из frontmatter, реагируют на hover, но не открывают страницу и не имеют preview. В текущем `home.mdx` поле не задано: при включённом build-флаге игры доступны через независимый `GamesExperience`. При отключённом флаге элементы `gameItems` не передаются в отображаемые вкладки.
- Сейчас `plannedItems` и три slug анонсов закомментированы в `home.mdx`; анонсы не отображаются. При восстановлении элементы `plannedItems` перечисляются в body как обычные slug. Название и статус берутся из frontmatter, период из `subtitle` участвует в группировке года. Вместо метрик отображается `statusLabel`: «Подготовка кейса» у «Медиа и галерея» (`media-and-gallery`) и «Автоматизация контента» (`content-automation`), «В разработке» у «Мини игры» (`mini-games`). При восстановлении анонс `mini-games` дополнительно требует `ENABLE_GAMES=true`; остальные два не зависят от этого флага. Все три имеют `subtitle: "2026 · Авторское"`. Заголовок серый, hover и первый стикер используют некликабельную ветку Globus; элемент — `span` без `href`, link-role и клавиатурной навигации. Собственное preview и события аналитики открытия preview не создаются. Три кейса используют один декоративный Globus preview со стабильным ключом и video DOM при прямом переключении между ними; при отсутствии донора preview не показывается. Более светлая синяя перекраска с различиями по тону (умеренная SVG gamma + полный accent-blue в screen), маска по краям media без внутреннего отступа с сохранением размера видео, белая подложка и локальное отсутствие blur при появлении/выходе и loading/handoff задаются каноническим правилом [Home showcase motion](../../design-system-spec.md#home-showcase-motion). Globus и остальные preview сохраняют исходные цвета и motion. Отдельные страницы и `content/work` для будущих кейсов не нужны.

## 2.1 Link Preview Settings (`content/site/link-preview.mdx`)

### Frontmatter (required)
- `title: string`
- `description: string`
- `url: string`

### Frontmatter (optional)
- `type: "website" | "article"` — default `"website"` при отсутствии.
- `image: string`

### Behavior
- This file defines the shared Open Graph and Twitter preview metadata.
- Preview cards are intentionally identical across all pages.
- Work, About and 404 inherit the common document title from `app/layout.tsx`; their frontmatter title supplies visible content, not a page-specific metadata title. Page-level metadata supplies description and canonical. Work canonical is derived from slug; About/404 use their frontmatter canonical.

## 3. Top-Card Settings (`content/site/top-card-*.mdx`)

### Supported files
- `top-card-to-profile.mdx`
- `top-card-to-home.mdx`
- `top-card-default.mdx`

### Frontmatter (required)
- `photo: string`
- `title: string`
- `subtitle: string`
- `link: string` (только внутренний путь, начинается с `/`)

### Frontmatter (optional)
- `icon1: string`
- `icon2: string`
- `icon3: string`
- `icon4: string`

### Body
- Может содержать markdown/MDX-заметки, но в текущем UI не отображается.

## 4. Static Pages (`content/pages/about.mdx`)

### Supported files
- `about.mdx`

### Frontmatter (required)
- `title: string`
- `description: string`
- `canonical: string`

### Body
- Основной контент страницы в markdown/MDX.
- Поддерживаются встроенные MDX-компоненты из `lib/content/mdx-components.tsx`.
- Для media-контента доступны `<Media />` и `<Gallery> ... </Gallery>`.

## 5. Not Found Page (`content/pages/not-found.mdx`)

### Frontmatter (required)
- `title: string`
- `subtitle: string`
- `description: string`
- `canonical: string`

### Body
- Рендерится через тот же `WorkArticle`, что и кейсы.
- Использует MDX variant `work`.
- Верхняя карточка должна приходить через `topCardVariant="default"`.

## 6. Validation and Loading
- CLI `scripts/content-validate.mjs` классифицирует MDX по первой директории относительно `content` через `scripts/content-validation.mjs`: `work`, `pages`, `site`. Имена родительских папок checkout, включая `/home/runner/work/`, не влияют на тип контента. Пути вне content root не классифицируются.
- Лёгкие CLI-проверки разделены по типам: `work` проверяет обязательные metadata, совпадение slug с именем файла и canonical `/work/${slug}`; `pages` — обязательные `title`, `description`, `canonical`; `site` — парсинг frontmatter и общие проверки media/внутренних ссылок, без требований кейсов и страниц. Полные контракты frontmatter остаются в Zod, CLI их не дублирует. Набор допустимых work-ссылок строится только из файлов типа `work`.
- `tests/content-validation.test.mjs` покрывает POSIX/Windows-пути, выход за content root, правила разных типов контента и запуск CLI из checkout с `work/pages` в родительском пути. Content validation workflow запускает эти тесты и `pnpm content:validate`; deploy workflow выполняет их до сборки и загрузки статического артефакта. Ошибка любого шага блокирует публикацию.
- Runtime-источник контракта frontmatter — Zod в `lib/content/schemas.ts`; optional поля с defaults не обязательны в исходном MDX.
- `gameItems` поддерживается schema/loader и `HomeShowcaseConfig`. Ручной `HomeFrontmatter` сейчас не содержит этого поля; он не определяет runtime-валидацию и не является полной копией схемы.
- `lib/content/site.server.ts` дополнительно fail-fast проверяет, что каждый ключ `itemStickers`, `gameItems` и `plannedItems` присутствует среди slug, реально перечисленных в body `home.mdx`; один slug не может одновременно быть игрой и будущим кейсом. При сборке списка `app/page.tsx` также отклоняет совпадение будущего кейса с опубликованным work entry. `plannedItems` поддерживается схемой, типами и loader.
- Загрузка и рендер выполняются через `lib/content/site.server.ts`.
- Runtime-зависимости не расширяют MDX-контракт: серверная главная импортирует лёгкий `GamesExperienceEntry` только внутри включённой ветки build-флага; эта клиентская граница использует SSR-enabled dynamic import `GamesExperience`, чтобы не объединять игровую реализацию с initial chunks отключённой страницы. Inline media, модалка, debug UI и demo разделяются по [ДС — Client runtime loading](../../design-system-spec.md#client-runtime-loading). Отключённые игры не получают initial HTML/RSC reference; существующий SSR маскота/frame при включённых играх сохраняется.

## 7. Motion and Reveal Contract
- Caption under a Home work preview is a derived `HomeWorkEntry.previewCaption`, sourced only from the body of the exact `Мой вклад` short-summary section in the work loader. It adds no Home/frontmatter field. Missing/empty sections and planned donor previews have no caption; differently named sections are not substituted. Source mapping is canonical in [the case contract](portfolio-case-json-structure.md#shortsummary-rules); caption layout and lifecycle follow [Home showcase motion](../../design-system-spec.md#home-showcase-motion).
- Home (`/`) uses `SiteShell` plus a custom `HomeShowcase` motion path. The top card is still rendered through `AnimatedTopCard`, while the showcase area owns its own list/preview/hover motion.
- About (`/about`), work detail (`/work/[slug]`), and not-found (`/404`) use `SiteShell`, which applies:
  - persistent top-card replacement owned by `PersistentSiteFrame` through `components/navigation/AnimatedTopCard.tsx`;
  - sequential page reveal through `components/motion/PageRevealSequence.tsx`.
- Static page and MDX content do not expose motion controls in frontmatter. Motion is renderer-defined and must stay consistent across pages.
- MDX elements rendered through `lib/content/mdx-components.tsx` participate in page reveal via `components/motion/MdxMotionComponents.tsx`.
- The reveal language for page content is fixed to soft `opacity + blur + translateY` sequencing. New page-level motion variants should not be introduced through content files.
- The page-reveal sequence is split into two synchronized tracks inside `components/motion/page-reveal-sequence.module.css`:
  - `pageRevealVisibility` controls `opacity + blur`;
  - `pageRevealMove` controls `translateY`.
- Current page-reveal timing contract:
  - visibility track: `0.7s`, `cubic-bezier(0.22, 1, 0.36, 1)`;
  - move track: `1.12s`, `cubic-bezier(0.18, 0.88, 0.28, 1)`;
  - shared stagger: `calc(var(--page-reveal-index, 0) * 80ms)`;
  - initial offset: `translateY(28px)`.
- Per-target readiness waits only for opacity/filter visibility animations; movement can continue. Full-animation waiting is lifecycle cleanup, not the Home glass/preview readiness gate.
- Bottom page padding is still renderer-controlled. `components/shell/BottomPaddingController.tsx` must re-check trim state after `load` and `app:scroll-restored` so reload/scroll-restore does not collapse the page container height incorrectly.
- Reduced motion is part of the rendering contract:
  - top-card swaps fall back to static rendering;
  - page-reveal sequence resolves to immediately visible content without animation.
  - home tab content swaps and container-height changes become instant.
