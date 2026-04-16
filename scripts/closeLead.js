function clickBySelector(sel, customError) {
  var el = document.querySelector(sel);
  if (!el) throw new Error(customError || 'Не найден: ' + sel);
  el.click();
}

function speak(text) {
  var utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ru-RU';
  speechSynthesis.speak(utter);
}

document.addEventListener('keydown', async function(e) {
  if (e.code !== 'Backquote') return;
  e.preventDefault();
  speechSynthesis.cancel(); // Сброс очереди при новом нажатии

  try {
    clickBySelector('div[data-id="WON"]', 'Не найдена первая кнопка');
    await new Promise(function(resolve) { setTimeout(resolve, 1250); });
    clickBySelector('span.webform-small-button-text');
    await new Promise(function(resolve) { setTimeout(resolve, 1250); });
    clickBySelector('#intranet_binding_menu_crm_detail_top');
    speak('Сделка удалена');
  } catch (err) {
    if (err.message === 'Не найдена первая кнопка') {
      speak('Ошибка. Не найдена первая кнопка');
    } else {
    	speak('Ошибка');
    }
    
    console.error(err);
  }
});
