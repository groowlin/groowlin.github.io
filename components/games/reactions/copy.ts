import type { ReactionReply } from "./types";

const reply = (id: string, title: string, body: string): ReactionReply => ({ id, title, body });

export const mascotCopy = {
  default: reply("default", "Отдыхать тоже нужно", "Пока начальство не видит.."),
  close: reply("close-preview", "Закрыть", "Ладно, пора за работу.."),
};

// Each pair is indivisible. Rules reference these groups instead of containing copy.
export const reactionCopy = {
  shared: {
    perfect: [reply("perfect-first-surprise", "Да ну не...", "С первого раза??"), reply("perfect-first-devtools", "Подозрительно", "Ты точно без DevTools?")],
    near: [reply("near-defend", "Ну почти", "Защитишь решение?"), reply("near-optical", "Оптическое выравнивание?", "Да-да, конечно")],
    close: [reply("close-eye", "На глаз сойдёт", "До первого разработчика с линейкой"), reply("close-grid", "Близко", "Но сетка всё видит")],
    miss: [reply("miss-layout", "Вот зачем придумали Auto Layout", "Попробуй ещё раз"), reply("miss-design", "Интересное решение", "А теперь попробуем по макету")],
    strong: [reply("strong-bold", "Смело", "Защитишь решение?"), reply("strong-hm", "Хм...", "Нууууу...."), reply("strong-author", "Авторское прочтение", "ТЗ было чуть раньше")],
    zero: [reply("zero-spacing", "Отступы переоценены", "Только время отнимают"), reply("zero-minimal", "0 px", "Минимализм зашёл слишком далеко")],
    outOfBounds: [reply("outside-qa", "Не балуйся...", "Я так и знал, что в душе ты QA"), reply("outside-feature", "Специально, да?", "Да фича это, фича"), reply("outside-bug", "Баг уже завели", "Верни квадрат")],
    rollback: [reply("special-rollback", "Нет!", "Верни как было")],
  },
  campaign: {
    perfectSecond: [reply("perfect-second", "Ну вот", "Всего одна итерация")],
    perfectFinal: [reply("perfect-final", "Успеееел, успел", "Главное результат")],
    improved: [reply("improved-progress", "Есть прогресс", "Ещё пара итераций и в прод"), reply("improved-warmer", "Теплее", "Очень продуктовая итерация")],
    unchanged: [reply("unchanged", "Стабильно", "Метрика не растёт, зато не падает")],
    worse: [reply("worse-review", "После ревью стало хуже", "Классика"), reply("worse-revert", "Откатим", "Предыдущая версия была лучше")],
    finalNear: [reply("final-optical", "Ладно", "Назовём это оптической компенсацией"), reply("final-backlog", "В бэклог", "Один пиксель переживём"), reply("final-count", "Засчитаем", "Вроде никто не видел")],
    finalOther: [reply("final-retro", "Зафиксировали", "Обсудим на ретро"), reply("final-work", "Есть над чем поработать", "Но уже не здесь"), reply("final-approved", "Согласовано", "Не спрашивай кем")],
  },
  endless: {
    improving: [reply("endless-improving", "Так-так", "Кажется, ты что-то понял")],
    repeated: [reply("endless-repeat", "Стабильно", "Но всё ещё неправильно"), reply("endless-personal", "Это уже личное?", "Там 16, если что")],
    oscillating: [reply("endless-oscillating", "Где-то посередине", "Подсказка бесплатная")],
    milestones: [reply("milestone-5", "Ты всё ещё здесь", "Уважаю"), reply("milestone-10", "Ты серьёзно?", "Это уже принципиально?"), reply("milestone-20", "Я никуда не спешу", "У меня всего лишь портфолио тут"), reply("milestone-30", "Теперь понимаю", "Почему релизы переносят")],
  },
};
