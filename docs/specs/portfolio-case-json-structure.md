# Portfolio Case MDX Structure

## 1. Purpose
Единый контракт контента для кейсов в формате `MDX + frontmatter`.

## 2. Storage
- Directory: `content/work`
- File pattern: `${slug}.mdx`
- Source of truth for home list and `/work/[slug]`: frontmatter каждого кейса.

## 3. Frontmatter Contract
Обязательные поля:
- `slug: string`
- `title: string`
- `subtitle: string`
- `status: "published" | "hidden"`
- `preview: { kind, aspectRatio, src?, placeholderToken?, centered? }`
- `description: string`
- `canonical: string`

Опциональные поля:
- `ogImage: string`
- `ogType: "article" | "website"`

## 4. Body Contract
- MDX body — это основной контент кейса.
- Разрешены стандартные markdown-блоки и встраиваемые MDX-компоненты из `lib/content/mdx-components.tsx`.
- Поддерживается `<Media />` и MDX-компонент `<Gallery> ... </Gallery>` с вложенными `<Media />`.
- Для `<Gallery />` встроено fullscreen-открытие media по клику или тапу только внутри самого gallery-блока.
- Для отдельного media внутри `<Gallery />` fullscreen можно отключить через `openable={false}`.

## 5. Motion Contract
- Motion не задаётся через frontmatter и не настраивается из MDX-контента.
- `/work/[slug]` использует общесистемный page-reveal для header и MDX-блоков через `SiteShell` + `PageRevealSequence`.
- Media внутри `Gallery` используют системное fullscreen motion-поведение:
  - переход из thumbnail в modal bounds и обратно;
  - backdrop fade/blur;
  - reduced-motion fallback без анимации.
- Отдельные кейсы не должны вводить собственные motion-правила поверх этих паттернов без изменения дизайн-системы.

## 6. Publication Rules
- `published`:
  - показывается на `/`
  - доступен на `/work/[slug]`
- `hidden`:
  - не показывается на `/`
  - недоступен на `/work/[slug]`

## 7. Validation and Loading
- Frontmatter валидируется через Zod (`lib/content/schemas.ts`).
- Контент читается из файловой системы (`lib/content/work.server.ts`).
- MDX рендерится server-side через `next-mdx-remote/rsc`.

## 8. Example
```mdx
---
slug: "demo-case"
title: "Демо-кейс"
subtitle: "2026 · Product Design"
status: "published"
preview:
  kind: "image"
  aspectRatio: "2 / 1"
  placeholderToken: "demo"
description: "Описание кейса"
canonical: "/work/demo-case"
---

## Задача

Текст кейса.

<Gallery>
  <Media kind="image" aspectRatio="16 / 9" src="/media/shot-1.png" />
  <Media kind="image" aspectRatio="16 / 9" src="/media/shot-2.png" />
</Gallery>
```
