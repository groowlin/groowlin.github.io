# Аудит загрузки контента — 21 октября 2026

## Вывод

Статическая архитектура подходит сайту. Главные обнаруженные потери находятся в клиентской политике запросов медиа: все полноразмерные изображения галерей заранее загружаются и декодируются, а мобильный рендерер дополнительно запускает последовательность `@2x → full` для изображений независимо от их видимости. Эти механизмы обходят пользу native lazy loading.

Следующий приоритет — общий TTF-шрифт и состав начальных JS/CSS. Переписывание загрузчиков MDX ради скорости посетителя не решит найденные проблемы: они работают при сборке.

Исправления в рамках этого аудита не вносились. Документ описывает подтвержденное поведение кода и отдельный срез существующего экспорта; фактическое время загрузки опубликованного сайта не измерено.

## Область и достоверность

- Изучены `/`, `/about`, семь опубликованных маршрутов `/work/{familia,globus,goldenapple,medicine,portfoliocase,vk,zvuk}`, 404 и условно включаемые игры. Отсутствие VK и Globus среди кликабельных карточек главной не исключает их прямые маршруты из аудита.
- Исследована текущая рабочая копия с уже существовавшими незакоммиченными изменениями. Они не изменялись аудитом.
- Прочитан существующий экспорт `out/` и связанные manifests `.next/`, созданные 20 октября 2026. Его `BUILD_ID`: `LUOyqKVKxs1AE1u_dsB5c`. Свежая сборка не запускалась; состав артефактов может отличаться от текущего кода и production.
- Размеры медиа — фактические размеры локальных файлов. Сумма файлов не равна сетевому transfer страницы: влияют cache, выбор source, DPR, поддержка формата, отмена запросов и действия пользователя.
- Gzip ниже вычислен локально через Node.js `zlib` для сравнения. Это не подтверждение `Content-Encoding` опубликованного сервера. Суммы JS не включают inline-скрипты, внешнюю Метрику и возможные последующие prefetch-запросы.
- Lighthouse, браузер, визуальная оценка, build, typecheck, lint и тесты не запускались. Изменений с влиянием на сборку нет; политика AGENTS.md разрешает чтение кода, документов и diff, но не дает основания запускать эти проверки для такого аудита.
- Не определялись реальные LCP/INP/CLS/TTFB, фактический LCP-элемент, cache headers, HTTP compression, byte ranges видео, waterfalls и decoded memory. Ниже нет утверждений о измеренном ускорении или балле производительности.

Приоритеты: **P1** — подтвержденный механизм существенной лишней загрузки; **P2** — существенный резерв или риск критического пути; **P3** — вторичная оптимизация/наблюдение, требующее учета поведения и контракта.

## 1. P1: галерея заранее запрашивает все full-изображения

**Где:** [GalleryLightbox.tsx:1474](C:/Users/abara/groowlin.github.io/components/media/GalleryLightbox.tsx:1474), [preloadImageSource:219](C:/Users/abara/groowlin.github.io/components/media/GalleryLightbox.tsx:219), [WorkArticle.tsx:17](C:/Users/abara/groowlin.github.io/components/sections/WorkArticle.tsx:17).

После mount `useEffect` собирает все `galleryItems` с `kind=image` и `fullSrc`. В `requestIdleCallback`, а без него через 120 мс, для каждого запускаются `new Image()` и `decode()`. Открывать lightbox или прокручивать страницу для этого не требуется. В кейсе общий `GalleryLightboxScope` объединяет изображения разных Gallery.

Следствие: чтение первых абзацев инициирует запросы больших изображений из всего рассказа. `requestIdleCallback` выбирает момент выполнения JS; он не означает, что сеть свободна, посетитель собирается открыть галерею или изображения нужны в viewport. Декодирование тоже выполняется заранее. Пиковые CPU/memory затраты не измерены.

Module-level `Set`/`Map` дедуплицируют одинаковые URL между экземплярами галерей. Поэтому находка не означает, что каждая Gallery повторно скачивает один и тот же full-файл.

**Исправление:** сохранить low/full progressive loading, но запрашивать full для открываемого/активного изображения и ограниченного числа соседей; существующий hover/focus preload использовать как сигнал намерения. Не скачивать весь scope после mount.

Контракт ДС требует немедленной смены индекса и геометрии, декодирования видимого слоя и хранения full DOM только для текущего изображения и соседей. Безусловный preload всех full не обязателен. См. [ДС:386](C:/Users/abara/groowlin.github.io/design-system-spec.md:386), [справочник блоков:71](C:/Users/abara/groowlin.github.io/docs/specs/case-blocks-reference.md:71). При реализации нужно явно синхронизировать описание политики запросов.

### Масштаб full-изображений

Учтены image-блоки полного рассказа. Short-ветка и другие декоративные ресурсы в таблицу не включены. Все кейсы первоначально открываются в full mode.

| Страница | Изображений | Base, МиБ | @2x, МиБ | Full, МиБ |
|---|---:|---:|---:|---:|
| `/work/familia` | 7 | 1,69 | 5,37 | 10,96 |
| `/work/goldenapple` | 4 | 0,80 | 2,72 | 5,85 |
| `/work/medicine` | 6 | 1,14 | 3,62 | 6,81 |
| `/work/portfoliocase` | 8 | 1,23 | 3,79 | 7,50 |
| `/work/vk` | 5 | 0,77 | 2,31 | 4,47 |
| `/work/zvuk` | 4 | 1,06 | 3,47 | 7,49 |
| `/about` | 4 | 0,61 | 2,32 | 14,58 |

Колонка Full — объем файлов, которые намеревается загрузить idle-механизм при сохранении mounted-страницы. Это не измеренная нагрузка первого экрана. Главная не монтирует галерею и не запускает этот эффект; у Globus и 404 рассматриваемый контент состоит из видео.

## 2. P1: mobile inline обходит lazy loading и заканчивает на full

**Где:** [MediaPlaceholder.tsx:140](C:/Users/abara/groowlin.github.io/components/media/MediaPlaceholder.tsx:140), [эффект:224](C:/Users/abara/groowlin.github.io/components/media/MediaPlaceholder.tsx:224), [img:654](C:/Users/abara/groowlin.github.io/components/media/MediaPlaceholder.tsx:654).

Для мобильного inline image формируется очередь `retinaImageSrc, fullImageSrc`. Эффект сразу загружает каждый кандидат через отдельный `new Image`, последовательно подменяя отображаемый URL. Нет условия видимости блока, необходимой ширины, DPR или состояния сети. Эффект запускается отдельно у каждого mounted image.

`loading=lazy` остается на отображаемом `<img>`, но не управляет запросами этих preload-объектов. На mobile конечный inline source — full, даже когда размер контейнера значительно меньше. `@2x` и `full` — разные URL: последовательность создает дополнительную работу относительно выбора одного подходящего ресурса браузером.

Начальный серверный render использует desktop density srcset, затем mobile hydration отключает его. Какие промежуточные запросы браузер реально успеет начать, без waterfall неизвестно. Общий браузерный cache может объединять совпадающие full URL с preload галереи; складывать две full-загрузки как гарантированный двойной transfer неправильно.

**Исправление:** позволить браузеру выбирать подходящий inline ресурс по ширине/DPR; не запускать безусловный переход к full. Если progressive upgrade сохраняется, привязать его к видимости и необходимому разрешению, ограничить очередь запросов. Full оставить для сценария, где его разрешение востребовано.

Это меняет существующее mobile-поведение, поэтому его нужно явно включить в scope исправления и синхронизировать документы. Обязательного требования скачивать full на mobile в Media Placeholder-контракте ДС нет.

## 3. P2: общий шрифт поставляется большим TTF

**Где:** [layout.tsx:15](C:/Users/abara/groowlin.github.io/app/layout.tsx:15), [контракт шрифта в ДС:37](C:/Users/abara/groowlin.github.io/design-system-spec.md:37).

Источник — `app/fonts/inter/Inter-Variable.ttf`, 876 576 байт. В существующем экспорте опубликован TTF того же размера и присутствует font preload на обычных страницах. Локальное gzip-сжатие дает 468 926 байт; реальный response encoding не исследован.

Локальное размещение, variable font и `display=swap` уже полезны. Но `next/font/local` не перекодировал этот TTF в WOFF2: установленный loader читает исходный buffer и передает его в `emitFontFile`, что подтверждается экспортом.

**Исправление:** использовать локальный variable WOFF2 с сохранением необходимых начертаний, кириллицы, латиницы и символов сайта. Возможное сокращение набора глифов требует учета всего контента. Точный выигрыш без подготовки файла неизвестен. При замене источника синхронизировать ДС и структурные описания.

WOFF2 поддерживается `next/font/local`: [официальная документация](https://nextjs.org/docs/app/api-reference/components/font).

## 4. P2: модальная функциональность и отключенные игры остаются в начальных чанках

**Где:** [GalleryLightbox.tsx:14](C:/Users/abara/groowlin.github.io/components/media/GalleryLightbox.tsx:14), [WorkShortSummaryToggle.tsx:24](C:/Users/abara/groowlin.github.io/components/sections/WorkShortSummaryToggle.tsx:24), [mdx-components.tsx:9](C:/Users/abara/groowlin.github.io/lib/content/mdx-components.tsx:9), [app/not-found.tsx:2](C:/Users/abara/groowlin.github.io/app/not-found.tsx:2), [app/page.tsx:3](C:/Users/abara/groowlin.github.io/app/page.tsx:3).

Lightbox, его motion/debug-функциональность и связанные компоненты соединены статическими импортами. Отложенных `import()`/`next/dynamic` в исследованном клиентском коде нет. Тяжелая логика открытия, навигации и жестов находится в том же компоненте, который нужен для inline-галереи. 404 также импортирует `WorkArticle`, а общая карта MDX-компонентов — `PortfolioMotionDemo`.

В существующем экспорте начальные script-теги главной, About и кейсов ссылаются на общий чанк `1ff142179ebbb664.js` размером 254 707 байт / 79 107 байт gzip. Внутри присутствует код lightbox и debug-панели. Это вес всего чанка, не отдельно lightbox.

В HTML главной **нет** `data-games-experience`, но подключенный чанк `5e44e4369b06559b.js` содержит `GamesExperience` и Pixel Perfect вместе с HomeShowcase. В workflow `ENABLE_GAMES=false`; условие в JSX предотвращает mount, однако в исследованном экспорте не устранило код из загружаемого чанка. Размер всего чанка — 156 769 байт / 46 251 байт gzip; приписывать весь объем играм нельзя.

Все исследованные страницы экспорта также подключают одинаковые четыре CSS-файла: суммарно 112 010 байт / 19 301 байт gzip. Один CSS-чанк размером 54 166 байт содержит игровые стили. Это вторичный расход по сравнению с изображениями и шрифтом; полный объем этого чанка не равен весу только игр.

**Исправление:** отделить inline media от модальной функциональности и загружать последнюю при намерении открыть lightbox; изолировать игры и редкие demo/debug-функции. Сохранить SSR inline-контента. Учитывать общий импортный граф через MDX и not-found: одного условного JSX недостаточно. Ожидаемое сокращение устанавливать по свежим артефактам после реализации, не по длине TSX.

Отложенная загрузка клиентских модалок поддерживается Next.js. Сам по себе dynamic import из Server Component не гарантирует требуемое разделение клиентского кода: [официальная документация](https://nextjs.org/docs/app/guides/lazy-loading).

### Вес существующего экспорта

**Modern JS** — сумма уникальных внешних script URL в HTML, за исключением `noModule`. Отдельный legacy-файл 112 594 байта / 39 627 байт gzip исключен из основной оценки: современные браузеры не должны исполнять его как обычный script.

| Страница | HTML, байт | HTML gzip, байт | Modern JS, байт | JS gzip, байт | RSC index.txt, байт |
|---|---:|---:|---:|---:|---:|
| `/` | 45 130 | 8 759 | 896 044 | 268 381 | 22 068 |
| `/about` | 48 855 | 8 800 | 739 275 | 222 130 | 23 884 |
| `/work/familia` | 75 592 | 15 197 | 738 323 | 221 655 | 36 474 |
| `/work/globus` | 40 090 | 8 019 | 738 323 | 221 655 | 21 188 |
| `/work/goldenapple` | 65 439 | 12 596 | 738 323 | 221 655 | 32 170 |
| `/work/medicine` | 71 410 | 14 497 | 738 323 | 221 655 | 34 506 |
| `/work/portfoliocase` | 100 416 | 22 652 | 738 323 | 221 655 | 47 981 |
| `/work/vk` | 61 496 | 10 993 | 738 323 | 221 655 | 29 702 |
| `/work/zvuk` | 67 105 | 13 154 | 738 323 | 221 655 | 33 184 |
| 404 | 36 653 | 7 478 | 735 401 | 220 708 | — |

Это инвентаризация файлов, не browser coverage и не замер execution cost. Общие чанки могут переиспользоваться при переходах. HTML уже содержит inline RSC; отдельный `index.txt` показан для контекста клиентской навигации, его нельзя автоматически прибавлять к первому HTML-запросу.

## 5. P2: изображения почти целиком PNG, выбор разрешения ограничен density 1x/2x

**Где:** [media-metadata.server.ts:338](C:/Users/abara/groowlin.github.io/lib/content/media-metadata.server.ts:338), [MediaPlaceholder.tsx:654](C:/Users/abara/groowlin.github.io/components/media/MediaPlaceholder.tsx:654), [media-prepare.mjs:8](C:/Users/abara/groowlin.github.io/scripts/media-prepare.mjs:8).

В `public/` — 250 файлов / 160,73 МиБ: 191 PNG / 119,04 МиБ, 13 MP4 / 34,08 МиБ, 7 WebM / 7,31 МиБ, 38 SVG / 0,30 МиБ и один ICO. WebP/AVIF-файлов нет. Это весь каталог публикации, а не сумма ресурсов одной страницы.

Автогенерируемый image srcset содержит `1x, 2x`; width-кандидатов и `sizes` в media renderer нет. Сам по себе density srcset допустим для фиксированного размера. Для изменяющейся ширины контента он не позволяет явно выбирать файл по ширине контейнера. Мобильная full-цепочка дополнительно отменяет этот выбор.

Примеры:

- Familia `2_gallery_1`: 744×420 / 0,63 МиБ; 1488×840 / 2,14 МиБ; 2232×1260 / 4,56 МиБ.
- About `4`: 240×320 / 0,17 МиБ; 480×640 / 0,67 МиБ; 1980×2640 / 7,14 МиБ.

**Исправление:** сначала устранить безусловные запросы full, затем подготовить подходящие размеры и более компактные форматы. Скриншоты интерфейсов требуют сохранения читаемости; визуальное сравнение выполняет пользователь. Гарантированный процент экономии без конверсии неизвестен.

Существующий `scripts/media-prepare.mjs` уже поддерживает WebP/AVIF и явные размеры, но по умолчанию сохраняет формат входного файла. Новый серверный image optimizer для этого не обязателен.

`images.unoptimized=true` в Next-конфиге соответствует выбранному static export. Простое удаление настройки не решает проблему: default Image Optimization требует неподдерживаемого здесь серверного механизма. Источники: [Image unoptimized](https://nextjs.org/docs/app/api-reference/components/image), [ограничения static export](https://nextjs.org/docs/app/guides/static-exports).

## 6. P2: inline-видео запускаются при mount без viewport lifecycle

**Где:** [MediaPlaceholder.tsx:529](C:/Users/abara/groowlin.github.io/components/media/MediaPlaceholder.tsx:529), [about.mdx:28](C:/Users/abara/groowlin.github.io/content/pages/about.mdx:28).

Inline video получает `autoPlay`, `muted`, `loop`, `playsInline` и `preload=metadata`. В renderer нет ограничения по IntersectionObserver и паузы по уходу из viewport/скрытию вкладки; poster не передается. Браузер может применять собственные ограничения autoplay, но код не задает такой lifecycle.

На About два видео ниже основного текста: inline WebM вместе 1,46 МиБ, MP4 fallback вместе 2,53 МиБ. Это альтернативные source: нельзя считать, что каждый браузер обязательно скачивает оба формата. Globus использует inline `main.webm` 419 004 байта или MP4 786 140 байт; 404 — существенно меньше: 33 676 / 93 644 байта соответственно.

`autoplay` имеет приоритет над `preload`; `metadata` не гарантирует отсутствие загрузки для воспроизведения. См. [MDN video](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video).

При открытии progressive video модалка монтирует low/full video с `preload=auto`: возможны два параллельных медиапотока. Это осознанный handoff-механизм; точный transfer не измерен. При оптимизации нужно сохранить готовый первый кадр и синхронизацию времени.

**Исправление:** привязать старт и остановку inline video к видимости и вкладке; отдавать source при приближении к экрану. Изменение poster требует отдельного согласования визуала. Для home preview mount уже вызывается пользовательским hover/focus — его сценарий отличается от длинной страницы About.

## 7. P2: готовый SSR-контент скрыт до клиентского reveal

**Где:** [SiteShell.tsx:37](C:/Users/abara/groowlin.github.io/components/shell/SiteShell.tsx:37), [PageRevealSequence.tsx:176](C:/Users/abara/groowlin.github.io/components/motion/PageRevealSequence.tsx:176), [reveal CSS:6](C:/Users/abara/groowlin.github.io/components/motion/page-reveal-sequence.module.css:6).

Root рендерится с `data-state=pending`. При `scripting:enabled` CSS скрывает leaf-элементы `[data-page-reveal]` через opacity и blur. Для показа нужен клиентский lifecycle: ожидание `app:scroll-restored` либо fallback 250 мс, два requestAnimationFrame, затем reveal-анимация. Если событие восстановления уже прошло до подписки, срабатывает fallback. Значение по умолчанию opacity/filter-анимации — 0,7 с, со stagger.

Это создает зависимость видимого контента от JS даже при готовом HTML. Время видимости и LCP могут увеличиться на медленном устройстве или сети; точная прибавка не измерялась. Нельзя суммировать все указанные длительности как универсальное время LCP: события и анимации пересекаются, а LCP-элемент неизвестен.

**Исправление:** включить в согласованный scope раннюю видимость критического контента и сохранение остальной анимации. Это изменение принятого motion-поведения, его нельзя проводить как незаметную техническую перестановку. Reduced-motion fallback уже предусмотрен.

## 8. P2, кандидат на runtime-подтверждение: первая картинка тоже lazy

**Где:** [MediaPlaceholder.tsx:659](C:/Users/abara/groowlin.github.io/components/media/MediaPlaceholder.tsx:659).

Все inline images получают `loading=lazy`; высокий fetch priority задан только modal image. Это относится и к начальным `main.png` кейсов. Если такая картинка является LCP, ее запрос может начаться позже необходимого. Не установлено, что на каждом экране LCP — именно изображение: им может быть текст.

**Исправление:** после определения фактического LCP дать отдельную политику первому нужному media; сохранить lazy для остальных. Не назначать high priority всем картинкам и не добавлять глобальный preload всех hero. [Рекомендации по LCP](https://web.dev/articles/optimize-lcp).

## Вторичные наблюдения

### Автоматический prefetch маршрутов — P3, возможность настройки

[HomeShowcase.tsx:1833](C:/Users/abara/groowlin.github.io/components/home/HomeShowcase.tsx:1833) и TopCard используют Next Link без отключения prefetch. Установленный Next 16.1.6 включает его по умолчанию; в production ссылки в viewport могут заранее получать route payload. В главном HTML существующего экспорта четыре кликабельных кейса и `/about/`.

Сам prefetch полезен для скорости перехода и не является подтвержденным багом. В экспортированных `index.txt` четырех кейсов вместе 136 334 байта; это не измеренные prefetch-запросы: Next может запрашивать сегменты и переиспользовать cache. Prefetch RSC сам по себе не означает mount страницы и запуск ее full-image эффектов.

Настраивать prefetch по намерению разумно только с учетом реального waterfall и скорости переходов, после устранения P1. [Документация Next.js](https://nextjs.org/docs/app/guides/prefetching).

### Low-слои lightbox — P3, действующий контракт

[LightboxImageLayers.tsx:116](C:/Users/abara/groowlin.github.io/components/media/LightboxImageLayers.tsx:116) монтирует low-изображения всего scope при открытой image-сессии, с eager loading. Full DOM ограничен активным изображением и соседями. Постоянные low-слои закреплены контрактом; их удаление не входит в рекомендуемое исправление P1. В первую очередь нужно устранить предварительную загрузку всех full до открытия.

### Неиспользуемые файлы — P3, вес публикации

Восемь файлов в корне `public/` занимают 6,86 МиБ. `public/media/cases/globus/NDA main.mp4` и `NDA preview.mp4` вместе занимают 21,53 МиБ. Ссылки на них не найдены в проверенных app/components/content/lib/config/workflow/scripts/specs/ДС/структурных JSON.

Их наличие увеличивает статический артефакт, но не означает загрузку браузером. Прямые внешние ссылки или использование вне репозитория не исследованы; автоматическое удаление не рекомендуется на основании одного поиска.

SHA256 выявил пары одинаковых full PNG Familia: `3_gallery_1-full.png` / `short-account-full.png` и `6_gallery_1-full.png` / `short-gift-card-full.png`. Вместе дубли добавляют около 2,01 МиБ. Разные URL не дают того же переиспользования HTTP cache, что один URL. При этом уникальные short-имена предписаны контентным контрактом: дедупликация требует его учета.

### Игровые изображения — условный резерв

При включенных играх heart assets 1254×1254 весят около 0,60/0,57 МиБ и показываются как 30×30; intro 1312×1199 / 1,21 МиБ и win 1254×1254 / 0,90 МиБ показываются примерно как 109×100. Это избыточное разрешение для указанного размера. Три mascot PNG запрошены eager при mount GamesExperience, вместе около 64,6 КБ.

При текущем `ENABLE_GAMES=false` workflow эти DOM/media не должны монтироваться. Их нельзя включать в измеренный трафик production; отдельно подтверждено только наличие игрового кода в чанке существующего экспорта.

## Что уже сделано правильно

- `output=export`, `trailingSlash=true`, `generateStaticParams` и `dynamicParams=false`: контент заранее собран, runtime API/DB-запросов для кейсов нет.
- MDX loader помечен `server-only`; MDX source и файловое чтение не выполняются браузером. Передача server-rendered children через Client Component сама по себе не превращает весь рассказ в клиентский исходный код.
- Главная получает компактные entries, а не все тела кейсов. Hover preview монтируется только при востребованном элементе и hover-capable устройстве. Mobile full-upgrade на `variant=homePreview` не распространяется.
- Full и short взаимоисключаются в DOM; обе медиаветки одновременно не монтируются. Short-данные присутствуют в props, но их изображения не обязаны скачиваться до выбора режима.
- Intrinsic dimensions/aspect ratio вычисляются при сборке, что помогает резервировать место под медиа.
- Есть WebM с MP4 fallback; это выбор альтернативы браузером.
- Font локальный, variable, с `display=swap`; нет отдельного запроса к Google Fonts.
- Метрика подключается `afterInteractive`, внешняя загрузка async, Webvisor и clickmap отключены. Без runtime trace нет основания объявлять ее главным тормозом сайта.
- `PortfolioMotionDemo` уже учитывает IntersectionObserver и document visibility для playback. Это полезный локальный пример lifecycle, хотя код компонента пока не отложен.

## Кеширование и границы вывода

В экспорте `_next/static` использует хешированные имена. Public media имеет читаемые стабильные URL. Фактические HTTP `Cache-Control`, `ETag`, `Content-Encoding`, редиректы домена и byte ranges невозможно вывести из этого факта: ответ сервера не исследовался.

Не доказано, что кеширование или сжатие production настроено плохо. Добавлять Next `headers()` ради GitHub Pages нельзя: static export не поддерживает серверные headers-правила. Поведение хоста нужно учитывать отдельно. [Ограничения Next static export](https://nextjs.org/docs/app/guides/static-exports).

Текущая продуктовая аналитика не содержит явного сбора CWV в исследованном коде, а ее спецификация прямо исключает performance monitoring из scope. Поведенческие метрики не заменяют LCP/INP/CLS; это ограничение доказательств аудита, не ошибка аналитического контракта.

## Инструменты и технологии

- Субагент **Silvio / explorer**: read-only исследование медиа, размеров assets, home preview и нормативного контракта; основной агент исследовал static generation, импортный граф, навигацию, font, артефакты и собрал отчет.
- PowerShell: `Get-Content`, `Get-ChildItem`, `Get-Item`, `Measure-Object`, `Group-Object`, `Get-FileHash`; `rg`; `git status --short`. Node.js: `fs`, `path`, `vm` для чтения сгенерированных manifests, `zlib` для локальных размеров сжатия. Использовались также размеры, PNG headers и SHA256 без просмотра изображений.
- Web: только первичная документация Next.js, MDN и web.dev по ссылкам в отчете. Проверен и установленный код Next 16.1.6: `node_modules/next/dist/client/app-dir/link.js`, `node_modules/next/dist/compiled/@next/font/dist/local/loader.js`. Доступного инструмента Context7 в сессии нет; обязательное по AGENTS обращение к нему выполнить невозможно, использованы указанные первичные источники и локальный код установленной версии. Внешняя документация Next отражает актуальную ветку 16 и не подменяет факты о локальной сборке.
- Прочитаны полностью или фрагментами: `AGENTS.md`, `package.json`, `next.config.mjs`, `.github/workflows/deploy-pages.yml`; `app/{layout,page,not-found}.tsx`, `app/about/page.tsx`, `app/work/[slug]/page.tsx`, `app/scroll-restoration-script.ts`, `app/globals.css`; `lib/features.ts`, `lib/content/{mdx.server,mdx-components}.tsx`, `lib/content/{site.server,work.server,media-metadata.server}.ts`; `components/media/{MediaPlaceholder,GalleryLightbox,GalleryLightboxScope,LightboxImageLayers,LightboxMotionDebugPanel}.tsx` и профильные CSS; `components/home/HomeShowcase.tsx` и CSS; `components/shell/{PersistentSiteFrame,SiteShell}.tsx` и CSS; `components/navigation/{NavigationLifecycleProvider,AnimatedTopCard,TopCard}.tsx`; `components/motion/{PageRevealSequence,MotionPage,MdxMotionComponents}.tsx` и reveal CSS; `components/sections/{WorkArticle,WorkShortSummaryToggle,PortfolioMotionDemo}.tsx`; `components/games/{GamesEntry,GameModeShell,PixelPerfect}.tsx`, `pixel-perfect-copy.ts` и фрагменты игровых CSS; все `content/work/*.mdx`, `content/pages/{about,not-found}.mdx`, `content/site/home.mdx`, top-card MDX; `design-system-spec.md`, `docs/specs/{case-blocks-reference,site-and-pages-mdx-structure,portfolio-analytics-metrics-spec}.md`, `scripts/media-prepare.mjs`. Поиском охвачены также аналитический код, scripts/specs и оба структурных JSON.
- Прочитаны существующие артефакты: `.next/BUILD_ID`, `.next/app-path-routes-manifest.json`, manifests client references для home/about/work; HTML и RSC `index.txt` всех перечисленных страниц в `out/`, подключенные JS/CSS, emitted font; metadata файлов `public/`.
- Создан только этот отчет: `docs/audits/2026-10-21-content-loading.md`.
- Допущение для оценки потенциального media-трафика: холодный cache и сохранение полного рассказа mounted до выполнения preload. Реальные пользовательские тайминги и transfer не выводились из размеров файлов.

## Порядок исправления и последующего подтверждения

1. Убрать глобальный idle full-preload и безусловную mobile full-цепочку, сохранив декодирование, progressive handoff и поведение открытой галереи. Это самый прямой способ сократить невостребованные запросы.
2. Заменить TTF на подходящий WOFF2; затем разделить inline media и редкие клиентские функции, исключить отключенные игры из начального импортного графа.
3. Подготовить размеры/форматы изображений; согласовать viewport lifecycle видео и раннюю видимость критического контента. Политику hero/LCP выбирать после определения фактического LCP-элемента.
4. При реализации синхронизировать затронутые разделы ДС, профильные specs и оба структурных JSON в той же правке. Проверки запускать только по механизму влияния на сборку из раздела 10 AGENTS.md: для новых imports/font resolution — применимые команды, для одних UI-взаимодействий — без автоматических тестов и визуальной оценки.
5. Отдельный согласованный runtime-аудит нужен, чтобы подтвердить отсутствие невостребованных full-запросов, фактический modern bundle, cold/warm cache, hero priority и CWV на mobile/desktop. Критерий успеха — наблюдаемое изменение запросов и метрик при сохранении согласованного поведения, а не заявленный процент ускорения по исходникам.
