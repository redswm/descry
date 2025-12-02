// Короткий звуковой сигнал "успешного копирования"
function playSuccessSound() {
    try {
        // Создаём звук только если есть поддержка Web Audio API
        if (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined') {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            
            // Разрешаем воспроизведение после пользовательского взаимодействия
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Параметры звука: частота 800 Гц, длительность 100 мс
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1; // Громкость
            
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(
                0.00001, audioCtx.currentTime + 0.1
            );
            
            setTimeout(() => {
                oscillator.stop();
                oscillator.disconnect();
                gainNode.disconnect();
            }, 100);
        }
    } catch (e) {
        console.warn('🔇 Не удалось воспроизвести звук:', e);
    }
}
