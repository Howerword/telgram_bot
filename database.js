const sqlite3 = require('sqlite3').verbose();

// Підключення до бази даних
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Помилка підключення до бази:', err.message);
    } else {
        console.log('✅ База даних підключена.');
    }
});

// Створюємо таблицю для користувачів (якщо її ще немає)
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        user_id INTEGER UNIQUE,
        reminder_time INTEGER
    )
`);

// Створюємо таблицю для нагадувань про монітори (якщо її ще немає)
db.run(`
    CREATE TABLE IF NOT EXISTS monitor_reminders (
        id INTEGER PRIMARY KEY,
        user_id INTEGER UNIQUE,
        monitor_time INTEGER
    )
`);

// Функція для збереження часу нагадування
const setReminderTime = (userId, time) => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO users (user_id, reminder_time) VALUES (?, ?)
             ON CONFLICT(user_id) DO UPDATE SET reminder_time = ?`,
            [userId, time, time],
            function (err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
};

// Функція для отримання часу нагадування користувача
const getReminderTime = (userId) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT reminder_time FROM users WHERE user_id = ?`, [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.reminder_time : null);
        });
    });
};

// Функція для збереження часу нагадування для моніторів
const setMonitorReminderTime = (userId, time) => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO monitor_reminders (user_id, monitor_time) VALUES (?, ?)
             ON CONFLICT(user_id) DO UPDATE SET monitor_time = ?`,
            [userId, time, time],
            function (err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
};

// Функція для отримання часу нагадувань для моніторів
const getMonitorReminderTime = (userId) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT monitor_time FROM monitor_reminders WHERE user_id = ?`, [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.monitor_time : null);
        });
    });
};

module.exports = { setReminderTime, getReminderTime, setMonitorReminderTime, getMonitorReminderTime };
