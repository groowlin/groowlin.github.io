# Site and Static Pages MDX Structure

## 1. Purpose
Контракт для:
- глобальных настроек сайта (`content/site/home.mdx`),
- статических страниц (`content/pages/about.mdx`, `content/pages/connect.mdx`).

## 2. Home Settings (`content/site/home.mdx`)

### Frontmatter (required)
- `name: string`
- `role: string`
- `metaNav: { label: string; href: string }[]`
- `contacts: { label: string; href: string }[]`
- `seo.siteUrl: string (url)`
- `seo.siteName: string`
- `seo.defaultTitle: string`
- `seo.titleTemplate: string`
- `seo.defaultDescription: string`
- `seo.robotsIndexByDefault: boolean`

### Frontmatter (optional)
- `avatar: string`
- `seo.defaultOgImage: string`
- `seo.faviconUrl: string`

### Body
- Может содержать markdown/MDX заметки, но в текущем UI не отображается как отдельный блок.

## 3. Static Pages (`content/pages/*.mdx`)

### Frontmatter (required)
- `title: string`
- `description: string`
- `canonical: string`

### Body
- Основной контент страницы в markdown/MDX.
- Поддерживаются встроенные MDX-компоненты из `lib/content/mdx-components.tsx`.

## 4. Validation and Loading
- Frontmatter валидируется через Zod в `lib/content/schemas.ts`.
- Загрузка и рендер выполняются через `lib/content/site.server.ts`.
