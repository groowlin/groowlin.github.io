# Portfolio Design System

## Source of truth
- Основные токены: `/Users/aleksandrlebed/Spizheno/app/globals.css` (`:root`).
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
- Home section rhythm: between sections `60px`, section title to first case `40px`, case internal gap `--home-item-gap = 8px`. Mobile overrides at `max-width: 767px`: between sections `40px`, section title to first case `24px`, `--home-item-padding-y = 8px`, `--home-meta-gap = 6px`, `--home-micro-gap = 4px`, `--home-contact-gap = 8px`, `--home-top-card-padding = 16px`, `--home-top-card-subtitle-gap = 6px`, `--home-top-card-icon-gap = 8px`.
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
- `--home-arrow-size = 24px`

## Motion System

### Motion principles
- Motion supports orientation, hierarchy, and state change; it must not exist as decoration detached from interaction or layout.
- Default motion language is soft, blurred, and slightly eased into place: `opacity + blur + translateY` for reveal, `opacity + blur + scale` for surface swaps, and restrained pointer-reactive transforms only where already designed.
- Ambient infinite animation is not allowed by default. Continuous loops are reserved for the home top-card hover state only.
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
- `motion-base = 280ms`; default for media shell open, button reveal transforms, and standard UI state changes.
- `motion-base-plus = 320ms`; allowed for asset settle/load completion and top-card background color.
- `motion-emphasis = 420ms`; used by the home active-item text shift.
- `motion-layout = 600ms`; used by the home outgoing-text return and preview enter/swap.
- `motion-page-reveal = 700ms`
- `motion-spring-soft = 800ms`; used by shared Framer Motion item reveal.
- `motion-ambient-enter = 1240ms`; reserved for animated top-card content replacement.
- `motion-loop-icon = 1400ms`; reserved for top-card icon wave on hover.
- `motion-loop-shimmer = 4200ms`; reserved for top-card shimmer on hover.

#### Reveal primitives
- Page and MDX reveal uses `opacity + blur(8px) + translateY(12px..16px)`.
- Sequenced reveal stagger is `80ms` between siblings.
- Surface swap reveal may add `scale` in the `0.97..1` or `0.985..1` range.
- Media loading/handoff may use blur up to `18px`; this is the upper bound in the current system.

### Reduced motion policy
- `PageRevealSequence` must resolve to fully visible static content when `prefers-reduced-motion: reduce` is active.
- `AnimatedTopCard` must render the static `TopCard` without animated crossfade when reduced motion is requested.
- `GalleryLightbox` must collapse motion transitions to `duration: 0` for open/close/backdrop/close-button choreography when reduced motion is requested.
- CSS hover/loop/keyframe effects must expose a `prefers-reduced-motion` fallback that disables transition/animation when the effect is not essential.
- Home active-case glass must switch geometry instantly, disable pointer tilt/shift and active-text transforms, and keep transform origin centered when reduced motion is requested. Home preview must omit blur/scale and use opacity-only motion.

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
- padding: `--space-sm` `--space-lg`; mobile item horizontal padding collapses to `0`, mobile item vertical token uses `--home-item-padding-y = 8px`
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
- optional caption

Spacing:
- desktop backdrop padding: `--space-3xl` (32px)
- mobile backdrop padding: `--space-lg` (16px)
- dialog and panel gap: `--space-lg`
- close button offset: `--space-3xl` on desktop, `--space-lg` on mobile

Shape:
- fullscreen media radius: `--radius-2xl` (40px)
- close button radius: `--radius-pill`

Rules:
- fullscreen overlay applies only to media inside `Gallery`
- fullscreen media horizontal max size: `min(viewport, --page-max-width + 640px)`
- fullscreen media fits viewport with `contain`
- backdrop uses `var(--white-20)` and `blur(20px)`
- close button uses `--black-85` surface with white text and `--white-75` border
- on fine pointer devices the system cursor stays visible, while a separate close indicator follows the cursor and the whole overlay becomes click-to-close, including over media
- on touch/coarse pointer devices the fallback is a fixed close button in the top-right corner
- a specific media item inside `Gallery` can disable fullscreen via `openable={false}`

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

## Motion Patterns By Area

### Shared page reveal
- `components/motion/PageRevealSequence.tsx` + `components/motion/page-reveal-sequence.module.css` are the canonical sequential reveal system used by `SiteShell`.
- `components/motion/MdxMotionComponents.tsx` marks MDX headings, paragraphs, list items, blockquotes, sections, and media wrappers with `data-page-reveal`, so case/about content participates in the same reveal contract.
- `components/motion/MotionPage.tsx` and `components/motion/MotionItem.tsx` mirror the same language in Framer Motion form: `opacity + blur + y`, `staggerChildren: 0.08`, `spring` item settle.
- New page-level reveal patterns must stay visually aligned with this system: no new reveal direction, no aggressive overshoot, no larger blur than `18px`.

### Home showcase motion
- Home uses the shared reveal language for heading/list entry, then adds a dedicated interactive layer for the active case bubble and preview pane.
- The active glass bubble position uses a velocity-preserving physics spring with `mass: 0.9`. Normalized travel distance is passed through the existing `smoothstep` for `stiffness: 320..460` and the post-target tail time-warp `1x..2x`. Raw overshoot amplitude uses a separate normalized exponential ease-out: distance is measured in actual item steps using the mean current/target height, the curve scale is `4.5` steps, and its value is normalized against the maximum available list travel before mapping damping ratio from `0.80` near to `0.62` far. After the first target crossing only, signed residual offsets remain unchanged through `16px`, then use a continuous exponential soft knee toward an asymptotic `28px` cap; this is not a hard clamp and does not affect the approach to the target. The tail time-warp still traverses the same raw spring trajectory, while generator velocity is multiplied by both the time-warp factor and the soft-knee derivative for interruption handoff. Stiffness, damping-distance, and tail-time curves otherwise remain unchanged. Distance is measured between the current untransformed glass layout center and the next target center.
- Bubble `width/height` morph with a separate physics spring: `stiffness: 220`, `damping: 22`, `mass: 1.0`. Do not add SVG, Canvas, WebGL, motion-blur, or duplicated-layer stretch to this effect.
- Pointer response targets `x: ±16px`, `y: ±10px` through `stiffness: 300`, `damping: 24`, `mass: 0.75`, using soft-shift power `1.4`. Existing tilt angles and highlight-origin springs remain unchanged.
- Active text follows `25%` of the pointer shift with `motion-emphasis` (`420ms`) and the expressive easing. On a cross-item switch, outgoing text returns from its computed transform through an explicit WAAPI animation using `motion-layout` (`600ms`) and the standard easing, avoiding shortened CSS reverse-transitions. Re-entering that item hands its current WAAPI transform back to the active CSS transition across two animation frames so motion remains continuous without a jump. The glass container uses `perspective: 1400px`.
- Glass opacity remains `280ms`; the `380ms` delayed close is preserved to prevent rapid cross-item pointer movement from destabilizing text and preview state.
- The right preview pane is a fine-pointer desktop enhancement. Its standard blur/opacity/scale transitions use `motion-layout`; under reduced motion it becomes opacity-only with no blur or scale.
- Hover motion in home must stay informational and tactile, not playful: small tilt, shallow shift, no large scale jumps, no bounce-heavy springs.

### Top-card motion
- `AnimatedTopCard` is the page-to-page/top-shell card replacement pattern for `/`, `/about`, `/work/[slug]`, and `/404`.
- The card swap uses `opacity + blur + scale` with `motion-ambient-enter` for enter and a shorter standard exit.
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
- `/Users/aleksandrlebed/Spizheno/app/globals.css`
- `/Users/aleksandrlebed/Spizheno/components/home/home-showcase.module.css`
- `/Users/aleksandrlebed/Spizheno/components/media/media-placeholder.module.css`
- `/Users/aleksandrlebed/Spizheno/components/shell/site-shell.module.css`
- `/Users/aleksandrlebed/Spizheno/components/sections/work-article.module.css`
- `/Users/aleksandrlebed/Spizheno/app/page-content.module.css`
