# Case MDX Blocks Reference

Кейс теперь хранится в MDX, а не в JSON `sections[]`.

## Поддерживаемые MDX-компоненты

### 1) `Media`
Props:
- `kind?: "image" | "video" | "gif"` (default: `image`)
- `src?: string`
- `aspectRatio?: string`
- `caption?: string`
- `placeholderToken?: string`

Пример:
```mdx
<Media kind="image" aspectRatio="16 / 9" placeholderToken="hero" />
```

### 2) `Cta`
Props:
- `href: string`
- `label: string`
- `body?: string`

Пример:
```mdx
<Cta href="#" label="Связаться" body="Обсудить похожую задачу" />
```

## Стандартные markdown-блоки
- заголовки (`##`, `###`)
- абзацы
- списки
- цитаты
- ссылки

Все они рендерятся как часть MDX body.
