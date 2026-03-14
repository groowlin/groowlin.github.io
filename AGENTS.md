# AGENTS.md

## 1) Цель проекта
Перевести текущую кодовую базу в персональное портфолио продуктового дизайнера (владелец проекта), без привязки к исходному референсу.

Целевая структура:
- Главная: список кейсов с превью.
- Страницы кейсов: контентные блоки (текст, медиа и дополнительные секции).
- Обо мне: отдельная страница с текстовым профилем.
- Контакты: отдельная страница с ссылками.

## 2) Соответствие текущей реализации (актуально на 2026-03-11)
Соответствие высокое по каркасу: примерно `75-80%`.

Что уже соответствует:
- Есть главная `/` с интерактивным списком кейсов и превью (`components/home/HomeShowcase.tsx`).
- Есть динамические страницы кейсов `/work/[slug]` с типизированными секциями (`WorkCase`, `SectionBlock`).
- Есть отдельные страницы `/about` и `/connect`.

Что не соответствует новой цели:
- В контенте/метаданных и identity остались данные другого дизайнера.
- Присутствуют legacy-разделы `/features`, `/icon-design`, `/explorations`, которые не входят в целевую структуру.
- В `next.config.mjs` и `lib/content/schema.ts` остались legacy-redirects от старой IA.
- Контент в основном EN-only и с плейсхолдерами.

## 3) Технологический стек
- Next.js App Router (`next@16.1.6`)
- React 19
- TypeScript (strict)
- Framer Motion
- ESLint v9 (flat config)
- pnpm

## 4) Важные команды
```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
```

Проверка legacy-redirects (выполнять только если редиректы менялись):
```bash
for p in /navigation /product-design /work/linear-interaction-moments /icon-design/quote /downloads/figma-icon /product-design/github-copilot /product-design/navigation-shortcuts /product-design/achievements; do
  curl -s -o /dev/null -w "$p -> %{http_code} %{redirect_url}\n" "http://127.0.0.1:3000$p"
done
```

## 5) Где что лежит
- App routes: `app/**`
- Глобальный layout/metadata: `app/layout.tsx`
- Главная (список кейсов + preview): `components/home/HomeShowcase.tsx`
- Стили preview на главной: `components/home/home-showcase.module.css`
- Базовые стили media-placeholder (включая радиусы): `components/media/media-placeholder.module.css`
- Страницы кейсов: `app/work/[slug]/page.tsx`
- Рендер блоков кейса: `components/sections/WorkArticle.tsx`
- Контент и типы: `lib/content/types.ts`, `lib/content/schema.ts`, `lib/content/index.ts`
- Redirect config: `next.config.mjs`

## 6) Контентная модель (обязательно)
- Главный источник контента: `lib/content/*`.
- Не хардкодить новый контент по страницам, добавлять/менять через typed-layer.
- Для кейсов использовать существующий контракт `WorkCase`.
- Для секций кейса использовать `SectionBlock` (`paragraph`, `media`, `list`, `quote`, `cta`).
- Любая новая/измененная страница должна иметь metadata (title/description/canonical).

## 7) Правила миграции к личному портфолио
- Убирать клон-идентичность поэтапно: `siteIdentity`, page metadata, тексты, названия кейсов.
- Сохранять текущую интерактивность главной (glass-highlight, tilt/shift, preview-pane), если не было отдельного запроса на редизайн.
- Для главной на desktop: preview-pane должен быть визуально фиксирован по вертикали (относительно viewport), но его `left` должен пересчитываться от списка кейсов (`right + 60px`).
- Для главной: скругление медиа в preview фиксировано `24px` (через `--placeholder-radius` для `MediaPlaceholderView`).
- Из-за `transform` у motion-контейнера превью на главной рендерить через portal (`document.body`), иначе `position: fixed` привязывается к предку, а не к viewport.
- На touch-устройствах не вводить поведение, зависящее только от hover.
- По умолчанию сохранять placeholder policy для внешних ссылок (`#`), пока пользователь явно не предоставил реальные URL.
- Изменения делать минимально инвазивно, без ненужных рефакторов.

## 8) Целевые маршруты (новая IA)
Базовые маршруты, которые должны быть в фокусе:
- `/`
- `/work/[slug]`
- `/about`
- `/connect`

Маршруты вне целевой IA (`/features`, `/icon-design`, `/explorations` и legacy redirects) считать кандидатами на удаление или переиспользование по отдельному решению.

## 9) Чеклист перед сдачей изменений
1. `pnpm typecheck` проходит.
2. `pnpm lint` проходит.
3. `pnpm build` проходит.
4. Проверены маршруты новой IA (`/`, `/work/[slug]`, `/about`, `/connect`).
5. Если затрагивались редиректы - проверены соответствующие 308.
6. Если менялась главная - ручной smoke-test hover/preview.
7. Для правок preview на главной: при скролле preview остается по центру viewport по вертикали.
8. Для правок preview на главной: отступ по горизонтали от списка кейсов равен `60px` и корректно пересчитывается при resize/scroll.
9. Для правок preview на главной: у медиа в preview скругление `24px` без "квадратных" внутренних углов.

## 10) Поведение агента в следующих сессиях
- При вопросах по библиотекам/API/конфигу обязательно использовать Context7.
- Если меняется контракт данных, обновлять типы и все места использования.
- Если затронуты маршруты/редиректы, синхронизировать `lib/content/schema.ts` и `next.config.mjs`.

## 11) Правила дизайн-системы и структуры (обязательно)
1. Never invent spacing values.
2. Follow component structure and use tokens from `design-system-spec.md`.
3. If something conflicts with design tokens, tokens win.
4. Если агент считает, что необходимы правки в дизайн-системе (токены, структура, правила), он обязан сначала запросить явное разрешение пользователя. Без явного разрешения вносить изменения в дизайн-систему нельзя.
5. Если по явному требованию пользователя вносятся изменения в дизайн-систему или структуру, обязательно актуализировать `design-system-spec.md` и `portoflio-structure.json`.

## 12) Спецификация JSON-кейсов
- Актуальная спецификация структуры данных кейсов: `docs/specs/portfolio-case-json-structure.md`
- Справочник блоков и полей для `sections`: `docs/specs/case-blocks-reference.md`
- При изменениях контракта JSON обновлять одновременно:
  - `lib/content/types.ts`
  - `lib/content/work.server.ts`
  - `docs/specs/portfolio-case-json-structure.md`
