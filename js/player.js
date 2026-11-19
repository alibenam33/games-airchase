// Canon du joueur : déplacement, tir vertical, chaleur / Surrégime / Verrou.
(function (A) {
  'use strict';

  class Player {
    constructor() {
      this.w = 16;
      this.h = 16;
      this.respawn();
      this.invuln = 0;
    }

    respawn() {
      const cfg = A.CONFIG;
      this.x = cfg.W / 2 - this.w / 2;
      this.y = cfg.GROUND_Y - this.h;
      this.heat = 0;
      this.coolDelay = 0;
      this.cooldown = 0;
      this.lockTimer = 0;
      this.surgeTimer = 0;
      this.shield = false;
      this.alive = true;
      this.invuln = cfg.INVULN_TIME;
      this.t = 0;
    }

    get cx() { return this.x + this.w / 2; }
    get locked() { return this.lockTimer > 0; }
    get overdrive() { return !this.locked && this.heat >= A.CONFIG.OVERDRIVE_AT; }

    // Zone de collision plus petite que le sprite (corps du canon).
    hitbox() {
      return { x: this.x + 3, y: this.y + 6, w: this.w - 6, h: this.h - 6 };
    }

    update(dt, input, game) {
      const cfg = A.CONFIG;
      this.t += dt;
      if (this.invuln > 0) this.invuln -= dt;
      if (this.cooldown > 0) this.cooldown -= dt;
      if (this.surgeTimer > 0) this.surgeTimer -= dt;

      // Le canon ne tire que vers le haut ; il peut se déplacer en tirant.
      const move = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
      const firing = input.isDown('fire') || input.isDown('up');

      const speed = cfg.PLAYER_SPEED * (this.locked ? cfg.LOCK_SPEED_FACTOR : 1);
      this.x = Math.max(0, Math.min(cfg.W - this.w, this.x + move * speed * dt));

      if (this.locked) {
        this.lockTimer -= dt;
        this.heat = Math.max(0, cfg.MAX_HEAT * (this.lockTimer / cfg.LOCK_TIME));
        if (this.lockTimer <= 0) {
          this.lockTimer = 0;
          this.heat = 0;
          A.Sfx.play('unlock');
        }
        return;
      }

      if (firing && this.cooldown <= 0) this.fire(game);

      if (this.coolDelay > 0) {
        this.coolDelay -= dt;
      } else {
        this.heat = Math.max(0, this.heat - cfg.COOL_RATE * dt);
      }
    }

    fire(game) {
      const cfg = A.CONFIG;
      const hot = this.overdrive;
      this.cooldown = cfg.FIRE_COOLDOWN;
      game.spawnPlayerBullet(this.cx - 2, this.y - 6, hot);
      A.Sfx.play(hot ? 'shootHot' : 'shoot');

      if (this.surgeTimer > 0) return;
      this.heat += cfg.HEAT_PER_SHOT;
      this.coolDelay = cfg.COOL_DELAY;
      if (this.heat >= cfg.MAX_HEAT) {
        this.heat = cfg.MAX_HEAT;
        this.lockTimer = cfg.LOCK_TIME;
        game.onOverheat();
      }
    }

    applyPickup(kind) {
      if (kind === 'cryo') {
        this.heat = 0;
        this.lockTimer = 0;
      } else if (kind === 'shield') {
        this.shield = true;
      } else if (kind === 'surge') {
        this.surgeTimer = A.CONFIG.SURGE_TIME;
      }
    }

    // Retourne 'shield' si le bouclier absorbe, 'dead' si le canon est détruit, null sinon.
    hit() {
      if (!this.alive || this.invuln > 0) return null;
      if (this.shield) {
        this.shield = false;
        this.invuln = 1;
        return 'shield';
      }
      this.alive = false;
      return 'dead';
    }

    draw(ctx) {
      if (!this.alive) return;
      if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;
      A.Assets.draw(ctx, 'player_cannon', this.x, this.y);

      const x = Math.round(this.x);
      const y = Math.round(this.y);
      if (this.locked) {
        // Canon verrouillé : fumée grise qui monte.
        ctx.fillStyle = '#8c8c98';
        for (let i = 0; i < 3; i++) {
          const k = (this.t * 1.5 + i / 3) % 1;
          ctx.fillRect(x + 6 + Math.round(Math.sin(k * 9 + i) * 3), y - 2 - Math.round(k * 12), 2, 2);
        }
      } else if (this.overdrive && Math.floor(this.t * 10) % 2 === 0) {
        ctx.fillStyle = '#d82828';
        ctx.fillRect(x + 7, y, 2, 4);
        ctx.fillRect(x + 1, y + 9, 14, 1);
      }
      if (this.surgeTimer > 0) {
        ctx.fillStyle = '#54b8ec';
        ctx.fillRect(x + 7, y - 3, 2, 2);
      }
      if (this.shield) {
        ctx.strokeStyle = Math.floor(this.t * 6) % 2 ? '#78dc28' : '#3cc83c';
        ctx.strokeRect(x - 2.5, y - 2.5, this.w + 5, this.h + 4);
      }
    }
  }

  A.Player = Player;
})(window.Airchase = window.Airchase || {});
