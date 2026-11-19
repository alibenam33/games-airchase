// Toutes les collisions de la partie, résolues une fois par frame.
(function (A) {
  'use strict';

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function bulletsVsMothership(game) {
    const ms = game.mothership;
    const body = ms.bodyRect();
    game.bullets.forEach((b) => {
      if (b.dead) return;
      for (const h of ms.hatches) {
        if (h.destroyed || !overlap(b, ms.hatchRect(h))) continue;
        const result = ms.damageHatch(h);
        b.dead = true;
        if (result === 'destroyed') game.onHatchDestroyed(h);
        else if (result === 'damaged') { A.Sfx.play('hit'); game.burst(b.x + 2, b.y, '#fce048', 3, 30); }
        else { A.Sfx.play('clink'); game.burst(b.x + 2, b.y, '#8c8c98', 2, 20); }
        return;
      }
      if (overlap(b, body)) {
        // Coque invulnérable : le tir est absorbé.
        b.dead = true;
        A.Sfx.play('clink');
        game.burst(b.x + 2, b.y, '#8c8c98', 2, 20);
      }
    });
  }

  function bulletsVsAliens(game) {
    game.bullets.forEach((b) => {
      for (const a of game.aliens) {
        if (b.dead) return;
        if (!a.hittable || b.hits.has(a) || !overlap(b, a)) continue;
        b.hits.add(a);
        if (!b.overdrive) b.dead = true;
        a.hp--;
        if (a.hp <= 0) game.killAlien(a, b);
        else game.alienHit(a, b);
      }
    });
  }

  function bulletsVsShots(game) {
    game.bullets.forEach((b) => {
      for (const s of game.enemyShots) {
        if (b.dead) return;
        if (s.dead || !s.destroyable || b.hits.has(s) || !overlap(b, s)) continue;
        b.hits.add(s);
        if (!b.overdrive) b.dead = true;
        game.destroyShot(s);
      }
    });
  }

  function hazardsVsPlayer(game) {
    const p = game.player;
    if (!p.alive) return;
    const box = p.hitbox();

    for (const s of game.enemyShots) {
      const r = s.hitRect();
      if (s.dead || !r || !overlap(r, box)) continue;
      if (s.kind !== 'rayon') s.dead = true;
      game.playerHit();
      if (!p.alive) return;
    }
    for (const a of game.aliens) {
      if (!a.hittable || !overlap(a, box)) continue;
      if (game.playerHit()) {
        a.dead = true;
        game.alienExplosion(a);
      }
      if (!p.alive) return;
    }
  }

  function pickupsVsPlayer(game) {
    const p = game.player;
    if (!p.alive) return;
    const box = { x: p.x, y: p.y, w: p.w, h: p.h };
    game.pickups.forEach((k) => {
      if (!k.dead && overlap(k, box)) {
        k.dead = true;
        game.collectPickup(k);
      }
    });
  }

  A.Collisions = {
    overlap,
    resolve(game) {
      bulletsVsMothership(game);
      bulletsVsAliens(game);
      bulletsVsShots(game);
      hazardsVsPlayer(game);
      pickupsVsPlayer(game);
    },
  };
})(window.Airchase = window.Airchase || {});
