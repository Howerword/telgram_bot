require('dotenv').config(); // Завантаження змінних середовища
const { Telegraf, Markup } = require('telegraf');
const schedule = require('node-schedule');
const axios = require('axios');
const db = require('./database');

// Перевірка наявності токена
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не знайдено в змінних середовища!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Встановлення списку команд у Telegram
bot.telegram.setMyCommands([
  { command: 'start', description: 'Запустити бота та переглянути опис' },
]);

// Планувальники
const userSchedules = new Map();
const monitorSchedules = new Map();

// Розділення мотиваційних повідомлень і відео для кращої організації
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

const motivationalVideos = [
  "https://www.youtube.com/watch?v=Qr1_PkkWYRE",  
  "https://www.youtube.com/watch?v=faxF5e4Wy1c", 
  "https://www.youtube.com/watch?v=q3z2wheJWyk",  
  "https://www.youtube.com/watch?v=hkzMaRLIIzI",  
  "https://www.youtube.com/watch?v=1mIM-wZiBck",  
  "https://www.youtube.com/watch?v=gqNdCk53EOc",  
  "https://www.youtube.com/watch?v=8eByI1WWmOs",  
  "https://www.youtube.com/watch?v=xlOjWHWzSYM",  
  "https://www.youtube.com/watch?v=3W40tBACFbI",  
  "https://www.youtube.com/watch?v=zyfHMFJAyA0",  
  "https://www.youtube.com/watch?v=JyD13ifbAN4",  
  "https://www.youtube.com/watch?v=KD95g_1pzSI",  
  "https://www.youtube.com/watch?v=Coz7G5R6GNE"  
];

// Об'єднана колекція мотиваційного контенту
const allMotivationalContent = [...motivationalMessages, ...motivationalVideos];

// Головне меню з кнопками
const mainMenu = Markup.keyboard([
  ['📅 Налаштувати нагадування', '🖥 Перевіряти монітори'],
  ['🔄 Нагадування', '😂 Надіслати мем'],
  ['🚪 Вийти']
]).resize();

// Інлайн-клавіатура для вибору часу нагадувань
const reminderTimes = [30, 35, 40, 45];
const reminderMenu = Markup.inlineKeyboard(
  reminderTimes.map(time => Markup.button.callback(`${time} хв`, `set_reminder_${time}`)),
  { columns: 2 }
);

// Інлайн-клавіатура для вибору часу перевірки моніторів
const monitorTimes = [0, 15, 30, 45];
const monitorMenu = Markup.inlineKeyboard(
  monitorTimes.map(time => Markup.button.callback(`${time} хв`, `set_monitor_${time}`)),
  { columns: 2 }
);

/**
 * Функція отримання випадкового мема з API
 * @returns {Promise<string|null>} URL мема або null у випадку помилки
 */
const getMemeFromAPI = async () => {
  try {
    const response = await axios.get('https://meme-api.com/gimme', { timeout: 5000 });
    return response.data?.url || null;
  } catch (error) {
    console.error('Помилка отримання мема:', error.message);
    return null;
  }
};

/**
 * Функція надсилання мема користувачу
 * @param {Object} ctx - Контекст Telegraf
 * @param {number} userId - ID користувача
 * @param {string} memeUrl - URL мема
 */
const sendMeme = async (ctx, userId, memeUrl) => {
  try {
    if (!memeUrl || !memeUrl.startsWith('http')) {
      throw new Error('Невалідний URL мема');
    }
    
    const response = await axios.get(memeUrl, { 
      responseType: 'arraybuffer',
      timeout: 5000
    });
    
    const buffer = Buffer.from(response.data, 'binary');
    const contentType = response.headers['content-type'];
    
    if (contentType.includes('gif')) {
      await ctx.telegram.sendAnimation(userId, { source: buffer });
    } else {
      await ctx.telegram.sendPhoto(userId, { source: buffer });
    }
    console.log(`✅ Мем надіслано користувачу ${userId}`);
  } catch (error) {
    console.error(`❌ Помилка при надсиланні мема користувачу ${userId}:`, error.message);
    try {
      await ctx.telegram.sendMessage(userId, '❌ Сталася помилка при надсиланні мема. Спробуйте пізніше.');
    } catch (sendError) {
      console.error(`❌ Не вдалося надіслати повідомлення про помилку: ${sendError.message}`);
    }
  }
};

/**
 * Функція надсилання мотиваційного повідомлення
 * @param {Object} ctx - Контекст Telegraf
 * @param {number} userId - ID користувача
 */
const sendMotivationalMessage = async (ctx, userId) => {
  try {
    const content = allMotivationalContent[Math.floor(Math.random() * allMotivationalContent.length)];
    const message = `🔔 Час зробити перенесення!\n${content}`;
    
    await ctx.telegram.sendMessage(userId, message);
    console.log(`✅ Мотиваційне повідомлення надіслано користувачу ${userId}`);
  } catch (error) {
    console.error(`❌ Помилка при надсиланні мотиваційного повідомлення користувачу ${userId}:`, error.message);
  }
};

/**
 * Функція надсилання нагадування
 * @param {Object} ctx - Контекст Telegraf 
 * @param {number} userId - ID користувача
 */
const sendReminder = async (ctx, userId) => {
  try {
    // Надсилаємо або мем, або мотиваційне повідомлення
    if (Math.random() < 0.5) {
      const meme = await getMemeFromAPI();
      if (meme) {
        await sendMeme(ctx, userId, meme);
      } else {
        await sendMotivationalMessage(ctx, userId);
      }
    } else {
      await sendMotivationalMessage(ctx, userId);
    }
    
    // Додаткове текстове нагадування
    await ctx.telegram.sendMessage(userId, "🔔 Це ваше нагадування! Не забувайте про перенесення.");
    console.log(`✅ Нагадування надіслано користувачу ${userId}`);
  } catch (error) {
    console.error(`❌ Помилка при надсиланні нагадування користувачу ${userId}:`, error.message);
  }
};

/**
 * Функція запуску нагадувань
 * @param {number} userId - ID користувача
 * @param {Object} ctx - Контекст Telegraf
 * @param {number} reminderTime - Час нагадування в хвилинах після години
 */
const startReminder = (userId, ctx, reminderTime) => {
  // Скасування попереднього завдання, якщо існує
  if (userSchedules.has(userId)) {
    userSchedules.get(userId).cancel();
    userSchedules.delete(userId);
  }

  const job = schedule.scheduleJob(`0 ${reminderTime} * * * *`, async () => {
    await sendReminder(ctx, userId);
  });

  userSchedules.set(userId, job);
  console.log(`✅ Нагадування заплановано для користувача ${userId} на ${reminderTime} хв кожної години`);
};

/**
 * Функція запуску нагадувань для перевірки моніторів
 * @param {number} userId - ID користувача
 * @param {Object} ctx - Контекст Telegraf
 * @param {number} monitorTime - Час нагадування в хвилинах після кожних двох годин
 */
const startMonitorReminder = (userId, ctx, monitorTime) => {
  // Скасування попереднього завдання, якщо існує
  if (monitorSchedules.has(userId)) {
    monitorSchedules.get(userId).cancel();
    monitorSchedules.delete(userId);
  }

  const job = schedule.scheduleJob(`0 ${monitorTime} */2 * * *`, async () => {
    try {
      await ctx.telegram.sendMessage(userId, '🔔 Час перевірити монітори!');
      console.log(`✅ Нагадування про перевірку моніторів надіслано користувачу ${userId}`);
    } catch (error) {
      console.error(`❌ Помилка при надсиланні нагадування про монітори користувачу ${userId}:`, error.message);
    }
  });

  monitorSchedules.set(userId, job);
  console.log(`✅ Нагадування про монітори заплановано для користувача ${userId} на ${monitorTime} хв кожні 2 години`);
};

// Обробник команди /start
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  console.log(`👤 Користувач ${userId} запустив бота`);
  
  await ctx.reply(
    `🤖 *Вітаю! Це бот для мемів, мотивації та нагадувань!* 🎉

🔄 *Якщо бот завис або працює некоректно – введи /start для перезапуску!*

📌 *Що вміє бот?*

1️⃣ *Нагадування:*
   - 📅 *Налаштувати нагадування* – вибери час для сповіщень
   - 🔄 *Увімкнути / вимкнути нагадування*
   - 🖥 *Перевіряти монітори* – встановлення нагадувань кожні 2 години

2️⃣ *Меми:*  
   - 😂 *Отримати випадковий мем*

3️⃣ *Мотивація:*  
   - 🎯 *Час від часу бот надсилає мотиваційні фрази та жарти!*  

🚀 *Як почати?*  
Натисни \`/start\` та вибери функцію!

💡 *Якщо є ідеї для покращення – пиши!* 🔥😃
    `,
    { parse_mode: "Markdown" }
  );
  
  // Відновлення нагадувань при перезапуску
  try {
    const reminderTime = await db.getReminderTime(userId);
    if (reminderTime) {
      startReminder(userId, ctx, reminderTime);
    }
    
    const monitorTime = await db.getMonitorReminderTime(userId);
    if (monitorTime) {
      startMonitorReminder(userId, ctx, monitorTime);
    }
  } catch (error) {
    console.error(`❌ Помилка відновлення нагадувань для користувача ${userId}:`, error.message);
  }
  
  // Надсилаємо головне меню
  await ctx.reply("Оберіть функцію:", mainMenu);
});

// Налаштування нагадувань
bot.hears('📅 Налаштувати нагадування', (ctx) => {
  console.log(`👤 Користувач ${ctx.from.id} відкрив налаштування нагадувань`);
  ctx.reply('Оберіть, через скільки хвилин після кожної години надсилати нагадування:', reminderMenu);
});

// Обробка вибору часу нагадувань
bot.action(/^set_reminder_(\d+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const selectedTime = parseInt(ctx.match[1]);
  
  console.log(`👤 Користувач ${userId} встановлює нагадування на ${selectedTime} хв`);
  
  try {
    await db.setReminderTime(userId, selectedTime);
    startReminder(userId, ctx, selectedTime);
    await ctx.reply(`✅ Нагадування встановлено на ${selectedTime} хвилин після кожної години.`);
    await ctx.answerCbQuery(); // Відповідь на колбек, щоб прибрати годинник з кнопки
  } catch (err) {
    console.error(`❌ Помилка збереження часу нагадувань для користувача ${userId}:`, err.message);
    await ctx.reply('❌ Помилка встановлення нагадування. Спробуйте ще раз.');
    await ctx.answerCbQuery('Помилка!');
  }
});

// Toggle нагадувань (кнопка "🔄 Нагадування")
bot.hears('🔄 Нагадування', async (ctx) => {
  const userId = ctx.from.id;
  console.log(`👤 Користувач ${userId} переключає нагадування`);
  
  try {
    if (userSchedules.has(userId)) {
      userSchedules.get(userId).cancel();
      userSchedules.delete(userId);
      await ctx.reply('✅ Нагадування вимкнено.');
    } else {
      const reminderTime = await db.getReminderTime(userId);
      if (!reminderTime) {
        await ctx.reply("❌ Ви ще не налаштували нагадування. Натисніть '📅 Налаштувати нагадування' для встановлення часу.");
        return;
      }
      startReminder(userId, ctx, reminderTime);
      await ctx.reply('✅ Нагадування увімкнено.');
    }
  } catch (error) {
    console.error(`❌ Помилка переключення нагадувань для користувача ${userId}:`, error.message);
    await ctx.reply('❌ Помилка при зміні стану нагадувань. Спробуйте ще раз.');
  }
});

// Надсилання мема
bot.hears('😂 Надіслати мем', async (ctx) => {
  const userId = ctx.from.id;
  console.log(`👤 Користувач ${userId} запитує мем`);
  
  try {
    await ctx.reply('⏳ Шукаю мем для вас...');
    const meme = await getMemeFromAPI();
    if (meme) {
      await sendMeme(ctx, userId, meme);
    } else {
      await ctx.reply('❌ Не вдалося отримати мем. Спробуйте ще раз пізніше!');
    }
  } catch (error) {
    console.error(`❌ Помилка при надсиланні мема користувачу ${userId}:`, error.message);
    await ctx.reply('❌ Сталася помилка при отриманні мема.');
  }
});

// Встановлення часу перевірки моніторів
bot.hears('🖥 Перевіряти монітори', (ctx) => {
  const userId = ctx.from.id;
  console.log(`👤 Користувач ${userId} відкрив налаштування моніторів`);
  ctx.reply('Оберіть хвилини кожних двох годин для перевірки моніторів:', monitorMenu);
});

// Обробка вибору часу перевірки моніторів
bot.action(/^set_monitor_(\d+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const selectedTime = parseInt(ctx.match[1]);
  
  console.log(`👤 Користувач ${userId} встановлює перевірку моніторів на ${selectedTime} хв`);
  
  try {
    await db.setMonitorReminderTime(userId, selectedTime);
    startMonitorReminder(userId, ctx, selectedTime);
    await ctx.reply(`✅ Нагадування про перевірку моніторів встановлено на ${selectedTime} хв кожні 2 години.`);
    await ctx.answerCbQuery(); // Відповідь на колбек
  } catch (err) {
    console.error(`❌ Помилка збереження часу нагадувань для моніторів користувача ${userId}:`, err.message);
    await ctx.reply('❌ Помилка встановлення нагадування. Спробуйте ще раз.');
    await ctx.answerCbQuery('Помилка!');
  }
});

// Вихід з бота та зупинка всіх нагадувань
bot.hears('🚪 Вийти', (ctx) => {
  const userId = ctx.from.id;
  console.log(`👤 Користувач ${userId} виходить з бота`);
  
  if (userSchedules.has(userId)) {
    userSchedules.get(userId).cancel();
    userSchedules.delete(userId);
  }
  if (monitorSchedules.has(userId)) {
    monitorSchedules.get(userId).cancel();
    monitorSchedules.delete(userId);
  }
  ctx.reply('👋 Вихід виконано. Нагадування зупинені.');
});

// Обробка помилок
bot.catch((err, ctx) => {
  console.error(`❌ Глобальна помилка бота для користувача ${ctx.from?.id || 'невідомий'}:`, err);
  ctx.reply('❌ Сталася помилка. Спробуйте знову або введіть /start для перезапуску бота.');
});

// Запуск бота з обробкою помилок
try {
  bot.launch();
  console.log('✅ Бот успішно запущено!');
  
  // Коректне вимкнення бота при завершенні
  process.once('SIGINT', () => {
    console.log('🛑 Зупинка бота (SIGINT)...');
    bot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    console.log('🛑 Зупинка бота (SIGTERM)...');
    bot.stop('SIGTERM');
  });
} catch (error) {
  console.error('❌ Помилка запуску бота:', error);
  process.exit(1);
}