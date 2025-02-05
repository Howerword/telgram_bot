require('dotenv').config(); // Підключаємо змінні середовища
const { Telegraf, Markup } = require('telegraf'); // Імпортуємо Telegraf
const schedule = require('node-schedule'); // Підключаємо планувальник задач
const db = require('./database'); // Підключаємо базу даних

const bot = new Telegraf(process.env.BOT_TOKEN); // Ініціалізуємо бота
const userSchedules = new Map(); // Карта для збереження запущених нагадувань користувачів

// Головне меню з кнопками
const mainMenu = Markup.keyboard([
    ['📅 Налаштувати нагадування'],
    ['▶️ Почати нагадування', '⏹ Зупинити нагадування'],
    ['🚪 Вийти']
]).resize(); // Робимо кнопки адаптивними

// Кнопки вибору хвилин для нагадувань
const reminderTimes = [30, 35, 40, 45];
const reminderMenu = Markup.inlineKeyboard(
    reminderTimes.map((time) => Markup.button.callback(`${time} хв`, `set_reminder_${time}`)),
    { columns: 2 }
);

// Обробник команди /start
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    try {
        const savedTime = await db.getReminderTime(userId); // Отримуємо збережений час
        let message = 'Привіт! Це тестові кнопки:';
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
    } catch (err) {
        console.error('Помилка збереження часу нагадувань:', err);
        ctx.reply('❌ Помилка встановлення нагадування. Спробуйте ще раз.');
    }
});

// Початок нагадувань
bot.hears('▶️ Почати нагадування', async (ctx) => {
    const userId = ctx.from.id;
    const reminderTime = await db.getReminderTime(userId);
    if (!reminderTime) return ctx.reply('❌ Ти ще не налаштував нагадування.');

    if (userSchedules.has(userId)) {
        return ctx.reply('🔄 Нагадування вже запущено.');
    }

    // Запускаємо нагадування кожну годину у вибраний користувачем час
    const job = schedule.scheduleJob(`*/1 * * * *`, () => {

        ctx.telegram.sendMessage(userId, '🔔 Час зробити перенесення!');
    });

    userSchedules.set(userId, job); // Зберігаємо активне нагадування у мапі
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

// Запускаємо бота
bot.launch();
console.log('Бот запущено!');
