// Clavier + boutons tactiles, exposés sous forme d'actions logiques.
(function (A) {
  'use strict';

  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    Space: 'fire',
    Enter: 'start', NumpadEnter: 'start',
    KeyP: 'pause', Escape: 'pause',
    KeyM: 'mute',
  };

  const down = {};
  const pressed = {};
  let blurred = false;

  // Doigts posés sur les boutons tactiles (pointerId -> action) : glisser d'un bouton à l'autre change d'action.
  const touches = new Map();
  const held = (action) => [...touches.values()].includes(action);

  function press(action) {
    if (!down[action]) pressed[action] = true;
    down[action] = true;
  }

  function release(action) {
    down[action] = false;
  }

  function buttonAt(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const btn = el && el.closest('#touch [data-key]');
    return btn ? btn.dataset.key : null;
  }

  function setTouch(id, action) {
    const prev = touches.get(id) || null;
    if (prev === action) return;
    if (action) touches.set(id, action);
    else touches.delete(id);
    if (prev && !held(prev)) release(prev);
    if (action) press(action);
    document.querySelectorAll('#touch [data-key]').forEach((btn) => btn.classList.toggle('on', held(btn.dataset.key)));
  }

  function releaseAll() {
    [...touches.keys()].forEach((id) => setTouch(id, null));
    Object.keys(down).forEach(release);
  }

  // Plein écran + verrouillage paysage, quand le navigateur le permet.
  let lockTried = false;
  function lockLandscape() {
    if (lockTried) return;
    lockTried = true;
    const el = document.documentElement;
    const lock = () => {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    };
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().then(lock, () => {});
    } else {
      lock();
    }
  }

  A.Input = {
    init(canvas) {
      // Boutons ◀ ▶ FIRE affichés sur tout appareil tactile (le canvas se resserre pour leur laisser deux colonnes).
      const touchDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
      document.documentElement.classList.toggle('touch', touchDevice);

      window.addEventListener('keydown', (e) => {
        const action = KEYMAP[e.code];
        if (!action) return;
        e.preventDefault();
        A.Sfx.unlock();
        if (!e.repeat) press(action);
      });
      window.addEventListener('keyup', (e) => {
        const action = KEYMAP[e.code];
        if (action) release(action);
      });
      window.addEventListener('blur', () => {
        releaseAll();
        blurred = true;
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) A.Input.forcePause();
      });

      // Le jeu est en paysage : passer en portrait met la partie en pause.
      const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
      const onOrientation = () => { if (portrait.matches) A.Input.forcePause(); };
      if (portrait.addEventListener) portrait.addEventListener('change', onOrientation);
      else portrait.addListener(onOrientation);

      window.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') lockLandscape();
      });

      canvas.addEventListener('pointerdown', () => {
        A.Sfx.unlock();
        pressed.start = true;
      });

      const pads = document.getElementById('touch');
      pads.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        A.Sfx.unlock();
        setTouch(e.pointerId, buttonAt(e));
      });
      pads.addEventListener('pointermove', (e) => {
        if (e.buttons || touches.has(e.pointerId)) setTouch(e.pointerId, buttonAt(e));
      });
      ['pointerup', 'pointercancel'].forEach((type) => {
        pads.addEventListener(type, (e) => setTouch(e.pointerId, null));
      });
      pads.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    isDown(action) {
      return !!down[action];
    },

    wasPressed(action) {
      return !!pressed[action];
    },

    forcePause() {
      releaseAll();
      blurred = true;
    },

    // Vrai une seule fois après une perte de focus ou un passage en portrait.
    consumeBlur() {
      const b = blurred;
      blurred = false;
      return b;
    },

    endFrame() {
      Object.keys(pressed).forEach((k) => { pressed[k] = false; });
    },
  };
})(window.Airchase = window.Airchase || {});
