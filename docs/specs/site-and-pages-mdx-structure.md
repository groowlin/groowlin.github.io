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

### Frontmatter (optional)
- `ogImage: string`
- `ogType: "article" | "website"`

### Body
- Рендерится через тот же `WorkArticle`, что и кейсы.
- Использует MDX variant `work`.
- Верхняя карточка должна приходить через `topCardVariant="default"`.

## 6. Validation and Loading
- Frontmatter валидируется через Zod в `lib/content/schemas.ts`.
- Загрузка и рендер выполняются через `lib/content/site.server.ts`.
