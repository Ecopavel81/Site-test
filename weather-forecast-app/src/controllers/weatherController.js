const weatherService = require('../services/weatherService');
const geocodingService = require('../services/geocodingService');
const searchHistoryModel = require('../models/searchHistory');
const { asyncHandler } = require('../utils/asyncHandler');

const weatherController = {
  // Получение погоды по городу
  getWeatherByCity: asyncHandler(async (req, res) => {
    const { city } = req.params;
    const userIp = req.ip || req.connection.remoteAddress;

    try {
      // Получаем координаты города
      const coordinates = await geocodingService.getCityCoordinates(city);
      
      if (!coordinates) {
        return res.status(404).json({
          error: 'Город не найден',
          message: 'Пожалуйста, проверьте правильность написания названия города'
        });
      }

      // Получаем данные о погоде
      const weatherData = await weatherService.getWeatherData(
        coordinates.latitude, 
        coordinates.longitude
      );

      // Сохраняем в историю поиска
      await searchHistoryModel.addSearch(userIp, city, coordinates.name);

      res.json({
        city: coordinates.name,
        country: coordinates.country,
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        },
        weather: weatherData
      });

    } catch (error) {
      console.error('Ошибка получения погоды:', error);
      res.status(500).json({
        error: 'Ошибка получения данных о погоде',
        message: 'Попробуйте позже'
      });
    }
  }),

  // Получение автодополнения городов
  getCitySuggestions: asyncHandler(async (req, res) => {
    const { query } = req.params;

    try {
      const suggestions = await geocodingService.searchCities(query);
      res.json({ suggestions });
    } catch (error) {
      console.error('Ошибка получения подсказок:', error);
      res.status(500).json({
        error: 'Ошибка получения подсказок',
        suggestions: []
      });
    }
  }),

  // Получение статистики поиска
  getSearchStats: asyncHandler(async (req, res) => {
    try {
      const stats = await searchHistoryModel.getSearchStats();
      res.json({ stats });
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      res.status(500).json({
        error: 'Ошибка получения статистики',
        stats: []
      });
    }
  }),

  // Сохранение истории поиска
  saveSearchHistory: asyncHandler(async (req, res) => {
    const { city, userId } = req.body;
    const userIp = userId || req.ip || req.connection.remoteAddress;

    if (!city) {
      return res.status(400).json({
        error: 'Название города обязательно'
      });
    }

    try {
      await searchHistoryModel.addSearch(userIp, city);
      res.json({ success: true });
    } catch (error) {
      console.error('Ошибка сохранения истории:', error);
      res.status(500).json({
        error: 'Ошибка сохранения истории поиска'
      });
    }
  }),

  // Получение истории поиска пользователя
  getUserHistory: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const userIp = userId || req.ip || req.connection.remoteAddress;

    try {
      const history = await searchHistoryModel.getUserHistory(userIp);
      res.json({ history });
    } catch (error) {
      console.error('Ошибка получения истории:', error);
      res.status(500).json({
        error: 'Ошибка получения истории поиска',
        history: []
      });
    }
  })
};

module.exports = weatherController;