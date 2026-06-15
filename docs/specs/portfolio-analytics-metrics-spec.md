# Portfolio Analytics Metrics Spec

## 1. Purpose
Контракт для продуктовой аналитики портфолио-сайта.

Документ фиксирует:
- какие события считаются source of truth;
- какие ключевые сценарии анализируются;
- какие метрики считаются поверх событий;
- как интерпретировать значения;
- какие правила должен соблюдать дальнейший ручной анализ данных.

Цель аналитики:
- измерять не "контакт" как главный KPI;
- измерять интерес к кейсам;
- измерять использование ключевого функционала;
- отделять случайный просмотр от осмысленного взаимодействия.

## 2. Scope
Спека относится к:
- сайту `rodyukov.art`;
- счетчику `Yandex Metrica`;
- событиям, отправляемым из текущего Next.js-проекта;
- ручному weekly-анализу данных из интерфейса и экспортов Метрики.

Спека не описывает:
- маркетинговую атрибуцию;
- performance-мониторинг;
- Webvisor, replay, heatmaps;
- CRM, офлайн-конверсии и hiring funnel вне сайта.

## 3. Product Analytics Goal
Главная аналитическая цель:

`оценивать качество вовлечения в кейсы и полезность ключевого функционала внутри кейсов`

Главный объект анализа:
- не прямой переход в контакт;
- не pageviews сами по себе;
- а признаки профессионального интереса к работам и сценариям их просмотра.

## 4. Primary Questions
Аналитика должна отвечать на следующие вопросы:

1. Открывают ли пользователи кейсы после входа на главную.
2. Исследуют ли пользователи несколько кейсов, а не один случайный.
3. Дочитывают ли кейсы глубоко.
4. Используют ли пользователи `short mode`.
5. Помогает ли `short mode` перейти к следующему осмысленному действию.
6. Используют ли пользователи fullscreen media.
7. Замечают ли пользователи интерактивную механику главной.
8. Переходят ли пользователи на страницу `About`.

## 5. Source Events
Ниже перечислены source events, которые считаются каноническими для аналитики.

### 5.1 Home Events
- `view_home`
  - просмотр главной страницы.
- `home_preview_open`
  - первое открытие hover-preview на главной в рамках визита.
- `home_preview_change`
  - переключение preview с одного кейса на другой на главной.
- `click_case_card`
  - переход в кейс с главной страницы.

### 5.2 Case Events
- `view_case`
  - открытие страницы кейса.
- `view_second_case`
  - открытие второго кейса в рамках одного визита.
- `case_scroll_90`
  - достижение глубины 90% на странице кейса в полном режиме.
- `case_read_120s`
  - 120 секунд активного чтения кейса в полном режиме.

### 5.3 Feature Events
- `short_mode_toggle_on`
  - включение сокращенного режима кейса.
- `short_mode_toggle_off`
  - возврат из сокращенного режима в полный кейс.
- `image_fullscreen_open`
  - открытие медиа в fullscreen.

### 5.4 Static Page Events
- `view_about`
  - открытие страницы `About`.

## 6. Event Semantics

### 6.1 `view_home`
Считается как page-level event.
Может срабатывать несколько раз у одного пользователя:
- при повторных заходах;
- при reload;
- при повторных визитах.

### 6.2 `home_preview_open`
Срабатывает только на первое открытие preview на главной в рамках одного клиентского состояния страницы.

Смысл:
- сигнал, что пользователь вообще заметил и активировал механику preview.

### 6.3 `home_preview_change`
Срабатывает при переходе между разными preview на главной.

Смысл:
- сигнал, что пользователь не просто задел hover, а начал исследовать список кейсов через механику главной.

### 6.4 `click_case_card`
Срабатывает при переходе в кейс с главной.

Смысл:
- главный action-bridge между главной и кейсами.

### 6.5 `view_case`
Срабатывает на открытие страницы кейса.

Смысл:
- базовый event входа в содержательный контент.

### 6.6 `view_second_case`
Срабатывает, если в рамках одного визита был открыт второй кейс.

Смысл:
- сильный сигнал интереса выше, чем одиночный `view_case`.

### 6.7 `case_scroll_90`
Срабатывает только для полного кейса.

Смысл:
- strong signal deep reading.

### 6.8 `case_read_120s`
Срабатывает только для полного кейса.

Смысл:
- strong signal sustained reading.

Замечание:
- отсутствие этого события не равно провалу кейса;
- для короткого или очень структурного сценария пользователь может считать контент полезным без 120 секунд чтения.

### 6.9 `short_mode_toggle_on`
Срабатывает на включение сокращенного режима.

Смысл:
- adoption ключевой feature.

### 6.10 `short_mode_toggle_off`
Срабатывает на возврат в полный режим.

Смысл:
- short mode может выступать entry point в полный кейс;
- само по себе событие не является ни положительным, ни отрицательным без контекста.

### 6.11 `image_fullscreen_open`
Срабатывает на открытие media в fullscreen.

Смысл:
- показатель ценности визуального слоя и интереса к деталям кейса.

### 6.12 `view_about`
Срабатывает при открытии страницы `About`.

Смысл:
- вторичный signal of professional interest.

## 7. Key Scenarios

### 7.1 Home Engagement Scenario
Сценарий:

`view_home -> home_preview_open -> home_preview_change -> click_case_card`

Смысл:
- проверить, замечают ли пользователи механику главной;
- исследуют ли ее;
- помогает ли она открыть кейс.

### 7.2 Case Exploration Scenario
Сценарий:

`view_case -> view_second_case`

Смысл:
- определить, вызывает ли один кейс интерес к следующим.

### 7.3 Deep Reading Scenario
Сценарий:

`view_case -> case_scroll_90 and/or case_read_120s`

Смысл:
- определить, происходит ли глубокое чтение кейсов, а не поверхностный просмотр.

### 7.4 Short Mode Scenario
Сценарий:

`view_case -> short_mode_toggle_on -> next outcome`

Допустимые следующие outcomes:
- `short_mode_toggle_off`
- `view_second_case`
- `view_about`
- `image_fullscreen_open`
- exit without next tracked action

Смысл:
- short mode оценивается не только по adoption, но и по распределению исходов после включения.

### 7.5 Fullscreen Media Scenario
Сценарий:

`view_case -> image_fullscreen_open`

Смысл:
- понять, воспринимаются ли визуальные материалы как достаточно ценные для детального просмотра.

## 8. Derived Metrics
Ниже перечислены derived metrics, которые должны считаться поверх source events.

### 8.1 Home Metrics

#### `Home Preview Open Rate`
Формула:

`home_preview_open / view_home`

Смысл:
- доля просмотров главной, в которых preview вообще был активирован.

#### `Home Preview Exploration Rate`
Формула:

`home_preview_change / home_preview_open`

Смысл:
- насколько часто первое касание preview переходит в исследование нескольких preview.

#### `Case Card Click Rate`
Формула:

`click_case_card / view_home`

Смысл:
- насколько эффективно главная ведет к открытию кейса.

### 8.2 Case Metrics

#### `Case Open Rate`
Формула:

`view_case / view_home`

Смысл:
- доля просмотров главной, закончившихся открытием кейса.

#### `Multi-Case Rate`
Формула:

`view_second_case / view_case`

Смысл:
- доля открывших кейс, которые пошли изучать второй кейс.

#### `Deep Read Rate`
Формула:

`(users or visits with case_scroll_90 or case_read_120s) / view_case`

Смысл:
- доля case visits, которые дошли до сильного сигнала чтения.

### 8.3 Short Mode Metrics

#### `Short Mode Adoption Rate`
Формула:

`short_mode_toggle_on / view_case`

Смысл:
- как часто пользователи вообще включают short mode.

#### `Short Mode Return-to-Full Rate`
Формула:

`short_mode_toggle_off / short_mode_toggle_on`

Смысл:
- как часто short mode становится входом в полный кейс.

#### `Short Mode Outcome Distribution`
Формула:

распределение долей от `short_mode_toggle_on` по следующим исходам:
- `short_mode_toggle_off`
- `view_second_case`
- `view_about`
- `image_fullscreen_open`
- `no tracked follow-up`

Смысл:
- основной способ анализа полезности short mode.

### 8.4 Fullscreen Metrics

#### `Fullscreen Open Rate`
Формула:

`image_fullscreen_open / view_case`

Смысл:
- как часто case visits приводят к детальному просмотру media.

### 8.5 About Metrics

#### `About View Rate`
Формула:

`view_about / view_case`

Смысл:
- как часто после кейса пользователь переходит к странице `About`.

## 9. Composite Interpretation Layer
Для ручного анализа нужно использовать и более простые интерпретационные слои.

### 9.1 `Home Interaction Signal`
Считается положительным, если в рамках визита был хотя бы один из signals:
- `home_preview_open`
- `home_preview_change`
- `click_case_card`

### 9.2 `Deep Case Engagement Signal`
Считается положительным, если в рамках визита был хотя бы один из signals:
- `view_second_case`
- `case_scroll_90`
- `case_read_120s`
- `view_about`

### 9.3 `Feature Usage Signal`
Считается положительным, если в рамках визита был хотя бы один из signals:
- `short_mode_toggle_on`
- `image_fullscreen_open`

## 10. Interpretation Rules

### 10.1 General Rule
На низком объеме трафика нельзя опираться на проценты как на устойчивый вывод.

При малом числе визитов приоритет анализа:
1. наличие события вообще;
2. соотношение `goal visits` и `goal completions`;
3. динамика по неделям;
4. только потом conversion rate.

### 10.2 `Goal Completions`
`Достижения цели` в Метрике:
- сколько раз событие произошло вообще;
- не равно числу пользователей;
- не равно числу визитов.

### 10.3 `Goal Visits`
`Целевые визиты` в Метрике:
- сколько визитов содержали хотя бы одно достижение цели.

### 10.4 `Conversion`
`Конверсия` в Метрике:
- доля визитов, в которых цель была достигнута.

На малом объеме трафика:
- не использовать как главный ориентир;
- рассматривать только как вспомогательную долю.

### 10.5 Short Mode Rule
`short_mode_toggle_on -> exit`
не должен автоматически интерпретироваться как негативный исход.

Правильный анализ:
- смотреть на распределение исходов;
- сравнивать долю `return-to-full`, `next-case`, `about`, `fullscreen`, `exit`;
- делать вывод только по относительной структуре сценариев.

### 10.6 Home Preview Rule
`home_preview_open` сам по себе не доказывает ценность механики главной.

Правильный анализ:
- `home_preview_open` отвечает за заметность;
- `home_preview_change` отвечает за исследование;
- `click_case_card` отвечает за переход в содержательный сценарий.

## 11. Recommended Reporting Layers

### 11.1 Manual Layer in Metrica
Для интерфейса Метрики цели должны быть сгруппированы по блокам:

#### Home
- `view_home`
- `home_preview_open`
- `home_preview_change`
- `click_case_card`

#### Cases
- `view_case`
- `view_second_case`
- `case_scroll_90`
- `case_read_120s`

#### Features
- `short_mode_toggle_on`
- `short_mode_toggle_off`
- `image_fullscreen_open`
- `view_about`

### 11.2 Automation Layer
Для weekly-анализа нужно собирать и сопоставлять:
- raw counts;
- goal visits;
- conversion where useful;
- derived metrics из раздела 8;
- interpretation layer из раздела 9.

## 12. Minimum Weekly Analysis Structure

### 12.1 Raw Events Section
Для каждого source event:
- event name;
- total completions;
- goal visits;
- conversion;
- period.

### 12.2 Derived Metrics Section
Для каждой derived metric:
- metric name;
- formula;
- numerator;
- denominator;
- result;
- interpretation note.

### 12.3 Summary Section
Краткая weekly-summary структура должна отвечать на вопросы:
- замечают ли главную механику;
- открывают ли кейсы;
- исследуют ли больше одного кейса;
- есть ли deep reading;
- используется ли short mode;
- используется ли fullscreen;
- есть ли интерес к `About`.

## 13. Recommended Data Transfer Format
Для weekly-анализа предпочтителен один из форматов:
- PDF-отчет из Метрики;
- CSV-экспорт из Метрики;
- набор скриншотов по ключевым блокам.

Если данных мало и анализ короткий, достаточно:
- PDF weekly report;
- или 2-4 скриншотов по блокам `Home`, `Cases`, `Features`.

## 14. Out of Scope
Вне рамок текущей спеки:
- Webvisor;
- replay;
- heatmaps;
- form analytics;
- call tracking;
- attribution modeling;
- hiring funnel outside website behavior.

## 15. Change Rules
При изменении событийной схемы или аналитической логики нужно одновременно обновлять:
- этот документ;
- код событий в проекте;
- правила ручного анализа и weekly-reporting.
