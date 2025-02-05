require('dotenv').config(); // Підключаємо змінні середовища
const { Telegraf, Markup } = require('telegraf'); // Імпортуємо Telegraf

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
bot.start((ctx) => {
    ctx.reply('Привіт! Це тестові кнопки:', mainMenu);
});

// Обробка натискань кнопок
bot.hears('🔘 Кнопка 1', (ctx) => ctx.reply('Ти натиснув кнопку 1!'));
bot.hears('🔘 Кнопка 2', (ctx) => ctx.reply('Ти натиснув кнопку 2!'));
bot.hears('🔘 Кнопка 3', (ctx) => ctx.reply('Ти натиснув кнопку 3!'));
bot.hears('🔘 Кнопка 4', (ctx) => ctx.reply('Ти натиснув кнопку 4!'));

// Обробка кнопки "📅 Налаштувати нагадування"
bot.hears('📅 Налаштувати нагадування', (ctx) => {
    ctx.reply('Оберіть, на скільки хвилин після кожної години хочете отримувати нагадування:', reminderMenu);
});

// Обробка вибору часу нагадування
bot.action(/^set_reminder_\d+$/, (ctx) => {
    const selectedTime = parseInt(ctx.match[0].split('_')[2]);
    ctx.reply(`✅ Нагадування встановлено на ${selectedTime} хвилин після кожної години.`);
});

// Запускаємо бота
bot.launch();
console.log('Бот запущено!');
