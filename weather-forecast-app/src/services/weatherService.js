const axios = require('axios');

class WeatherService {
  constructor() {
    this.baseURL = 'https://api.open-meteo.com/v1';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 минут
  }

  // Получение данных о погоде по координатам
  async getWeatherData(latitude, longitude) {
    const cacheKey = `${latitude}-${longitude}`;
    
    // Проверяем кэш
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      const response = await axios.get(`${this.baseURL}/forecast`, {
        params: {
          latitude,
          longitude,
          current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'is_day',
            'precipitation',
            'rain',
            'showers',
            'snowfall',
            'weather_code',
            'cloud_cover',
            'pressure_msl',
            'surface_pressure',
            'wind_speed_10m',
            'wind_direction_10m',
            'wind_gusts_10m'
          ].join(','),
          daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'apparent_temperature_max',
            'apparent_temperature_min',
            'sunrise',
            'sunset',
            'daylight_duration',
            'sunshine_duration',
            'uv_index_max',
            'precipitation_sum',
            'rain_sum',
            'showers_sum',
            'snowfall_sum',
            'precipitation_hours',
            'precipitation_probability_max',
            'wind_speed_10m_max',
            'wind_gusts_10m_max',
            'wind_direction_10m_dominant'
          ].join(','),
          timezone: 'auto',
          forecast_days: 7
        },
        timeout: 5000
      });

      const weatherData = this.formatWeatherData(response.data);
      
      // Сохраняем в кэш
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (error) {
      console.error('Ошибка API погоды:', error.message);
      throw new Error('Не удалось получить данные о погоде');
    }
  }

  // Форматирование данных о погоде
  formatWeatherData(rawData) {
    const { current, daily } = rawData;

    return {
      current: {
        temperature: Math.round(current.temperature_2m),
        apparent_temperature: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        wind_speed: Math.round(current.wind_speed_10m),
        wind_direction: current.wind_direction_10m,
        pressure: Math.round(current.pressure_msl),
        cloud_cover: current.cloud_cover,
        weather_code: current.weather_code,
        weather_description: this.getWeatherDescription(current.weather_code),
        is_day: current.is_day,
        precipitation: current.precipitation || 0,
        timestamp: current.time
      },
      daily: daily.time.map((date, index) => ({
        date,
        weather_code: daily.weather_code[index],
        weather_description: this.getWeatherDescription(daily.weather_code[index]),
        temperature_max: Math.round(daily.temperature_2m_max[index]),
        temperature_min: Math.round(daily.temperature_2m_min[index]),
        precipitation_sum: daily.precipitation_sum[index] || 0,
        precipitation_probability: daily.precipitation_probability_max[index] || 0,
        wind_speed_max: Math.round(daily.wind_speed_10m_max[index]),
        sunrise: daily.sunrise[index],
        sunset: daily.sunset[index],
        uv_index: daily.uv_index_max[index]
      }))
    };
  }

  // Получение описания погоды по коду
  getWeatherDescription(code) {
    const descriptions = {
      0: 'Ясно',
      1: 'Преимущественно ясно',
      2: 'Переменная облачность',
      3: 'Пасмурно',
      45: 'Туман',
      48: 'Изморозь',
      51: 'Легкая морось',
      53: 'Умеренная морось',
      55: 'Сильная морось',
      56: 'Ледяная морось',
      57: 'Сильная ледяная морось',
      61: 'Небольшой дождь',
      63: 'Умеренный дождь',
      65: 'Сильный дождь',
      66: 'Ледяной дождь',
      67: 'Сильный ледяной дождь',
      71: 'Небольшой снег',
      73: 'Умеренный снег',
      75: 'Сильный снег',
      77: 'Снежные зёрна',
      80: 'Слабые ливни',
      81: 'Умеренные ливни',
      82: 'Сильные ливни',
      85: 'Слабые снежные ливни',
      86: 'Сильные снежные ливни',
      95: 'Гроза',
      96: 'Г