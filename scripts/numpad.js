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

  // Массив ненужных словосочетаний
  const unwantedPhrases = [
    "Задача от",
    "Со следующим текстом",
    "Добавил комментарий",
  ];

  // Удаляем каждую фразу из текста
  for (const phrase of unwantedPhrases) {
    // Экранируем специальные символы в фразе для безопасного использования в регулярке
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Удаляем все вхождения (с учётом возможных пробелов вокруг)
    const regex = new RegExp(escapedPhrase, 'g');
    text = text.replace(regex, '');
  }

  // Опционально: убираем лишние пробелы
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}




function readFirstNotification() {
    // Останавливаем текущее чтение, если есть
    stopReading();

	//Верхнее уведомление
    let container = document.querySelector('.bx-im-content-notification-item__content-container');
    
    //Если нет верхнего уведомления, то Заголовок
    if (!container) {
    	container = document.querySelector('#pagetitle');
    }


	//Временно. Красим в желтый
    if (!container) return;
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
        // Блокируем Esc ещё на 3 секунды после завершения
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
