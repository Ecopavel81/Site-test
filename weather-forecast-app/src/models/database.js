const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../database/app.db');

// Создаем директорию для базы данных если её нет
const dbDir = path.dirname(DATABASE_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

class Database {
  constructor() {
    this.db = null;
  }

  // Инициализация базы данных
  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DATABASE_PATH, (err) => {
        if (err) {
          console.error('Ошибка подключения к базе данных:', err);
          reject(err);
        } else {
          console.log('✅ Подключение к SQLite базе данных установлено');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  // Создание таблиц
  async createTables() {
    return new Promise((resolve, reject) => {
      const createSearchHistoryTable = `
        CREATE TABLE IF NOT EXISTS search_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          city_name TEXT NOT NULL,
          normalized_city_name TEXT NOT NULL,
          search_count INTEGER DEFAULT 1,
          last_search_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_user_city ON search_history(user_id, normalized_city_name);
        CREATE INDEX IF NOT EXISTS idx_city_name ON search_history(normalized_city_name);
        CREATE INDEX IF NOT EXISTS idx_last_search ON search_history(last_search_date);
      `;

      this.db.exec(createSearchHistoryTable + '; ' + createIndexes, (err) => {
        if (err) {
          console.error('Ошибка создания таблиц:', err);
          reject(err);
        } else {
          console.log('✅ Таблицы базы данных созданы успешно');
          resolve();
        }
      });
    });
  }

  // Выполнение запроса
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Получение одной записи
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Получение всех записей
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Закрытие соединения
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('✅ Соединение с базой данных закрыто');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

const database = new Database();

// Функция инициализации для экспорта
async function initDatabase() {
  await database.init();
  return database;
}

module.exports = {
  database,
  initDatabase
};