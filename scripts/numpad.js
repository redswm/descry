// Глобальные переменные для управления чтением
let isReading = false;
let readBlockTimeout = null;

// Слушатель событий для нажатия клавиш
document.addEventListener('keydown', function(event) {
    // Проверяем, не зажаты ли CTRL, SHIFT, ALT
    if (event.ctrlKey || event.shiftKey || event.altKey) {
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
    // Numpad* — чтение первого уведомления
    else if (event.code === 'NumpadMultiply') {
        event.preventDefault();
        readFirstNotification();
    }
    // Esc — остановка чтения (если разрешено)
    else if (event.code === 'Escape') {
        if (!isReading && !readBlockTimeout) {
            return;
        }
        event.preventDefault();
        stopReading();
    }
});

function readFirstNotification() {
    // Останавливаем текущее чтение, если есть
    stopReading();

    const container = document.querySelector('.bx-im-content-notification-item__content-container');
    if (!container) return;

    // Извлекаем весь текст, игнорируя скрытые или служебные элементы
    const text = container.innerText.trim();
    if (!text) return;

    // Создаем utterance и настраиваем синтез речи
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => {
        isReading = true;
    };
    
    utterance.onend = () => {
        isReading = false;
        // Блокируем Esc ещё на 3 секунды после завершения
        readBlockTimeout = setTimeout(() => {
            readBlockTimeout = null;
        }, 3000);
    };
    
    utterance.onerror = () => {
        isReading = false;
        if (readBlockTimeout) clearTimeout(readBlockTimeout);
        readBlockTimeout = null;
    };

    speechSynthesis.speak(utterance);
}

function stopReading() {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        isReading = false;
        if (readBlockTimeout) clearTimeout(readBlockTimeout);
        readBlockTimeout = null;
    }
}
