// Глобальные переменные для управления чтением
let isReading = false;
let readBlockTimeout = null;
let currentReadingElement = null;
let isStopping = false;
let allElements = []; // Массив всех доступных элементов для чтения
let currentElementIndex = 0; // Текущий индекс в массиве

// Собирает все доступные элементы для чтения в правильном порядке
function collectElements() {
    // 1. Все уведомления (в порядке появления)
    const notifications = Array.from(
        document.querySelectorAll('.bx-im-content-notification-item__content-container')
    );
    
    // 2. Все сообщения мессенджера (в обратном порядке - новые снизу)
    const messages = Array.from(
        document.querySelectorAll('.bx-im-message-base__wrap')
    ).reverse();
    
    // 3. Заголовок страницы
    const pageTitle = document.querySelector('#pagetitle');
    
    // Формируем общий массив в порядке приоритета
    allElements = [...notifications, ...messages];
    if (pageTitle) allElements.push(pageTitle);
    
    return allElements;
}

// Слушатель событий для нажатия клавиш
document.addEventListener('keydown', function (event) {
    if (event.ctrlKey) return;
    
    // Стрелка вниз - следующий элемент
    if (event.code === 'ArrowDown') {
        event.preventDefault();
        navigateToElement(1);
        return;
    }
    
    // Стрелка вверх - предыдущий элемент
    if (event.code === 'ArrowUp') {
        event.preventDefault();
        navigateToElement(-1);
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
            // Собираем элементы и начинаем с первого
            collectElements();
            if (allElements.length > 0) {
                currentElementIndex = 0;
                readElementAtIndex(currentElementIndex);
            }
        }
    }
});

// Навигация между элементами
function navigateToElement(direction) {
    if (isReading) stopReading();
    
    // Собираем актуальный список элементов
    collectElements();
    
    if (allElements.length === 0) {
        console.warn('Нет элементов для чтения');
        return;
    }
    
    // Вычисляем новый индекс с учетом границ массива
    currentElementIndex += direction;
    if (currentElementIndex < 0) currentElementIndex = 0;
    if (currentElementIndex >= allElements.length) currentElementIndex = allElements.length - 1;
    
    readElementAtIndex(currentElementIndex);
}

// Чтение элемента по индексу
function readElementAtIndex(index) {
    stopReading(); // Останавливаем предыдущее чтение
    
    if (index < 0 || index >= allElements.length) return;
    
    const container = allElements[index];
    if (!container) return;
    
    // Прокручиваем к элементу для визуальной обратной связи
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    currentReadingElement = container;
    container.classList.add('reading-glow');
    
    let text = container.innerText.trim();
    text = cleanText(text);
    
    if (!text) {
        cleanupReadingUI();
        console.warn('Пустой элемент для чтения');
        return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => {
        isReading = true;
        isStopping = false;
        copyClientEmail();
    };
    
    utterance.onend = () => {
        isReading = false;
        readBlockTimeout = setTimeout(() => {
            readBlockTimeout = null;
        }, 100);
        console.log(`Дочитал элемент ${index + 1} из ${allElements.length}`);
    };
    
    utterance.onerror = (event) => {
        if (!isStopping) {
            console.error('Ошибка синтеза речи:', event.error);
        }
        isReading = false;
        if (readBlockTimeout) clearTimeout(readBlockTimeout);
        readBlockTimeout = null;
    };
    
    utterance.onend = () => {
        isReading = false;
        cleanupReadingUI();
        readBlockTimeout = setTimeout(() => {
            readBlockTimeout = null;
        }, 100);
        console.log(`Дочитал элемент ${index + 1} из ${allElements.length}`);
    };
    
    speechSynthesis.speak(utterance);
}

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
    if (!emailMatch) return;
    const email = emailMatch[0].trim();
    // Копируем в буфер обмена
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email)
            .then(() => {
                console.log(`Email скопирован: ${email}`);
                playSuccessSound();
            })
            .catch(err => {
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
        'Уведомление Робот',
        'https://',
        'и ещё',
        '1 человек(а)',
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

function stopReading() {
    isStopping = true;
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

