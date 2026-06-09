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
- `shortSummary: { title?: string; items: string[] }`

### `subtitle` rules

`subtitle` используется и на главной, и в заголовке страницы кейса.
Отдельное поле для главной не добавляется.

Формат:

`period · role/format/status`

Примеры:

- `2024-2025 · Продуктовый дизайн`
- `2025 · Продуктовый дизайн`
- `2023-2024 · UX/UI дизайн`
- `2025-2026 · Продуктовый дизайн`

Ограничения:

- не длиннее паттерна `2023–2024 · продуктовый дизайн`;
- не дублировать продуктовый hook из `title`;
- использовать для периода, роли, формата или статуса кейса;
- продуктовый эффект раскрывать в `title`, первом narrative-блоке и body кейса, а не в `subtitle`.

### `shortSummary` rules

`shortSummary` — опциональная короткая версия кейса для второго уровня пирамиды Минто.

Правила:

- `shortSummary.items` содержит 3-5 тезисов;
- тезисы должны опираться только на полный текст кейса;
- неподтвержденные эффекты формулируются как `ожидаемый эффект`;
- поле не используется на главной и не заменяет `description`;
- если у кейса нет `shortSummary`, переключатель короткой версии не показывается.

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
subtitle: "2026 · Продуктовый дизайн"
status: "published"
preview:
  kind: "image"
  aspectRatio: "2 / 1"
  placeholderToken: "demo"
shortSummary:
  title: "Короткая версия"
  items:
    - "Главный вывод кейса."
    - "Ключевой барьер или причина работы."
    - "Логика решения."
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
