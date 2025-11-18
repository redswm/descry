//Вызывает смену фона (вспышка)

function doFlash(color = "green", count = 1, time = 200) {
  const originalColor = document.body.style.backgroundColor || "";
  let flashesDone = 0;

  function flash() {
    if (flashesDone >= count) {
      // Восстановить оригинальный цвет и остановить
      document.body.style.backgroundColor = originalColor;
      return;
    }

    // Меняем цвет на заданный
    document.body.style.backgroundColor = color;

    setTimeout(() => {
      // Возвращаем оригинальный цвет
      document.body.style.backgroundColor = originalColor;

      flashesDone++;
      // Задержка перед следующей вспышкой
      setTimeout(flash, time);
    }, time);
  }

  flash();
}
