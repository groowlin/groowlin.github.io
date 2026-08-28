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
