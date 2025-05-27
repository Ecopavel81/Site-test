// Глобальные переменные
let recentCities = JSON.parse(localStorage.getItem('recentCities')) || [];
let searchTimeout;

// Популярные города для начального отображения
const popularCities = [
    'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
    'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону'
];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    displayRecentCities();
    displayPopularCities();
}

function setupEventListeners() {
    const cityInput = document.getElementById('cityInput');
    const searchButton = document.getElementById('searchButton');
    
    // Обработчик ввода с задержкой для автодополнения
    cityInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        
        if (query.length >= 2) {
            searchTimeout = setTimeout(() => {
                fetchCitySuggestions(query);
            }, 300);
        } else {
            hideSuggestions();
        }
    });
    
    // Поиск по Enter
    cityInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchWeather();
        }
    });
    
    // Скрытие подсказок при клике вне области
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.input-container')) {
            hideSuggestions();
        }
    });
}

async function fetchCitySuggestions(query) {
    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=ru&format=json`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            displaySuggestions(data.results);
        } else {
            hideSuggestions();
        }
    } catch (error) {
        console.log('Ошибка при получении подсказок:', error);
        hideSuggestions();
    }
}

function displaySuggestions(suggestions) {
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '';
    
    suggestions.forEach(city => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = `${city.name}${city.admin1 ? ', ' + city.admin1 : ''}${city.country ? ', ' + city.country : ''}`;
        item.addEventListener('click', () => {
            document.getElementById('cityInput').value = city.name;
            hideSuggestions();
            searchWeatherByCoords(city.latitude, city.longitude, city.name);
        });
        suggestionsDiv.appendChild(item);
    });
    
    suggestionsDiv.style.display = 'block';
}

function hideSuggestions() {
    document.getElementById('suggestions').style.display = 'none';
}

async function searchWeather() {
    const cityName = document.getElementById('cityInput').value.trim();
    
    if (!cityName) {
        showError('Пожалуйста, введите название города');
        return;
    }
    
    setLoadingState(true);
    hideError();
    
    try {
        // Получаем координаты города
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ru&format=json`);
        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('Город не найден');
        }
        
        const city = geoData.results[0];
        await searchWeatherByCoords(city.latitude, city.longitude, city.name);
        
    } catch (error) {
        showError('Не удалось найти город. Проверьте правильность написания.');
        console.error('Ошибка поиска:', error);
    } finally {
        setLoadingState(false);
    }
}

async function searchWeatherByCoords(lat, lon, cityName) {
    try {
        setLoadingState(true);
        hideError();
        
        // Получаем данные о погоде
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=7`);
        const weatherData = await weatherResponse.json();
        
        displayWeatherResult(weatherData, cityName);
        addToRecentCities(cityName);
        
    } catch (error) {
        showError('Не удалось получить данные о погоде. Попробуйте еще раз.');
        console.error('Ошибка получения погоды:', error);
    } finally {
        setLoadingState(false);
    }
}

function displayWeatherResult(data, cityName) {
    const current = data.current;
    const daily = data.daily;
    
    const weatherHTML = `
        <div class="weather-header">
            <h2 class="city-name">${cityName}</h2>
            <p class="weather-date">${formatDate(new Date())}</p>
        </div>
        
        <div class="current-weather">
            <div class="weather-icon">${getWeatherIcon(current.weather_code, current.is_day)}</div>
            <div class="weather-temp">
                <div class="temperature">${Math.round(current.temperature_2m)}°C</div>
                <div class="weather-description">${getWeatherDescription(current.weather_code)}</div>
            </div>
        </div>
        
        <div class="weather-details">
            <div class="detail-item">
                <div class="detail-icon">🌡️</div>
                <div class="detail-label">Ощущается как</div>
                <div class="detail-value">${Math.round(current.apparent_temperature)}°C</div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">💧</div>
                <div class="detail-label">Влажность</div>
                <div class="detail-value">${current.relative_humidity_2m}%</div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">💨</div>
                <div class="detail-label">Ветер</div>
                <div class="detail-value">${Math.round(current.wind_speed_10m)} км/ч</div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">🌊</div>
                <div class="detail-label">Давление</div>
                <div class="detail-value">${Math.round(current.pressure_msl)} гПа</div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">☁️</div>
                <div class="detail-label">Облачность</div>
                <div class="detail-value">${current.cloud_cover}%</div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">🌧️</div>
                <div class="detail-label">Осадки</div>
                <div class="detail-value">${current.precipitation} мм</div>
            </div>
        </div>
        
        <div class="forecast">
            <h3>Прогноз на 7 дней</h3>
            <div class="forecast-container">
                ${generateForecast(daily)}
            </div>
        </div>
    `;
    
    document.getElementById('weatherResult').innerHTML = weatherHTML;
    document.getElementById('weatherResult').style.display = 'block';
}

function generateForecast(daily) {
    let forecastHTML = '';
    const today = new Date();
    
    for (let i = 0; i < daily.time.length; i++) {
        const date = new Date(daily.time[i]);
        const dayName = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : formatDayName(date);
        
        forecastHTML += `
            <div class="forecast-item">
                <div class="forecast-day">${dayName}</div>
                <div class="forecast-icon">${getWeatherIcon(daily.weather_code[i], 1)}</div>
                <div class="forecast-temps">
                    <span class="temp-high">${Math.round(daily.temperature_2m_max[i])}°</span>
                    <span class="temp-low">${Math.round(daily.temperature_2m_min[i])}°</span>
                </div>
            </div>
        `;
    }
    
    return forecastHTML;
}

function getWeatherIcon(code, isDay) {
    const icons = {
        0: isDay ? '☀️' : '🌙', // Ясно
        1: isDay ? '🌤️' : '🌙', // Преимущественно ясно
        2: '⛅', // Переменная облачность
        3: '☁️', // Пасмурно
        45: '🌫️', // Туман
        48: '🌫️', // Изморозь
        51: '🌦️', // Легкая морось
        53: '🌦️', // Умеренная морось
        55: '🌧️', // Сильная морось
        56: '🌨️', // Легкий ледяной дождь
        57: '🌨️', // Сильный ледяной дождь
        61: '🌦️', // Легкий дождь
        63: '🌧️', // Умеренный дождь
        65: '⛈️', // Сильный дождь
        66: '🌨️', // Легкий ледяной дождь
        67: '🌨️', // Сильный ледяной дождь
        71: '❄️', // Легкий снег
        73: '🌨️', // Умеренный снег
        75: '☃️', // Сильный снег
        77: '🌨️', // Снежные зерна
        80: '🌦️', // Легкие ливни
        81: '🌧️', // Умеренные ливни
        82: '⛈️', // Сильные ливни
        85: '🌨️', // Легкие снежные ливни
        86: '☃️', // Сильные снежные ливни
        95: '⛈️', // Гроза
        96: '⛈️', // Гроза с градом
        99: '⛈️'  // Сильная гроза с градом
    };
    
    return icons[code] || '🌤️';
}

function getWeatherDescription(code) {
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
        56: 'Легкий ледяной дождь',
        57: 'Сильный ледяной дождь',
        61: 'Легкий дождь',
        63: 'Умеренный дождь',
        65: 'Сильный дождь',
        66: 'Легкий ледяной дождь',
        67: 'Сильный ледяной дождь',
        71: 'Легкий снег',
        73: 'Умеренный снег',
        75: 'Сильный снег',
        77: 'Снежные зерна',
        80: 'Легкие ливни',
        81: 'Умеренные ливни',
        82: 'Сильные ливни',
        85: 'Легкие снежные ливни',
        86: 'Сильные снежные ливни',
        95: 'Гроза',
        96: 'Гроза с градом',
        99: 'Сильная гроза с градом'
    };
    
    return descriptions[code] || 'Неизвестно';
}

function addToRecentCities(cityName) {
    // Удаляем город из списка, если он уже есть
    recentCities = recentCities.filter(city => city !== cityName);
    
    // Добавляем город в начало списка
    recentCities.unshift(cityName);
    
    // Ограничиваем список 5 городами
    recentCities = recentCities.slice(0, 5);
    
    // Сохраняем в localStorage
    localStorage.setItem('recentCities', JSON.stringify(recentCities));
    
    displayRecentCities();
}

function displayRecentCities() {
    const recentCitiesDiv = document.getElementById('recentCities');
    const recentCityTags = document.getElementById('recentCityTags');
    
    if (recentCities.length > 0) {
        recentCityTags.innerHTML = '';
        recentCities.forEach(city => {
            const tag = document.createElement('span');
            tag.className = 'recent-city-tag';
            tag.textContent = city;
            tag.addEventListener('click', () => {
                document.getElementById('cityInput').value = city;
                searchWeather();
            });
            recentCityTags.appendChild(tag);
        });
        recentCitiesDiv.style.display = 'block';
    } else {
        recentCitiesDiv.style.display = 'none';
    }
}

function displayPopularCities() {
    const historyDiv = document.getElementById('searchHistory');
    const historyList = document.getElementById('historyList');
    
    historyList.innerHTML = '';
    popularCities.forEach(city => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.textContent = city;
        item.addEventListener('click', () => {
            document.getElementById('cityInput').value = city;
            searchWeather();
        });
        historyList.appendChild(item);
    });
    
    historyDiv.style.display = 'block';
}

function setLoadingState(isLoading) {
    const searchButton = document.getElementById('searchButton');
    const searchButtonText = document.getElementById('searchButtonText');
    const spinner = document.getElementById('spinner');
    
    if (isLoading) {
        searchButton.disabled = true;
        searchButtonText.textContent = 'Загружаем...';
        spinner.style.display = 'inline-block';
    } else {
        searchButton.disabled = false;
        searchButtonText.textContent = 'Получить прогноз';
        spinner.style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Автоматически скрываем ошибку через 5 секунд
    setTimeout(() => {
        hideError();
    }, 5000);
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}

function formatDate(date) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('ru-RU', options);
}

function formatDayName(date) {
    const options = { weekday: 'short' };
    return date.toLocaleDateString('ru-RU', options);
}