// Глобальные переменные
let isReading = false;
let readBlockTimeout = null;
let currentReadingElement = null;
let isStopping = false;
let deleteTimeout = null;
let isDeletePending = false;

// Обработчик клавиш
document.addEventListener('keydown', function (event) {
    // Отмена отложенного удаления при ЛЮБОМ нажатии клавиши
    if (isDeletePending) {
        cancelPendingDeletion();
    }

    if (event.ctrlKey) return;

    if (event.code === 'NumpadDivide') {
        event.preventDefault();
        initiateDeletion();
    }
    else if (event.code === 'NumpadSubtract') {
        event.preventDefault();
        const notificationElement = document.querySelector('.--o-notification');
        if (notificationElement) {
            notificationElement.click();
        }
    }
    else if (event.code === 'NumpadAdd') {
        event.preventDefault();
        window.location.href = '/crm/lead/list/';
    }
    else if (event.code === 'NumpadMultiply') {
        event.preventDefault();
        if (isReading) {
            stopReading();
        } else {
            readFirstNotification();
        }
    }
});

function initiateDeletion() {
    const deleteButton = document.querySelector('.bx-im-content-notification-item__actions-delete-button');
    if (!deleteButton) return;

    // Воспроизводим звук СРАЗУ
    stopReading();
	playSound ();


    // Подсвечиваем
    deleteButton.classList.add('delete-highlight');
    isDeletePending = true;

    // Запускаем таймер на 2 секунды
    deleteTimeout = setTimeout(() => {
        deleteButton.click();
        cleanupDeletionUI();
        playSound (800, 0.5, 250);
    }, 2000);
}

function cancelPendingDeletion() {
    if (deleteTimeout) {
        clearTimeout(deleteTimeout);
        deleteTimeout = null;
    }
    cleanupDeletionUI();
}

function cleanupDeletionUI() {
    const button = document.querySelector('.delete-highlight');
    if (button) button.classList.remove('delete-highlight');
    isDeletePending = false;
}

// Звук удаления
function playDeleteSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 250;
        gainNode.gain.value = 0.80;
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.80);

        setTimeout(() => {
            oscillator.stop();
            oscillator.disconnect();
            gainNode.disconnect();
        }, 400);
    } catch (e) {
        console.warn('🔇 Не удалось воспроизвести звук удаления:', e);
    }
}



// Звук
function playSound (freq=250, gain=0.5, plaingTime=500) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        gainNode.gain.value = gain;
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + gain);

        setTimeout(() => {
            oscillator.stop();
            oscillator.disconnect();
            gainNode.disconnect();
        }, plaingTime);
    } catch (e) {
        console.warn('🔇 Не удалось воспроизвести звук:', e);
    }
}


// ========= ОСТАЛЬНОЙ КОД БЕЗ ИЗМЕНЕНИЙ =========

function copyClientEmail() {
    const emailContainer = document.querySelector('div[data-cid="UF_CRM_EMAIL_HOME"]');
    if (!emailContainer) return;
    const text = emailContainer.textContent.trim();
    if (!text) return;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = text.match(emailRegex);
    if (!emailMatch) return;
    const email = emailMatch[0].trim();
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

function playSuccessSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.5;
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);

        setTimeout(() => {
            oscillator.stop();
            oscillator.disconnect();
            gainNode.disconnect();
        }, 100);
    } catch (e) {
        console.warn('🔇 Не удалось воспроизвести звук:', e);
    }
}

function cleanText(text) {
    text = text.replace(/\[#\d+\]/g, '');
    const unwantedPhrases = [
        'Задача от',
        'Со следующим текстом',
        'Добавил комментарий',
        'Уведомление Робот',
        'https://',
        'и ещё',
        '1 человек(а)',
    ];
    for (const phrase of unwantedPhrases) {
        const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedPhrase, 'g');
        text = text.replace(regex, '');
    }
    return text.replace(/\s+/g, ' ').trim();
}

function readFirstNotification() {
    stopReading();
    let container = document.querySelector('.bx-im-content-notification-item__content-container');
    if (!container) {
        const containers = document.querySelectorAll('.bx-im-message-base__wrap');
        container = containers.length > 0 ? containers[containers.length - 1] : null;
    }
    if (!container) {
        container = document.querySelector('#pagetitle');
    }
    if (!container) return;

    currentReadingElement = container;
    container.classList.add('reading-glow');

    let text = container.innerText.trim();
    text = cleanText(text);
    if (!text) {
        cleanupReadingUI();
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
        cleanupReadingUI();
        readBlockTimeout = setTimeout(() => {
            readBlockTimeout = null;
        }, 100);
        console.log('Дочитал');
    };
    utterance.onerror = () => {
        if (!isStopping) {
            console.error('Ошибка синтеза речи');
        }
        isReading = false;
        cleanupReadingUI();
        if (readBlockTimeout) clearTimeout(readBlockTimeout);
        readBlockTimeout = null;
    };

    speechSynthesis.speak(utterance);
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

// CSS
(function () {
    const style = document.createElement('style');
    style.textContent = `
        .delete-highlight {
            box-shadow: 0 0 8px #ff4444, 0 0 16px #ff0000;
            border-radius: 4px;
            transition: box-shadow 0.3s ease;
        }
        .reading-glow {
            text-shadow: 0 0 8px gold, 0 0 12px gold, 0 0 16px rgba(255, 215, 0, 0.7);
            transition: text-shadow 0.3s ease;
        }
    `;
    document.head.appendChild(style);
})();
