//Нажатие по кнопке по css-селектору
function clickBySelector(sel, customError) {
  var el = document.querySelector(sel);
  if (!el) throw new Error(customError || 'Не найден: ' + sel);
  el.click();
}

//Говорилка
function speak(text) {
  speechSynthesis.cancel();
  var utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ru-RU';
  utter.rate = 1.0;
  speechSynthesis.speak(utter);
}

/*
ЗАКРЫТИЕ НЕКАЧЕСТВЕННЫХ ЛИДОВ - Ё
*/
document.addEventListener('keydown', async function(e) {
	//Клавиша Ё - закрываем лид
  if (e.code !== 'Backquote') return;
  e.preventDefault();
  speechSynthesis.cancel();
  
  //1. Кнопка Завершить сделку
  try {
    clickBySelector('div[data-id="WON"]', 'FIRST_NOT_FOUND');
  } catch (err) {
    if (err.message === 'FIRST_NOT_FOUND') {
      speak('Не найдена первая кнопка');
    } else {
      speak('Ошибка');
    }
    console.error(err);
    return; // ← дальше не идём
  }

  // 2. Кнопка Сделка успешна, 3-я кнопка
  try {
    await new Promise(function(resolve) { setTimeout(resolve, 1250); });
    clickBySelector('span.webform-small-button-text');
    await new Promise(function(resolve) { setTimeout(resolve, 1250); });
    clickBySelector('#intranet_binding_menu_crm_detail_top');
    speak('Сделка удалена');
  } catch (err) {
    speak('Ошибка');
    console.error(err);
  }
});
