require('dotenv').config(); // Підключаємо змінні середовища
const { Telegraf } = require('telegraf');

// Ініціалізуємо бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// Обробка команди /start
bot.start((ctx) => {
    ctx.reply('Привіт! Це тестовий бот.');
});

// Запускаємо бота
bot.launch();
console.log('Бот запущено!');
