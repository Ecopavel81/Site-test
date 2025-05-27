const axios = require('axios');

class GeocodingService {
  constructor() {
    this.baseURL = 'https://geocoding-api.open-meteo.com/v1';
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 минут
  }

  // Получение координат города
  async getCityCoordinates(cityName) {
    const cacheKey = `coords-${cityName.toLowerCase()}`;
    
    // Проверяем кэш
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      const response = await axios.get(`${this.baseURL}/search`, {
        params: {
          name: cityName,
          count: 1,
          language: 'ru',
          format: 'json'
        },
        timeout: 5000
      });

      if (!response.data.results || response.data.results.length === 0) {
        return null;
      }

      const city = response.data.results[0];
      const coordinates = {
        name: city.name,
        latitude: city.latitude,
        longitude: city.longitude,
        country: city.country,
        admin1: city.admin1,
        timezone: city.timezone
      };

      // Сохраняем в кэш
      this.cache.set(cacheKey, {
        data: coordinates,
        timestamp: Date.now()
      });

      return coordinates;
    } catch (error) {
      console.error('Ошибка геокодирования:', error.message);
      throw new Error('Не удалось найти координаты города');
    }
  }

  // Поиск городов для автодополнения
  async searchCities(query) {
    if (query.length < 2) {
      return [];
    }

    const cacheKey = `search-${query.toLowerCase()}`;
    
    // Проверяем кэш
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      const response = await axios.get(`${this.baseURL}/search`, {
        params: {
          name: query,
          count: 10,
          language: 'ru',
          format: 'json'
        },
        timeout: 5000
      });

      if (!response.data.results) {
        return [];
      }

      const cities = response.data.results.map(city => ({
        name: city.name,
        country: city.country,
        admin1: city.admin1,
        latitude: city.latitude,
        longitude: city.longitude,
        display_name: `${city.name}, ${city.country}${city.admin1 ? ', ' + city.admin1 : ''}`
      }));

      // Сохраняем в кэш
      this.cache.set(cacheKey, {
        data: cities,
        timestamp: Date.now()
      });

      return cities;
    } catch (error) {
      console.error('Ошибка поиска городов:', error.message);
      return [];
    }
  }

  // Очистка кэша
  clearCache() {
    this.cache.clear();
  }

  // Получение размера кэша
  getCacheSize() {
    return this.cache.size;
  }
}

module.exports = new GeocodingService();