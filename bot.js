require('dotenv').config(); // Завантаження змінних середовища
const { Telegraf, Markup } = require('telegraf'); // Імпорт Telegraf
const schedule = require('node-schedule'); // Планувальник завдань
const axios = require('axios'); // HTTP-запити
const db = require('./database'); // Робота з базою даних

const bot = new Telegraf(process.env.BOT_TOKEN);
const userSchedules = new Map(); // Карта для збереження запущених завдань нагадувань

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

// Головне меню з кнопками (без тестових повідомлень)
const mainMenu = Markup.keyboard([
  ['📅 Налаштувати нагадування', '📋 Переглянути нагадування'],
  ['🖥 Перевіряти монітори'],
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

// Функція отримання випадкового мема з API
const getMemeFromAPI = async () => {
  try {
    const response = await axios.get('https://meme-api.com/gimme');
    return response.data.url;
  } catch (error) {
    console.error('Помилка отримання мема:', error);
    return null;
  }
};

// Функція надсилання мема з перевіркою типу контенту
const sendMeme = async (ctx, userId, memeUrl) => {
  try {
    // Завантаження файлу як буфера
    const response = await axios.get(memeUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    const contentType = response.headers['content-type'];
    // Якщо content-type містить "gif" – надсилаємо як анімацію, інакше – як фото
    if (contentType.includes('gif')) {
      await ctx.telegram.sendAnimation(userId, { source: buffer });
    } else {
      await ctx.telegram.sendPhoto(userId, { source: buffer });
    }
  } catch (error) {
    console.error('Помилка при надсиланні мема:', error);
    await ctx.telegram.sendMessage(userId, '❌ Сталася помилка при надсиланні мема.');
  }
};

// Функція надсилання мотиваційного повідомлення
const sendMotivationalMessage = async (ctx, userId) => {
  const message = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  await ctx.telegram.sendMessage(userId, `🔔 Час зробити перенесення!\n${message}`);
};

// Функція запуску нагадувань
const startReminder = async (userId, ctx) => {
  const reminderTime = await db.getReminderTime(userId);
  if (!reminderTime) return;

  // Якщо нагадування вже запущено – скасовуємо попереднє завдання
  if (userSchedules.has(userId)) {
    userSchedules.get(userId).cancel();
  }

  // Планування завдання: кожну годину на вказану хвилину
  const job = schedule.scheduleJob(`0 ${reminderTime} * * * *`, async () => {
    try {
      if (Math.random() < 0.5) { // 50% шанс на надсилання мема
        const meme = await getMemeFromAPI();
        if (meme) {
          await sendMeme(ctx, userId, meme);
        } else {
          await sendMotivationalMessage(ctx, userId);
        }
      } else {
        await sendMotivationalMessage(ctx, userId);
      }
    } catch (error) {
      console.error('Помилка під час надсилання нагадування:', error);
    }
  });

  userSchedules.set(userId, job);
};

// Обробник команди /start
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  try {
    const savedTime = await db.getReminderTime(userId);
    let message = 'Привіт! Я твій асистент:';
    if (savedTime) {
      message += `\n🔔 Ваш встановлений час нагадувань: ${savedTime} хв`;
    }
    await ctx.reply(message, mainMenu);
  } catch (err) {
    console.error('Помилка отримання часу нагадувань:', err);
    await ctx.reply('Привіт! Це тестові кнопки:', mainMenu);
  }
});

// Налаштування нагадувань
bot.hears('📅 Налаштувати нагадування', (ctx) => {
  ctx.reply('Оберіть, через скільки хвилин після кожної години надсилати нагадування:', reminderMenu);
});

// Обробка вибору часу нагадування
bot.action(/^set_reminder_\d+$/, async (ctx) => {
  const userId = ctx.from.id;
  const selectedTime = parseInt(ctx.match[0].split('_')[2]);
  try {
    await db.setReminderTime(userId, selectedTime);
    await ctx.reply(`✅ Нагадування встановлено на ${selectedTime} хвилин після кожної години.`);
    // Якщо нагадування вже запущено – перезапускаємо його з новим часом
    if (userSchedules.has(userId)) {
      userSchedules.get(userId).cancel();
      await startReminder(userId, ctx);
    }
  } catch (err) {
    console.error('Помилка збереження часу нагадувань:', err);
    await ctx.reply('❌ Помилка встановлення нагадування. Спробуйте ще раз.');
  }
});

// Перегляд налаштувань нагадувань
bot.hears('📋 Переглянути нагадування', async (ctx) => {
  const userId = ctx.from.id;
  const reminderTime = await db.getReminderTime(userId);
  if (reminderTime) {
    await ctx.reply(`📋 Ваші налаштування:\n🔔 Нагадування кожну годину на ${reminderTime} хв.`);
  } else {
    await ctx.reply('❌ Ви ще не налаштували нагадування.');
  }
});

// Toggle нагадувань за допомогою кнопки "🔄 Нагадування"
bot.hears('🔄 Нагадування', async (ctx) => {
  const userId = ctx.from.id;
  // Якщо нагадування запущено – зупиняємо їх
  if (userSchedules.has(userId)) {
    userSchedules.get(userId).cancel();
    userSchedules.delete(userId);
    await ctx.reply('Нагадування вимкнено.');
  } else {
    // Перевірка, чи налаштовано час нагадувань
    const reminderTime = await db.getReminderTime(userId);
    if (!reminderTime) {
      await ctx.reply("Ви ще не налаштували нагадування. Натисніть '📅 Налаштувати нагадування' для встановлення часу.");
      return;
    }
    await startReminder(userId, ctx);
    await ctx.reply('Нагадування увімкнено.');
  }
});

// Надсилання мема
bot.hears('😂 Надіслати мем', async (ctx) => {
  try {
    const meme = await getMemeFromAPI();
    if (meme) {
      await sendMeme(ctx, ctx.from.id, meme);
    } else {
      await ctx.reply('❌ Не вдалося отримати мем. Спробуйте ще раз пізніше!');
    }
  } catch (error) {
    console.error('Помилка при надсиланні мема:', error);
    await ctx.reply('❌ Сталася помилка при отриманні мема.');
  }
});

// Встановлення часу перевірки моніторів
bot.hears('🖥 Перевіряти монітори', (ctx) => {
  ctx.reply('Оберіть хвилини кожних двох годин для перевірки моніторів:', monitorMenu);
});

// Обробка вибору часу перевірки моніторів
bot.action(/^set_monitor_\d+$/, async (ctx) => {
  const userId = ctx.from.id;
  const selectedTime = parseInt(ctx.match[0].split('_')[2]);
  try {
    await db.setMonitorReminderTime(userId, selectedTime);
    await ctx.reply(`✅ Нагадування про перевірку моніторів встановлено на ${selectedTime} хв кожні 2 години.`);
  } catch (err) {
    console.error('Помилка збереження часу нагадувань для моніторів:', err);
    await ctx.reply('❌ Помилка встановлення нагадування. Спробуйте ще раз.');
  }
});

// Вихід з бота та зупинка всіх нагадувань
bot.hears('🚪 Вийти', (ctx) => {
  const userId = ctx.from.id;
  if (userSchedules.has(userId)) {
    userSchedules.get(userId).cancel();
    userSchedules.delete(userId);
  }
  ctx.reply('👋 Вихід виконано. Нагадування зупинені.');
});

// Запуск бота
bot.launch();
console.log('Бот запущено!');
