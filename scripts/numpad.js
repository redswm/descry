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





function cleanText (text) {
  // Удаляем подстроки вида [#12345]
  text = text.replace(/\[#\d+\]/g, '');

  // Массив нежелательных словосочетаний
  const unwantedPhrases = [
    "Задача от",
    "Со следующим текстом",
    "Добавил комментарий",
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



//Чтение первого уведомления или заголовка
function readFirstNotification() {
    // Останавливаем текущее чтение
    stopReading();

	//Верхнее уведомление
    let container = document.querySelector('.bx-im-content-notification-item__content-container');
    
    //Если нет верхнего уведомления, то Заголовок
    if (!container) {
    	container = document.querySelector('#pagetitle');
    }

    if (!container) return;
	
	//Временно. Красим в желтый
	if (container) {
	  container.style.color = 'yellow';
	}

    // Извлекаем весь текст, игнорируя скрытые или служебные элементы
    let text = container.innerText.trim();
    
    //Удаляем лишнее
    text = cleanText(text);
    
    console.log(text);
    if (!text) return;

    // Создаем utterance и настраиваем синтез речи
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => {
        isReading = true;
    };
    
    
    utterance.onend = () => {
        isReading = false;
        // Блокируем Esc (Не работает для Escape)
        readBlockTimeout = setTimeout(() => {
            readBlockTimeout = null;
        }, 100);
        console.log('Дочитал');
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
