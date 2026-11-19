// Police bitmap 3x5, HUD et écrans (titre, pause, game over, annonces).
(function (A) {
  'use strict';

  const GLYPHS = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
    8: '111101111101111', 9: '111101111001110',
    ' ': '000000000000000', '-': '000000111000000', '!': '010010010000010', ':': '000010000010000',
    '.': '000000000000010', '%': '101001010100101', '/': '001001010100100', '+': '000010111010000',
    '>': '100010001010100', '<': '001010100010001', '?': '110001010000010', "'": '010010000000000',
    '(': '010100100100010', ')': '010001001001010', ',': '000000000010100', '=': '000111000111000',
    '×': '000101010101000',
  };

  function normalize(str) {
    return String(str).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function textWidth(str, scale) {
    const n = normalize(str).length;
    return n ? (n * 4 - 1) * (scale || 1) : 0;
  }

  function text(ctx, str, x, y, color, scale, align) {
    scale = scale || 1;
    const s = normalize(str);
    if (align === 'center') x -= textWidth(s, scale) / 2;
    else if (align === 'right') x -= textWidth(s, scale);
    x = Math.round(x);
    y = Math.round(y);
    ctx.fillStyle = color || '#ececec';
    for (let i = 0; i < s.length; i++) {
      const g = GLYPHS[s[i]] || GLYPHS['?'];
      for (let gy = 0; gy < 5; gy++) {
        for (let gx = 0; gx < 3; gx++) {
          if (g[gy * 3 + gx] === '1') {
            ctx.fillRect(x + (i * 4 + gx) * scale, y + gy * scale, scale, scale);
          }
        }
      }
    }
  }

  function blink(t, rate) {
    return Math.floor(t * (rate || 2)) % 2 === 0;
  }

  function drawHUD(ctx, game) {
    const cfg = A.CONFIG;
    const S = A.Score;
    const p = game.player;

    // Haut : score, chaîne, meilleur score, secteur.
    text(ctx, S.format(S.value), 4, 3, '#ececec');
    const mult = S.multiplier();
    if (mult > 1) text(ctx, '×' + mult, 32, 3, mult >= 4 ? '#d82828' : '#fce048');
    text(ctx, 'HI ' + S.format(Math.max(S.high, S.value)), cfg.W / 2, 3, '#8c8c98', 1, 'center');
    text(ctx, 'SECTOR ' + String(game.sector).padStart(2, '0'), cfg.W - 4, 3, '#54b8ec', 1, 'right');

    // Bas gauche : canons restants.
    const lifeY = cfg.GROUND_Y + 18;
    const icon = A.Assets.get('player_cannon');
    for (let i = 0; i < game.lives; i++) {
      if (icon) ctx.drawImage(icon, 4 + i * 10, lifeY, 8, 8);
      else { ctx.fillStyle = '#54b8ec'; ctx.fillRect(4 + i * 10, lifeY + 2, 8, 6); }
    }
    if (p.alive && p.shield) text(ctx, 'S', 6 + game.lives * 10, lifeY + 2, '#78dc28');

    // Bas centre : état de l'arme.
    const midX = cfg.W / 2;
    if (p.alive) {
      if (p.locked) {
        if (blink(game.time, 6)) text(ctx, 'LOCKED', midX, lifeY + 2, '#d82828', 1, 'center');
      } else if (p.surgeTimer > 0) {
        text(ctx, 'HEATSINK ' + Math.ceil(p.surgeTimer), midX, lifeY + 2, '#54b8ec', 1, 'center');
      } else if (p.overdrive) {
        text(ctx, 'OVERDRIVE ×2', midX, lifeY + 2, blink(game.time, 8) ? '#fce048' : '#f08020', 1, 'center');
      }
    }

    // Bas droite : jauge TEMP.
    const barX = cfg.W - 52;
    const barY = lifeY;
    text(ctx, 'TEMP', barX - 4, barY + 2, p.locked ? '#d82828' : '#ececec', 1, 'right');
    const bar = A.Assets.get('temperature_bar');
    const fill = A.Assets.get('temperature_fill');
    if (bar) ctx.drawImage(bar, barX, barY);
    else { ctx.fillStyle = '#ececec'; ctx.fillRect(barX, barY, 48, 8); ctx.fillStyle = '#1c1c2c'; ctx.fillRect(barX + 2, barY + 2, 44, 4); }
    const ratio = Math.max(0, Math.min(1, p.heat / cfg.MAX_HEAT));
    const fw = Math.round(44 * ratio);
    if (fw > 0 && !(p.locked && !blink(game.time, 8))) {
      if (fill) ctx.drawImage(fill, 2, 0, fw, 8, barX + 2, barY, fw, 8);
      else { ctx.fillStyle = '#d82828'; ctx.fillRect(barX + 2, barY + 2, fw, 4); }
    }
    // Repère du Surrégime.
    ctx.fillStyle = '#ececec';
    ctx.fillRect(barX + 2 + Math.round(44 * cfg.OVERDRIVE_AT / cfg.MAX_HEAT), barY + 1, 1, 6);
  }

  function drawBanner(ctx, banner) {
    if (!banner) return;
    const cfg = A.CONFIG;
    let y = banner.y || 96;
    banner.lines.forEach((line) => {
      const scale = line.scale || 1;
      text(ctx, line.text, cfg.W / 2, y, line.color, scale, 'center');
      y += 5 * scale + 5;
    });
  }

  function overlay(ctx, alpha) {
    ctx.fillStyle = 'rgba(0, 0, 0, ' + alpha + ')';
    ctx.fillRect(0, 0, A.CONFIG.W, A.CONFIG.H);
  }

  function drawTitle(ctx, game) {
    const cfg = A.CONFIG;
    const logo = A.Assets.get('title_logo');
    if (logo) ctx.drawImage(logo, (cfg.W - logo.width) / 2, 14);
    else text(ctx, 'AIRCHASE', cfg.W / 2, 30, '#ececec', 6, 'center');

    text(ctx, 'THE HIVE IS ATTACKING. HOLD THE SECTOR.', cfg.W / 2, 82, '#54b8ec', 1, 'center');

    const lines = [
      ['ARROWS / A-D', 'MOVE THE CANNON'],
      ['SPACE / UP / W', 'FIRE UPWARD'],
      ['P / M', 'PAUSE / SOUND'],
    ];
    lines.forEach(([k, v], i) => {
      text(ctx, k, cfg.W / 2 - 6, 100 + i * 9, '#fce048', 1, 'right');
      text(ctx, v, cfg.W / 2 + 6, 100 + i * 9, '#ececec');
    });

    const tips = [
      'HIT THE OPEN HATCHES: 3 HATCHES = BREACH',
      'TEMP 70% = OVERDRIVE (PIERCING, ×2 POINTS)',
      'TEMP 100% = CANNON LOCKED',
    ];
    tips.forEach((t, i) => text(ctx, t, cfg.W / 2, 146 + i * 9, '#8c8c98', 1, 'center'));

    if (blink(game.time, 2)) text(ctx, 'PRESS ENTER OR TAP TO PLAY', cfg.W / 2, 184, '#ececec', 1, 'center');
    text(ctx, 'BEST ' + A.Score.format(A.Score.high), cfg.W / 2, 200, '#54b8ec', 1, 'center');
  }

  function drawGameOver(ctx, game) {
    const cfg = A.CONFIG;
    overlay(ctx, 0.6);
    const img = A.Assets.get('game_over_text');
    if (img) ctx.drawImage(img, (cfg.W - img.width) / 2, 46);
    else text(ctx, 'GAME OVER', cfg.W / 2, 50, '#d82828', 4, 'center');

    text(ctx, 'SCORE ' + A.Score.format(A.Score.value), cfg.W / 2, 96, '#ececec', 2, 'center');
    text(ctx, 'BEST ' + A.Score.format(A.Score.high), cfg.W / 2, 118, '#54b8ec', 1, 'center');
    if (game.newRecord && blink(game.stateTime, 4)) {
      text(ctx, 'NEW HIGH SCORE!', cfg.W / 2, 130, '#fce048', 1, 'center');
    }
    text(ctx, 'SECTOR REACHED ' + String(game.sector).padStart(2, '0'), cfg.W / 2, 144, '#8c8c98', 1, 'center');
    if (game.stateTime > 1 && blink(game.stateTime, 2)) {
      text(ctx, 'PRESS ENTER OR TAP TO PLAY AGAIN', cfg.W / 2, 170, '#ececec', 1, 'center');
    }
  }

  function drawPause(ctx) {
    const cfg = A.CONFIG;
    overlay(ctx, 0.5);
    text(ctx, 'PAUSE', cfg.W / 2, 100, '#ececec', 3, 'center');
    text(ctx, 'PRESS P TO RESUME', cfg.W / 2, 124, '#8c8c98', 1, 'center');
  }

  A.UI = { text, textWidth, drawHUD, drawBanner, drawTitle, drawGameOver, drawPause };
})(window.Airchase = window.Airchase || {});
