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
- `shortSummary: { paragraphs: string[]; media?: MediaPlaceholder[] }`

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
Это не teaser, не SEO-description и не отдельная страница, а сжатый паспорт решения внутри самого кейса.

Правила:

- `shortSummary.paragraphs` содержит 1-2 абзаца;
- рекомендуемый формат для паспортной версии: `Проблема`, `Решение`, `Ожидаемый эффект`;
- паспортные лейблы пишутся внутри строки `paragraphs`, а не как отдельные MDX-заголовки или новые frontmatter-поля;
- для паспортной структуры можно использовать multiline YAML через `|`; переносы внутри строки рендерятся short-summary UI;
- `shortSummary.media` опционально содержит медиа после текстового блока короткой версии;
- абзацы должны опираться только на полный текст кейса;
- неподтвержденные эффекты формулируются как `ожидаемый эффект`;
- поле не используется на главной и не заменяет `description`;
- если у кейса нет `shortSummary`, переключатель короткой версии не показывается.

Правила media:

- `shortSummary.media` использует тот же `MediaPlaceholder[]`, что и MDX media;
- assets для короткой версии должны лежать внутри media-папки своего кейса (`public/media/cases/{slug}/...`);
- отдельная подпапка для short-assets не является обязательной частью контракта;
- имена файлов должны быть уникальными и не конфликтовать с основными assets кейса: например `short-before.png`, `short-after.png`, а не повторные `before.png`, `after.png`;
- captions пишутся как обычные подписи media; для пар до/после использовать `Было` и `Стало`.

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
  paragraphs:
    - |
      Проблема
      Пользователи не понимали, что произойдет в сценарии, и уходили без действия.

      Решение
      Пересобрали экран в последовательный сценарий выбора: сначала доказательство результата, затем снятие барьеров, затем действие.

      Ожидаемый эффект
      Рост целевого действия и снижение потерь на первом экране.
  media:
    - kind: "image"
      src: "/media/cases/demo-case/short-before.png"
      caption: "Было"
    - kind: "image"
      src: "/media/cases/demo-case/short-after.png"
      caption: "Стало"
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
