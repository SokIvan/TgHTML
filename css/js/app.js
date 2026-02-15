// Глобальный объект приложения
const App = {
    // Конфигурация
    config: {
        apiUrl: 'https://твой-сервер.com', // Замени на свой URL FastAPI
        timeout: 10000
    },

    // Telegram WebApp объект
    tg: window.Telegram.WebApp,

    // Данные пользователя
    user: null,

    // Инициализация
    init: function() {
        console.log('🚀 Инициализация Mini App...');
        
        // Настройка Telegram
        this.tg.ready();
        this.tg.expand();
        
        // Получаем данные пользователя
        this.user = this.tg.initDataUnsafe?.user;
        
        // Отображаем информацию
        this.displayUserInfo();
        
        // Проверяем тему Telegram
        this.checkTheme();
        
        // Проверяем соединение с API
        this.checkApiConnection();
        
        // Добавляем приветствие в лог
        this.addLog('✅ Mini App загружен', 'success');
        this.addLog(`📱 Platform: ${this.tg.platform}`, 'info');
        this.addLog(`🆔 User ID: ${this.user?.id || 'unknown'}`, 'info');
        
        // Настраиваем MainButton если нужно
        this.setupMainButton();
        
        console.log('✅ Инициализация завершена');
    },

    // Отображение информации о пользователе
    displayUserInfo: function() {
        const userInfo = document.getElementById('userInfo');
        
        if (this.user) {
            userInfo.innerHTML = `
                <div class="user-info-item">
                    <span class="user-info-label">ID:</span>
                    <span class="user-info-value">${this.user.id}</span>
                </div>
                <div class="user-info-item">
                    <span class="user-info-label">Имя:</span>
                    <span class="user-info-value">${this.user.first_name} ${this.user.last_name || ''}</span>
                </div>
                <div class="user-info-item">
                    <span class="user-info-label">Username:</span>
                    <span class="user-info-value">${this.user.username ? '@' + this.user.username : 'нет'}</span>
                </div>
                <div class="user-info-item">
                    <span class="user-info-label">Язык:</span>
                    <span class="user-info-value">${this.user.language_code || 'ru'}</span>
                </div>
                <div class="user-info-item">
                    <span class="user-info-label">Премиум:</span>
                    <span class="user-info-value">${this.user.is_premium ? '✅' : '❌'}</span>
                </div>
            `;
            
            document.getElementById('userBadge').innerHTML = `
                <span>👋 ${this.user.first_name}</span>
            `;
        } else {
            userInfo.innerHTML = `
                <div class="user-info-item">
                    <span class="user-info-label">⚠️ Данные пользователя недоступны</span>
                </div>
                <div class="user-info-item">
                    <span class="user-info-value">Приложение открыто не через Telegram?</span>
                </div>
            `;
        }
    },

    // Проверка темы Telegram
    checkTheme: function() {
        if (this.tg.colorScheme === 'dark') {
            document.body.classList.add('dark');
        }
        
        // Следим за изменением темы
        this.tg.onEvent('themeChanged', () => {
            if (this.tg.colorScheme === 'dark') {
                document.body.classList.add('dark');
            } else {
                document.body.classList.remove('dark');
            }
        });
    },

    // Настройка MainButton
    setupMainButton: function() {
        if (this.tg.MainButton) {
            this.tg.MainButton.setText("Готово");
            this.tg.MainButton.onClick(() => {
                this.addLog('MainButton нажата', 'info');
                this.sendAction('main_button');
            });
        }
    },

    // Добавление записи в лог
    addLog: function(message, type = 'info') {
        const logContainer = document.getElementById('logContainer');
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        
        const time = new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        entry.innerHTML = `[${time}] ${message}`;
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    },

    // Отправка данных на API
    sendToAPI: async function(endpoint, data) {
        this.addLog(`📤 Отправка на ${endpoint}...`, 'info');
        
        // Показываем индикатор загрузки
        this.tg.HapticFeedback?.impactOccurred('light');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-User-Id': this.user?.id || 'unknown',
                    'X-Telegram-Init-Data': this.tg.initData || '',
                    'X-Telegram-Platform': this.tg.platform
                },
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const result = await response.json();

            if (response.ok) {
                this.addLog(`✅ Успешно: ${JSON.stringify(result)}`, 'success');
                this.tg.HapticFeedback?.notificationOccurred('success');
                
                // Показываем всплывающее уведомление
                if (this.tg.showPopup) {
                    this.tg.showPopup({
                        title: 'Успешно',
                        message: 'Данные отправлены!',
                        buttons: [{ type: 'close' }]
                    });
                }
                
                return result;
            } else {
                throw new Error(result.message || 'Ошибка сервера');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                this.addLog('❌ Таймаут запроса', 'error');
            } else {
                this.addLog(`❌ Ошибка: ${error.message}`, 'error');
            }
            
            this.tg.HapticFeedback?.notificationOccurred('error');
            
            throw error;
        }
    },

    // Отправка действия
    sendAction: function(action) {
        const data = {
            action: action,
            user_id: this.user?.id,
            user_name: this.user?.first_name,
            timestamp: new Date().toISOString(),
            platform: this.tg.platform,
            version: this.tg.version
        };
        
        this.addLog(`🔄 Действие: ${action}`, 'info');
        this.sendToAPI('/api/webapp-data', data);
    },

    // Отправка кастомных данных
    sendCustomData: function() {
        document.getElementById('customForm').style.display = 'block';
    },

    // Отправка кастомного JSON
    sendCustomJson: function() {
        try {
            const customData = document.getElementById('customData').value;
            const data = JSON.parse(customData);
            
            this.sendToAPI('/api/webapp-data', {
                action: 'custom',
                data: data,
                user_id: this.user?.id,
                timestamp: new Date().toISOString()
            });
            
            this.hideCustomForm();
        } catch (error) {
            this.addLog(`❌ Ошибка парсинга JSON: ${error.message}`, 'error');
            alert('Неверный формат JSON');
        }
    },

    // Отправка полных данных пользователя
    sendUserData: function() {
        const fullUserData = {
            action: 'user_data',
            user: this.user,
            telegram: {
                initData: this.tg.initData,
                initDataUnsafe: this.tg.initDataUnsafe,
                platform: this.tg.platform,
                version: this.tg.version,
                colorScheme: this.tg.colorScheme,
                viewportHeight: this.tg.viewportHeight,
                viewportStableHeight: this.tg.viewportStableHeight,
                isExpanded: this.tg.isExpanded
            },
            timestamp: new Date().toISOString()
        };
        
        this.sendToAPI('/api/webapp-data', fullUserData);
    },

    // Проверка соединения с API
    checkApiConnection: async function() {
        const statusElement = document.getElementById('apiStatus');
        
        try {
            const response = await fetch(`${this.config.apiUrl}/api/bot-status`);
            const data = await response.json();
            
            if (data.status === 'online') {
                statusElement.innerHTML = '✅ Online';
                this.addLog('🔌 API соединение установлено', 'success');
            } else {
                statusElement.innerHTML = '❌ Offline';
                this.addLog('⚠️ API недоступен', 'warning');
            }
        } catch (error) {
            statusElement.innerHTML = '❌ Offline';
            this.addLog(`⚠️ Ошибка соединения с API: ${error.message}`, 'warning');
        }
    },

    // Тест соединения
    testConnection: function() {
        this.checkApiConnection();
    },

    // Очистка лога
    clearLog: function() {
        const logContainer = document.getElementById('logContainer');
        logContainer.innerHTML = '';
        this.addLog('🗑️ Лог очищен', 'info');
    },

    // Скрыть форму кастомной отправки
    hideCustomForm: function() {
        document.getElementById('customForm').style.display = 'none';
        document.getElementById('customData').value = '';
    },

    // Закрыть приложение
    close: function() {
        this.tg.close();
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Экспортируем для глобального доступа
window.App = App;
