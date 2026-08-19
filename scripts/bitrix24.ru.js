// V 1.04 19.08.26
// Глобальные переменные для управления чтением
let isReading = false;
let readBlockTimeout = null;
let currentReadingElement = null;
let isStopping = false;
let allElements = [];
let currentElementIndex = 0;

// Переменные для отслеживания одиночного/двойного нажатия
let starPressTimer = null;
let lastStarPressTime = 0;
const DOUBLE_PRESS_THRESHOLD = 300;

// Переменные для отмены последовательности ~
let cancelBackquoteSequence = false;
let backquoteKeyListener = null;

// ==========================================
// 0. Проверка флага после редиректа (Стрелка вниз)
// ==========================================
(function checkRedirectFlag() {
    if (sessionStorage.getItem('clickInfoTitleAfterRedirect') === 'true') {
        sessionStorage.removeItem('clickInfoTitleAfterRedirect');
        
        // Вместо фиксированной задержки в 1 сек, ждем появления элемента в DOM
        waitForElementAndClick('.crm-info-title-wrapper a', 5000);
    }
})();

// Функция ожидания появления элемента (решает проблему долгой загрузки Битрикс)
function waitForElementAndClick(selector, timeout) {
    const startTime = Date.now();
    const interval = setInterval(() => {
        let link = findElementInDomOrIframe(selector);
        
        if (link) {
            clearInterval(interval);
            
            // Убираем target="_blank", чтобы браузер не блокировал клик как "всплывающее окно"
            // Если нужно именно в новой вкладке - закомментируйте следующую строку, 
            // но тогда Chrome может заблокировать переход после авто-редиректа.
            link.removeAttribute('target'); 
            
            link.click();
            playSuccessSound();
            console.log('Ссылка найдена и нажата:', link.href);
        } else if (Date.now() - startTime > timeout) {
            clearInterval(interval);
            console.warn(`Элемент ${selector} не появился за ${timeout}мс`);
        }
    }, 200); // Проверяем каждые 200 миллисекунд
}

// Универсальный поиск элемента (в текущем окне или в iframe)
function findElementInDomOrIframe(selector) {
    let el = null;
    if (window.self !== window.top) {
        el = document.querySelector(selector);
    }
    if (!el && window.self === window.top) {
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
            try {
                if (iframe.contentDocument) {
                    const found = iframe.contentDocument.querySelector(selector);
                    if (found) {
                        el = found;
                        break;
                    }
                }
            } catch (e) { continue; }
        }
    }
    return el;
}

// ==========================================
// 1. Слушатель сообщений из родительского окна (для iframe)
// ==========================================
window.addEventListener('message', (e) => {
    if (e.origin === window.location.origin && e.data && e.data.type === 'BITRIX_READ_COMMAND') {
        if (isReading) stopReading();
        collectElements();
        if (allElements.length > 0) {
            currentElementIndex = 0;
            readElementAtIndex(0);
        }
    }
    if (e.origin === window.location.origin && e.data && e.data.type === 'BITRIX_BACKQUOTE_COMMAND') {
        executeBackquoteSequence();
    }
});

// ==========================================
// 2. Клавиатурные события (основные)
// ==========================================
document.addEventListener('keydown', function (event) {
    if (event.ctrlKey) return;

    // --- ФУНКЦИЯ: Стрелка вправо -> [data-id="IN_PROCESS"] ---
    if (event.code === 'ArrowRight') {
        event.preventDefault();
        handleInProcessAction();
        return;
    }
    // -----------------------------------------------------

    // --- ОБНОВЛЕННАЯ ФУНКЦИЯ: Стрелка вниз ---
    if (event.code === 'ArrowDown') {
        event.preventDefault();
        handleInfoTitleLinkAction();
        return;
    }
    // -----------------------------------------

    if (event.code === 'ArrowUp') {
        event.preventDefault();
        navigateToElement(-1);
        return;
    }

    if (event.code === 'NumpadSubtract') {
        event.preventDefault();
        const notificationElement = document.querySelector('.--o-notification');
        if (notificationElement) notificationElement.click();
    }
    else if (event.code === 'NumpadAdd') {
        event.preventDefault();
        window.location.href = '/crm/lead/list/';
    }
    else if (event.code === 'NumpadMultiply') {
        event.preventDefault();
        const now = Date.now();

        if (starPressTimer && (now - lastStarPressTime) < DOUBLE_PRESS_THRESHOLD) {
            clearTimeout(starPressTimer);
            starPressTimer = null;
            lastStarPressTime = 0;

            const playerBtn = document.querySelector('.ui-btn-icon-start');
            if (playerBtn) {
                playerBtn.click();
                return;
            }
            executeSingleStarAction();
            return;
        }

        lastStarPressTime = now;
        starPressTimer = setTimeout(() => {
            starPressTimer = null;
            executeSingleStarAction();
        }, DOUBLE_PRESS_THRESHOLD);
    }
});

// --- ФУНКЦИЯ: Логика обработки [data-id="IN_PROCESS"] ---
function handleInProcessAction() {
    let btn = findElementInDomOrIframe('[data-id="IN_PROCESS"]');

    if (btn) {
        btn.click();
        playSuccessSound();
        console.log('Кнопка [data-id="IN_PROCESS"] нажата');
    } else {
        console.warn('Кнопка [data-id="IN_PROCESS"] не найдена на странице');
    }
}

// --- ФУНКЦИЯ: Логика обработки ссылки .crm-info-title-wrapper a ---
function handleInfoTitleLinkAction() {
    const currentPath = window.location.pathname;

    // Если текущая страница НЕ содержит "/crm/lead/"
    if (!currentPath.includes('/crm/lead/')) {
        console.log('Переход на страницу лидов...');
        sessionStorage.setItem('clickInfoTitleAfterRedirect', 'true');
        window.location.href = '/crm/lead/list/';
        return;
    }

    // Если мы уже на странице с "/crm/lead/", ищем и кликаем (тоже с ожиданием, вдруг еще грузится)
    waitForElementAndClick('.crm-info-title-wrapper a', 5000);
}

function executeSingleStarAction() {
    if (window.self === window.top) {
        const iframes = document.querySelectorAll('iframe');
        let popupIframe = null;

        for (const iframe of iframes) {
            try {
                if (iframe.contentDocument && iframe.contentDocument.querySelector('#pagetitle')) {
                    popupIframe = iframe;
                    break;
                }
            } catch (e) { continue; }
        }

        if (popupIframe) {
            popupIframe.contentWindow.postMessage({ type: 'BITRIX_READ_COMMAND' }, window.location.origin);
            popupIframe.focus();
            return;
        }
    }

    if (isReading) {
        stopReading();
    } else {
        collectElements();
        if (allElements.length > 0) {
            currentElementIndex = 0;
            readElementAtIndex(currentElementIndex);
        }
    }
}

// ==========================================
// 3. Основные функции чтения
// ==========================================
function findActiveStageElement() {
    let el = document.querySelector('.my-active-stage .crm-entity-section-status-step-item-text');
    if (el) return el;

    const stageField = document.querySelector('div[data-cid="STAGE_ID"] .ui-entity-editor-content-block-text');
    if (stageField) {
        const stageText = stageField.innerText.trim();
        const allStages = document.querySelectorAll('.crm-entity-section-status-step-item-text');
        for (const s of allStages) {
            if (s.innerText.trim() === stageText) return s;
        }
    }
    return null;
}

function collectElements() {
    const notifications = Array.from(document.querySelectorAll('.bx-im-content-notification-item__content-container'));
    const messages = Array.from(document.querySelectorAll('.bx-im-message-base__wrap')).reverse();
    const pageTitle = document.querySelector('#pagetitle');

    allElements = [...notifications, ...messages];
    if (pageTitle) allElements.push(pageTitle);

    const stageEl = findActiveStageElement();
    if (stageEl) {
        const titleIdx = allElements.indexOf(pageTitle);
        if (titleIdx !== -1) {
            allElements.splice(titleIdx + 1, 0, stageEl);
        } else {
            allElements.unshift(stageEl);
        }
    }

    return allElements;
}

function navigateToElement(direction) {
    if (isReading) stopReading();
    collectElements();

    if (allElements.length === 0) {
        console.warn('Нет элементов для чтения');
        return;
    }

    currentElementIndex += direction;
    if (currentElementIndex < 0) currentElementIndex = 0;
    if (currentElementIndex >= allElements.length) currentElementIndex = allElements.length - 1;

    readElementAtIndex(currentElementIndex);
}

function readElementAtIndex(index) {
    stopReading();
    if (index < 0 || index >= allElements.length) return;

    const container = allElements[index];
    if (!container) return;

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
        cleanupReadingUI();
        readBlockTimeout = setTimeout(() => { readBlockTimeout = null; }, 100);
        console.log(`Дочитал элемент ${index + 1} из ${allElements.length}`);
    };

    utterance.onerror = (event) => {
        if (!isStopping) console.error('Ошибка синтеза речи:', event.error);
        isReading = false;
        if (readBlockTimeout) clearTimeout(readBlockTimeout);
        readBlockTimeout = null;
        cleanupReadingUI();
    };

    speechSynthesis.speak(utterance);
}

// ==========================================
// 4. Вспомогательные функции
// ==========================================
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
            .then(() => { console.log(`Email скопирован: ${email}`); playSuccessSound(); })
            .catch(err => console.error('Ошибка копирования:', err));
    }
}

function playSuccessSound() {
    try {
        if (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined') {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            if (audioCtx.state === 'suspended') audioCtx.resume();

            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1;
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);

            setTimeout(() => {
                oscillator.stop();
                oscillator.disconnect();
                gainNode.disconnect();
            }, 100);
        }
    } catch (e) { console.warn('🔇 Не удалось воспроизвести звук:', e); }
}

function cleanText(text) {
    text = text.replace(/\[#\d+\]/g, '');
    const unwantedPhrases = [
        'Задача от', 'Со следующим текстом', 'Добавил комментарий',
        'Уведомление Робот', 'https://', 'и ещё', '1 человек(а)'
    ];
    for (const phrase of unwantedPhrases) {
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(new RegExp(escaped, 'g'), '');
    }
    return text.replace(/\s+/g, ' ').trim();
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

// ==========================================
// 5. Новые функции для работы с кнопками и озвучкой
// ==========================================
function clickBySelector(sel, customError) {
    var el = document.querySelector(sel);
    if (!el) throw new Error(customError || 'Не найден: ' + sel);
    el.click();
}

function speak(text) {
    speechSynthesis.cancel();
    var utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ru-RU';
    utter.rate = 1.0;
    speechSynthesis.speak(utter);
}

// ==========================================
// 6. Обработчик клавиши ~ (Backquote) — с поддержкой iframe и отменой
// ==========================================
document.addEventListener('keydown', async function(e) {
    if (e.code !== 'Backquote') return;
    e.preventDefault();

    if (window.self === window.top) {
        const iframes = document.querySelectorAll('iframe');
        let popupIframe = null;
        for (const iframe of iframes) {
            try {
                if (iframe.contentDocument && iframe.contentDocument.querySelector('#pagetitle')) {
                    popupIframe = iframe;
                    break;
                }
            } catch (e) { continue; }
        }
        if (popupIframe) {
            popupIframe.contentWindow.postMessage({ type: 'BITRIX_BACKQUOTE_COMMAND' }, window.location.origin);
            popupIframe.focus();
            return;
        }
    }

    executeBackquoteSequence();
});

async function executeBackquoteSequence() {
    speechSynthesis.cancel();
    cancelBackquoteSequence = false;

    backquoteKeyListener = (e) => {
        cancelBackquoteSequence = true;
        speak('Отменено');
        console.log('Последовательность ~ отменена пользователем');
    };
    document.addEventListener('keydown', backquoteKeyListener, { once: true });

    try {
        clickBySelector('div[data-id="JUNK"]', 'FIRST_NOT_FOUND');
        speak('Удаляю');

        await new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (cancelBackquoteSequence) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 500);
        });

        if (cancelBackquoteSequence) {
            if (backquoteKeyListener) {
                document.removeEventListener('keydown', backquoteKeyListener);
                backquoteKeyListener = null;
            }
            return;
        }

        clickBySelector('span.webform-small-button-text');
        await new Promise(resolve => setTimeout(resolve, 500));
        clickBySelector('.popup-window-buttons button.popup-window-button-accept');
        speak('Лид удален');
    } catch (err) {
        if (!cancelBackquoteSequence) {
            if (err.message === 'FIRST_NOT_FOUND') {
                speak('Не найдена первая кнопка');
            } else {
                speak('Ошибка');
            }
            console.error(err);
        }
    } finally {
        if (backquoteKeyListener) {
            document.removeEventListener('keydown', backquoteKeyListener);
            backquoteKeyListener = null;
        }
        cancelBackquoteSequence = false;
    }
}

// ==========================================
// 7. Авто-выделение стадии при загрузке
// ==========================================
setTimeout(() => {
    let stageId = null;
    const scripts = document.querySelectorAll('script');
    for (const s of scripts) {
        if (s.textContent.includes('currentStepId')) {
            const match = s.textContent.match(/currentStepId:\s*["']([^"']+)["']/);
            if (match) { stageId = match[1]; break; }
        }
    }

    if (stageId) {
        const el = document.querySelector(`.crm-entity-section-status-step[data-id="${stageId}"]`);
        if (el) el.classList.add('my-active-stage');
    }
}, 1500);
