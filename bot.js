require('dotenv').config(); // Підключаємо змінні середовища
const { Telegraf, Markup } = require('telegraf'); // Імпортуємо Telegraf
const schedule = require('node-schedule'); // Підключаємо планувальник задач
const db = require('./database'); // Підключаємо базу даних

const BOT_TOKEN = process.env.BOT_TOKEN_TEST || process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN); // Ініціалізуємо бота
const userSchedules = new Map(); // Карта для збереження запущених нагадувань користувачів

// Мотиваційні повідомлення
const motivationalMessages = [
    "🌟 Ти вже зробив великий крок уперед – не зупиняйся!",
    "💪 Маленькі кроки ведуть до великих досягнень!",
    "🔥 Все, що тобі потрібно – це почати!",
    "🚀 Кожен твій рух – це ще один крок до успіху!",
    "💡 Найкращий спосіб почати – це припинити говорити і почати діяти!",
    "🌈 Велика подорож починається з маленького кроку!",
    "🏆 Сьогодні – ідеальний день для того, щоб стати кращою версією себе!",
    "📈 Навіть 1% покращення кожен день створює неймовірний прогрес!",
    "💭 Віра в себе – це перший крок до перемоги!",
    "⏳ Не відкладай на завтра те, що можеш зробити сьогодні!",
    "🎯 Сфокусуйся на меті, а не на перешкодах!",
    "🔋 Невдачі – це лише сходинки на шляху до успіху!",
    "🌿 Відпочинок – це не слабкість, а частина продуктивності!",
    "💥 Чим більше працюєш над собою, тим більше тобі щастить!",
    "🎶 Зроби паузу, вдихни на повні груди – і вперед до нових звершень!"
];

// Головне меню з кнопками
const mainMenu = Markup.keyboard([
    ['📅 Налаштувати нагадування', '📋 Переглянути нагадування'],
    ['▶️ Почати нагадування', '⏹ Зупинити нагадування'],
    ['🚪 Вийти']
]).resize(); // Робимо кнопки адаптивними

// Кнопки вибору хвилин для нагадувань
const reminderTimes = [30, 35, 40, 45];
const reminderMenu = Markup.inlineKeyboard(
    reminderTimes.map((time) => Markup.button.callback(`${time} хв`, `set_reminder_${time}`)),
    { columns: 2 }
);

// Функція запуску нагадувань
const startReminder = async (userId, ctx) => {
    const reminderTime = await db.getReminderTime(userId);
    if (!reminderTime) return;

    if (userSchedules.has(userId)) {
        userSchedules.get(userId).cancel(); // Вимикаємо старе нагадування
    }

    const job = schedule.scheduleJob(`0 ${reminderTime} * * * *`, () => {
        const motivation = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        ctx.telegram.sendMessage(userId, `🔔 Час зробити перенесення! ${motivation}`);
    });

    userSchedules.set(userId, job);
};

// Обробник команди /start
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    try {
        const savedTime = await db.getReminderTime(userId); // Отримуємо збережений час
        let message = 'Привіт! Я твій асистент:';
        if (savedTime) {
            message += `\n🔔 Ваш встановлений час нагадувань: ${savedTime} хв`;
        }
        ctx.reply(message, mainMenu);
    } catch (err) {
        console.error('Помилка отримання часу нагадувань:', err);
        ctx.reply('Привіт! Це тестові кнопки:', mainMenu);
    }
});

// Обробка натискання "📅 Налаштувати нагадування"
bot.hears('📅 Налаштувати нагадування', (ctx) => {
    ctx.reply('Оберіть, на скільки хвилин після кожної години хочете отримувати нагадування:', reminderMenu);
});

// Обробка вибору часу нагадування
bot.action(/^set_reminder_\d+$/, async (ctx) => {
    const userId = ctx.from.id;
    const selectedTime = parseInt(ctx.match[0].split('_')[2]);
    try {
        await db.setReminderTime(userId, selectedTime); // Збереження у базі
        ctx.reply(`✅ Нагадування встановлено на ${selectedTime} хвилин після кожної години.`);
        await startReminder(userId, ctx); // Автоматично перезапускаємо нагадування
    } catch (err) {
        console.error('Помилка збереження часу нагадувань:', err);
        ctx.reply('❌ Помилка встановлення нагадування. Спробуйте ще раз.');
    }
});

// Перегляд активних нагадувань
bot.hears('📋 Переглянути нагадування', async (ctx) => {
    const userId = ctx.from.id;
    const reminderTime = await db.getReminderTime(userId);
    if (reminderTime) {
        ctx.reply(`📋 Ваші налаштування:
🔔 Нагадування кожну годину на ${reminderTime} хв.`);
    } else {
        ctx.reply('❌ Ви ще не налаштували нагадування.');
    }
});

// Початок нагадувань
bot.hears('▶️ Почати нагадування', async (ctx) => {
    const userId = ctx.from.id;
    await startReminder(userId, ctx);
    ctx.reply('▶️ Нагадування увімкнено.');
});

// Зупинка нагадувань
bot.hears('⏹ Зупинити нагадування', (ctx) => {
    const userId = ctx.from.id;
    if (userSchedules.has(userId)) {
        userSchedules.get(userId).cancel(); // Зупиняємо плановану задачу
        userSchedules.delete(userId); // Видаляємо користувача з активних нагадувань
        ctx.reply('⏹ Нагадування вимкнено.');
    } else {
        ctx.reply('❌ У тебе немає активних нагадувань.');
    }
});

// Вихід з бота та зупинка нагадувань
bot.hears('🚪 Вийти', (ctx) => {
    const userId = ctx.from.id;
    if (userSchedules.has(userId)) {
        userSchedules.get(userId).cancel();
        userSchedules.delete(userId);
    }
    ctx.reply('👋 Вихід виконано. Нагадування зупинені.');
});

// Запускаємо бота
bot.launch();
console.log('Бот запущено!');
