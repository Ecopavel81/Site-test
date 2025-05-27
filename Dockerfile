# Используем официальный Node.js образ
FROM node:18-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Производственный этап
FROM node:18-alpine AS production

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем зависимости из builder этапа
COPY --from=builder /app/node_modules ./node_modules

# Копируем исходный код приложения
COPY src/ ./src/
COPY public/ ./public/
COPY package.json ./

# Создаем директорию для базы данных и устанавливаем права
RUN mkdir -p /app/database && \
    chown -R nextjs:nodejs /app

# Переключаемся на созданного пользователя
USER nextjs

# Открываем порт
EXPOSE 3000

# Настраиваем health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Запускаем приложение
CMD ["npm", "start"]