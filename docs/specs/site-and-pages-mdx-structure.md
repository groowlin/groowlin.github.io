# Site and Static Pages MDX Structure

## 1. Purpose
Контракт для:
- глобальных настроек сайта (`content/site/home.mdx`),
- top-card навигации (`content/site/top-card-*.mdx`),
- статической страницы профиля (`content/pages/about.mdx`).

## 2. Home Settings (`content/site/home.mdx`)

### Frontmatter (required)
- `title: string`
- `seo.siteUrl: string (url)`
- `seo.siteName: string`
- `seo.defaultTitle: string`
- `seo.titleTemplate: string`
- `seo.defaultDescription: string`
- `seo.robotsIndexByDefault: boolean`

### Frontmatter (optional)
- `subtitle: string`
- `seo.defaultOgImage: string`
- `seo.faviconUrl: string`

### Body
- Управляет секциями списка кейсов на главной.
- Формат:
  - секции разделяются строкой `---`,
  - в секции опциональна первая строка `## Заголовок`,
  - далее список slug: `- my-case-slug`.
- Секция без заголовка поддерживается (начинается сразу со списка slug).
- Источник превью и карточек кейсов остается `content/work/*.mdx` (published only).

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
- Может содержать markdown/MDX заметки, но в текущем UI не отображается.

## 4. Static Pages (`content/pages/about.mdx`)

### Frontmatter (required)
- `title: string`
- `description: string`
- `canonical: string`

### Body
- Основной контент страницы в markdown/MDX.
- Поддерживаются встроенные MDX-компоненты из `lib/content/mdx-components.tsx`.

## 5. Validation and Loading
- Frontmatter валидируется через Zod в `lib/content/schemas.ts`.
- Загрузка и рендер выполняются через `lib/content/site.server.ts`.
