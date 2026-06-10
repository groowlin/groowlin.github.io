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
- `openable?: boolean` (default: `true`, используется только для media внутри `Gallery`)

Пример:
```mdx
<Media kind="image" aspectRatio="16 / 9" src="/media/hero.png" />
```

Поведение layout:
- Соотношение сторон сохраняется по загруженному файлу (или по `aspectRatio`, если задан).
- Для контента кейса media растягивается по ширине контейнера.
- Media выходит за границы текстового контейнера на `20px` слева и справа.
- Скругление media — `20px`.
- При загрузке media допускается только короткое системное состояние `blur + opacity + scale` из `MediaPlaceholder`; отдельные кастомные анимации на уровне MDX-контента не поддерживаются.

### 2) `Gallery`
Использование:
- Используется как MDX-компонент: `<Gallery> ... </Gallery>`.
- Внутри `Gallery` поддерживаются только `<Media />`.
- Количество media не ограничено.
- Media внутри `Gallery` открывается во fullscreen-overlay по клику или тапу.
- У конкретного `<Media />` внутри `Gallery` fullscreen можно отключить через `openable={false}`.
- Это поведение относится только к media внутри `Gallery` и не применяется к preview, avatar, SVG-иконкам и другим изображениям вне `Gallery`.

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
- Fullscreen-overlay закрывается по `Escape`.
- На устройствах с fine pointer fullscreen-overlay закрывается кликом в любой точке overlay; системный курсор остается обычным, а отдельный close-индикатор следует за курсором, в том числе над media.
- На touch/coarse pointer используется обычная fixed close-button в правом верхнем углу.
- Fullscreen media сохраняет свой тип (`image`/`video`) и вписывается в viewport с `contain`.
- Горизонтальный размер fullscreen media ограничен правилом `min(viewport, page container + 640px)`.
- Backdrop fullscreen-overlay использует `var(--white-20)` и `blur(20px)`.
- Open/close motion fullscreen-overlay задаётся самим UI-рендерером:
  - открытие и закрытие происходят через переход между source bounds media и modal bounds;
  - backdrop появляется/исчезает через короткий fade + blur;
  - на fine pointer floating close-indicator следует за курсором;
  - на reduced motion все эти переходы схлопываются в мгновенное состояние без анимации.
- Hover-отклик trigger внутри `Gallery` допустим только как лёгкий системный feedback. Контент не управляет его параметрами.

Пример:
```mdx
<Gallery>
  <Media kind="image" src="/media/shot-1.png" />
  <Media kind="image" src="/media/shot-2.png" />
  <Media kind="video" src="/media/flow.mp4" />
</Gallery>
```

### 2.1) `shortSummary.media`

`shortSummary.media` описывается во frontmatter кейса, а не в MDX body.
По структуре это тот же `MediaPlaceholder[]`, что используется для `<Media />`.

Правила:
- media короткой версии рендерится после текста shortSummary через системную gallery/lightbox-логику;
- fullscreen, caption, intrinsic dimensions и загрузочное состояние наследуют поведение `MediaPlaceholder` и `GalleryLightbox`;
- assets должны оставаться внутри media-папки своего кейса (`public/media/cases/{slug}/...`);
- отдельная подпапка для short-assets не обязательна;
- имена файлов должны быть уникальными относительно основных media кейса, например `short-before.png` / `short-after.png`.

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
