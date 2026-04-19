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
<Media kind="image" aspectRatio="16 / 9" src="/media/hero.png" />
```

Поведение layout:
- Соотношение сторон сохраняется по загруженному файлу (или по `aspectRatio`, если задан).
- Для контента кейса media растягивается по ширине контейнера.
- Media выходит за границы текстового контейнера на `20px` слева и справа.
- Скругление media — `20px`.

### 2) `Gallery`
Использование:
- Используется как MDX-компонент: `<Gallery> ... </Gallery>`.
- Внутри `Gallery` поддерживаются только `<Media />`.
- Количество media не ограничено.

Правила раскладки:
- Desktop/tablet: максимум `3` media в строке.
- Для `n <= 3` — одна строка из `n`.
- Для `n > 3` — строки только по `2` или `3` элемента, распределение сбалансированное.
- Алгоритм: `rows = ceil(n / 3)`, стартуем с `rows` строк по `2`, остаток распределяется по `+1` в последние строки.
- Примеры: `4 => 2+2`, `5 => 2+3`, `6 => 3+3`, `7 => 2+2+3`, `8 => 2+3+3`.
- Mobile: максимум `2` media в строке.

Отступы/форма:
- Gap между media и между строками — `20px`.
- Весь блок `Gallery` выходит за границы текстового контейнера на `20px` с обеих сторон.

Пример:
```mdx
<Gallery>
  <Media kind="image" src="/media/shot-1.png" />
  <Media kind="image" src="/media/shot-2.png" />
  <Media kind="video" src="/media/flow.mp4" />
</Gallery>
```

### 3) `Cta`
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
