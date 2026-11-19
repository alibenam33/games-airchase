// Configuration, machine à états et orchestration d'une partie.
(function (A) {
  'use strict';

  A.CONFIG = {
    W: 320,
    H: 240,
    GROUND_Y: 212,

    PLAYER_SPEED: 115,
    FIRE_COOLDOWN: 0.14,
    BULLET_SPEED: 280,

    MAX_HEAT: 100,
    HEAT_PER_SHOT: 7,
    COOL_DELAY: 0.35,
    COOL_RATE: 38,
    OVERDRIVE_AT: 70,
    LOCK_TIME: 2.4,
    LOCK_SPEED_FACTOR: 0.6,

    START_LIVES: 3,
    MAX_LIVES: 6,
    LIFE_THRESHOLDS: [25000, 75000, 150000],
    LIFE_STEP_AFTER: 100000,
    RESPAWN_TIME: 1.6,
    INVULN_TIME: 2,

    HATCH_HP: 3,
    CHAIN_WINDOW: 1.2,
    MAX_MULT: 4,
    SCORE_MAX: 999999,
    HIGH_SCORE_KEY: 'airchase_high_score',
    COLD_BONUS_HEAT: 20,

    RAYON_WARN: 0.7,
    RAYON_BEAM: 0.45,
    SABOTEUR_SHOW_TIME: 1.6,
    KAMIKAZE_BLAST: 14,
    SURGE_TIME: 6,
    PICKUP_GROUND_TIME: 4,

    POINTS: {
      drone: 100, prism: 150, eclat: 50, armored: 250, saboteur: 200, kamikaze: 150,
      plasma: 10, comet: 30, hatch: 500,
    },
  };

  const CFG = A.CONFIG;
  const STATE = { TITLE: 'TITLE', PLAYING: 'PLAYING', GAME_OVER: 'GAME_OVER' };
  A.STATE = STATE;

  const ALIEN_COLORS = {
    drone: '#dc3cc8', prism: '#78dc28', eclat: '#54b8ec',
    armored: '#8c8c98', saboteur: '#54b8ec', kamikaze: '#d82828',
  };

  // [type, secteur d'apparition, poids de tirage]
  const ROSTER = [
    ['drone', 1, 4],
    ['prism', 2, 3],
    ['armored', 3, 2],
    ['saboteur', 4, 2],
    ['kamikaze', 6, 2],
  ];

  function buildWave(sector) {
    const pool = ROSTER.filter(([, from]) => sector >= from);
    const totalWeight = pool.reduce((s, [, , w]) => s + w, 0);
    const total = Math.min(6 + 2 * sector, 18);
    const queue = [];
    for (let i = 0; i < total; i++) {
      let r = Math.random() * totalWeight;
      const pick = pool.find(([, , w]) => (r -= w) < 0);
      queue.push(pick[0]);
    }
    const fresh = ROSTER.find(([, from]) => from === sector);
    if (fresh) queue[0] = fresh[0];
    return {
      queue,
      maxAlive: Math.min(4 + Math.floor(sector / 2), 9),
      dropInterval: Math.max(0.55, 1.7 - 0.08 * sector),
      groupMax: Math.min(3, 1 + Math.floor((sector + 1) / 3)),
      shotCap: Math.min(8, 3 + Math.floor(sector / 2)),
    };
  }

  class Game {
    constructor(ctx) {
      this.ctx = ctx;
      this.state = STATE.TITLE;
      this.stateTime = 0;
      this.time = 0;
      this.paused = false;
      this.sector = 1;
      this.lives = CFG.START_LIVES;
      A.Score.loadHigh();
      this.player = new A.Player();
      this.mothership = new A.Mothership();
      this.clearWorld();
    }

    clearWorld() {
      this.aliens = [];
      this.bullets = [];
      this.enemyShots = [];
      this.pickups = [];
      this.particles = [];
      this.explosions = [];
      this.popups = [];
      this.banner = null;
      this.shake = 0;
    }

    setState(state) {
      this.state = state;
      this.stateTime = 0;
    }

    newRun() {
      A.Score.reset();
      this.lives = CFG.START_LIVES;
      this.clearWorld();
      this.player.respawn();
      this.mothership = new A.Mothership();
      this.deathTimer = 0;
      this.newRecord = false;
      this.paused = false;
      this.startSector(1);
      this.setState(STATE.PLAYING);
      A.Music.start();
    }

    startSector(n) {
      this.sector = n;
      this.siege = n % 5 === 0;
      this.wave = buildWave(n);
      this.mothership.prepare(n, this.siege);
      this.phase = 'intro';
      this.phaseTimer = 1.6;
      const lines = [{ text: 'SECTOR ' + String(n).padStart(2, '0'), color: '#ececec', scale: 2 }];
      if (this.siege) lines.push({ text: 'HIVE ASSAULT', color: '#d82828' });
      this.setBanner(lines, 1.6);
      A.Sfx.play('wave');
    }

    setBanner(lines, duration) {
      this.banner = { lines, timer: duration };
    }

    // --- Interface utilisée par les autres modules -------------------------

    isFighting() {
      return this.phase === 'fight';
    }

    canDrop() {
      return this.phase === 'fight' && this.wave.queue.length > 0 && this.aliens.length < this.wave.maxAlive;
    }

    canEnemyFire() {
      return this.enemyShots.length < this.wave.shotCap;
    }

    dropAlien(cx, y) {
      const type = this.wave.queue.shift();
      this.aliens.push(A.Aliens.create(type, cx, y, this.sector));
    }

    spawnPlayerBullet(x, y, overdrive) {
      this.bullets.push(new A.Projectiles.PlayerBullet(x, y, overdrive));
    }

    spawnEnemyShot(kind, cx, y, opts) {
      opts = opts || {};
      if (!opts.speed) opts.speed = Math.min(2, 1 + 0.07 * (this.sector - 1));
      this.enemyShots.push(new A.Projectiles.EnemyShot(kind, cx, y, opts));
    }

    killAlien(alien, bullet) {
      alien.dead = true;
      const overdrive = bullet ? bullet.overdrive : false;
      const pts = A.Score.addKill(CFG.POINTS[alien.type], overdrive);
      this.popup(alien.cx, alien.y, String(pts), overdrive ? '#fce048' : '#ececec');
      this.alienExplosion(alien);

      if (alien.type === 'prism') {
        for (const side of [-1, 1]) {
          const e = A.Aliens.create('eclat', alien.cx + side * 4, alien.cy - 4, this.sector);
          e.vx = side * Math.abs(e.vx);
          if (bullet) bullet.hits.add(e);
          this.aliens.push(e);
        }
      }
    }

    // Alien touché sans être détruit (Blindé) : étincelle d'impact + clang métallique.
    alienHit(alien, bullet) {
      alien.flash = 0.2;
      this.spawnExplosion(bullet.x + 2, alien.y + alien.h - 2, 'spark', '#8c8c98');
      this.burst(bullet.x + 2, alien.y + alien.h - 2, '#ececec', 4, 50);
      A.Sfx.play('armorHit');
    }

    // Explosion proportionnée à la taille de l'alien, avec bruitage assorti.
    alienExplosion(alien) {
      const big = alien.type === 'armored' || alien.type === 'prism';
      const small = alien.w <= 8;
      const size = big ? 'large' : small ? 'small' : 'medium';
      this.spawnExplosion(alien.cx, alien.cy, size, ALIEN_COLORS[alien.type]);
      this.burst(alien.cx, alien.cy, ALIEN_COLORS[alien.type], small ? 6 : 10, small ? 50 : 70);
      if (big) this.shake = Math.max(this.shake, 2);
      A.Sfx.play(big ? 'killBig' : small ? 'killSmall' : 'kill');
    }

    spawnExplosion(x, y, size, color) {
      this.explosions.push(new A.Effects.Explosion(x, y, size, color));
    }

    destroyShot(shot) {
      shot.dead = true;
      const pts = A.Score.add(CFG.POINTS[shot.kind]);
      this.popup(shot.cx, shot.y, String(pts), '#f08020');
      this.spawnExplosion(shot.cx, shot.y + 4, 'small', '#f08020');
      A.Sfx.play('pop');
    }

    onHatchDestroyed(hatch) {
      const ms = this.mothership;
      const cx = ms.x + hatch.ox;
      const cy = ms.y + 20;
      A.Score.add(CFG.POINTS.hatch);
      this.popup(cx, cy, String(CFG.POINTS.hatch), '#fce048');
      this.spawnExplosion(cx, cy, 'large', '#7c40c8');
      this.burst(cx, cy, '#fce048', 12, 80);
      this.shake = Math.max(this.shake, 3);
      A.Sfx.play('hatch');
      const kinds = A.Projectiles.PICKUP_KINDS;
      this.pickups.push(new A.Projectiles.Pickup(kinds[Math.floor(Math.random() * kinds.length)], cx, cy + 4));
      if (ms.allHatchesDestroyed()) this.breach();
    }

    // Les 3 trappes sont détruites : tous les aliens explosent et le secteur est gagné.
    breach() {
      this.aliens.forEach((a) => {
        if (a.dead) return;
        a.dead = true;
        A.Score.add(CFG.POINTS[a.type]);
        this.spawnExplosion(a.cx, a.cy, 'large', ALIEN_COLORS[a.type]);
      });
      this.wave.queue = [];
      const bonus = A.Score.add(1000 * this.sector);
      this.shake = 6;
      A.Sfx.play('breach');
      this.sectorClear([{ text: 'BREACH!', color: '#fce048', scale: 3 }, { text: 'BONUS ' + bonus, color: '#ececec' }]);
    }

    sectorClear(extraLines) {
      this.phase = 'clear';
      this.phaseTimer = 2.4;
      this.enemyShots.forEach((s) => this.burst(s.cx, s.y + 4, '#8c8c98', 3, 30));
      this.enemyShots = [];
      const lines = extraLines || [{ text: 'SECTOR CLEARED', color: '#78dc28', scale: 2 }];
      const p = this.player;
      if (p.alive && p.heat < CFG.COLD_BONUS_HEAT) {
        const bonus = A.Score.add(300 * this.sector);
        lines.push({ text: 'COOL HEAD +' + bonus, color: '#54b8ec' });
      }
      this.setBanner(lines, 2.4);
      if (!extraLines) A.Sfx.play('clear');
    }

    collectPickup(pickup) {
      this.player.applyPickup(pickup.kind);
      const labels = { cryo: 'CRYO', shield: 'SHIELD', surge: 'HEATSINK' };
      this.popup(pickup.x + 4, pickup.y - 4, labels[pickup.kind], '#78dc28');
      A.Sfx.play('pickup');
    }

    onOverheat() {
      A.Sfx.play('lock');
      this.popup(this.player.cx, this.player.y - 6, 'LOCKED', '#d82828');
      this.burst(this.player.cx, this.player.y, '#8c8c98', 8, 40);
    }

    // Retourne vrai si le coup a porté (bouclier ou destruction).
    playerHit() {
      const p = this.player;
      const result = p.hit();
      if (!result) return false;
      if (result === 'shield') {
        A.Sfx.play('shield');
        this.burst(p.cx, p.y + 8, '#78dc28', 12, 60);
        return true;
      }
      this.lives--;
      this.deathTimer = this.lives > 0 ? CFG.RESPAWN_TIME : 2;
      A.Score.breakChain();
      this.spawnExplosion(p.cx, p.y + 8, 'large', '#54b8ec');
      this.burst(p.cx, p.y + 8, '#ececec', 16, 90);
      this.shake = 5;
      A.Sfx.play('dead');
      return true;
    }

    explode(x, y, radius, hurtsPlayer) {
      this.spawnExplosion(x, y, 'medium', '#f08020');
      this.burst(x, y, '#fce048', 8, 50);
      A.Sfx.play('killBig');
      const p = this.player;
      if (hurtsPlayer && p.alive && Math.abs(p.cx - x) < radius + p.w / 2 - 3) this.playerHit();
    }

    warpEffect(x, y) {
      this.burst(x, y, '#54b8ec', 6, 40);
      A.Sfx.play('warp');
    }

    burst(x, y, color, count, speed) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random() * 0.7);
        this.particles.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          life: 0.3 + Math.random() * 0.4, color,
        });
      }
    }

    popup(x, y, text, color) {
      this.popups.push({ x, y, text, color, life: 0.9 });
    }

    // --- Boucle -----------------------------------------------------------

    update(dt) {
      const input = A.Input;
      this.time += dt;
      this.stateTime += dt;
      if (input.wasPressed('mute')) {
        A.Sfx.muted = !A.Sfx.muted;
        A.Music.setMuted(A.Sfx.muted);
      }
      const blurred = input.consumeBlur();

      if (this.state === STATE.TITLE) {
        if (input.wasPressed('start') || input.wasPressed('fire')) this.newRun();
        return;
      }
      if (this.state === STATE.GAME_OVER) {
        this.updateEffects(dt);
        if (this.stateTime > 1 && (input.wasPressed('start') || input.wasPressed('fire'))) this.newRun();
        return;
      }

      const wasPaused = this.paused;
      if (blurred) this.paused = true;
      else if (input.wasPressed('pause') || (this.paused && input.wasPressed('start'))) this.paused = !this.paused;
      // La musique suit la pause (y compris la pause automatique en perdant le focus)
      if (this.paused !== wasPaused) {
        if (this.paused) A.Music.pause();
        else A.Music.resume();
      }
      if (this.paused) return;

      this.updatePlaying(dt);
      this.updateEffects(dt);
    }

    updatePlaying(dt) {
      const p = this.player;
      A.Score.update(dt);

      if (p.alive) {
        p.update(dt, A.Input, this);
      } else {
        this.deathTimer -= dt;
        if (this.deathTimer <= 0) {
          if (this.lives > 0) {
            p.respawn();
            this.enemyShots = [];
          } else {
            this.newRecord = A.Score.saveHigh();
            this.setState(STATE.GAME_OVER);
            A.Music.gameOver();
            return;
          }
        }
      }

      this.mothership.update(dt, this);
      this.aliens.forEach((a) => a.update(dt, this));
      this.bullets.forEach((b) => b.update(dt));
      this.enemyShots.forEach((s) => s.update(dt, this));
      this.pickups.forEach((k) => k.update(dt));

      A.Collisions.resolve(this);

      this.aliens = this.aliens.filter((a) => !a.dead);
      this.bullets = this.bullets.filter((b) => !b.dead);
      this.enemyShots = this.enemyShots.filter((s) => !s.dead);
      this.pickups = this.pickups.filter((k) => !k.dead);

      if (this.phase === 'intro') {
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) this.phase = 'fight';
      } else if (this.phase === 'fight') {
        if (this.wave.queue.length === 0 && this.aliens.length === 0) this.sectorClear();
      } else if (this.phase === 'clear') {
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) this.startSector(this.sector + 1);
      }

      const extra = A.Score.takeExtraLives();
      for (let i = 0; i < extra; i++) {
        if (this.lives >= CFG.MAX_LIVES) break;
        this.lives++;
        this.popup(CFG.W / 2, CFG.GROUND_Y - 30, 'EXTRA CANNON', '#78dc28');
        A.Sfx.play('life');
      }
    }

    updateEffects(dt) {
      this.particles.forEach((q) => {
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vy += 60 * dt;
        q.life -= dt;
      });
      this.particles = this.particles.filter((q) => q.life > 0);
      this.explosions.forEach((e) => e.update(dt));
      this.explosions = this.explosions.filter((e) => !e.dead);
      this.popups.forEach((q) => { q.y -= 18 * dt; q.life -= dt; });
      this.popups = this.popups.filter((q) => q.life > 0);
      if (this.banner && (this.banner.timer -= dt) <= 0) this.banner = null;
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 12);
    }

    // --- Rendu ------------------------------------------------------------

    draw() {
      const ctx = this.ctx;
      ctx.fillStyle = '#05060f';
      ctx.fillRect(0, 0, CFG.W, CFG.H);
      A.Assets.draw(ctx, 'background_space', 0, 0);

      if (this.state === STATE.TITLE) {
        this.drawGround(ctx);
        A.UI.drawTitle(ctx, this);
        return;
      }

      ctx.save();
      if (this.shake > 0) {
        ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake));
      }
      this.mothership.draw(ctx);
      this.aliens.forEach((a) => a.draw(ctx));
      this.pickups.forEach((k) => k.draw(ctx));
      this.enemyShots.forEach((s) => s.draw(ctx));
      this.bullets.forEach((b) => b.draw(ctx));
      this.player.draw(ctx);
      this.drawGround(ctx);
      this.explosions.forEach((e) => e.draw(ctx));
      this.particles.forEach((q) => {
        ctx.fillStyle = q.color;
        ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);
      });
      this.popups.forEach((q) => A.UI.text(ctx, q.text, q.x, q.y, q.color, 1, 'center'));
      ctx.restore();

      A.UI.drawHUD(ctx, this);
      if (this.state === STATE.PLAYING) A.UI.drawBanner(ctx, this.banner);
      if (this.paused) A.UI.drawPause(ctx);
      if (this.state === STATE.GAME_OVER) A.UI.drawGameOver(ctx, this);
    }

    drawGround(ctx) {
      for (let x = 0; x < CFG.W; x += 64) A.Assets.draw(ctx, 'base', x, CFG.GROUND_Y);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, CFG.GROUND_Y + 16, CFG.W, CFG.H - CFG.GROUND_Y - 16);
    }
  }

  A.Game = Game;
})(window.Airchase = window.Airchase || {});
