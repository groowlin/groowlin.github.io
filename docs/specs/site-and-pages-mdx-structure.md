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
- `seo.robotsIndexByDefault: boolean`

### Frontmatter (optional)
- `subtitle: string`
- `itemStickers: Record<workSlug, NonEmptyArray<internalSvgPath>>`
- `seo.defaultOgImage: string`
- `seo.faviconUrl: string`

### Item sticker mapping
- `itemStickers` настраивает sticker только для элементов списка главной; frontmatter кейсов не меняется.
- Ключ — work slug, который обязательно должен присутствовать среди slug в body этого же `home.mdx`.
- Значение — непустой массив внутренних путей; каждый путь начинается с `/` и заканчивается на `.svg`.
- Массив из одного SVG рендерится статично. Несколько SVG циклично сменяются в указанном порядке.
- Отсутствие ключа означает, что у соответствующего элемента списка sticker не рендерится.
- Несуществующий в body ключ считается ошибкой контракта и останавливает загрузку.

```yaml
itemStickers:
  portfoliocase:
    - "/media/cases/portfoliocase/sticker-figma.svg"
    - "/media/cases/portfoliocase/sticker-codex.svg"
    - "/media/cases/portfoliocase/sticker-github.svg"
    - "/media/cases/portfoliocase/sticker-segmented-circle.svg"
```

## 2.1 Link Preview Settings (`content/site/link-preview.mdx`)

### Frontmatter (required)
- `title: string`
- `description: string`
- `url: string`
- `type: "website" | "article"`

### Frontmatter (optional)
- `image: string`

### Behavior
- This file defines the shared Open Graph and Twitter preview metadata.
- Preview cards are intentionally identical across all pages.
- Page-level metadata still controls per-page `title`, `description`, and `canonical`.

### Body
- Управляет секциями списка кейсов на главной.
- Формат:
  - секции разделяются строкой `---`;
  - в секции опциональна первая строка `## Заголовок`;
  - далее список slug: `- my-case-slug`.
- Секция без заголовка поддерживается.
- Источник карточек и preview кейсов остается `content/work/*.mdx` (`published` only).

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
- Frontmatter валидируется через Zod в `lib/content/schemas.ts`.
- `lib/content/site.server.ts` дополнительно fail-fast проверяет, что каждый ключ `itemStickers` присутствует среди slug, реально перечисленных в body `home.mdx`.
- Загрузка и рендер выполняются через `lib/content/site.server.ts`.

## 7. Motion and Reveal Contract
- Home (`/`) uses `SiteShell` plus a custom `HomeShowcase` motion path. The top card is still rendered through `AnimatedTopCard`, while the showcase area owns its own list/preview/hover motion.
- About (`/about`), work detail (`/work/[slug]`), and not-found (`/404`) use `SiteShell`, which applies:
  - animated top-card replacement through `components/navigation/AnimatedTopCard.tsx`;
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
- Bottom page padding is still renderer-controlled. `components/shell/BottomPaddingController.tsx` must re-check trim state after `load` and `app:scroll-restored` so reload/scroll-restore does not collapse the page container height incorrectly.
- Reduced motion is part of the rendering contract:
  - top-card swaps fall back to static rendering;
  - page-reveal sequence resolves to immediately visible content without animation.
