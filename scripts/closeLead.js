//Завершает текущий лид

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

document.addEventListener('keydown', async (event) => {
  if (event.code === 'Backquote' && !event.repeat) {
    event.preventDefault();
    
    // 1. Нажимаем на div с data-id="C12:WON"
    const div1 = document.querySelector('div[data-id="C12:WON"]');
    if (div1) div1.click();

    // 2. Ждем 3 секунды
    await delay(3000);

    // 3. Нажимаем на div с id apply_button_control
    const div2 = document.getElementById('apply_button_control');
    if (div2) div2.click();

    // 4. Ждем 3 секунды
    await delay(3000);

    // 5. Нажимаем на button с классом won
    const btnWon = document.querySelector('button.won');
    if (btnWon) btnWon.click();

    // 6. Запускаем функцию playsond()
    if (typeof playsound === 'function') {
      playSuccesSound ();
    }
  }
});
