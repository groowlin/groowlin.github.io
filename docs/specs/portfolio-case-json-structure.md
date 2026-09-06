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

- `shortSummary.paragraphs` содержит 1-4 абзаца;
- рекомендуемый формат для паспортной версии: `Проблема`, `Решение`, `Ожидаемый эффект`;
- для крупных или мета-кейсов допустима индивидуальная структура короткой версии, если она плотнее и точнее передает продуктовую логику кейса;
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
- Поддерживаются `<Media />`, MDX-компонент `<Gallery> ... </Gallery>` с вложенными `<Media />` и специализированный `<PortfolioMotionDemo />` для кейса `portfoliocase`.
- Для `<Gallery />` встроено fullscreen-открытие media по клику или тапу только внутри самого gallery-блока.
- Для отдельного media внутри `<Gallery />` fullscreen можно отключить через `openable={false}`.
- `<PortfolioMotionDemo />` не принимает props, не содержит интерактивных элементов и рендерит статичный репрезентативный кадр при reduced motion.
- Renderer может передать типизированный case-specific `shortAfterContent`-slot. Он рендерится только в short-ветке после всего текста и `shortSummary.media`, не является частью frontmatter-контракта и не требует отдельного контентного поля. Для `portfoliocase` slot содержит тот же `<PortfolioMotionDemo />`, что используется в полном MDX-контенте; full- и short-экземпляры взаимоисключающие и одновременно не монтируются.
- Цикл `<PortfolioMotionDemo />` активен только в пределах viewport с `rootMargin: "100px 0px"`, при видимом документе и без `prefers-reduced-motion`. Вне активной области таймеры и motion-слои останавливаются, индекс дискретной сцены сохраняется, а после возврата воспроизведение продолжается со следующей сцены без восстановления промежуточного прогресса перехода.

## 5. Motion Contract
- Motion не задаётся через frontmatter и не настраивается из MDX-контента.
- `/work/[slug]` использует общесистемный page-reveal для header и MDX-блоков через `SiteShell` + `PageRevealSequence`.
- Для этого page-reveal зафиксирован единый renderer-level motion contract:
  - `opacity + blur` и `translateY` анимируются раздельно;
  - `opacity + blur` используют `0.7s` и `cubic-bezier(0.22, 1, 0.36, 1)`;
  - `translateY` использует `1.12s`, `cubic-bezier(0.18, 0.88, 0.28, 1)` и стартовый offset `28px`;
  - stagger остаётся общесистемным: `calc(var(--page-reveal-index, 0) * 80ms)`.
- Media внутри `Gallery` используют системное fullscreen motion-поведение:
  - переход из thumbnail в modal bounds и обратно;
  - backdrop fade/blur;
  - reduced-motion fallback без анимации.
- `PortfolioMotionDemo` является контентной демонстрацией уже существующих интерфейсных состояний, а не системным page-level motion-паттерном. Общий ритм замедлен в `1.2x`: outgoing проходит `0 -> 120px` за `720ms` по `cubic-bezier(0.7, 0, 0.84, 0)`, а incoming достигает верхней точки на границе lifecycle `1440ms` по зеркальной `cubic-bezier(0.16, 1, 0.3, 1)`. Outgoing opacity остаётся `1`, а blur — `0px`, пока не пройдены первые `60px`; затем они меняются до `0` и `18px`. Incoming начинает полёт при outgoing opacity `0.5` примерно на `683ms`; к первым `60px` подъёма примерно на `760ms` он уже достигает opacity `1` и blur `0px`. Равная видимость сцен составляет около `24.4% / 24.4%`, ниже лимита `30% / 30%`. Каждая сцена проходит rotation через `0deg` в противоположную сторону: `-15deg -> 0deg -> 15deg` или `15deg -> 0deg -> -15deg`; стартовое направление чередуется между сценами и через стык цикла. Внутренняя production-анимация запускается через guard при opacity `>= 0.8`; top card один раз переключается `to-profile -> to-home`, short mode остаётся в масштабе `2x`, и обе смены состояния начинаются после задержки `280ms`. Иконки top card в обоих состояниях постоянно воспроизводят production hover-cycle `620ms`. Top card сохраняет desktop-ширину `--home-top-card-width` на всех viewport. Сцена кейса содержит только `Портфолио как продукт`: его bubble сохраняет естественные production-пропорции по текстовому содержимому, целиком масштабируется в `1.2x` и центрируется внутри сцены; вместе с ним пропорционально увеличиваются текст, стикер, скругление, тени и визуальная амплитуда деформации пузыря. Этот кейс объединяет подъём и падение в одну непрерывную траекторию без зависания в верхней точке; opacity и blur меняются после первых `60px` каждого участка. Стеклянный пузырь закреплён за кейсом и после его проявления появляется с задержкой `140ms`: opacity меняется за `280ms`, а scale проходит `0.1 -> 1` с пружинным хвостом `220 / 14 / 1`; затем запускается sticker frame-cycle. Viewport использует высоту `calc(--layout-preview-size - --space-4xl - --space-2xl)` (`412px`), а центр сцены смещён вверх на `68.8px`: верхняя точка находится на линии верхней трети (`≈137.2px` при целевых `≈137.3px`), при этом снизу остаётся полный запас под падение, поворот, blur-хвост и масштаб кейса без обрезания. Каждая завершившая exit-сцена вызывает `safeToRemove` через `720ms`, поэтому циклический ключ не переиспользует экземпляр с уже изменёнными motion values. Visibility-aware timeout останавливает цикл при скрытии документа и пересоздаёт одну presence-сессию после возврата, исключая накопление exit-слоёв. Reduced-motion fallback остаётся статичным и не запускает цикл.
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
