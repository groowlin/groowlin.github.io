# AGENTS.md

## 1) Цель проекта
Поддерживать персональное портфолио продуктового дизайнера на статической архитектуре:
- контент хранится в репозитории (`MDX + frontmatter`),
- сайт собирается через Next.js static export,
- публикация идет на GitHub Pages.

Целевая IA:
- `/`
- `/work/[slug]`
- `/about`
- `/connect`

## 2) Текущее состояние (актуально на 2026-03-26)
Соответствие целевой архитектуре: `~100%`.

Что уже реализовано:
- CMS/admin/API удалены.
- Supabase и NextAuth удалены.
- Контент переведен на MDX-файлы.
- Включен `output: "export"`.
- Добавлен GitHub Pages workflow.

## 3) Технологический стек
- Next.js App Router (`next@16.1.6`)
- React 19
- TypeScript (strict)
- Framer Motion
- `next-mdx-remote` (RSC)
- `gray-matter`
- Zod
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

## 5) Где что лежит
- App routes: `app/**`
- Глобальный layout/metadata: `app/layout.tsx`
- Главная (интерактивный список кейсов): `components/home/HomeShowcase.tsx`
- Страницы кейсов: `app/work/[slug]/page.tsx`
- Рендер MDX кейса: `components/sections/WorkArticle.tsx`
- Контентные типы: `lib/content/types.ts`
- Zod-схемы frontmatter: `lib/content/schemas.ts`
- MDX loader/render: `lib/content/mdx.server.tsx`
- Site/static pages loader: `lib/content/site.server.ts`
- Work loader: `lib/content/work.server.ts`
- Home settings: `content/site/home.mdx`
- Static pages: `content/pages/*.mdx`
- Cases: `content/work/*.mdx`
- Media: `public/media/*`
- Deploy workflow: `.github/workflows/deploy-pages.yml`

## 6) Контентная модель (обязательно)
- Источник контента: только `content/**/*.mdx`.
- Любой новый контент добавлять через frontmatter + MDX body.
- Контракт frontmatter валидируется через Zod.
- Любая новая/измененная страница должна иметь metadata (`title`, `description`, `canonical`).

## 7) Ограничения архитектуры
- Проект статический: нельзя добавлять server actions, runtime API routes, DB-зависимости.
- Не возвращать CMS/admin-панель без отдельного явного запроса.
- `next.config.mjs` должен оставаться совместимым с GitHub Pages (`output: "export"`, `trailingSlash: true`).
- Интерактивность главной (hover + preview-pane) сохраняется, если нет отдельного запроса на редизайн.

## 8) GitHub Pages и домен
- Источник публикации: GitHub Actions.
- Для CNAME используется repository variable: `PAGES_CNAME`.
- Workflow сам добавляет `out/.nojekyll` и `out/CNAME` (если `PAGES_CNAME` задан).

## 9) Чеклист перед сдачей изменений
1. `pnpm typecheck` проходит.
2. `pnpm lint` проходит.
3. `pnpm build` проходит.
4. Проверены маршруты: `/`, `/work/[slug]`, `/about`, `/connect`.
5. Проверено, что в итоговой статике нет `admin/api/preview` маршрутов.
6. Если менялась главная: выполнен ручной smoke-test hover/preview.

## 10) Поведение агента в следующих сессиях
- При вопросах по библиотекам/API/конфигу обязательно использовать Context7.
- Если меняется контракт frontmatter, обновлять одновременно:
  - `lib/content/types.ts`
  - `lib/content/schemas.ts`
  - `lib/content/site.server.ts` и/или `lib/content/work.server.ts`
  - соответствующие docs/specs.
- Если меняется структура страниц, синхронизировать `portfolio-structure.json` и `portoflio-structure.json`.

## 11) Правила дизайн-системы и структуры (обязательно)
1. Never invent spacing values.
2. Follow component structure and use tokens from `design-system-spec.md`.
3. If something conflicts with design tokens, tokens win.
4. Если агент считает, что необходимы правки в дизайн-системе (токены, структура, правила), он обязан сначала запросить явное разрешение пользователя. Без явного разрешения вносить изменения в дизайн-систему нельзя.
5. Если по явному требованию пользователя вносятся изменения в дизайн-систему или структуру, обязательно актуализировать `design-system-spec.md` и `portoflio-structure.json`.

## 12) Спецификация MDX-контракта
- Кейс-контракт: `docs/specs/portfolio-case-json-structure.md`
- Справочник MDX-блоков: `docs/specs/case-blocks-reference.md`
- Site/static pages контракт: `docs/specs/site-and-pages-mdx-structure.md`
