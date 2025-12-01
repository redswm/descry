//Мерцание
function flashScreen(color = 'white', count = 1, duration = 200) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = color;
    overlay.style.zIndex = '999999';
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.transition = `opacity ${duration / 1000}s ease-out`;
    document.body.appendChild(overlay);
    function flash(current) {
        if (current >= count) {
            // Завершаем и убираем оверлей
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, duration);
            return;
        }
        // Мигаем: включаем
        overlay.style.opacity = '0.8';
        setTimeout(() => {
            // Выключаем
            overlay.style.opacity = '0';
            setTimeout(() => {
                // Следующий цикл
                flash(current + 1);
            }, duration);
        }, duration);
    }
    flash(0); // Запускаем с 0
}

/*
Примеры
flashScreen ();
flashScreen ('#FF9000', 3, 300);
flashScreen ('green', 3, 300);
flashScreen ('red', 2, 200);
*/
