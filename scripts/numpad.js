// Слушатель событий для нажатия клавиш
document.addEventListener('keydown', function(event) {
    // Проверяем не зажат ли CTRL, SHIFT, ALT
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
    // Numpad+ Переход на страницу /crm/deal/
    else if (event.code === 'NumpadMultiply') {
        event.preventDefault();
        window.location.href = '/crm/deal/';
    }
});
