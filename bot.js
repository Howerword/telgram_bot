require('dotenv').config(); // Підключаємо змінні середовища
const { Telegraf, Markup } = require('telegraf'); // Імпортуємо Telegraf
const db = require('./database'); // Підключаємо базу даних

const bot = new Telegraf(process.env.BOT_TOKEN); // Ініціалізуємо бота

// Головне меню з кнопками
const mainMenu = Markup.keyboard([
    ['📅 Налаштувати нагадування'],
    ['🔘 Кнопка 1', '🔘 Кнопка 2'],
    ['🔘 Кнопка 3', '🔘 Кнопка 4']
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

// Запускаємо бота
bot.launch();
console.log('Бот запущено!');
