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

module.exports = { setReminderTime, getReminderTime };
