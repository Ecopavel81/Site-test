const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');
const { validateCity, validateQuery } = require('../middleware/validation');

// Получение погоды по городу
router.get('/weather/:city', validateCity, weatherController.getWeatherByCity);

// Получение автодополнения городов
router.get('/suggestions/:query', validateQuery, weatherController.getCitySuggestions);

// Получение статистики поиска
router.get('/stats', weatherController.getSearchStats);

// Сохранение истории поиска
router.post('/search-history', weatherController.saveSearchHistory);

// Получение истории поиска пользователя
router.get('/search-history/:userId', weatherController.getUserHistory);

module.exports = router;