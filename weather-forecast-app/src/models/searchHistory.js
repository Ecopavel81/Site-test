const { database } = require('./database');

class SearchHistoryModel {
  // Нормализация названия города
  normalizeCityName(cityName) {
    return cityName.toLowerCase().trim()
      .replace(/ё/g, 'е')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ');
  }

  // Добавление поиска в историю
  async addSearch(userId, cityName, actualCityName = null) {
    const normalizedCity = this.normalizeCityName(cityName);
    const displayName = actualCityName || cityName;

    try {
      // Проверяем, есть ли уже такая запись
      const existing = await database.get(
        'SELECT id, search_count FROM search_history WHERE user_id = ? AND normalized_city_name = ?',
        [userId, normalizedCity]
      );

      if (existing) {
        // Обновляем существующую запись
        await database.run(
          'UPDATE search_history SET search_count = search_count + 1, last_search_date = CURRENT_TIMESTAMP, city_name = ? WHERE id = ?',
          [displayName, existing.id]
        );
        return { id: existing.id, count: existing.search_count + 1 };
      } else {
        // Создаем новую запись
        const result = await database.run(
          'INSERT INTO search_history (user_id, city_name, normalized_city_name) VALUES (?, ?, ?)',
          [userId, displayName, normalizedCity]
        );
        return { id: result.id, count: 1 };
      }
    } catch (error) {
      console.error('Ошибка добавления в историю поиска:', error);
      throw error;
    }
  }

  // Получение истории поиска пользователя
  async getUserHistory(userId, limit = 20) {
    try {
      const history = await database.all(
        `SELECT city_name, search_count, last_search_date, created_at 
         FROM search_history 
         WHERE user_id = ? 
         ORDER BY last_search_date DESC 
         LIMIT ?`,
        [userId, limit]
      );

      return history.map(item => ({
        city: item.city_name,
        count: item.search_count,
        lastSearch: item.last_search_date,
        firstSearch: item.created_at
      }));
    } catch (error) {
      console.error('Ошибка получения истории пользователя:', error);
      throw error;
    }
  }

  // Получение общей статистики поиска
  async getSearchStats(limit = 50) {
    try {
      const stats = await database.all(
        `SELECT 
           city_name,
           COUNT(DISTINCT user_id) as unique_users,
           SUM(search_count) as total_searches,
           MAX(last_search_date) as last_search,
           MIN(created_at) as first_search
         FROM search_history 
         GROUP BY normalized_city_name 
         ORDER BY total_searches DESC 
         LIMIT ?`,
        [limit]
      );

      return stats.map(item => ({
        city: item.city_name,
        uniqueUsers: item.unique_users,
        totalSearches: item.total_searches,
        lastSearch: item.last_search,
        firstSearch: item.first_search
      }));
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      throw error;
    }
  }

  // Получение топ городов по популярности
  async getTopCities(limit = 10) {
    try {
      const topCities = await database.all(
        `SELECT 
           city_name,
           SUM(search_count) as total_searches,
           COUNT(DISTINCT user_id) as unique_users
         FROM search_history 
         GROUP BY normalized_city_name 
         ORDER BY total_searches DESC 
         LIMIT ?`,
        [limit]
      );

      return topCities;
    } catch (error) {
      console.error('Ошибка получения топ городов:', error);
      throw error;
    }
  }

  // Получение недавних поисков пользователя для быстрого доступа
  async getRecentCities(userId, limit = 5) {
    try {
      const recent = await database.all(
        `SELECT DISTINCT city_name, last_search_date
         FROM search_history 
         WHERE user_id = ? 
         ORDER BY last_search_date DESC 
         LIMIT ?`,
        [userId, limit]
      );

      return recent.map(item => item.city_name);
    } catch (error) {
      console.error('Ошибка получения недавних городов:', error);
      throw error;
    }
  }

  // Очистка старых записей (старше 6 месяцев)
  async cleanupOldRecords() {
    try {
      const result = await database.run(
        `DELETE FROM search_history 
         WHERE last_search_date < datetime('now', '-6 months')`
      );
      
      console.log(`Удалено ${result.changes} старых записей из истории поиска`);
      return result.changes;
    } catch (error) {
      console.error('Ошибка очистки старых записей:', error);
      throw error;
    }
  }

  // Получение статистики базы данных
  async getDatabaseStats() {
    try {
      const totalRecords = await database.get(
        'SELECT COUNT(*) as count FROM search_history'
      );
      
      const uniqueUsers = await database.get(
        'SELECT COUNT(DISTINCT user_id) as count FROM search_history'
      );
      
      const uniqueCities = await database.get(
        'SELECT COUNT(DISTINCT normalized_city_name) as count FROM search_history'
      );

      const totalSearches = await database.get(
        'SELECT SUM(search_count) as total FROM search_history'
      );

      return {
        totalRecords: totalRecords.count,
        uniqueUsers: uniqueUsers.count,
        uniqueCities: uniqueCities.count,
        totalSearches: totalSearches.total || 0
      };
    } catch (error) {
      console.error('Ошибка получения статистики БД:', error);
      throw error;
    }
  }
}

module.exports = new SearchHistoryModel();