# Portfolio Design System

## Source of truth

- Current home content uses one untitled list per tab. Experience (`Опыт`) contains `goldenapple`, `zvuk`, `medicine`, `familia`; Authored (`Авторское`) contains `portfoliocase` (2026), in descending year order with the existing author order within a year. Globus, VK and planned `media-and-gallery`, `mini-games`, `content-automation` are temporarily retained as single-line MDX comments in `content/site/home.mdx`; `plannedItems` and `itemStickers.globus` are retained as YAML comments so the loader sees no mappings for absent body entries. Existing case files, routes and media are preserved. Games are available through the independent `GamesExperience` mascot only when `ENABLE_GAMES=true`; this flag does not restore commented entries. Former section headings are retained as single-line MDX comments.
- Утверждённая текущая реализация — baseline этой редакции. Основные токены: `app/globals.css` (`:root`); локальные параметры — CSS-модули и компоненты. Документ фиксирует их контракт.
- При последующих изменениях UI одновременно согласовывать и обновлять затронутые правила ДС, спеки и оба структурных JSON в том же изменении; порядок работы и запуск проверок определяет `AGENTS.md`, §§9–12.
- Документные и UI-only изменения не запускают проверки, тесты, сборку или browser/visual smoke-test. Проверки и тесты выполняются только для изменений, которые могут повлиять на сборку, по `AGENTS.md`, §§9–10.
- Применение токенов в UI: CSS-модули в `components/**` и `app/page-content.module.css`.

## Layout
- Base grid: 4px (основной ритм 8px, с поддержкой micro-step для плотных элементов)
- Content max-width: `--page-max-width = 42rem` (672px)
- Main side padding: `--layout-main-padding-x = 2rem` (32px)
- Mobile main top padding: `--layout-mobile-main-padding-top = 40px`; mobile override at `max-width: 767px` = `32px`
- Mobile surface side padding: `--layout-mobile-surface-padding-x = --space-lg` (16px)
- Mobile content side padding: `--layout-mobile-content-padding-x = --space-3xl` (32px)
- Mobile content inset inside the surface grid: `--layout-mobile-content-inset = 16px`
- Main top padding: `--layout-main-padding-top = 6rem` (96px)
- Main bottom padding: `--layout-main-padding-bottom = 200px`
- Default vertical section gap: `--layout-content-gap = 2rem` (32px); mobile override at `max-width: 767px` = `24px`
- Global header rhythm: `--rhythm-title-block-top = 60px`, `--rhythm-title-block-bottom = 40px` для блока `title + subtitle` на всех страницах. Mobile override at `max-width: 767px`: `--rhythm-title-block-top = 32px`, `--rhythm-title-block-bottom = 24px`.
- Global section-heading rhythm: `--rhythm-section-heading-top = 60px`, `--rhythm-section-heading-bottom = 40px` для заголовков секций кейсов. Mobile override at `max-width: 767px`: `--rhythm-section-heading-top = 40px`, `--rhythm-section-heading-bottom = 24px`.
- Home preview pane size: `--layout-preview-size = 484px`
- Home preview offset from list: `--layout-preview-offset-x = 68px`
- Home left column width: `--home-left-column-width = 405px`
- Home layout paddings: `--home-layout-pad-left = 135px`, `--home-layout-pad-top = 135px`
- Home section rhythm: from the last case subtitle to the next section heading `--home-section-gap = 60px`, from section heading to the first case title `--home-section-title-gap = 40px`, between adjacent cases `40px` via vertical item padding, case title to subtitle `--home-item-gap = 8px`. Section and list CSS subtract the item layout padding so the visible text distances match these tokens. Hover glass keeps its previous `74px` height via `--home-item-hover-padding-y = 14px`. Mobile overrides at `max-width: 767px`: `--home-item-padding-y = 8px`, `--home-item-hover-padding-y = 12px`, `--home-meta-gap = 6px`, `--home-micro-gap = 4px`, `--home-contact-gap = 8px`, `--home-top-card-padding = 16px`, `--home-top-card-subtitle-gap = 6px`, `--home-top-card-icon-gap = 8px`.
- Home tab rhythm: `--home-tabs-gap = 20px` between tab labels, `--home-tabs-to-list-gap = 60px` from tab-label bottom to the first list heading or first case title text in an untitled section (compensating item layout padding with a first-section negative margin), and `--home-top-card-to-tabs-gap = 80px` from the top-card bottom to the tab-label top. At `max-width: 767px`, `--home-top-card-to-tabs-gap` uses `--space-3xl` (32px) and `--home-tabs-to-list-gap` uses `--space-3xl` (32px); the label gap stays unchanged.
- Breakpoints: 680px (masonry/icon grid), 768px (shell layout), 1180px (fixed preview pane)

## Typography Tokens

### Font family
- `--font-family-sans`: `var(--font-inter), ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`
- `--font-family-home`: `var(--font-inter), ui-sans-serif, system-ui, sans-serif`
- `--font-inter`: CSS variable from `next/font/local` in `app/layout.tsx`, served from `app/fonts/inter/Inter-Variable.woff2`. The WOFF2 is a full-glyph conversion of the retained `Inter-Variable.ttf` source, preserving variation axes, character mapping, glyph outlines, hinting and metrics; no subset is applied. The local OFL license remains alongside both files. Keep `display: swap`, local self-hosting and the existing `100 900` weight range.

### Font weights
- `--font-weight-regular = 400`
- `--font-weight-medium = 500`
- `--font-weight-bold = 700`
- `--font-weight-heavy = 800`

### Font sizes
- `--font-size-body = 1rem` (16px)
- `--font-size-caption = 0.875rem` (14px)
- `--font-size-overline = 0.75rem` (12px)
- `--font-size-overline-xs = 0.6875rem` (11px)
- `--home-font-size-md = 16px`
- `--home-font-size-lg = 18px`

### Line-height and tracking
- `--line-height-base = 1.5`
- `--line-height-reading = 1.65`
- `--line-height-caption = 1.25rem` (20px)
- `--home-line-height-tight = 19px`
- `--letter-spacing-base = 0.03em` (3%)
- `--letter-spacing-overline = 0.04em`
- `--letter-spacing-overline-tight = 0.03em`

### Semantic text usage
- Body text and links: `font-size-body` + `font-weight-regular`
- Medicine and Golden Apple case narratives follow the existing case format: one section-heading level (`#` in MDX), regular-weight paragraphs and list items, no inline bold labels or metric emphasis, and no label-based extra heading tier. Introductory role/team context is prose rather than a labeled passport. This is a content-formatting rule; shared typography tokens and renderer styles stay unchanged.
- Medicine and Golden Apple reading rhythm follows Familia/Zvuk: short paragraphs with one main thought, existing `<br/>` pauses between semantic groups, and flat lists for funnels, states, responsibilities and metrics. Do not collapse several distinct claims into one dense paragraph. `<br/>` stays away from section headings and does not introduce new spacing values; shared font sizes and text-container width stay unchanged.
- Medicine is a reference only for short-mode brevity, not for other full narratives. Each case follows its own product logic without required iteration count. Canonical editorial scope, short length and metric evidence: `docs/specs/portfolio-case-json-structure.md#shortsummary-rules`.
- Medicine, Familia, Zvuk, Golden Apple and Portfolio short overviews have four compact labeled blocks before the existing media, with no cards, backgrounds, borders or shadows. The overview is a semantic `dl`: one column at every viewport width. Each label uses `font-size-caption`, `font-weight-medium`, `text-muted`; values use `font-size-body`, `font-weight-regular`. Block gap uses `space-xl`, label-to-value gap uses `space-sm`. It is opt-in through four existing `shortSummary.paragraphs` strings whose first lines exactly match one of two ordered sets: `Контекст`, `Метрики`, `Мой вклад`, `Ограничение`, or Portfolio's `Продуктовая задача`, `Решения`, `Аналитика и развитие`, `Автоматизация и AI`. Each block has a nonempty body. Both sets reuse `shortOverview`, `shortOverviewBlock`, `shortOverviewLabel` and `shortOverviewValue` with semantic `dl/dt/dd` and the same tokens. Other formats retain the existing renderer. This scoped label hierarchy is allowed only in the overview; full-mode prose keeps its no-inline-bold/no-extra-heading-tier rule. No new content fields, controls or spacing tokens are introduced.
- Zvuk retains existing case typography and reading rhythm. Profiles scope, short overview, source archive and metric definitions are canonical in `docs/specs/portfolio-case-json-structure.md#shortsummary-rules`. Existing short-profile and short-player media and renderer remain; Profiles are primary, the player supports uninterrupted listening, and onboarding is outside scope. Preserve existing full/short media during text editing unless the user explicitly requests removal; canonical media order is in the case contract. No new tokens or fields.
- Familia retains existing case typography and reading rhythm: single-level headings, regular prose, flat lists and pauses away from headings. Its four-block short overview retains existing media. Editorial scope and metrics are canonical in `docs/specs/portfolio-case-json-structure.md#shortsummary-rules`; no new tokens, components or fields.
- Golden Apple full mode follows its own product logic, with contribution, scenario value and boundaries; no fixed three-step template or public model-status notes. Canonical editorial scope and metric definitions: `docs/specs/portfolio-case-json-structure.md#shortsummary-rules`.
- Page headings, MDX section headings and Home `.sectionTitle`: `font-weight-heavy` (800). Global unqualified `h1/h3` retain medium (500); TopCard title uses bold (700).
- Captions and icon titles: `font-size-caption` (14px). Home `.itemMeta` uses `--home-font-size-md` (16px); its line-height is `--home-line-height-tight` (19px).
- Uppercase media labels: `font-size-overline` + `letter-spacing-overline`

## Color Tokens

### Core neutrals
- `--color-black = #000000`
- `--color-white = #ffffff`
- `--color-gray-900 = #111111`
- `--color-gray-700 = #71717a`
- `--color-gray-600 = #555555`
- `--color-gray-500 = #a1a1aa`
- `--color-gray-400 = #d4d4d8`
- `--color-gray-300 = #cfcfcf`
- `--color-gray-250 = #eeeff2`
- `--color-gray-200 = #ececec`
- `--color-gray-150 = #e4e4e7`
- `--color-gray-100 = #f8f8f9`
- `--color-gray-75 = #f7f7f8`
- `--color-gray-50 = #f4f4f6`
- `--color-gray-40 = #f4f4f5`
- `--color-gray-35 = #f5f5f5`
- `--color-accent-blue = #339CFF` — переиспользуемый интерактивный акцент для hover, focus-visible и active состояний.
- `--color-gray-25 = #fafafa`

### Approved local hover color
- `#f0f3f6` is the current local hover backing in TopCard, shell controls and ShortSummary. It is allowed in these components without introducing a global token.

### Semantic color tokens
- `--text-primary`, `--text-muted`, `--text-light`, `--text-marker`
- `--line-muted`, `--line-hover`
- `--home-line-default`
- `--bg-page`
- `--card-bg`, `--card-bg-hover`
- `--surface-glass-border`, `--surface-glass-start`, `--surface-glass-end`
- `--surface-placeholder-border`, `--surface-placeholder-bg`
- `--surface-placeholder-work-border`, `--surface-placeholder-work-bg`
- `--logo-gradient-start`, `--logo-gradient-end`
- `--home-top-card-bg`
- `--home-top-card-text-primary`
- `--home-top-card-bg`, `--home-text-primary`, `--home-text-secondary`

### Alpha and shadow tokens
- White overlays: `--white-92`, `--white-90`, `--white-85`, `--white-82`, `--white-75`, `--white-50`, `--white-42`, `--white-25`, `--white-20`, `--white-14`
- Black overlays: `--black-85`, `--black-08`, `--black-04`
- Glass shadows: `--brand-shadow-07`, `--brand-shadow-40`, `--brand-shadow-10`

## Spacing Scale
- `--space-0 = 0`
- `--space-3xs = 0.1rem` (1.6px)
- `--space-2xs = 0.25rem` (4px)
- `--space-xs = 0.35rem` (5.6px)
- `--space-sm-compact = 0.45rem` (7.2px)
- `--space-sm = 0.5rem` (8px)
- `--space-md-compact = 0.55rem` (8.8px)
- `--space-md = 0.6rem` (9.6px)
- `--space-lg-compact = 0.7rem` (11.2px)
- `--space-lg = 1rem` (16px)
- `--space-xl = 1.3rem` (20.8px)
- `--space-2xl = 1.5rem` (24px)
- `--space-3xl = 2rem` (32px)
- `--space-4xl = 3rem` (48px)
- `--space-5xl = 6rem` (96px)

## Border Radius Tokens
- `--radius-xs = 4px`
- `--radius-md = 10px`
- `--radius-lg = 16px`
- `--radius-xl = 24px`
- `--radius-2xl = 40px`
- `--radius-avatar-home = 44px`
- `--radius-home-preview = 22px`
- `--radius-home-top-card = 40px`
- `--radius-home-avatar = 50px`
- `--radius-pill = 999px`

## Size Tokens
- `--size-dot-md = 0.45rem`
- `--size-dot-sm = 0.4rem`
- `--home-avatar-size = 64px`
- `--home-icon-size = 18px`
- `--home-arrow-size = 27px`

## Motion System

### Motion principles
- Motion supports orientation, hierarchy, and state change; it must not exist as decoration detached from interaction or layout.
- Default motion language is soft, blurred, and slightly eased into place: `opacity + blur + translateY` for reveal, `opacity + blur + scale` for surface swaps, and restrained pointer-reactive transforms only where already designed. Persistent top-card route swaps are the explicit exception: their content uses `opacity + translateY + scale` without blur.
- Ambient infinite animation is not allowed by default. Home top-card hover and active mapped sticker cycles stop when inactive. Explicit local exceptions are game simulation/ambient effects and visibility-gated `PortfolioMotionDemo` (including its demonstrated 620ms icon cycle); their local lifecycle and reduced-motion contracts apply.
- Scroll-linked animation patterns (`useScroll`, parallax, while-in-view transforms, progress-based transforms) are not part of the current design system.
- New motion values should reuse the existing motion tiers below. If a new duration/easing family is needed, it must be added here first.

### Motion implementation rules
- Use `Framer Motion` for stateful enter/exit, geometry transitions, pointer-follow behavior, and portal-based overlays.
- Use CSS transitions/keyframes for simple hover, asset loading, and deterministic page-reveal sequencing.
- Prefer property-specific transitions. Avoid `transition: all` for new UI work.
- Page reveal, top-card swaps, lightbox open/close and Home glass/preview implement the reduced-motion behavior documented below. Other component behavior is described locally; do not infer a global JS fallback from a CSS media query.

### Motion tokens

#### Easings
- `motion-expressive = cubic-bezier(0.22, 1, 0.36, 1)`; primary easing for reveal, modal geometry changes, hover transforms, and media handoff.
- `motion-standard = cubic-bezier(0.4, 0, 0.2, 1)`; secondary easing for small UI feedback and legacy link hover.
- `motion-soft-out = easeOut`; allowed for simple backdrop fade/blur.
- `motion-basic = ease`; allowed for media load-state transitions only.
- `motion-soft-in-out = ease-in-out`; allowed for top-card background-color hover only.

#### Duration tiers
- `motion-instant = 0ms`; reduced-motion fallback.
- `motion-micro = 180ms`; micro fade-out and compact icon-state changes.
- `motion-fast = 200ms`
- `motion-fast-plus = 220ms`; default for quick overlay fade, trigger hover, media handoff, and close-button enter.
- `motion-sticker-cycle = 200ms`; exact `5fps` frame slot for the home sticker cycle.
- `motion-base = 280ms`; default for media shell open, button reveal transforms, and standard UI state changes.
- `motion-base-plus = 320ms`; allowed for asset settle/load completion and top-card background color.
- `motion-emphasis = 420ms`; used by the home active-item text shift and each persistent top-card route-swap tape retarget.
- `motion-layout = 600ms`; used by the home outgoing-text return and preview enter/swap.
- `motion-page-reveal = 700ms`; visibility track; movement uses `1120ms` and `cubic-bezier(0.18, 0.88, 0.28, 1)`
- `motion-spring-soft = 800ms`; used by shared Framer Motion item reveal.
- `motion-ambient-enter = 1240ms`; reserved for the initial top-card document reveal.
- `motion-loop-icon = 620ms`; reserved for top-card icon wave on hover.
- `motion-loop-shimmer = 4200ms`; reserved for top-card shimmer on hover.

#### Approved local motion values
- Lightbox floating close: `440ms`, delay `80ms`; close icon `360ms`; ordinary closing geometry `240ms`, interrupted closing `160ms`; navigation press `120ms`. These use expressive easing.
- Gallery trigger hover: scale `1 → 1.018`, `420ms`, `cubic-bezier(0.16, 1, 0.3, 1)`; no reduced-motion override for this transform.
- Local game and PortfolioMotionDemo timing follows their component contracts rather than the common duration tiers.

#### Reveal primitives
- Page and MDX reveal uses `opacity + blur(8px) + translateY(28px)`.
- Sequenced reveal stagger is `80ms` between siblings.
- Initial top-card surface/content reveal uses `scale(0.985 → 1)`; the route wheel uses the component-specific symmetric `0.667 ↔ 1` scale lifecycle defined below.
- Media loading/handoff may use blur up to `18px`; this is the upper bound in the current system.

### Reduced motion policy
- `PageRevealSequence` must resolve to fully visible static content when `prefers-reduced-motion: reduce` is active.
- `AnimatedTopCard` must render the static `TopCard` without route-swap motion when reduced motion is requested.
- `GalleryLightbox` must collapse motion transitions to `duration: 0` for open/close/backdrop/close-button choreography when reduced motion is requested.
- Reduced-motion behavior is scoped to each component. MediaPlaceholder handoff/load and Gallery trigger hover remain animated; mobile ShortSummary skips initial hidden state but retains its JS springs/deformations. Its CSS fallback disables CSS animation/transition only. These are current implementation contracts, not assertions of complete accessibility coverage.
- Home active-case glass must switch geometry instantly, disable pointer tilt/shift and active-text transforms, and keep transform origin centered when reduced motion is requested. Home preview must omit blur/scale and use opacity-only motion.

## Progressive Blur

Общая реализация дизайн-системы — [`ProgressiveBlur`](components/design-system/ProgressiveBlur.tsx) и его [CSS module](components/design-system/progressive-blur.module.css). Компонент принимает направление и набор слоёв, возвращает `Fragment` из статичных `span` без дополнительной DOM-обёртки. Рабочий эталон использования — [`PixelPerfect`](components/games/PixelPerfect.tsx); пользователь подтвердил корректную работу эффекта. При следующих запросах на progressive blur переиспользовать этот компонент; при несвязанных правках сохранять рабочие параметры.

Порядок деклараций обязателен, значения должны совпадать:

```css
-webkit-backdrop-filter: blur(var(--progressive-blur));
backdrop-filter: blur(var(--progressive-blur));
```

Предыдущая диагностика подтвердила: установленный Lightning CSS из Next.js 16.1.6 при обратном порядке оставляет только prefixed-декларацию, которую проверенный браузер не поддерживает. Это поведение текущего трансформера, а не универсальный закон CSS.

- Размываемые источники и перекрывающие их filter spans — соседи внутри общего фонового контейнера, обрезающего содержимое по радиусу. Маски применяются к самим filter spans, без дополнительной маскированной обёртки между ними и источниками.
- Сохранять доступ backdrop к источникам. Не добавлять в обёртку, отделяющую фильтры от источников, `opacity < 1`, `filter`, `mask`, `clip-path`, `backdrop-filter`, `mix-blend-mode` или `will-change` для этих свойств. Это ограничение не означает, что любой общий предок, `transform` или `z-index` сам по себе блокирует размытие.
- Фильтры — обычные статичные `span`: `opacity: 1`, `animation: none`, `transition: none`, `will-change: auto`, без Motion/WAAPI. После получения bounds они остаются смонтированы; crossfade применяется к исходным квадратам позади них.
- Foreground располагается выше фоновых слоёв. Декоративные слои используют `pointer-events: none` и скрыты от accessibility tree через `aria-hidden`. Tint — отдельный слой тонирования; он не заменяет blur.
- В Pixel Perfect размытие усиливается слева направо: радиусы `0 / 5 / 10 / 20 / 40px`, пары start/end масок соответственно `0/25`, `8/35`, `16/45`, `24/55`, `32/65%`. Эти значения задаются локально в `PixelPerfect`, а не defaults или токенами общего компонента. Источники имеют `z-index: 0`, blur — `1–5`, tint — `6`. Направление и область эффекта адаптируются через props под конкретный запрос с сохранением механизма.
- Reduced motion сохраняет статичный progressive blur и отключает пространственные анимации.

Технические проверки CSS запускаются только при возможном влиянии изменения на сборку по `AGENTS.md`, §§9–10; UI-only и документные изменения их не запускают. При разрешённой диагностике сборки начинать с реально сгенерированного CSS и сохранности обеих backdrop-filter деклараций. Browser computed `backdrop-filter`, `CSS.supports`, геометрия, маски и разделяющие границы предков проверяются только по отдельному явному запросу пользователя. Не менять вслепую `z-index` или радиусы. Визуальную оценку выполняет пользователь; автоматические визуальные проверки не создавать.

## Home Top Card Tokens
- `--home-top-card-width = 340px`
- `--home-top-card-padding = 20px`; mobile override at `max-width: 767px` = `16px`
- `--home-top-card-radius = 40px`
- `--home-top-card-content-gap = 12px`
- `--home-top-card-subtitle-gap = 7px`
- `--home-top-card-icon-gap = 9px`
- `--home-name-size = 20px`
- `--home-subtitle-size = 18px`
- `--home-line-height-tight = 19px`
- `--home-avatar-radius = 50px` (alias `--radius-home-avatar`)
- Desktop `--home-meta-gap = 7px`, `--home-micro-gap = 5px`, `--home-contact-gap = 9px`, `--home-top-card-gap = 22px`.
- Declared legacy values without active layout/typography consumers: `--home-layout-pad-left/top = 135px`, `--home-top-card-gap = 22px`, `--home-contact-gap = 9px`, `--home-name-size = 20px`, `--home-subtitle-size = 18px`. TopCard binds text to `--home-font-size-lg/md`, not these legacy font-size declarations.

## Client runtime loading

- Initial HTML retains inline media, gallery triggers and their existing layout/reveal DOM. A deferred module must not replace the inline gallery or remount its source images when loaded. The lightweight inline renderer must not import the modal/progressive-video renderer.
- Gallery pointer intent or keyboard focus may preload the lightbox JavaScript and that trigger's full image. Click/touch/keyboard activation requests the deferred runtime and opens against live, persistent source refs after the module is ready. The latest request wins; leaving the gallery cancels pending opening. No synthetic event is retained across an asynchronous import, and analytics runs once for the actual opening.
- The loaded lightbox runtime retains its session state, scroll/focus lifecycle, decoded low/full layers and closing portals through completion. Module loading does not bypass or redefine [Image request policy](#image-request-policy), source-aware handoff, navigation or reduced-motion behavior.
- The optional lightbox debug UI has a separate deferred module. Shared settings/types/defaults live in a lightweight module that does not import the panel; the panel loads only for the existing explicit debug flag with an actionable context.
- Both MDX and the short-case slot use the same lightweight PortfolioMotionDemo entry. Its fixed layout/reveal shell is retained; scene code loads near the existing playback intersection boundary. Playback remains governed by the existing visibility, document-hidden and reduced-motion rules; module loading does not introduce another reveal wrapper or change scene geometry.
- Failed runtime imports do not leave a permanently rejected cached promise. Gallery/game activation can retry; an in-range demo has a bounded retry on network recovery or return to a visible tab. Pending callbacks/listeners are cancelled on unmount; loading failures add no visible placeholder or error UI.
- The home server component imports the lightweight GamesExperienceEntry only inside the enabled build-flag branch. That client entry declares a separate SSR-enabled dynamic import of GamesExperience, preventing the game implementation from being merged into the initial disabled-page chunks. Disabled pages do not reference or preload the game client runtime. Enabled pages preserve the SSR mascot/frame required by the games bootstrap; any deferred game body must be ready and committed before frame measurement, opening or restored-session animation.
- Generated chunks may remain in the exported directory without belonging to an initial route. Bundle accounting uses the actual HTML/RSC references and distinguishes initial modern scripts, deferred modules and legacy noModule scripts.

## Components

### Games Experience (`GamesExperience`)
- Runtime loading follows [Client runtime loading](#client-runtime-loading). `DeferredGameModeShell` retains a lightweight SSR `GameFrame`; game implementation loads on mascot intent/activation or an open-session restore. Opening and restore wait for the loaded frame's React commit before reading geometry. The existing mascot, bootstrap geometry, session persistence and motion contract remain unchanged.
- Build availability: `lib/features.ts` evaluates `process.env.ENABLE_GAMES === "true"`, default false; GitHub Pages explicitly sets `ENABLE_GAMES=false`. When disabled, `app/page.tsx` omits `GamesExperience`, its mascot and all `gameItems` plus the planned `mini-games` entry; `app/layout.tsx` omits the games bootstrap. The validated MDX source stays unchanged; filtering occurs only in the page builder. The rules below apply when enabled. Sources and public game assets remain available.
- Home-only, desktop-only (`min-width: 768px`) inline game mode after `SiteShell`; mascot is absolute at the physical page bottom, centered, 125×72 CSS px.
- `GameModeShell` → `GameFrame` / (`PixelPerfect` → `CharacterPlayground`), with a `MascotMessage` slot. The final Далее button advances to the second game. No additional route, overlay, backend, overall games title or sequence progress.
- One versioned sessionStorage record restores open state and Pixel Perfect attempts/results (maximum five attempts per series) through an early safe bootstrap before scroll restoration; CSS reserves restored-open geometry before hydration.
- In closed state, the page tail after `SiteShell` has a minimum height of 80svh and expands when the selected list is shorter than the viewport. Maximum scroll leaves the lower 20% of a sufficiently long case list visible; the 125×72 mascot is fully visible with its bottom at the physical document/viewport bottom. This is scoped to the desktop home main and does not change global spacing tokens.
- Uses one wide card with width `min(672px, viewport minus existing page gutters)` and height50svh. Pixel Perfect uses the local dark contract below. Intro/final render three background source squares with progressive backdrop blur; play shows five hearts at top40px. Exact16 or five attempts including violations complete the series; best gap is nearest16. Final has no active square; its full-card Далее button opens CharacterPlayground and preserves the Pixel Perfect result. Outer lifecycle, measurement geometry and mascot behavior remain unchanged.
- Pixel Perfect local measurement: orange #ff835e line/dashes/endcaps1px, badge filled orange #ff835e with white text; number24px regular white, padding4px8px and radius4px. Draggable hover outline remains #0C8CE9, centered on the edge (1px inside and1px outside). Hearts use heart-active.png / heart-spent.png, size30px, DS space-md gap, top40px. These are local game values, not changes to the global palette.
- Pixel Perfect has no external contour glow, white frame border or frame shadow. Victory uses internal spotlights only.
- Detailed behavior, geometry, Figma-derived component values, state schema and browser edge cases: [Games specification](docs/specs/games.md).

#### CEO Simulator

- Population starts with six neutral humans and no AI. Two AI appear together only when task4 is presented; the lifetime maximum is two.
- Human Speed/Quality contributions are Analytics10/10, Design8/25, Development28/5 and QA7/25. Active human cost is13; only one effective AI per department costs2. Ineffective/unassigned/duplicate AI is free. Metrics clamp to0–100.
- AI is a coworker booster, not a replacement: one effective AI per department gives speed+20 with one human or+40 with at least two humans, never quality or department presence. Existing kick behavior remains active only during interactive play.
- Gameplay uses three compact continuous metric bars without visible numeric thresholds or a task card. Each bar has seamless low/normal/high background zones, no white surface, black outline, gaps or button-like segments; its continuous fill animates width and pastel zone color for300ms. Local colors are low `#d58b8c`, normal `#e2c66f`, high `#87b895`; they do not alter the global palette. Acceptable target zones softly pulse, minimum Normal highlights Normal+High, and a newly met metric uses one350ms success pulse instead of persistent arrows/checks. Department requirements and AI markers enter/exit through fade/scale. Crisis countdown is embedded in the60–80px metrics HUD and fades with its state.
- Normal task hold is1s; crisis hold is0.7s and its timer is5s. Lightweight success/fail feedback lasts500ms, then the next round is immediately playable. Lower contextual content uses one compact hand-drawn bubble without a tail or white underlay, with normal/think/robot/shout/whisper semantics and red !/!!/!!! markers. Bubble reveal/hide takes220ms through opacity and scale `.96↔1`; text replacement completes fade-out before fade-in.
- Three crisis successes mean «Компания растёт», two mean «Бизнес удержался», zero or one mean «Компания обанкротилась». Every path reaches the report.
### Home Top Card
Текущая главная использует тот же persistent `TopCard` (`.card`), что описан ниже; отдельный `.topCard/.avatar/.topName/.contactLink` контракт — прежняя структура, не активный компонент. Старые `home-top-card-gap` (22px) и `home-contact-gap` (9px) остаются декларациями без текущих потребителей; `home-micro-gap` равен 5px desktop /4px mobile. Аватар текущего TopCard использует `home-avatar-radius` 50px.

### Home Case Card (`.item`)
Structure:
- label (`.itemLabel`)
- meta (`.itemMeta`)

Spacing:
- row spacing: `40px` via `--home-item-layout-pad-y = 20px` on each side; mobile keeps its previous vertical spacing via `--home-item-padding-y = 8px`
- hover glass padding: `--home-item-hover-padding-y = 14px` on desktop and `12px` on mobile
- internal gap: `--home-item-gap` (8px)
- declared meta gap: `--home-meta-gap` (7px desktop, 6px mobile); HOME_METRIC_LABELS use inline groups with a decorative metric-up.svg before each label, rendered as a 12×12px CSS mask in --color-gray-400 (#d4d4d8), a local metric-icon size exception; icon/label spacing uses --home-micro-gap, and groups use --home-meta-gap without separators.

Shape:
- radius: `--home-bubble-radius` (18px)

Rules:
- label всегда сверху meta
- underline для label использует `--home-line-default`
- hover glass-слой использует `surface` и `shadow` токены
- on mobile, hover-only glass/highlight behavior and active text shift are disabled; list content follows the content grid (`32px` from viewport edge)

### Top Card (`.card`)
Structure:
- avatar (`.photo`)
- text block (`.title`, `.subtitle`)
- optional icon row (`.icons`)
- navigation arrow (`.arrow`)

Motion ownership:
- during client route swaps, the card backing and right navigation arrow are static layers outside the clipped content viewport

Spacing:
- card padding: `--home-top-card-padding`
- avatar/text gap: `--home-top-card-content-gap`
- subtitle/icons gap: `--home-top-card-subtitle-gap`
- icon gap: `--home-top-card-icon-gap`

Shape:
- card radius: `--home-top-card-radius`
- avatar radius: `--home-avatar-radius`

Typography:
- title: `--home-font-size-lg` (18px) / `--home-line-height-tight` / `--font-weight-bold`
- subtitle: `--home-font-size-md` (16px) / `--home-line-height-tight` / `--font-weight-regular`

### Media Placeholder (`.wrapper`, `.mediaLabel`)
Structure:
- frame
- media surface
- optional pill label
- optional caption

Spacing:
- caption: margin-top `--space-md` (9.6px), margin-left `--home-top-card-padding` (20px); at max-width 767px margin-left `--layout-mobile-content-inset` (16px).
- pill padding: `--space-xs` `--space-lg-compact`
- pill gap: `--space-sm`

Shape:
- default radius: `--radius-md`
- work radius fallback: `--radius-xs`; content-media override uses `--home-top-card-padding` (20px desktop /16px at max-width767px).
- pill radius: `--radius-pill`

Rules:
- вся палитра placeholder и наложений берётся из color/alpha токенов
- video dot size переключается через `--size-dot-md`/`--size-dot-sm`
- on mobile, inline content media bleeds from the content grid back to the surface grid (`16px` from viewport edge)

#### Image request policy

- Inline content images use native `loading="lazy"` at every viewport width. The browser selects an existing base/retina source using `srcset` and DPR; there is no JavaScript preload or sequential mobile upgrade to `@2x` and then `fullSrc`.
- When intrinsic base width is available, the renderer converts density descriptors to width descriptors; an existing width-based source set is preserved. Width-based inline source sets use `sizes="auto, 100vw"`: supporting browsers select against the rendered image width, including gallery columns, while other browsers use the conservative viewport-width fallback. Without usable dimensions the original density source set remains, without `sizes`. No additional image variants or layout dimensions are introduced.
- `fullSrc` is excluded from automatic inline source selection. Modal images retain the existing full-resolution source; home hover previews retain their existing density source selection and mount lifecycle. Native source selection is consistent between server markup and hydration and may change on resize or DPR changes; it does not promise exactly one request for the entire page session.
- Mounting a Gallery or its scope must not preload or decode every full-resolution image, including during idle time. Pointer enter or keyboard focus on an openable trigger may preload only that trigger's image. During an open image session, full-resolution requests are limited to the active image and its immediate neighbours. The decoded low/full presentation, persistent low layers, source-aware handoff and selection behavior remain governed by the Gallery Lightbox rules below.

### Gallery Fullscreen Overlay (`GalleryLightbox`)
Structure:
- backdrop
- dialog container
- media frame
- fixed close button
- desktop previous/next controls
- desktop/mobile thumbnail rail
- optional caption

The case lightbox also includes a context card above the thumbnail rail (or at the bottom for a single item). Only its collapsed state is compact: it hugs a single regular-weight black title with `--space-sm` vertical and `--space-xl` horizontal padding and a pill radius. Hover or keyboard focus expands the actionable card to `560px` (capped by the viewport) using a lightbox-local spring (`stiffness: 420`, `damping: 36`, `mass: 1.6`) for width and vertical padding, restores the full-card padding `--space-lg` / `--space-xl` and `--home-bubble-radius`; the radius changes linearly over `400ms` in both directions from half the measured compact card height to `--home-bubble-radius`, crossfades the title to heavy weight over `60ms` and reveals the body from below the clipped lower edge: body text moves only vertically from `80px` below its expanded position after `120ms`, using the title vertical-axis `420/36/1.6` spring, while opacity fades from 0 to 1 over `200ms` after `160ms`; reverse motion has no delay; reduced motion makes these changes immediate. The fixed centering wrapper keeps the card horizontally centered and its bottom edge fixed. The glass surface contains a native link on desktop or a semantic toggle button on mobile and clips an independently centered, fixed-width content layer; invisible geometry drives its height without affecting its width. Content does not scale or reflow with the width spring. The compact title hugs its full intrinsic width until the surface reaches the viewport width minus two `--space-lg` insets (16px per side); only then the single-line title uses ellipsis. The compact sizer, anchor and glass share this cap, while the hover zone extends outside it by 10px per side. The anchor has an explicit width independent of the glass intrinsic size, avoiding premature title truncation; both title weights are anchored to the fixed-width inner content layer and move independently of the glass from the centered compact position to the upper-left expanded position while crossfading; they follow the same oval arc in both directions. In both directions the title uses the glass spring stiffness and damping with 90% of its mass (default `420/36/1.44`), retaining spring overshoot at both endpoints. The expanded title does not use ellipsis. The surface remains 92% white with a 12px backdrop blur, and body text is limited to three lines. In the full case its title is the nearest preceding heading, falling back to the case title before the first heading, and its body is the first nonempty paragraph in that section. Before the first heading, the case title and first paragraph of the article are used; activating this case-title fallback closes the lightbox and smooth-scrolls to the top of the page instead of assigning an anchor to the paragraph. A preview backed by an actual heading, including «Интерактивное содержание», retains element-target navigation with the 25% viewport offset. Captions do not override the full-case preview, and media in the same Gallery share the same title and paragraph. On mobile, the full-case surface toggles expansion on tap or Enter/Space; activating an expanded card collapses it. On desktop, hover/focus expands the card, and activating its surface navigates to the source after closing; the pointer informer reads «Показать в кейсе». Only mobile expanded cards include a separate «Показать в кейсе» button with `--color-accent-blue` background, `--color-white` text, `--radius-pill`, and desktop informer padding `--space-xs` / `--space-lg-compact`. The button fills the text content width with centered text and border-box sizing. Its top gap is `--space-sm`, and invisible expanded geometry includes its height. It stays mounted throughout mobile expansion/collapse, follows the body travel, spring and opacity duration with the canonical sibling stagger of `80ms` added to both opening delays (defaults: rise `200ms`, fade `240ms`), and reverses without delay; while collapsed it is disabled, unfocusable and ignores pointer events. Intrinsic mobile title measurements do not depend on animated glass bounds, and collapsing does not remeasure or force an instant transition. On mobile the CTA and toggle are sibling buttons, with no nested interactive elements; only the CTA navigates on mobile. The transformed content layer is stacked above the full-surface toggle; it ignores pointer events except for the CTA, so its tap reaches the CTA instead of collapsing the card. CTA activation completes closing and releases the scroll lock before moving to the source block or media. In short mode the card is shown only when the active item has a caption and contains that caption as its sole compact, non-interactive, non-expanding heading. About has no context card. The compact hover zone is exactly 20px wider than the compact card in total, extending 10px on each side; the expanded card remains inside this zone and holds hover until pointer exit. There is no re-entry lock. The optional `?lightboxDebug=1` panel appears only with an actionable context card and exposes the shared resize/title/text spring stiffness/damping/mass, text travel distance, text-rise delay, opacity delay/duration, title crossfade duration, radius duration, and Reset; it does not persist values. Defaults are glass/body spring 420/36/1.6 and title spring 420/36/1.44, text travel 80px, rise delay 120ms, fade delay 160ms, fade duration 200ms, title crossfade 60ms, and radius duration 400ms. On touch, the first card tap expands it and the second collapses it; navigation requires the mobile CTA; while the card is expanded, a tap outside the text preview collapses only that preview with its reverse animation, including a tap in the central media area. With the preview collapsed, a tap outside the current media container closes the lightbox. Explicit navigation through media side zones, swipe, arrows or thumbnails preserves expansion; actual controls and the CTA execute their own actions without outside capture. Mobile media navigation preserves the expanded state and replaces the context content without replaying its opening motion; focus changes within mobile interaction do not collapse the card before CTA activation. Pointer hover and keyboard focus on an actionable card hold the controls visible; pointer hover hides the floating close indicator. Card interaction does not close the backdrop or swipe the gallery.

Spacing:
- The lower white gradient declaration is retained as a CSS comment and does not render. The lightbox's 0/8/16px `ProgressiveBlur` layers retain the existing mask positions and extend 60px above the base lower-control region. Their mask alpha follows the controls' 400ms fade (immediate with reduced motion), without animating filter layers or wrapper opacity.
- desktop backdrop padding: `--space-3xl` (32px)
- mobile backdrop padding: `--space-lg` (16px)
- dialog and panel gap: `--space-lg`
- close button offset: `--space-3xl` on desktop, `--space-lg` on mobile

Shape:
- fullscreen media radius: `--radius-2xl` (40px)
- close button radius: `--radius-pill`

Rules:
- fullscreen overlay applies only to media inside `Gallery`
- while mounted, the lightbox locks root/body scrolling and temporarily sets the root scrollbar gutter to `auto`. Compensation adds the nonnegative increase in the measured body width before and after locking to the existing computed body right padding, preserving the page content width even when a stable gutter reserves space without vertical overflow. Closing restores the original inline overflow, gutter and padding values.
- all openable image and video items from `Gallery` blocks inside one `GalleryLightboxScope` form one ordered gallery; full case, short case, and About use separate scopes
- full-resolution request timing and inline source selection follow [Image request policy](#image-request-policy); a shared scope does not authorize eager full-image loading
- fullscreen media horizontal max size: `min(viewport, --page-max-width + 640px)`
- fullscreen media fits viewport with `contain`
- backdrop uses `var(--white-20)` and `blur(20px)`
- on fine pointer devices the system cursor stays visible, while a separate close indicator follows the cursor and the whole overlay becomes click-to-close, including over media
- on touch/coarse pointer devices the fallback is a fixed close button in the top-right corner
- a specific media item inside `Gallery` can disable fullscreen via `openable={false}`
- desktop navigation is non-cyclic and supports full-height 160px side buttons, keyboard ArrowLeft for previous and ArrowRight for next, and clickable thumbnails with a pointer cursor; keyboard navigation does not reveal hidden controls, while wheel, trackpad, swipe and drag navigation are disabled
- side zones are transparent by default and reveal an edge-to-inner transparent `--card-bg-hover` gradient through a short opacity fade on hover/focus; the default arrow remains unchanged until hover/focus, when it crossfades to the compact 36px `ScrollToTopButton` head state rotated toward navigation, with `--color-black` background and `--color-white` arrow; pressing an available arrow scales this hover visual to `1.12` over `120ms` and returns it to `1` with the short-mode spring; at the first and last item the unavailable previous/next zone remains present to intercept rapid clicks, hides its default arrow, and shows the same hover visual with `--color-gray-150` background and lighter `--color-gray-400` arrow without navigating
- media selection, context and final geometry change synchronously, without waiting for the network. Context glass and text transitions are disabled for media navigation, so the next item appears immediately. Context wrappers do not replay initial opacity fade on remount, keeping glass opacity consistent across items. The shell persists throughout the session; open-phase geometry is applied directly in the same React commit, while Motion owns opening/closing geometry. There is no opacity, crossfade, blur, scale, overlap, resize, or re-open transition during navigation; keyboard navigation does not reveal hidden controls
- low-resolution image DOM nodes persist for the lightbox session and are decoded before becoming visible. Full-resolution layers are retained only for the current image and its immediate neighbours, and replace low only after their own DOM image has decoded. On a cold selection the previous image disappears immediately; the chosen image's area stays empty until a source is ready. No loading text, placeholder, skeleton or error message is rendered. The selected index never waits for readiness, and late loads cannot change selection. Videos remain transparent until a frame is available
- `activeIndex` of the displayed media is the only gallery selection source of truth; arrows, keyboard, thumbnail clicks, and mobile thumbnail scroll change it, after which the rail derives `aria-current`, active crop and centering from that index
- on desktop the thumbnail rail is clipped but its thumbnails remain clickable; on mobile it is always visible, horizontally scrollable with native momentum and mandatory center snap, and continuously selects the thumbnail nearest the center during scrolling with `requestAnimationFrame` throttling; a `140ms` settle pass confirms the final snapped item, and tapping a thumbnail selects it explicitly
- rail centering keeps the existing CSS `ease` curve and always takes 200ms regardless of travel distance; interrupted travel starts from the actual `scrollLeft`. Initial centering and active-slot/spacer expansion use the same 200ms. Scroll snap is suspended until centering and slot expansion finish at the exact endpoint. The active thumbnail is fully opaque and reveals the complete height-fitted asset by expanding its outer slot to the media ratio without overlapping adjacent items; inactive square thumbnails are 50% opaque and crop the same constant-size asset horizontally without scaling it; adaptive edge spacers allow the first/last active slots to center; the gap between outer slots remains `--space-sm` (8px); thumbnails use the item `src` source rather than `fullSrc`
- arrows, the thumbnail rail and the context card start hidden on each lightbox opening, wait 120ms after the media opening geometry animation completes, then fade from opacity 0 to 1 over 400ms; pointer/focus activity cannot bypass this opening gate, and switching media within the same session does not restart it; reduced motion retains the delay and skips the fade; after this reveal, desktop controls appear on pointer or focus activity and fade after one second without activity, while the mobile thumbnail rail remains visible. After the opening gate, desktop arrow and thumbnail hit areas remain active when their visuals fade: a stationary pointer keeps the floating close indicator suppressed, clicking an invisible arrow navigates, and clicking an invisible thumbnail selects that media. Suppression is released only when the pointer leaves the corresponding control region or the lightbox closes. The desktop floating close indicator is the top UI layer and hides across the occupied thumbnail span (including gaps, excluding outer rail spacers), both full-height side navigation zones, and the context card
- keyboard-opened sessions restore focus on ordinary close, but handling ArrowLeft or ArrowRight suppresses restoration to the source media because the active item has changed; subsequent Tab navigation may enable accessible restoration again
- the full-screen controls wrapper never captures overlay clicks; visible side arrows, actual thumbnails with their internal gaps, and the case context card are interactive, while the remaining overlay retains its existing close behavior. On desktop, clicks in the free horizontal track area outside the occupied thumbnail region close the lightbox. The rail's real thumbnails and their internal gaps live in one semantic occupied-region flex wrapper; its outer centering spacers remain outside that hover region. Close suppression is derived from a set of active control-region identifiers, without pointer-move geometry reads, so leaving one overlapping region cannot clear another
- if the current source remains in the viewport, close returns to its source bounds; otherwise the media dissolves in place
- mobile uses full-viewport contain media while preserving the computed border radius of its inline source in every lightbox phase; it keeps a static top-right close control, transparent previous/next tap zones covering the left/right `20%` of the actual media container (not the viewport), horizontal swipe navigation across the lightbox, and the always-visible scroll-snap thumbnail rail; a swipe requires at least `48px` predominantly horizontal displacement, navigates non-cyclically, and suppresses the synthetic backdrop click; desktop side arrows are not rendered
- mobile images support centered touch zoom from `1x` to `4x`: two-finger pinch scales continuously around the gesture midpoint, while double tap in the central `60%` toggles `1x`/`2x` around the tap position (the full media area when there is only one item). Zoom changes the media shell position and dimensions around this origin, enlarging the container itself instead of clipping a transformed inner asset. When the text preview is collapsed, taps outside the current shell close the lightbox; when expanded, an ordinary outside tap collapses only the preview. Legitimate controls remain interactive and synthetic clicks after a swipe or pinch are suppressed. Zoom resets on media change and close, disables one-finger gallery swipe above `1x`, and never changes desktop interaction
- bottom rail backing has no active white gradient; its retained CSS declaration is commented out. The lower region uses static 0/8/16px progressive blur layers and 400ms mask-alpha fade described above.
- navigation controls are rendered only when the scope contains more than one openable item

### Work Article Section (`.article`, `.section`)
Structure:
- section title
- body/list/media/quote/cta

Spacing:
- article gap: `--space-3xl`
- section gap: `--space-sm`

Typography:
- section title: `font-weight-heavy` (800)
- quote attribution: `font-size-caption`

### Sticker (inline SVG in text)
Rules:
- an inline SVG asset rendered via `<img>` is called a `стикер`
- height: `20px`
- width: `auto`
- original aspect ratio is preserved
- inline alignment: `vertical-align: middle` with optical compensation `translateY(-0.09em)`

## Motion Patterns By Area

### Shared page reveal
- `components/motion/PageRevealSequence.tsx` + `components/motion/page-reveal-sequence.module.css` are the canonical sequential reveal system used by `SiteShell`.
- Reveal readiness is tracked per `data-page-reveal` target from its own Web Animations API records. A target becomes `ready` after its own visibility animations (opacity/filter) settle, including its stagger. Movement is not part of this readiness gate and may continue. Waiting for all CSS animations is used for lifecycle cleanup, not readiness; this is not derived from a global sequence timeout. Instant and reduced-motion targets become ready immediately.
- `components/motion/MdxMotionComponents.tsx` marks MDX headings, paragraphs, list items, blockquotes, sections, and media wrappers with `data-page-reveal`, so case/about content participates in the same reveal contract.
- `components/motion/MotionPage.tsx` and `components/motion/MotionItem.tsx` mirror the same language in Framer Motion form: `opacity + blur + y`, `staggerChildren: 0.08`, `spring` item settle.
- New page-level reveal patterns must stay visually aligned with this system: no new reveal direction, no aggressive overshoot, no larger blur than `18px`.

### Home showcase motion
- Globus is currently commented out on the home page. Its retained rendering exception applies when restored: the home title uses `--home-text-secondary` (gray500), including hover. The item remains available to hover, preview and stickers, but renders with the default arrow cursor (`cursor: default`) and without link semantics or click navigation; the `/work/globus` link is preserved in a code comment for restoration. The detailed route remains available directly.
- Planned authored cases use the same non-navigable span branch and secondary title color as Globus, including hover, with the default arrow cursor. They have no href, link role, keyboard link target, detail page or own preview; preview analytics excludes them. Their label, subtitle and statusLabel come from optional `plannedItems` in `content/site/home.mdx` ([content contract](docs/specs/site-and-pages-mdx-structure.md)). The three entries and their `plannedItems` configuration are currently commented out; the following behavior applies when restored in the 2026 bracket, with `mini-games` additionally requiring `ENABLE_GAMES=true`: `media-and-gallery` (Медиа и галерея) and `content-automation` (Автоматизация контента) show «Подготовка кейса» instead of metrics; `mini-games` (Мини игры) shows «В разработке». Hover keeps the existing glass and sticker motion. Each uses only the first frame from `itemStickers.globus` at build time, without frame cycling or duplicating asset paths. They share the Globus work preview decoratively with one stable `planned-globus-preview` key, source and video DOM across direct switches between these three cases; playback does not restart. If the Globus entry is absent, this preview is omitted. This local exception uses a persistent inline SVG filter outside the keyed preview: grayscale luminance followed by gamma exponent 2 in sRGB preserves white and gives a lighter blue rendering with greater separation of intermediate tones, without contrast clipping. The full `--color-accent-blue` token overlays it with `screen` blending, mapping dark tones to saturated accent blue and white to white; no black color mix is applied. The actual media and overlay are clipped together by `inset(0 round var(--home-radius-preview-media))`: zero inset at the media edges, without resizing the video. The outer backing remains `--color-white`, preserving white before and after reveal. The SVG definitions have zero layout size and an expanded filter region; they introduce no additional clipping. Planned preview aside/frame enter and exit omit blur while preserving existing opacity/scale (opacity-only under reduced motion); asset loading/handoff sets `--media-loading-blur: 0px`. The modifier remains inside the keyed subtree, and a separate planned pane key preserves its blur-free exit even when switching to a work preview. Globus and other previews keep their original colors and motion.
- At `max-width: 767px`, horizontal touch swipes in the full-width area below the tablist switch to the adjacent tab: left advances, right returns, without wrapping. The area includes the existing tab-to-list gap, list rows and blank space down to the viewport bottom; its minimum height is measured from its actual top. The list retains its layout position. Direction locks after `12px`: horizontal requires X displacement greater than `1.25` times Y; a vertical-dominant gesture stays vertical. Horizontal travel of at least `48px` selects through the same tab activation path, preserving animation and sessionStorage. `touch-action: pan-y pinch-zoom` retains native vertical scrolling and pinch zoom. Ordinary link taps and keyboard activation remain native; controls, editable content and nested scrollable widgets are excluded. Recognized horizontal swipes suppress their synthetic click for up to `500ms`, including attempts beyond the first/last tab; a fresh touch clears suppression. No gesture listener or overlay covers the top card or tabs.
- Tabs sit directly below the persistent top card and remain on one line. The label-to-label gap is `--home-tabs-gap` on desktop and mobile; button padding is compensated with sibling overlap, without wrapping or horizontal scrolling. The top-card-bottom-to-label-top gap is `--home-top-card-to-tabs-gap`, compensating the shell's page gap and the tab's vertical padding. Buttons use half of `--space-md` vertical and half of `--space-xl` horizontal padding on desktop and mobile; the tablist's left inset subtracts that button padding so the first label aligns with section-heading text on both desktop and mobile. The active tab uses a light gray `--line-muted` underline, matching the global text-link underline color. Its thickness and label offset follow the existing link underline: `2px` and `--space-2xs`; the offset is measured below the label line box without changing button geometry. Its width and horizontal position are measured from the label relative to the tablist, excluding button padding. The label-bottom-to-first-heading distance uses `--home-tabs-to-list-gap` from the Layout section, compensating the tab's vertical padding. When the first section has no heading, its negative margin compensates the first item's layout padding, measuring the same gap to the case title text rather than its container. Labels use the existing home text size; inactive labels use the secondary color, while hover, focus-visible, and active labels use `--color-gray-700`. One persistent underline travels between the labels by tweening position and width over `400ms` with `cubic-bezier(0.4, 0, 0.2, 1)`. A separate, very weak length spring animates only `scaleX` from `0.99` to `1`, with stiffness `400`, damping `30`, mass `1`, rest delta `0.0001` and rest speed `0.001` so the small amplitude can settle smoothly; it does not change the position/width tween or add vertical deformation. Repeated activation can replay this spring. Rapid clicks retarget position, width and an unfinished scale spring from their current values without resetting an ongoing deformation; a settled scale can restart from `0.99`. Initial placement, resizing and reduced motion stop the animations and reset scale to `1`; reduced motion places the underline instantly. Unmount stops all underline animations.
- Home tab order comes from `content/site/home.mdx`. The active title is stored in sessionStorage and restored on return, reload, and in-site navigation without changing the URL; unavailable storage falls back to the first tab. Restoration remounts the pane-presence boundary before paint, so the server-rendered default pane cannot linger alongside the saved pane and no tab-switch transition replays. Switching right moves each outgoing heading and case item 80px left and brings each incoming target 80px from the right; switching left mirrors the motion. A non-adjacent switch targets the selected pane directly. The first incoming target begins its reveal `200ms` after the outgoing wave starts; the two waves can overlap. The incoming pane enters normal document flow immediately, while `AnimatePresence` keeps the outgoing pane out of flow until its exit completes. The pane viewport has no overflow clipping. The active pane has identity transform and no filter. Each keyed pane has its own DOM reference for the hover glass. Reduced motion switches panes instantly without blur or translation.
- Every valid tab activation, including clicking the current tab and rapid returns, immediately clears close timers, pointer/focus intent and active case state before any early return. A pane DOM suppression flag immediately hides glass, year and stickers and restores text to its default unshifted state without transition, including retained outgoing panes; the preview portal and its AnimatePresence boundary unmount together without an exit fade. Only a subsequent valid case hover/focus opening in the active non-inert pane clears its suppression and permits preview mounting; tab re-entry alone does not restore hover. Keyed item and list refs remain available while an exiting pane is mounted, so a rapid return can reuse them. The exiting pane ignores pointer and focus interactions and cannot close the active pane's glass. Only its exiting DOM state applies `pointer-events: none`; Framer Motion never writes that property inline. On rapid re-entry, the active pane also clears any stale `inert`, `aria-hidden`, and inline pointer-events state. Existing per-case hover, focus, year, glass, and preview behavior remains unchanged inside the active pane.
- Home uses the shared reveal language for heading/list entry, then adds a dedicated interactive layer for the active case bubble and preview pane. The tablist keeps its page-level reveal; each selected pane owns a nested, keyed reveal sequence for section headings and case items. Initial entry and sessionStorage restoration wait for scroll restoration and use no horizontal offset. On a tab switch, the incoming reveal is prepared after two animation frames, and its remaining CSS delay is calculated from the outgoing wave's start timestamp so its first target starts at the `200ms` offset; rapid re-entry restarts that pane's wave. Each incoming target combines signed horizontal `80px` travel with no vertical travel and `20ms` per-target stagger. The complete switch lasts `1129ms` from outgoing start to the final incoming target: after the `200ms` incoming offset, movement, opacity and blur share `929ms - (N - 1) * 20ms`, where N counts only targets actually animated after scroll restoration. Late preparation subtracts elapsed time from the remaining wave; exceptionally long waves cap the stagger to fit the budget. The outgoing targets use the opposite horizontal direction and 200ms without stagger, starting from their current computed transform during rapid switches. Neither pane uses a whole-panel horizontal transition. Reveal readiness continues to gate the case glass and preview per item. Initial entry uses the shared 80ms per-row wave; nested reveal roots do not hide each other's initialized targets. In scripting-enabled browsers, uninitialized leaf targets inside pending roots are hidden by server-rendered CSS before hydration, including the complete tablist and its underline; no-JS and reduced-motion content remains visible.
- A case item cannot open its glass or preview until that specific reveal target is ready. Hover and focus intent are retained while its reveal runs, so a stationary pointer or focused link opens automatically as soon as that target's own visibility animations settle; navigation itself remains available. This gate is per item, not tied to the end of the complete page sequence.
- The active glass bubble position uses a velocity-preserving physics spring with `mass: 0.9`. Normalized travel distance still maps through `smoothstep` to `stiffness: 320..460`, and the post-target tail time-warp remains `1x..2x`. A separate normalized exponential reference damping curve uses actual item steps, a `4.5`-step scale, and ratios from approximately `0.80` near to `0.62` far; these are reference values, not the final damping applied to the spring. Its theoretical start-from-rest peak is preserved through `12px`, then mapped by an exponential target-amplitude curve toward an `18px` asymptote. The effective damping ratio is derived from that target peak (approximately `0.7566` at maximum travel), so the spring physically reaches the intended overshoot and reverses naturally with no post-crossing position or velocity compression. The approach is normalized to `1.20x` the reference spring crossing time using damping-aware compensation; the internal flight scale therefore falls below `1` where effective damping is substantially higher, while the distance-aware tail scale takes over unchanged after the first crossing. Initial inherited velocity is pre-compensated by the active flight scale in a copied spring options object for interruption handoff. Distance is measured between the current untransformed glass layout center and the next target center.
- Bubble `width/height` morph with a separate physics spring: `stiffness: 220`, `damping: 22`, `mass: 1.0`. Do not add SVG, Canvas, WebGL, motion-blur, or duplicated-layer stretch to this effect.
- Pointer response targets x: ±16px and y: ±10px through stiffness 300, damping 24, mass 0.75, with soft-shift power 1.4. Existing glass tilt and highlight-origin springs remain unchanged. Work entries follow descending year order within each tab, retaining the current author order within the same year. The home.mdx body sets the order without automatic sorting. Work entries share one non-interactive year bracket per year group in their own pane, with no rotation. The bracket and year move together through independent raw-pointer targets and stiffness 300, damping 24, mass 0.75 springs. Their coordinates use the full listWrap width and the measured year-group top/height, rather than the active item. Targets are x: ±1⅓px and y: ±⅚px with soft-shift power 1.4 (0.5 / 1.5 / 4 of the main pointer shift limits, six times weaker than stickers). Moving within the group preserves the targets; leaving listWrap resets them. Only the active pane tracks pointer movement. The common bracket/year motion layer uses translate3d with fractional x/y values and will-change: transform; this requests compositing without changing motion targets or child geometry.
- Active text follows `25%` of the pointer shift with `motion-emphasis` (`420ms`) and the expressive easing. On a cross-item switch, outgoing text returns from its computed transform through an explicit WAAPI animation using `motion-layout` (`600ms`) and the standard easing, avoiding shortened CSS reverse-transitions. Re-entering that item hands its current WAAPI transform back to the active CSS transition across two animation frames so motion remains continuous without a jump. The glass container uses `perspective: 1400px`.
- The year bracket opens right with a 2px color-gray-40 (#f4f4f5) border and radius-md rounded ends. It uses right: 100%, margin-right: home-item-gap and width: home-item-padding-x. Pane-local content layout offsets and ResizeObserver measure from the first title to the last metadata bottom of the year group, excluding layout padding and animated transforms. The centered year has no underline; its bg-page background and space-2xs block padding interrupt the line. Typography uses home-font-size-md, home-line-height-tight, font-weight-regular and home-text-secondary. Games have no bracket; mobile hides it with the glass.
- Year appearance reuses the reveal-ready hover/focus state with no additional delay and 1120ms opacity/deblur, reusing the existing page-reveal movement duration and expressive easing; exit starts immediately over 280ms. Moving between cases of the same year keeps the bracket in place without replaying entry. Each mounted pane measures only its own content. Reduced motion removes blur and sets bracket/year pointer shift to zero. Work metadata shows HOME_METRIC_LABELS as inline text groups without separators with a decorative /media/system/metric-up.svg before each metric (12×12px CSS mask, --color-gray-400, --home-micro-gap); no chips or year. Metric names in full/short text and home labels use established abbreviations with meanings in the canonical contract; first-use definitions are allowed in full prose. Actions without established abbreviations stay scenario prose, never invented metric labels. RR in full/short/home always includes D7 or D30, meaning return on that exact day; windows and rationale are canonical in the case contract. Home labels include decorative growth icons without numerical growth claims or percentages; count follows usefulness, never a mandatory set of three. Globus restores its author-provided CR · RR D30 · NPS labels without new case content or measurements. Portfolio retains ER · FA · CD and all four short-section names; authorized editing condenses short copy to a 15-second reading target and explains existing metric groups in the current full analytics section. Other narrative, media and motion remain. Canonical Portfolio definitions: `docs/specs/portfolio-analytics-metrics-spec.md#80-отображаемые-обозначения-portfolio`. Zvuk labels are RR D7 · NU; existing media order remains. Canonical current sets, definitions and evidence are in `docs/specs/portfolio-case-json-structure.md#shortsummary-rules`; no independent metric definitions are maintained here.
- The itemStickers frontmatter configuration and loader contract remain supported alongside the year bracket. Mapped stickers occupy the original item-local top-right 27px layer, anchored at right: -half home-arrow-size and top: -half home-item-gap, rotated -15deg with 50% raw-pointer parallax through a 300/24/0.75 spring. They retain reveal-ready hover/focus gating, 280ms entry delay, 700ms expressive opacity/deblur appearance, 4px blur and immediate 280ms exit. Multiple eagerly loaded SVG frames cycle discretely every 200ms after the entry delay; activation resets frame zero, deactivation stops the timer, reduced motion shows frame zero without blur/parallax, and mobile hides the layer. Globus uses only the static Clock Neutral sticker; portfoliocase cycles through Codex, Puffy Sparkle Darker Violet, GitHub, Segmented Circle (Metrica), and Puffy Star Darker Yellow in that order. Puffy Star retains scale 1.1.
- The right preview pane is a fine-pointer desktop enhancement. Its standard blur/opacity/scale transitions use `motion-layout`; the planned authored preview exception above omits blur. Under reduced motion it becomes opacity-only with no blur or scale.
- Home work previews may show a derived caption from the short summary's exact `Мой вклад` section, excluding the label. The build loader takes the remaining nonempty body from that paragraph; no new frontmatter field or fallback to differently named sections is allowed. Missing/empty sections and planned donor previews omit the caption. Caption width follows the preview; `padding-inline: var(--home-radius-preview-media)` keeps both side insets equal to the media radius. Top gap is `--space-sm`; typography uses `--font-size-caption`, `--line-height-caption` and `--home-text-secondary`. The caption is outside the media transform and does not change media centering or the hover hit area. Each keyed preview owns its caption readiness: show after media opacity reaches `0.98`, with animation-complete fallback; stale/exiting previews cannot reveal a new caption. Entry uses opacity plus `y: 4px → 0` with spring `100 / 20 / 1`; exit uses opacity plus `y: 2px` over `motion-micro`. Reduced motion uses opacity only over `motion-micro`. Existing Home tab suppression removes the caption together with its preview.
- Hover motion in home must stay informational and tactile, not playful: small tilt, shallow shift, no large scale jumps, no bounce-heavy springs.

### Persistent shell and top-card motion
- `app/layout.tsx` loads the complete top-card content map and published `workSlugs` on the server, passes both to `PersistentSiteFrame`, and renders it inside `NavigationLifecycleProvider`.
- `components/shell/PersistentSiteFrame.tsx` is the persistent client owner of `main`, `inner`, `pageStack`, `AnimatedTopCard`, route `children`, `contentEnd`, and `BottomPaddingController`. `AnimatedTopCard` therefore remains mounted across client route changes.
- Top-card route mapping is fixed: `/` uses `to-profile`; `/about` and `/work/[published slug]` use `to-home`; invalid or unknown `/work/*`, all other unknown routes, and `/404` use `default`.
- `SiteShell` owns only the route header/body wrapped by `PageRevealSequence`. It must not load or select top-card content, render `AnimatedTopCard`, or recreate the outer shell.
- Initial document reveal remains `opacity + blur(18px) + scale` with `motion-ambient-enter` for the card surface, mutable content, and navigation arrow.
- Client route swaps keep the card backing and right navigation arrow static. Route-content snapshots form a continuous vertical wheel/tape inside one clipped viewport. Every snapshot is a unique instance on one shared track offset; each committed route and each ordinary fast top-card click immediately appends another slot below the current tape.
- A new click during motion does not wait for completion and does not reverse or visually restart the upward movement. The track tween retargets immediately from its current rendered offset, extending the shared target by another `-100%`; all existing snapshots continue upward from that offset. Each retarget gets a new `runId`: stale completions are ignored, and snapshot cleanup runs only after the current `runId` completes.
- Every track retarget uses `motion-emphasis` (`420ms`) with the standard easing (`cubic-bezier(0.4, 0, 0.2, 1)`). Because the duration resets to the same `420ms` while burst clicks extend the remaining target distance, multi-click sequences visibly accelerate the wheel.
- Snapshot scale is symmetric by track position: `1 / 1.5` (`≈0.667`) at incoming `+100%`, `1` at center `0%`, and `1 / 1.5` at outgoing `-100%`. Scale transform origin is the center of the complete card viewport (`50% 50%`), not the intrinsic bounds of its visible content. Opacity is the corresponding faster inverse fade over `64%` of travel: incoming fades `0 → 1` from `+100% → +36%`; outgoing fades `1 → 0` from `0% → -64%`. Route-swap blur remains `0`.
- Visual snapshots are non-interactive. One stable semantic link overlay owns interaction, always uses the latest requested target, and updates that target optimistically on click before route commit or network completion.
- Reduced motion renders the route content and semantic link in their static final state; the wheel/tape, fades, scaling, and press deformation do not animate.
- Surface deformation is independent of press duration. A completed primary activation (`click`, after mouse/pointer up) starts one fixed `560ms` jelly sequence from the current shape: `scaleX → [0.96, 1.02, 0.995, 1]` and `scaleY → [1.11, 0.985, 1.01, 1]`, with times `[0, 0.18, 0.46, 0.76, 1]`. Repeated clicks restart the bounded sequence from its current value without accumulating momentum.
- The clipped content viewport shares the backing's visual `scaleX/scaleY`, so its mask follows the deformed surface and cannot leave a static clipping strip. A full-size inner counter-scale preserves the content's size, shape, wheel coordinates, and card-centered scale origin. Layout `width/height` remain static and never participate in the deformation.
- During surface deformation, the arrow anchor follows the backing's right edge in the same transform space. An inverse `scaleX/scaleY` on the arrow anchor preserves the arrow's original size and shape; only its position changes.
- `top-card.module.css` may animate hover-only feedback: background-color shift, icon wave, and shimmer sweep.
- Those hover loops are only allowed while the card is actively hovered. No idle autoplay version should be introduced.

### Media and lightbox motion
- `MediaPlaceholder` handoff uses opacity + blur18px over220ms expressive; load-state blur18px/scale1.02/opacity0 uses280ms ease, loaded state blur0/scale1/opacity1 uses320ms ease. Loading and handoff blur resolve through `--media-loading-blur` with an `18px` fallback; only the planned authored home preview sets it to `0px` per [Home showcase motion](#home-showcase-motion). These CSS transitions and handoff keyframe remain active with reduced motion.
- `GalleryLightbox` owns all fullscreen media motion. Open and close are geometry-aware transitions between source media bounds and modal bounds, paired with backdrop fade/blur.
- The floating close indicator on fine-pointer devices follows the pointer through springs; touch/coarse devices use a fixed close button instead.
- Gallery-trigger hover feedback may scale slightly, but fullscreen motion rules belong only to media opened from `Gallery`.

### Utility motion
- `ScrollToTopButton` may reveal itself with opacity + upward settle and may stretch its inner visual on hover/focus.
- Global text links use a simple underline-color feedback and should remain understated relative to component-level motion.

### Work short-summary motion
- `WorkShortSummaryToggle` switches full MDX and optional `shortSummary`; without `shortSummary` there is no control. Content switching uses `PageRevealSequence`; passport labels use `--font-weight-heavy`.
- Desktop is one segmented button (84×40px) with two icon segments (36×36px), 8px gap and 2px inset, inside the title container. Shell has 14px radius, border and #f5f5f5 backing; blue #339cff thumb has 12px radius. Icons are 20px, selected icons are inverted by an active mask. Text labels are not visible on desktop; click toggles mode.
- Mobile (`max-width: 768px`, inclusive) is a portal floating segmented group, 44px high, inset 16px from left/right/bottom. Its glass pill shell has white-50 backing, border and local inset/outer shadows. Labels accompany icons; normal thumb is 42px high and `(width - 12px) / 2` wide. The lower blend is a separate white gradient. Shell uses mobile only through 767px; at exactly 768px these controls retain their mobile branch. `ScrollToTopButton` uses the same inclusive 768px cutoff.
- Mobile selection is pointer-up driven through pointer handlers; current buttons do not implement click/Enter/Space mode activation. This describes current behavior and does not prohibit future keyboard support.
- Mobile press uses 120ms expressive easing; hold-to-drag begins after 360ms and turns the thumb into a 120px bubble. The selected mobile tab reserves the gesture from touch start with `touch-action: none`, preventing vertical page scroll from cancelling the hold or bubble drag; bubble movement uses only the pointer's horizontal position. Vertical scrolling remains available outside the selected tab. Drag uses pointer capture and position/shape deformation; position settles with spring 260/24/0.85, shape with 200ms expressive easing. Desktop and mobile retain local jelly shell/thumb feedback and active masks.
- Mobile initial reveal has 1s delay, opacity 180ms easeOut and y/scale spring 360/28/0.7. Reduced motion bypasses its initial hidden pose, while ongoing mobile JS springs, shape and press feedback remain active. CSS disables CSS animation/transition only. Desktop reduced-motion paths use final states instead of deformation.
- Hover feedback uses fine-pointer guards. Local hover backing #f0f3f6 is approved for ShortSummary, TopCard and shell controls.
- Mobile switching scrolls to the top of the case after toggling mode.

## Что было токенизировано
Хардкод-значения цветов/отступов/радиусов/типографики заменены на `var(--...)` в:
- `/Users/groowlin/groowlin.github.io/app/globals.css`
- `/Users/groowlin/groowlin.github.io/components/home/home-showcase.module.css`
- `/Users/groowlin/groowlin.github.io/components/media/media-placeholder.module.css`
- `/Users/groowlin/groowlin.github.io/components/shell/site-shell.module.css`
- `/Users/groowlin/groowlin.github.io/components/sections/work-article.module.css`
- `/Users/groowlin/groowlin.github.io/app/page-content.module.css`

### CEO simulator: local gameplay contract

The `characters` card reuses GameFrame dimensions, gray200 surface, Russian copy and the existing six neutral44px human SVG figures. No AI exists initially; exactly two appear once on task4 and this is the lifetime maximum. A human entering any department acquires its role immediately; leaving departments clears the assignment.

Four wider flat parallelograms with larger gaps and closer-to-square proportions span the card in one horizontal row: Аналитика, Дизайн, Разработка, Тестирование. Front/back edges are horizontal, depth points up/right, with configurable skew0.4 and depth scale0.55. Local floor geometry may extend slightly at the lower-left card edge. Characters remain screen-upright. All accessible floor outside departments is the labor market; the original lower FREE_AREA remains the separate free random-walking region. Walking outside an entity's walking region gradually returns to it. Humans and AI can transfer directly between departments.

Walking and landing respect physical card bounds and the departments' common back edge: no floor exists farther up the screen. Held and flying characters can rise above this edge through height, but a grabbed head remains inside the card's rounded top boundary; a released throw may cross it. PointerDown preserves the head-to-pointer offset; movement follows from the first pixel, including heights0–40px. Carry height is continuous, not fixed at40px. Diagonal lift transfers0.70–0.95 to floor depth until the back edge, after which further lift increases height only. Recent constrained pointer samples transfer0.3 horizontal and0.45 vertical velocity to a manual throw; AI launch impulse remains independent. Ballistic height, gravity and actual ground position determine flight time and landing. Pointer capture belongs to the stable field instead of depth-sorted character nodes and clears on cancellation/focus loss. A pointer-transparent held-character SVG overlay sits above header and metrics without lifting the field layer. Existing rigid segment lengths, springs and recovery remain. There is no hover pose, zone highlight or native title tooltip.

The compact60–80px top HUD contains one continuous Speed, Quality and Budget bar plus an embedded crisis countdown. Bars have seamless low/normal/high zones, animated fill width/color, target glow and one-shot success feedback without permanent arrows/checks or white underlays. There is no task number, criteria list, large card, focus veil or card choreography. Department labels expose required human progress only while relevant. Zone-specific AI requirements appear only on their current target departments; a count-only task uses one compact global AI count plus markers only where AI is placed. Each AI has an inactive gray placeholder icon slot without a human coworker, and a faded/scaled highlighted slot with soft glow when a human coworker is active; final icons will replace the slots without changing layout/motion. A compact tail-less transparent sketch bubble below carries one narrative, idle-hint or result phrase through sequenced220ms fades. Existing space-2xs/space-sm/space-lg/space-xl tokens govern spacing. Local world geometry and effects live in game config and do not create global tokens.

AI has independent6s cycles with first delay1.9–3.9s; reserved human targets cannot overlap. Existing body/leg parts animate a220ms windup,100ms strike and180ms recovery; push starts on strike and lands toward the market walking region. Flight time scales with travel distance and its vertical impulse uses the same gravity as player throws. Trail and landing effect parameters follow the canonical Games specification. Meaningful impacts shake the whole GameFrame; reduced motion disables this shake. Bottom narrative and idle hints share the sketch bubble system.

Only active recovered assignments contribute. Human costs13; only effective AI costs2. Human contribution is10/10 Analytics,8/25 Design,28/5 Development and7/25 QA. One effective AI per department gives speed+20 with one human or+40 with2+, and quality0. Missing-department penalties follow the canonical Games specification. Six tasks require continuous1s hold. Three5s crises require0.7s hold and always reach the report; one logical advance cannot skip multiple rounds. FINISHED stops simulation. Restart clears all roles, assignments, AI clocks, hints/effects and statistics. Visual assessment remains with the user. See [Games specification](docs/specs/games.md).

### Pixel Perfect: local dark contract

Surface #111111, copy white, active square vertical gradient #D3D9FF to #7E91F6, target #363636. Radius40 reuses TopCard; square radius16. Intro/final: icon109x100, gap space-xl, title42/44 heavy, description20/22 separated by12px. Three214px background source squares have gap16 and the left square extends beyond the clipped frame. Five static overlapping masked backdrop-filter layers0/5/10/20/40 progressively increase blur left-to-right; the filter elements never animate opacity or filter and remain mounted while only their source squares crossfade; a separate #111111 tint reaches full opacity at the right. Backdrop squares and blur share a permanently clipped background container. Foreground copy and draggable stay above blur; hearts render above the active square. Target state changes parallel crossfade280ms with screen-space blur16px without geometry interpolation. Ordinary attempt returns the active square with the original550ms spring, bounce0.16; other state crossfades use screen-space16px blur. Measurement retains camera zoom; terminal squares disappear through opacity and screen-space blur16px over280ms with the measurement camera held at zoom, while final copy/background appear simultaneously, without zoom-out. Final button covers the card; Далее and its icon fade in over600ms, then pulse40–60% over1200ms per direction. Its activation is sequence-locked: reset-exit starts the card shake, then after one animation frame mounts CharacterPlayground above the final. The incoming opaque gray surface fades opacity0→1 over300ms while the final stays mounted underneath; there is no transparent frame or new opacity ancestor around the backdrop filters. At completion, Pixel Perfect unmounts and currentGameId changes without clearing its result. The card itself does not fade and performs two consecutive150ms shakes during the same300ms interval. Progressive blur layers stay static. Reduced motion makes ordinary stage crossfades instant (duration0), removes zoom/shake/animated blur, and preserves the300ms transition to the next game with static progressive blur. Victory uses seven independently moving, different-length beams with rounded tops anchored at bottom center and no card bounce animation. Each beam independently pulses between4% and16% opacity over1200ms per direction, with phases evenly distributed across the full2400ms cycle; the group waits300ms, fades in over600ms and extends beyond the clipped card boundary. Beam lengths are182/176/194/166/188/180/174% of card height. Missing results show ???; external victory test remains. Visual assessment belongs to the user. Checks/tests are conditional on build impact under AGENTS §§9–10; UI-only changes do not run them.

