// Обработчик ошибок 404
const notFound = (req, res, next) => {
  const error = new Error(`Маршрут ${req.originalUrl} не найден`);
  error.status = 404;
  next(error);
};

// Основной обработчик ошибок
const errorHandler = (error, req, res, next) => {
  console.error('Ошибка приложения:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Определяем статус ошибки
  let status = error.status || error.statusCode || 500;
  let message = error.message || 'Внутренняя ошибка сервера';

  // Обработка специфических типов ошибок
  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Ошибка валидации данных';
  } else if (error.name === 'CastError') {
    status = 400;
    message = 'Неверный формат данных';
  } else if (error.code === 'ECONNREFUSED') {
    status = 503;
    message = 'Сервис временно недоступен';
  } else if (error.code === 'ETIMEDOUT') {
    status = 504;
    message = 'Превышено время ожидания';
  } else if (error.name === 'SyntaxError' && error.type === 'entity.parse.failed') {
    status = 400;
    message = 'Неверный формат JSON';
  }

  // В продакшене не показываем детали внутренних ошибок
  if (status === 500 && process.env.NODE_ENV === 'production') {
    message = 'Что-то пошло не так. Попробуйте позже.';
  }

  // Формируем ответ об ошибке
  const errorResponse = {
    error: true,
    message,
    status,
    timestamp: new Date().toISOString()
  };

  // В режиме разработки добавляем дополнительную информацию
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.details = {
      name: error.name,
      code: error.code,
      path: req.path,
      method: req.method
    };
  }

  res.status(status).json(errorResponse);
};

// Обработчик необработанных исключений
const handleUncaughtException = (error) => {
  console.error('Необработанное исключение:', error);
  process.exit(1);
};

// Обработчик необработанных промисов
const handleUnhandledRejection = (reason, promise) => {
  console.error('Необработанный отказ промиса:', reason);
  console.error('Промис:', promise);
  process.exit(1);
};

// Установка глобальных обработчиков ошибок
process.on('uncaughtException', handleUncaughtException);
process.on('unhandledRejection', handleUnhandledRejection);

module.exports = {
  notFound,
  errorHandler,
  handleUncaughtException,
  handleUnhandledRejection
};