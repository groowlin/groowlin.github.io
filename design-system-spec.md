# Portfolio Design System

## Source of truth
- Основные токены: `/Users/groowlin/groowlin.github.io/app/globals.css` (`:root`).
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
- Home preview offset from list: `--layout-preview-offset-x = 60px`
- Home left column width: `--home-left-column-width = 360px`
- Home layout paddings: `--home-layout-pad-left = 120px`, `--home-layout-pad-top = 120px`
- Home section rhythm: between sections `--home-section-gap = 80px`, section title to first case `--home-section-title-gap = 60px`, between adjacent cases `40px` via vertical item padding, case title to subtitle `--home-item-gap = 8px`. Hover glass keeps its previous `74px` height via `--home-item-hover-padding-y = 14px`. Mobile overrides at `max-width: 767px`: `--home-section-gap = 40px`, `--home-section-title-gap = 24px`, `--home-item-padding-y = 8px`, `--home-item-hover-padding-y = 12px`, `--home-meta-gap = 6px`, `--home-micro-gap = 4px`, `--home-contact-gap = 8px`, `--home-top-card-padding = 16px`, `--home-top-card-subtitle-gap = 6px`, `--home-top-card-icon-gap = 8px`.
- Breakpoints: 680px (masonry/icon grid), 768px (shell layout), 1180px (fixed preview pane)

## Typography Tokens

### Font family
- `--font-family-sans`: `var(--font-inter), ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`
- `--font-family-home`: `var(--font-inter), ui-sans-serif, system-ui, sans-serif`
- `--font-inter`: CSS variable from `next/font/local` in `app/layout.tsx`, source file `app/fonts/inter/Inter-Variable.ttf`

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
- `--home-font-size-md = 14px`
- `--home-font-size-lg = 16px`

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
- Section headings (`h1`, `h3`, `.sectionTitle`, name/title blocks): `font-weight-medium`
- Secondary/meta text (`.itemMeta`, captions, icon titles): `font-size-caption`
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
- `--color-gray-25 = #fafafa`

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
- `--radius-home-preview = 20px`
- `--radius-home-top-card = 40px`
- `--radius-home-avatar = 44px`
- `--radius-pill = 999px`

## Size Tokens
- `--size-dot-md = 0.45rem`
- `--size-dot-sm = 0.4rem`
- `--home-avatar-size = 64px`
- `--home-icon-size = 16px`
- `--home-arrow-size = 27px`

## Motion System

### Motion principles
- Motion supports orientation, hierarchy, and state change; it must not exist as decoration detached from interaction or layout.
- Default motion language is soft, blurred, and slightly eased into place: `opacity + blur + translateY` for reveal, `opacity + blur + scale` for surface swaps, and restrained pointer-reactive transforms only where already designed. Persistent top-card route swaps are the explicit exception: their content uses `opacity + translateY + scale` without blur.
- Ambient infinite animation is not allowed by default. Continuous loops are reserved for the home top-card hover state and the active mapped home sticker frame cycle; both are interaction-bound and stop when inactive.
- Scroll-linked animation patterns (`useScroll`, parallax, while-in-view transforms, progress-based transforms) are not part of the current design system.
- New motion values should reuse the existing motion tiers below. If a new duration/easing family is needed, it must be added here first.

### Motion implementation rules
- Use `Framer Motion` for stateful enter/exit, geometry transitions, pointer-follow behavior, and portal-based overlays.
- Use CSS transitions/keyframes for simple hover, asset loading, and deterministic page-reveal sequencing.
- Prefer property-specific transitions. Avoid `transition: all` for new UI work.
- Reduced motion support is mandatory for page reveal, top-card swaps, lightbox open/close, and any keyframe-driven effect with semantic meaning.

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
- `motion-page-reveal = 700ms`
- `motion-spring-soft = 800ms`; used by shared Framer Motion item reveal.
- `motion-ambient-enter = 1240ms`; reserved for the initial top-card document reveal.
- `motion-loop-icon = 1400ms`; reserved for top-card icon wave on hover.
- `motion-loop-shimmer = 4200ms`; reserved for top-card shimmer on hover.

#### Reveal primitives
- Page and MDX reveal uses `opacity + blur(8px) + translateY(12px..16px)`.
- Sequenced reveal stagger is `80ms` between siblings.
- Initial top-card surface/content reveal uses `scale(0.985 → 1)`; the route wheel uses the component-specific symmetric `0.667 ↔ 1` scale lifecycle defined below.
- Media loading/handoff may use blur up to `18px`; this is the upper bound in the current system.

### Reduced motion policy
- `PageRevealSequence` must resolve to fully visible static content when `prefers-reduced-motion: reduce` is active.
- `AnimatedTopCard` must render the static `TopCard` without route-swap motion when reduced motion is requested.
- `GalleryLightbox` must collapse motion transitions to `duration: 0` for open/close/backdrop/close-button choreography when reduced motion is requested.
- CSS hover/loop/keyframe effects must expose a `prefers-reduced-motion` fallback that disables transition/animation when the effect is not essential.
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

Если пользователь не запретил технические проверки, диагностика начинается с реально сгенерированного CSS, computed `backdrop-filter`, `CSS.supports`, значений переменных, геометрии и масок; затем проверяются разделяющие границы у предков. Не менять вслепую `z-index` или радиусы. Визуальную оценку выполняет пользователь; автоматические визуальные проверки не создавать.

## Home Top Card Tokens
- `--home-top-card-width = 360px`
- `--home-top-card-padding = 20px`; mobile override at `max-width: 767px` = `16px`
- `--home-top-card-radius = 40px`
- `--home-top-card-content-gap = 20px`
- `--home-top-card-subtitle-gap = 6px`
- `--home-top-card-icon-gap = 8px`
- `--home-name-size = 18px`
- `--home-subtitle-size = 16px`
- `--home-line-height-tight = 19px`
- `--home-avatar-radius = 44px`

## Components

### Games Experience (`GamesExperience`)
- Home-only, desktop-only (`min-width: 768px`) inline game mode after `SiteShell`; mascot is absolute at the physical page bottom, centered, 125×72 CSS px.
- `GameModeShell` → `GameFrame` / (`PixelPerfect` → `CharacterPlayground`), with a `MascotMessage` slot. The final Далее button advances to the second game. No additional route, overlay, backend, overall games title or sequence progress.
- One versioned sessionStorage record restores open state and unlimited attempts through an early safe bootstrap before scroll restoration; CSS reserves restored-open geometry before hydration.
- In closed state, the page tail after `SiteShell` is exactly 80svh, so maximum scroll leaves the lower 20% of the case list visible; the 125×72 mascot is fully visible with its bottom at the physical document/viewport bottom. This is scoped to the desktop home main and does not change global spacing tokens.
- Uses one wide card with width `min(672px, viewport minus existing page gutters)` and height50svh. Pixel Perfect uses the local dark contract below. Intro/final show two background squares with progressive backdrop blur; play shows five hearts at top40px. Exact16 or five attempts including violations complete the series; best gap is nearest16. Final has no active square; its full-card Далее button opens CharacterPlayground and preserves the Pixel Perfect result. Outer lifecycle, measurement geometry and mascot behavior remain unchanged.
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
### Home Top Card (`.topCard`)
Structure:
- avatar (`.avatar`)
- profile text block (`.topName`, `.aboutLink`)
- contact icons (`.contactLink`)
- arrow trigger (`.topArrowLink`)

Spacing:
- card padding: `--home-top-card-padding` (20px); mobile override at `max-width: 767px` = `16px`
- internal gap: `--home-top-card-gap` (20px)
- text micro gap: `--home-micro-gap` (4px)
- contact gap: `--home-contact-gap` (8px)

Shape:
- card radius: `--home-top-card-radius` (40px)
- avatar radius: `--home-avatar-radius` (44px)

Rules:
- top-card uses `--home-top-card-bg`
- typography uses общий системный стек `--font-family-sans` и home font-size tokens
- on mobile, top-card occupies the surface grid (`16px` from viewport edge)

### Home Case Card (`.item`)
Structure:
- label (`.itemLabel`)
- meta (`.itemMeta`)

Spacing:
- row spacing: `40px` via `--home-item-layout-pad-y = 20px` on each side; mobile keeps its previous vertical spacing via `--home-item-padding-y = 8px`
- hover glass padding: `--home-item-hover-padding-y = 14px` on desktop and `12px` on mobile
- internal gap: `--home-item-gap` (8px)
- meta inline gap: `--home-meta-gap` (6px)

Shape:
- radius: `--radius-lg`

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
- title: `--home-name-size / --home-line-height-tight / --font-weight-bold`
- subtitle: `--home-subtitle-size / --home-line-height-tight / --font-weight-regular`

### Media Placeholder (`.wrapper`, `.mediaLabel`)
Structure:
- frame
- media surface
- optional pill label
- optional caption

Spacing:
- caption: `--space-sm` `--space-3xs` `--space-0`
- pill padding: `--space-xs` `--space-lg-compact`
- pill gap: `--space-sm`

Shape:
- default radius: `--radius-md`
- work radius fallback: `--radius-xs`
- pill radius: `--radius-pill`

Rules:
- вся палитра placeholder и наложений берётся из color/alpha токенов
- video dot size переключается через `--size-dot-md`/`--size-dot-sm`
- on mobile, inline content media bleeds from the content grid back to the surface grid (`16px` from viewport edge)

### Gallery Fullscreen Overlay (`GalleryLightbox`)
Structure:
- backdrop
- dialog container
- media frame
- fixed close button
- desktop previous/next controls
- desktop/mobile thumbnail rail
- optional caption

The case lightbox also includes a context card above the thumbnail rail (or at the bottom for a single item). Only its collapsed state is compact: it hugs a single regular-weight black title with `--space-sm` vertical and `--space-xl` horizontal padding and a pill radius. Hover or keyboard focus expands the actionable card to `560px` (capped by the viewport) using a lightbox-local spring (`stiffness: 420`, `damping: 36`, `mass: 1.6`) for width and vertical padding, restores the full-card padding `--space-lg` / `--space-xl` and `--home-bubble-radius`; the radius changes linearly over `400ms` in both directions from half the measured compact card height to `--home-bubble-radius`, crossfades the title to heavy weight over `60ms` and reveals the body from below the clipped lower edge: body text moves only vertically from `80px` below its expanded position after `120ms`, using the title vertical-axis `420/36/1.6` spring, while opacity fades from 0 to 1 over `200ms` after `160ms`; reverse motion has no delay; reduced motion makes these changes immediate. The fixed centering wrapper keeps the card horizontally centered and its bottom edge fixed. The glass surface is the semantic link and clips an independently centered, fixed-width content layer; invisible geometry drives its height without affecting its width. Content does not scale or reflow with the width spring. The compact title uses its full intrinsic width until the viewport cap; both title weights are anchored to the fixed-width inner content layer and move independently of the glass from the centered compact position to the upper-left expanded position while crossfading; they follow the same oval arc in both directions. In both directions the title uses the glass spring stiffness and damping with 90% of its mass (default `420/36/1.44`), retaining spring overshoot at both endpoints. The expanded title does not use ellipsis. The surface remains 92% white with a 12px backdrop blur, and body text is limited to three lines. In the full case its title is the nearest preceding heading, falling back to the case title before the first heading, and its body is the first nonempty paragraph in that section. Before the first heading, the case title and first paragraph of the article are used; activating this case-title fallback closes the lightbox and smooth-scrolls to the top of the page instead of assigning an anchor to the paragraph. A preview backed by an actual heading, including «Интерактивное содержание», retains element-target navigation with the 25% viewport offset. Captions do not override the full-case preview, and media in the same Gallery share the same title and paragraph. The full-case card is one semantic link: the whole surface activates navigation to the source in the case, without a visible action label. Activation completes closing and releases the scroll lock before moving to the source block or media. In short mode the card is shown only when the active item has a caption and contains that caption as its sole compact, non-interactive, non-expanding heading. About has no context card. The compact hover zone is exactly 20px wider than the compact card in total, extending 10px on each side; the expanded card remains inside this zone and holds hover until pointer exit. There is no re-entry lock. The optional `?lightboxDebug=1` panel appears only with an actionable context card and exposes the shared resize/title/text spring stiffness/damping/mass, text travel distance, text-rise delay, opacity delay/duration, title crossfade duration, radius duration, and Reset; it does not persist values. Defaults are glass/body spring 420/36/1.6 and title spring 420/36/1.44, text travel 80px, rise delay 120ms, fade delay 160ms, fade duration 200ms, title crossfade 60ms, and radius duration 400ms. On touch, the first card tap expands it and the second activates the case link; the first outside tap collapses only the expanded card, while a subsequent outside tap closes the lightbox. Pointer hover and keyboard focus on an actionable card hold the controls visible; pointer hover hides the floating close indicator. Card interaction does not close the backdrop or swipe the gallery.

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
- all openable image and video items from `Gallery` blocks inside one `GalleryLightboxScope` form one ordered gallery; full case, short case, and About use separate scopes
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
- mobile uses full-viewport contain media while preserving the computed border radius of its inline source in every lightbox phase; it keeps a static top-right close control, side tap zones, horizontal swipe navigation across the lightbox, and the always-visible scroll-snap thumbnail rail; a swipe requires at least `48px` predominantly horizontal displacement, navigates non-cyclically, and suppresses the synthetic backdrop click; desktop side arrows are not rendered
- mobile images support centered touch zoom from `1x` to `4x`: two-finger pinch scales continuously around the gesture midpoint, while double tap toggles `1x`/`2x` around the tap position; zoom resets on media change and close, disables one-finger gallery swipe above `1x`, and never changes desktop interaction
- a pointer-transparent bottom rail backing fades from transparent at the thumbnail top edge to opaque `--color-white` at the viewport bottom, including the current rail bottom offset and padding
- navigation controls are rendered only when the scope contains more than one openable item

### Work Article Section (`.article`, `.section`)
Structure:
- section title
- body/list/media/quote/cta

Spacing:
- article gap: `--space-3xl`
- section gap: `--space-sm`

Typography:
- section title: `font-weight-medium`
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
- Reveal readiness is tracked per `data-page-reveal` target from its own Web Animations API records. A target becomes `ready` only after all of its actual CSS animations settle; this includes its own stagger and durations and is not derived from a global sequence timeout. Instant and reduced-motion targets become ready immediately.
- `components/motion/MdxMotionComponents.tsx` marks MDX headings, paragraphs, list items, blockquotes, sections, and media wrappers with `data-page-reveal`, so case/about content participates in the same reveal contract.
- `components/motion/MotionPage.tsx` and `components/motion/MotionItem.tsx` mirror the same language in Framer Motion form: `opacity + blur + y`, `staggerChildren: 0.08`, `spring` item settle.
- New page-level reveal patterns must stay visually aligned with this system: no new reveal direction, no aggressive overshoot, no larger blur than `18px`.

### Home showcase motion
- Home uses the shared reveal language for heading/list entry, then adds a dedicated interactive layer for the active case bubble and preview pane.
- A case item cannot open its glass or preview until that specific reveal target is ready. Hover and focus intent are retained while its reveal runs, so a stationary pointer or focused link opens automatically as soon as that target's own animations settle; navigation itself remains available. This gate is per item, not tied to the end of the complete page sequence.
- The active glass bubble position uses a velocity-preserving physics spring with `mass: 0.9`. Normalized travel distance still maps through `smoothstep` to `stiffness: 320..460`, and the post-target tail time-warp remains `1x..2x`. A separate normalized exponential reference damping curve uses actual item steps, a `4.5`-step scale, and ratios from approximately `0.80` near to `0.62` far; these are reference values, not the final damping applied to the spring. Its theoretical start-from-rest peak is preserved through `12px`, then mapped by an exponential target-amplitude curve toward an `18px` asymptote. The effective damping ratio is derived from that target peak (approximately `0.7566` at maximum travel), so the spring physically reaches the intended overshoot and reverses naturally with no post-crossing position or velocity compression. The approach is normalized to `1.20x` the reference spring crossing time using damping-aware compensation; the internal flight scale therefore falls below `1` where effective damping is substantially higher, while the distance-aware tail scale takes over unchanged after the first crossing. Initial inherited velocity is pre-compensated by the active flight scale in a copied spring options object for interruption handoff. Distance is measured between the current untransformed glass layout center and the next target center.
- Bubble `width/height` morph with a separate physics spring: `stiffness: 220`, `damping: 22`, `mass: 1.0`. Do not add SVG, Canvas, WebGL, motion-blur, or duplicated-layer stretch to this effect.
- Pointer response targets `x: ±16px`, `y: ±10px` through `stiffness: 300`, `damping: 24`, `mass: 0.75`, using soft-shift power `1.4`. Existing tilt angles and highlight-origin springs remain unchanged. An item whose slug has an `itemStickers` entry in `content/site/home.mdx` renders that non-empty SVG frame array in an item-local layer inside its own `itemVisualBounds`, sized by `--home-arrow-size` (`27px`), permanently rotated `-15deg` counterclockwise, and stacked above the glass. Rotation is orientation and remains under reduced motion. The sticker follows `50%` of the same raw pointer target through its own `300/24/0.75` spring, bounded to `±8px`/`±5px` while the glass is bounded to `±16px`/`±10px`.
- Active text follows `25%` of the pointer shift with `motion-emphasis` (`420ms`) and the expressive easing. On a cross-item switch, outgoing text returns from its computed transform through an explicit WAAPI animation using `motion-layout` (`600ms`) and the standard easing, avoiding shortened CSS reverse-transitions. Re-entering that item hands its current WAAPI transform back to the active CSS transition across two animation frames so motion remains continuous without a jump. The glass container uses `perspective: 1400px`.
- The sticker does not change or reserve bubble geometry. Its item-local position is `right: calc(var(--home-arrow-size) / -2)` and `top: calc(var(--home-item-gap) / -2)`: at `27px` this leaves only `4px` above the top edge and a `13.5px` baseline horizontal intersection. Sticker parallax varies that intersection from `5.5px` to `21.5px`; because text follows `25%` of the same raw target (`±4px`), the maximum inward sticker-to-text delta is `4px`, and the existing `18px` padding keeps a minimum gap of approximately `0.5px`. The sticker therefore stays in contact with the bubble, remains outside the text, and does not travel between items when the glass changes target. The layer remains non-interactive, appears for hover and keyboard focus, and is hidden on mobile.
- Glass opacity remains `280ms` (`motion-base`) through the shared glass-opacity constant. A mapped sticker activation reuses that constant as a `280ms` delay, then enters over `700ms` (`motion-page-reveal`) with expressive easing through `opacity: 0 → 1` and `blur(4px) → blur(0px)`; `4px` matches runtime `--space-2xs`. Deactivation starts immediately and exits over `280ms` through `opacity: 1 → 0` and `blur(0px) → blur(4px)`, so a delayed entry is cancelled cleanly during rapid switching and the old item-local sticker does not linger. Reduced motion preserves the opacity sequencing but forces blur and parallax to `0`; the `380ms` delayed close is unchanged.
- Sticker frame arrays are eagerly preloaded as stacked SVG images and switch discretely through `visibility`, with no inner motion, opacity, blur, scale, crossfade, or frame transition. A single frame stays static and does not start the cycle. The current `portfoliocase` set contains only Puffy Sparkle Darker Violet, while `globus` uses the single static Clock Neutral sticker. Codex, GitHub, Metrica, and Puffy Star Darker Yellow remain commented in `content/site/home.mdx`. When multiple frames are configured, the cycle starts after the initial `280ms` sticker delay alongside the unchanged outer `700ms` opacity/deblur appearance and changes the visible frame every `200ms` (`5fps`). Only the active item's recursive timeout chain runs. Activation resets the visible source to frame `0`; deactivation cancels all timeouts. Reduced motion shows frame `0` only and does not start the cycle.
- Every sticker frame keeps the same `27px × 27px` DOM/image container. Puffy Sparkle Darker Violet and Clock Neutral normalize their source artwork directly through `viewBox="2.75 2.75 18.5 18.5"`, filling approximately `26.3–26.9px` of the container without CSS scaling. The existing `scale(1.1)` mapping for the currently commented Puffy Star Darker Yellow remains available for later restoration. Tool images and the outer item-local motion wrapper are not scaled, so position, `-15deg` orientation, and parallax remain identical across frame categories.
- The right preview pane is a fine-pointer desktop enhancement. Its standard blur/opacity/scale transitions use `motion-layout`; under reduced motion it becomes opacity-only with no blur or scale.
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
- `MediaPlaceholder` may use blur/opacity/scale state changes for asset loading and a short handoff reveal when switching from placeholder/skeleton to loaded asset.
- `GalleryLightbox` owns all fullscreen media motion. Open and close are geometry-aware transitions between source media bounds and modal bounds, paired with backdrop fade/blur.
- The floating close indicator on fine-pointer devices follows the pointer through springs; touch/coarse devices use a fixed close button instead.
- Gallery-trigger hover feedback may scale slightly, but fullscreen motion rules belong only to media opened from `Gallery`.

### Utility motion
- `ScrollToTopButton` may reveal itself with opacity + upward settle and may stretch its inner visual on hover/focus.
- Global text links use a simple underline-color feedback and should remain understated relative to component-level motion.

### Work short-summary motion
- `WorkShortSummaryToggle` is the case-level switch between full MDX content and the optional `shortSummary` content.
- On desktop, the switch uses an icon-only inline action inside the case title container, aligned to the right edge of the content area.
- On mobile, the switch is rendered as a portal-based floating control so it is not constrained by transformed page/header containers.
- The control is icon-only.
- The control uses `/media/system/read-fast.svg` and `/media/system/read-detailed.svg`.
- Mobile floating controls use `36px` square visible buttons with `--space-lg` (`16px`) vertical gap between stacked actions.
- The control has no bubble/glass surface; hover/focus only scales the icon slightly on fine-pointer devices.
- Hover feedback must be guarded by `(hover: hover) and (pointer: fine)`; touch/coarse devices must not preserve hover-expanded states.
- Mobile switching scrolls to the top of the case page after toggling short/full mode.
- Content switching reuses the shared `PageRevealSequence` contract; do not add a separate transition system on top of it.
- `shortSummary` passport labels use `--font-weight-heavy`; do not set raw `font-weight: 800` in component CSS.

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

Surface #111111, copy white, active square vertical gradient #D3D9FF to #7E91F6, target #363636. Radius40 reuses TopCard; square radius16. Intro/final: icon109x100, gap space-xl, title42/44 heavy, description20/22 separated by12px. Two214px background squares have gap16 and the left square extends beyond the clipped frame. Five static overlapping masked backdrop-filter layers0/5/10/20/40 progressively increase blur left-to-right; the filter elements never animate opacity or filter and remain mounted while only their source squares crossfade; a separate #111111 tint reaches full opacity at the right. Backdrop squares and blur share a permanently clipped background container. Foreground copy and draggable stay above blur; hearts render above the active square. Target state changes parallel crossfade280ms with screen-space blur16px without geometry interpolation. Ordinary attempt returns the active square with the original550ms spring, bounce0.16; other state crossfades use screen-space16px blur. Measurement retains camera zoom; terminal squares disappear through opacity and screen-space blur16px over280ms with the measurement camera held at zoom, while final copy/background appear simultaneously, without zoom-out. Final button covers the card; Далее and its icon fade in over600ms, then pulse40–60% over1200ms per direction. Its activation is sequence-locked: reset-exit starts the card shake, then after one animation frame mounts CharacterPlayground above the final. The incoming opaque gray surface fades opacity0→1 over300ms while the final stays mounted underneath; there is no transparent frame or new opacity ancestor around the backdrop filters. At completion, Pixel Perfect unmounts and currentGameId changes without clearing its result. The card itself does not fade and performs two consecutive150ms shakes during the same300ms interval. Progressive blur layers stay static. Reduced motion preserves the300ms content crossfade and removes the card shake. Victory uses seven independently moving, different-length beams with rounded tops anchored at bottom center and no card bounce animation. Each beam independently pulses between4% and16% opacity over1200ms per direction, with phases evenly distributed across the full2400ms cycle; the group waits300ms, fades in over600ms and extends beyond the clipped card boundary. Beam lengths are182/176/194/166/188/180/174% of card height. Missing results show ???; external victory test remains. Technical and visual verification wait for user visual approval.
