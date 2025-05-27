// Валидация названия города
const validateCity = (req, res, next) => {
  const { city } = req.params;

  if (!city) {
    return res.status(400).json({
      error: 'Название города обязательно',
      message: 'Пожалуйста, укажите название города'
    });
  }

  if (typeof city !== 'string') {
    return res.status(400).json({
      error: 'Неверный формат города',
      message: 'Название города должно быть строкой'
    });
  }

  const trimmedCity = city.trim();
  
  if (trimmedCity.length < 1) {
    return res.status(400).json({
      error: 'Пустое название города',
      message: 'Название города не может быть пустым'
    });
  }

  if (trimmedCity.length > 100) {
    return res.status(400).json({
      error: 'Слишком длинное название',
      message: 'Название города не должно превышать 100 символов'
    });
  }

  // Проверяем на недопустимые символы
  const validCityRegex = /^[a-zA-Zа-яА-ЯёЁ\s\-'.]+$/;
  if (!validCityRegex.test(trimmedCity)) {
    return res.status(400).json({
      error: 'Недопустимые символы',
      message: 'Название города может содержать только буквы, пробелы, дефисы и апострофы'
    });
  }

  // Обновляем параметр с очищенным значением
  req.params.city = trimmedCity;
  next();
};

// Валидация поискового запроса
const validateQuery = (req, res, next) => {
  const { query } = req.params;

  if (!query) {
    return res.status(400).json({
      error: 'Поисковый запрос обязателен',
      suggestions: []
    });
  }

  if (typeof query !== 'string') {
    return res.status(400).json({
      error: 'Неверный формат запроса',
      suggestions: []
    });
  }

  const trimmedQuery = query.trim();
  
  if (trimmedQuery.length < 1) {
    return res.status(400).json({
      error: 'Пустой поисковый запрос',
      suggestions: []
    });
  }

  if (trimmedQuery.length > 50) {
    return res.status(400).json({
      error: 'Слишком длинный запрос',
      message: 'Поисковый запрос не должен превышать 50 символов',
      suggestions: []
    });
  }

  // Для поиска разрешаем больше символов
  const validQueryRegex = /^[a-zA-Zа-яА-ЯёЁ0-9\s\-'.,]+$/;
  if (!validQueryRegex.test(trimmedQuery)) {
    return res.status(400).json({
      error: 'Недопустимые символы в запросе',
      suggestions: []
    });
  }

  req.params.query = trimmedQuery;
  next();
};

// Валидация тела запроса для сохранения истории
const validateSearchHistory = (req, res, next) => {
  const { city, userId } = req.body;

  if (!city) {
    return res.status(400).json({
      error: 'Название города обязательно'
    });
  }

  if (typeof city !== 'string') {
    return res.status(400).json({
      error: 'Неверный формат города'
    });
  }

  const trimmedCity = city.trim();
  
  if (trimmedCity.length < 1 || trimmedCity.length > 100) {
    return res.status(400).json({
      error: 'Неверная длина названия города'
    });
  }

  // Валидация userId если присутствует
  if (userId && (typeof userId !== 'string' || userId.trim().length === 0)) {
    return res.status(400).json({
      error: 'Неверный формат ID пользователя'
    });
  }

  req.body.city = trimmedCity;
  if (userId) {
    req.body.userId = userId.trim();
  }

  next();
};

// Общая валидация параметров запроса
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      error: 'Неверный номер страницы'
    });
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({
      error: 'Неверный лимит записей (1-100)'
    });
  }

  req.pagination = {
    page: pageNum,
    limit: limitNum,
    offset: (pageNum - 1) * limitNum
  };

  next();
};

module.exports = {
  validateCity,
  validateQuery,
  validateSearchHistory,
  validatePagination
};