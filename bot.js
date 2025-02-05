rrequire('dotenv').config(); // Підключаємо змінні середовища
const { Telegraf, Markup } = require('telegraf'); // Імпортуємо Telegraf

const bot = new Telegraf(process.env.BOT_TOKEN); // Ініціалізуємо бота

// Головне меню з тестовими кнопками
const mainMenu = Markup.keyboard([
    ['🔘 Кнопка 1', '🔘 Кнопка 2'],
    ['🔘 Кнопка 3', '🔘 Кнопка 4']
]).resize(); // Робимо кнопки адаптивними

// Обробник команди /start
bot.start((ctx) => {
    ctx.reply('Привіт! Це тестові кнопки:', mainMenu);
});

// Обробка натискань кнопок
bot.hears('🔘 Кнопка 1', (ctx) => ctx.reply('Ти натиснув кнопку 1!'));
bot.hears('🔘 Кнопка 2', (ctx) => ctx.reply('Ти натиснув кнопку 2!'));
bot.hears('🔘 Кнопка 3', (ctx) => ctx.reply('Ти натиснув кнопку 3!'));
bot.hears('🔘 Кнопка 4', (ctx) => ctx.reply('Ти натиснув кнопку 4!'));

// Запускаємо бота
bot.launch();
console.log('Бот запущено!');
