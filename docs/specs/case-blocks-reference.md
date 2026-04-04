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
- `bleed?: "default" | "wide"` (default: `default`)

Поведение `bleed`:
- `default` — обычная ширина в рамках контейнера страницы.
- `wide` — для кейс-страницы расширяет Media на `120px` влево и вправо.
- На мобильных устройствах всегда применяется `default`, даже если задано `wide`.

Пример:
```mdx
<Media kind="image" aspectRatio="16 / 9" bleed="wide" />
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
