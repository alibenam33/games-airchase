// Point d'entrée : chargement des assets puis boucle requestAnimationFrame.
(function (A) {
  'use strict';

  const MAX_DT = 0.05;

  function boot() {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    A.UI.text(ctx, 'LOADING...', canvas.width / 2, canvas.height / 2, '#ececec', 1, 'center');

    A.Input.init(canvas);
    A.Assets.load(() => {
      const game = new A.Game(ctx);
      let last = performance.now();
      function frame(now) {
        const dt = Math.min((now - last) / 1000, MAX_DT);
        last = now;
        game.update(dt);
        game.draw();
        A.Input.endFrame();
        requestAnimationFrame(frame);
      }
      game.draw();
      requestAnimationFrame(frame);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.Airchase = window.Airchase || {});
