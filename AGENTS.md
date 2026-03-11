# AGENTS.md

## 1) Цель проекта
Клон `https://nelson.co/` на React/Next.js с максимально близким визуалом и интерактивностью.

Текущий статус:
- Phase 1 реализован (основные страницы + redirects).
- Используются плейсхолдеры медиа и плейсхолдеры внешних ссылок.
- EN-only контент.

## 2) Технологический стек
- Next.js App Router (`next@16.1.6`)
- React 19
- TypeScript (strict)
- Framer Motion
- ESLint v9 (flat config)
- pnpm

## 3) Важные команды
```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
```

Проверка ключевых редиректов:
```bash
for p in /navigation /product-design /work/linear-interaction-moments /icon-design/quote /downloads/figma-icon /product-design/github-copilot /product-design/navigation-shortcuts /product-design/achievements; do
  curl -s -o /dev/null -w "$p -> %{http_code} %{redirect_url}\n" "http://127.0.0.1:3000$p"
done
```

## 4) Текущее покрытие маршрутов (Phase 1)
Основные:
- `/`
- `/about`
- `/connect`
- `/features`
- `/icon-design`
- `/explorations`
- `/work/interaction-prototypes`
- `/work/linear-26`
- `/work/linear-search`
- `/work/linear-documents`
- `/work/linear-v1`
- `/work/linear-renders`
- `/work/github-copilot`
- `/work/achievements`
- `/work/navigation-shortcuts`

Redirects (permanent 308):
- `/navigation` -> `/`
- `/product-design` -> `/`
- `/work/linear-interaction-moments` -> `/work/interaction-prototypes`
- `/icon-design/quote` -> `/icon-design`
- `/downloads/figma-icon` -> `/icon-design`
- `/product-design/github-copilot` -> `/work/github-copilot`
- `/product-design/navigation-shortcuts` -> `/work/navigation-shortcuts`
- `/product-design/achievements` -> `/work/achievements`

## 5) Где что лежит
- App routes: `app/**`
- Основной layout/meta: `app/layout.tsx`
- Главная интерактивность: `components/home/HomeShowcase.tsx`
- UI shell: `components/shell/SiteShell.tsx`
- Motion primitives: `components/motion/*`
- Work article renderer: `components/sections/WorkArticle.tsx`
- Content schema/types: `lib/content/types.ts`, `lib/content/schema.ts`, `lib/content/index.ts`
- Redirect config: `next.config.mjs`
- Спецификация: `docs/specs/nelson-co-react-clone.md`

## 6) Контент и архитектурные правила
- Контент редактируется через typed-layer в `lib/content/*`, не хардкодить новый контент по страницам.
- Для кейсов использовать существующий контракт `WorkCase` и `SectionBlock`.
- Новые страницы должны иметь metadata (title/description/canonical).
- По умолчанию не добавлять analytics/cookies scripts.
- По умолчанию сохранять placeholder link policy (`#`), если пользователь явно не попросил заменить.

## 7) UI/UX и motion требования
- Сохранять визуальный стиль минималистичным, светлая тема.
- Не ломать hover-интерактив на главной: glass-highlight, tilt/shift, preview-pane.
- На touch-устройствах поведение должно быть безопасным (без зависимости от hover).
- При правках motion проверять, что нет явных regressions по плавности/иерархии переходов.

## 8) Чеклист перед сдачей изменений
1. `pnpm typecheck` проходит.
2. `pnpm lint` проходит.
3. `pnpm build` проходит.
4. Проверены основные маршруты.
5. Проверены redirects (308).
6. Если были UI-правки на главной - ручной smoke hover/preview.

## 9) Планируемый Phase 2
- Реальные медиа-ассеты (вместо плейсхолдеров).
- Полная поддержка extras-страниц без редиректов.
- RU localization (и при необходимости переключатель языков).

## 10) Интеграция UI Kit из Figma (обязательные входные)
Что нужно от пользователя:
- Ссылка на Figma (view + inspect/dev mode).
- Список приоритетных компонентов.
- Решение по темам (light only или multi-theme).
- Решение по policy ассетов/иконок.

Что должно быть в Figma:
- Component Set + Variants.
- Состояния: default, hover, focus, disabled, error, loading (где применимо).
- Auto Layout и корректные constraints.
- Базовые компоненты: Button, Input, Select, Checkbox, Radio, Switch, Tabs, Modal/Drawer, Menu, Toast, Tooltip, Card, Table (если нужна), Pagination (если нужна).
- Иконки в экспортируемом формате (предпочтительно SVG).

Токены нужны обязательно (минимум):
- Colors (primitive + semantic)
- Typography
- Spacing scale
- Radius / Border / Shadow
- Motion (duration, easing)
- Z-index

Рекомендуемый путь интеграции:
1. Сначала токены -> CSS variables (или design token pipeline).
2. Затем базовые primitives.
3. Затем composed components.
4. Только потом экранные шаблоны.

## 11) Поведение агента в следующих сессиях
- При вопросах по библиотекам/API/конфигу - обязательно использовать Context7.
- Изменения делать минимально инвазивно, без ненужных рефакторов.
- Если меняется контракт данных - обновлять типы и все места использования.
- Если затронуты маршруты/редиректы - обновлять `next.config.mjs` и прогонять redirect-check.

