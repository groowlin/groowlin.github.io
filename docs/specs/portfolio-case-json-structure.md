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
- `year: string`
- `category: string`
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

## 5. Publication Rules
- `published`:
  - показывается на `/`
  - доступен на `/work/[slug]`
- `hidden`:
  - не показывается на `/`
  - недоступен на `/work/[slug]`

## 6. Validation and Loading
- Frontmatter валидируется через Zod (`lib/content/schemas.ts`).
- Контент читается из файловой системы (`lib/content/work.server.ts`).
- MDX рендерится server-side через `next-mdx-remote/rsc`.

## 7. Example
```mdx
---
slug: "demo-case"
title: "Демо-кейс"
year: "2026"
category: "Product Design"
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

<Media kind="image" aspectRatio="16 / 9" placeholderToken="frame" />
```
