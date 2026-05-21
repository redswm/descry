//Alt+F12 для инверсии цветов страницы
(function() {
  // Защита от повторной загрузки
  if (document.getElementById('hc-standalone-inject')) return;

  // === НАСТРОЙКИ ===
  const STORAGE_KEY = 'hc-standalone-enabled'; // Ключ для localStorage
  const HOTKEY_CONFIG = {
    ctrlKey: false,
    shiftKey: false,
    altKey: true,
    key: 'F11'
  };
  // =================================

  // 1. Внедряем SVG-фильтр
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'hc-standalone-inject';
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  svg.innerHTML = `
    <defs>
      <filter id="hc-invert-filter" x="0" y="0" width="99999" height="99999">
        <feComponentTransfer><feFuncR type="table" tableValues="1 0"/><feFuncG type="table" tableValues="1 0"/><feFuncB type="table" tableValues="1 0"/></feComponentTransfer>
        <feComponentTransfer><feFuncR type="gamma" exponent="1.7"/><feFuncG type="gamma" exponent="1.7"/><feFuncB type="gamma" exponent="1.7"/></feComponentTransfer>
      </filter>
    </defs>
  `;
  if (document.body) {
    document.body.appendChild(svg);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(svg), { once: true });
  }

  // 2. Внедряем CSS-правила
  const style = document.createElement('style');
  style.id = 'hc-standalone-css';
  style.textContent = `
    html[data-hc-active], body[data-hc-active] {
      filter: url("#hc-invert-filter") !important;
      backface-visibility: hidden;
    }
    html[data-hc-active] img,
    html[data-hc-active] video,
    html[data-hc-active] canvas {
      filter: url("#hc-invert-filter") !important;
    }
    html[data-hc-dark-bg] {
      background-color: #1a1a1a !important;
    }
    html[data-hc-dark-bg] body {
      background-color: #1a1a1a !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  // 3. Создаём слой для фона
  const bgLayer = document.createElement('div');
  bgLayer.id = 'hc-standalone-bg';
  bgLayer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -2147483647;
    pointer-events: none;
    display: none;
  `;
  if (document.body) {
    document.body.appendChild(bgLayer);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(bgLayer), { once: true });
  }

  // 4. Функция проверки яркости цвета
  function getLuminance(color) {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return 0;
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return 0;
    const [, r, g, b] = match;
    return (0.299 * parseInt(r) + 0.587 * parseInt(g) + 0.114 * parseInt(b)) / 255;
  }

  // 5. Функция затемнения светлого фона
  function applyDarkBackground() {
    const body = document.body;
    const html = document.documentElement;
    if (!body) return;
    
    const bodyBg = window.getComputedStyle(body).backgroundColor;
    const htmlBg = window.getComputedStyle(html).backgroundColor;
    const bodyLuminance = getLuminance(bodyBg);
    const htmlLuminance = getLuminance(htmlBg);
    
    if (bodyLuminance > 0.7 || htmlLuminance > 0.7) {
      html.setAttribute('data-hc-dark-bg', '');
      const originalBg = bodyLuminance > 0.7 ? bodyBg : htmlBg;
      bgLayer.style.background = originalBg;
      bgLayer.style.filter = 'url("#hc-invert-filter") brightness(0.3)';
    }
  }

  // 6. Синхронизация фона
  function syncBackground() {
    if (document.documentElement.hasAttribute('data-hc-active')) {
      applyDarkBackground();
      bgLayer.style.display = 'block';
    } else {
      bgLayer.style.display = 'none';
      document.documentElement.removeAttribute('data-hc-dark-bg');
    }
  }

  // 7. Сохранение и загрузка состояния
  function saveState(enabled) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled, timestamp: Date.now() }));
    } catch (e) {
      console.warn('Не удалось сохранить состояние инверсии:', e);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Опционально: сброс состояния старше 30 дней
      // if (Date.now() - data.timestamp > 30 * 24 * 60 * 60 * 1000) return null;
      return !!data.enabled;
    } catch (e) {
      console.warn('Не удалось загрузить состояние инверсии:', e);
      return null;
    }
  }

  // 8. Обработчик горячей клавиши
  function handleHotkey(event) {
    const target = event.target;
    const isInputLike = target.tagName === 'INPUT' || 
                        target.tagName === 'TEXTAREA' || 
                        target.isContentEditable;
    if (isInputLike) return;

    if (
      event.ctrlKey === HOTKEY_CONFIG.ctrlKey &&
      event.shiftKey === HOTKEY_CONFIG.shiftKey &&
      event.altKey === HOTKEY_CONFIG.altKey &&
      event.key.toLowerCase() === HOTKEY_CONFIG.key.toLowerCase()
    ) {
      event.preventDefault();
      event.stopPropagation();
      window.HighContrast?.toggle();
      return false;
    }
  }

  document.addEventListener('keydown', handleHotkey, { capture: true });

  // 9. Публичный API
  window.HighContrast = {
    _initialized: false,
    
    enable() {
      document.documentElement.setAttribute('data-hc-active', '');
      syncBackground();
      saveState(true);
      if (!this.observer) {
        this.observer = new MutationObserver(syncBackground);
        this.observer.observe(document.body, { 
          attributes: true, 
          attributeFilter: ['style', 'class'] 
        });
      }
    },
    
    disable() {
      document.documentElement.removeAttribute('data-hc-active');
      document.documentElement.removeAttribute('data-hc-dark-bg');
      bgLayer.style.display = 'none';
      saveState(false);
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    },
    
    toggle() {
      document.documentElement.hasAttribute('data-hc-active') ? this.disable() : this.enable();
    },
    
    // Метод для перенастройки горячей клавиши
    setHotkey(config) {
      Object.assign(HOTKEY_CONFIG, config);
    },
    
    // Метод для принудительной инициализации с проверкой состояния
    init() {
      if (this._initialized) return;
      this._initialized = true;
      
      const saved = loadState();
      if (saved === true) {
        // Небольшая задержка, чтобы дождаться готовности DOM
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => this.enable(), { once: true });
        } else {
          this.enable();
        }
      }
    },
    
    // Метод для сброса состояния (удаление из localStorage)
    reset() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.warn('Не удалось сбросить состояние:', e);
      }
    }
  };

  // Авто-инициализация при загрузке
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.HighContrast.init(), { once: true });
  } else {
    window.HighContrast.init();
  }

  // Информируем в консоль
  const mac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const keyCombo = `${HOTKEY_CONFIG.ctrlKey ? (mac ? 'Cmd' : 'Ctrl') + '+' : ''}${HOTKEY_CONFIG.shiftKey ? 'Shift+' : ''}${HOTKEY_CONFIG.altKey ? 'Alt+' : ''}${HOTKEY_CONFIG.key.toUpperCase()}`;
  console.log(`✅ Инверсия загружена. Горячая клавиша: ${keyCombo} | Состояние сохраняется в localStorage`);
})();
