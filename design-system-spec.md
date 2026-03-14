# Portfolio Design System

## Source of truth
- Основные токены: `/Users/aleksandrlebed/Spizheno/app/globals.css` (`:root`).
- Применение токенов в UI: CSS-модули в `components/**` и `app/page-content.module.css`.

## Layout
- Base grid: 4px (основной ритм 8px, с поддержкой micro-step для плотных элементов)
- Content max-width: `--page-max-width = 42rem` (672px)
- Main side padding: `--layout-main-padding-x = 2rem` (32px)
- Main vertical padding: `--layout-main-padding-y = 6rem` (96px)
- Default vertical section gap: `--layout-content-gap = 2rem` (32px)
- Home preview pane size: `--layout-preview-size = 484px`
- Home preview offset from list: `--layout-preview-offset-x = 60px`
- Breakpoints: 680px (masonry/icon grid), 768px (shell layout), 1180px (fixed preview pane)

## Typography Tokens

### Font family
- `--font-family-sans`: `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`

### Font weights
- `--font-weight-regular = 400`
- `--font-weight-medium = 500`

### Font sizes
- `--font-size-body = 1rem` (16px)
- `--font-size-caption = 0.875rem` (14px)
- `--font-size-overline = 0.75rem` (12px)
- `--font-size-overline-xs = 0.6875rem` (11px)

### Line-height and tracking
- `--line-height-base = 1.5`
- `--line-height-reading = 1.65`
- `--line-height-caption = 1.25rem` (20px)
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
- `--color-gray-25 = #fafafa`

### Semantic color tokens
- `--text-primary`, `--text-muted`, `--text-light`, `--text-marker`
- `--line-muted`, `--line-hover`
- `--bg-page`
- `--card-bg`, `--card-bg-hover`
- `--surface-glass-border`, `--surface-glass-start`, `--surface-glass-end`
- `--surface-placeholder-border`, `--surface-placeholder-bg`
- `--surface-placeholder-work-border`, `--surface-placeholder-work-bg`
- `--logo-gradient-start`, `--logo-gradient-end`

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
- `--radius-pill = 999px`

## Size Tokens
- `--size-dot-md = 0.45rem`
- `--size-dot-sm = 0.4rem`

## Components

### Home Case Card (`.item`)
Structure:
- label (`.itemLabel`)
- meta (`.itemMeta`)

Spacing:
- padding: `--space-sm` `--space-lg`
- internal gap: `--space-2xs`

Shape:
- radius: `--radius-lg`

Rules:
- label всегда сверху meta
- underline для label использует `--card-bg`
- hover glass-слой использует `surface` и `shadow` токены

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

## Что было токенизировано
Хардкод-значения цветов/отступов/радиусов/типографики заменены на `var(--...)` в:
- `/Users/aleksandrlebed/Spizheno/app/globals.css`
- `/Users/aleksandrlebed/Spizheno/components/home/home-showcase.module.css`
- `/Users/aleksandrlebed/Spizheno/components/media/media-placeholder.module.css`
- `/Users/aleksandrlebed/Spizheno/components/shell/site-shell.module.css`
- `/Users/aleksandrlebed/Spizheno/components/sections/work-article.module.css`
- `/Users/aleksandrlebed/Spizheno/app/page-content.module.css`
