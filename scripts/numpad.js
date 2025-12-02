// Глобальные переменные для управления чтением
let isReading = false;
let readBlockTimeout = null;
let currentReadingElement = null;
let isStopping = false; // Флаг для отслеживания принудительной остановки

// Слушатель событий для нажатия клавиш
document.addEventListener('keydown', function (event) {
    // Игнорируем только Ctrl (Alt и Shift не блокируем)
    if (event.ctrlKey) {
        return;
    }

    // Numpad- Открывает уведомления
    if (event.code === 'NumpadSubtract') {
        event.preventDefault();
        const notificationElement = document.querySelector('.--o-notification');
        if (notificationElement) {
            notificationElement.click();
        }
    }
    // Numpad+ Переход на страницу /crm/lead/list/
    else if (event.code === 'NumpadAdd') {
        event.preventDefault();
        window.location.href = '/crm/lead/list/';
    }
    // Numpad* — переключатель: чтение или остановка
    else if (event.code === 'NumpadMultiply') {
        event.preventDefault();
        if (isReading) {
            stopReading();
        } else {
            readFirstNotification();
            // Копируем email только после успешного чтения
            setTimeout(copyClientEmail, 300);
        }
    }
});


// Копирование Email клиента
function copyClientEmail() {
    const emailContainer = document.querySelector('div[data-cid="UF_CRM_EMAIL_HOME"]');
    if (!emailContainer) {
        return;
    }
    
    const text = emailContainer.textContent.trim();
    if (!text) {
        return;
    }

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = text.match(emailRegex);
    
    if (!emailMatch) {
        return;
    }
    
    const email = emailMatch[0].trim();

    // Копируем в буфер обмена
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email)
            .then(() => {
                console.log(`Email скопирован: ${email}`);
                playSuccessSound();
            })
            .catch(err => {
                // Добавлен обработчик ошибок для логгирования
                console.error('Ошибка копирования:', err);
            });
    }
}


// Короткий звуковой сигнал "успешного копирования"
function playSuccessSound() {
    try {
        // Создаём звук только если есть поддержка Web Audio API
        if (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined') {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            
            // Разрешаем воспроизведение после пользовательского взаимодействия
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Параметры звука: частота 800 Гц, длительность 100 мс
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1; // Громкость
            
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(
                0.00001, audioCtx.currentTime + 0.1
            );
            
            setTimeout(() => {
                oscillator.stop();
                oscillator.disconnect();
                gainNode.disconnect();
            }, 100);
        }
    } catch (e) {
        console.warn('🔇 Не удалось воспроизвести звук:', e);
    }
}



function cleanText(text) {
    // Удаляем подстроки вида [#12345]
    text = text.replace(/\[#\d+\]/g, '');

    // Массив нежелательных словосочетаний
    const unwantedPhrases = [
        'Задача от',
        'Со следующим текстом',
        'Добавил комментарий',
    ];

    // Удаляем фразы
    for (const phrase of unwantedPhrases) {
        const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedPhrase, 'g');
        text = text.replace(regex, '');
    }

    // Убираем лишние пробелы
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}



function readFirstNotification() {
    stopReading(); // остановить предыдущее чтение

    let container = document.querySelector('.bx-im-content-notification-item__content-container');

    // Если нет, то последнее сообщение (Мессенджер)
    if (!container) {
        const containers = document.querySelectorAll('.bx-im-message-base__wrap');
        container = containers.length > 0 ? containers[containers.length - 1] : null;
    }
    
    // Если нет уведомления, то заголовок страницы
    if (!container) {
        container = document.querySelector('#pagetitle');
    }

    if (!container) return;

    currentReadingElement = container;
    container.classList.add('reading-glow'); // включаем свечение

    let text = container.innerText.trim();
    text = cleanText(text);
    if (!text) {
        cleanupReadingUI();
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.onstart = () => {
        isReading = true;
        isStopping = false; // Сбрасываем флаг остановки при начале чтения
    };

    utterance.onend = () => {
        isReading = false;
        cleanupReadingUI();
        readBlockTimeout = setTimeout(() => {
            readBlockTimeout = null;
        }, 100);
        console.log('Дочитал');
    };

    utterance.onerror = (event) => {
        // Проверяем, не была ли ошибка вызвана принудительной остановкой
        if (!isStopping) {
            console.error('Ошибка синтеза речи:', event.error);
        }
        isReading = false;
        cleanupReadingUI();
        if (readBlockTimeout) clearTimeout(readBlockTimeout);
        readBlockTimeout = null;
    };

    speechSynthesis.speak(utterance);
}

function stopReading() {
    isStopping = true; // Устанавливаем флаг остановки
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        isReading = false;
        cleanupReadingUI();
        if (readBlockTimeout) clearTimeout(readBlockTimeout);
        readBlockTimeout = null;
        console.log('Чтение остановлено');
    }
}

function cleanupReadingUI() {
    if (currentReadingElement) {
        currentReadingElement.classList.remove('reading-glow');
        currentReadingElement = null;
    }
}

// Добавляем CSS для свечения
(function() {
    const style = document.createElement('style');
    style.textContent = `
        .reading-glow {
            text-shadow: 0 0 8px gold, 0 0 12px gold, 0 0 16px rgba(255, 215, 0, 0.7);
            transition: text-shadow 0.3s ease;
        }
    `;
    document.head.appendChild(style);
})();
