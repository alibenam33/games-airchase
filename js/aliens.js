// Aliens : Drone, Prisme, Éclat, Blindé, Saboteur, Kamikaze.
(function (A) {
  'use strict';

  const rand = (a, b) => a + Math.random() * (b - a);

  const DEFS = {
    drone:    { sprite: 'alien_large_solid',    size: 16, hp: 1, fire: [2.6, 4.6] },
    prism:    { sprite: 'alien_large_splitter', size: 16, hp: 1, fire: [3.4, 5.2] },
    eclat:    { sprite: 'alien_small',          size: 8,  hp: 1, fire: [3.5, 6.0] },
    armored:  { sprite: 'alien_large_solid',    size: 16, hp: 2, fire: [4.0, 6.0] },
    saboteur: { sprite: 'alien_small',          size: 16, hp: 1, fire: null },
    kamikaze: { sprite: 'alien_small',          size: 8,  hp: 1, fire: null },
  };

  const FIRE_MAX_Y = 170;

  class Alien {
    constructor(type, cx, y, sector) {
      const def = DEFS[type];
      this.type = type;
      this.def = def;
      this.w = def.size;
      this.h = def.size;
      this.x = cx - this.w / 2;
      this.y = y;
      this.hp = def.hp;
      this.speed = Math.min(2, 1 + 0.07 * (sector - 1));
      this.fireScale = 1 + 0.06 * (sector - 1);
      this.t = 0;
      this.flash = 0;
      this.dead = false;
      this.visible = true;
      this.phase = 'enter';
      this.rowY = type === 'armored' ? rand(44, 70) : rand(48, 112);
      this.targetY = this.rowY;
      this.vx = (Math.random() < 0.5 ? -1 : 1) * rand(28, 40) * this.speed;
      this.turnTimer = rand(0.6, 2.2);
      this.stepTimer = rand(3.5, 6);
      this.fireTimer = rand(1.2, 2.5);
      this.chargeTimer = 0;

      if (type === 'armored') this.vx *= 0.6;
      if (type === 'prism') this.baseX = this.x;
      if (type === 'saboteur') {
        this.phase = 'hidden';
        this.visible = false;
        this.hideTimer = rand(0.3, 0.7);
      }
      if (type === 'eclat') {
        this.phase = 'free';
        this.vx = (Math.random() < 0.5 ? -1 : 1) * rand(60, 80) * this.speed;
        this.vy = -rand(30, 60);
      }
    }

    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }
    get hittable() { return this.visible && !this.dead; }

    update(dt, game) {
      this.t += dt;
      if (this.flash > 0) this.flash -= dt;

      if (this.phase === 'enter') {
        this.y += 55 * this.speed * dt;
        if (this.y >= this.rowY) {
          this.y = this.rowY;
          this.phase = this.type === 'kamikaze' ? 'hover' : 'move';
          this.hoverTimer = rand(1.2, 2.6);
        }
        return;
      }

      switch (this.type) {
        case 'drone': this.updateDrone(dt); break;
        case 'prism': this.updatePrism(dt); break;
        case 'eclat': this.updateEclat(dt, game); break;
        case 'armored': this.updateArmored(dt); break;
        case 'saboteur': this.updateSaboteur(dt, game); break;
        case 'kamikaze': this.updateKamikaze(dt, game); break;
      }

      if (this.def.fire) this.updateFire(dt, game);
    }

    patrol(dt) {
      const W = A.CONFIG.W;
      this.x += this.vx * dt;
      if (this.x < 2) { this.x = 2; this.vx = Math.abs(this.vx); }
      if (this.x + this.w > W - 2) { this.x = W - 2 - this.w; this.vx = -Math.abs(this.vx); }
      this.turnTimer -= dt;
      if (this.turnTimer <= 0) {
        this.vx = -this.vx;
        this.turnTimer = rand(0.6, 2.2) / this.speed;
      }
    }

    updateDrone(dt) {
      this.patrol(dt);
      // Descente par paliers ; une fois trop bas, le Drone remonte en haut.
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.targetY = this.y > 140 ? 46 : this.y + 14;
        this.stepTimer = rand(3.5, 6);
      }
      this.y += Math.max(-60 * dt, Math.min(60 * dt, this.targetY - this.y));
    }

    updatePrism(dt) {
      const W = A.CONFIG.W;
      this.baseX += this.vx * dt;
      if (this.baseX < 20) { this.baseX = 20; this.vx = Math.abs(this.vx); }
      if (this.baseX > W - 36) { this.baseX = W - 36; this.vx = -Math.abs(this.vx); }
      this.turnTimer -= dt;
      if (this.turnTimer <= 0) {
        this.vx = -this.vx;
        this.turnTimer = rand(1, 3);
      }
      this.x = Math.max(0, Math.min(W - this.w, this.baseX + Math.sin(this.t * 2.2) * 18));
      this.y = this.rowY + Math.sin(this.t * 1.4) * 12;
    }

    updateEclat(dt, game) {
      const W = A.CONFIG.W;
      const p = game.player;
      if (p.alive) this.vx += Math.sign(p.cx - this.cx) * 25 * dt;
      const vmax = 110 * this.speed;
      this.vx = Math.max(-vmax, Math.min(vmax, this.vx));
      if (Math.abs(this.vy) < 20) this.vy = this.vy < 0 ? -30 : 30;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < 0) { this.x = 0; this.vx = Math.abs(this.vx); }
      if (this.x + this.w > W) { this.x = W - this.w; this.vx = -Math.abs(this.vx); }
      if (this.y < 40) { this.y = 40; this.vy = Math.abs(this.vy); }
      if (this.y > 176) { this.y = 176; this.vy = -Math.abs(this.vy); }
    }

    updateArmored(dt) {
      // Immobile pendant que son Rayon se charge et tire.
      if (this.chargeTimer > 0) {
        this.chargeTimer -= dt;
        return;
      }
      this.patrol(dt);
    }

    updateSaboteur(dt, game) {
      const W = A.CONFIG.W;
      if (this.phase === 'hidden') {
        this.hideTimer -= dt;
        if (this.hideTimer <= 0) {
          this.x = rand(8, W - 24);
          this.y = rand(138, 170);
          this.visible = true;
          this.phase = 'shown';
          this.showTimer = A.CONFIG.SABOTEUR_SHOW_TIME / Math.sqrt(this.speed);
          this.fired = false;
          game.warpEffect(this.cx, this.cy);
        }
        return;
      }
      this.showTimer -= dt;
      if (!this.fired && this.showTimer < 1.1 && game.player.alive) {
        this.fired = true;
        game.spawnEnemyShot('comet', this.cx, this.cy, { target: game.player, speed: this.speed });
      }
      if (this.showTimer <= 0) {
        game.warpEffect(this.cx, this.cy);
        this.visible = false;
        this.phase = 'hidden';
        this.hideTimer = rand(0.7, 1.3);
      }
    }

    updateKamikaze(dt, game) {
      const cfg = A.CONFIG;
      if (this.phase === 'hover') {
        this.x += Math.sin(this.t * 9) * 20 * dt;
        this.hoverTimer -= dt;
        if (this.hoverTimer <= 0) {
          const p = game.player;
          const tx = p.alive ? p.cx : cfg.W / 2;
          const dx = tx - this.cx;
          const dy = cfg.GROUND_Y - this.cy;
          const len = Math.hypot(dx, dy) || 1;
          const v = 150 * this.speed;
          this.vx = (dx / len) * v;
          this.vy = (dy / len) * v;
          this.phase = 'dive';
        }
        return;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.y + this.h >= cfg.GROUND_Y) {
        this.dead = true;
        game.explode(this.cx, cfg.GROUND_Y - 2, cfg.KAMIKAZE_BLAST, true);
      }
    }

    updateFire(dt, game) {
      if (!this.visible || this.chargeTimer > 0) return;
      this.fireTimer -= dt;
      if (this.fireTimer > 0) return;
      this.fireTimer = rand(this.def.fire[0], this.def.fire[1]) / this.fireScale;
      if (this.y > FIRE_MAX_Y || !game.canEnemyFire()) return;

      const bx = this.cx;
      const by = this.y + this.h;
      switch (this.type) {
        case 'drone':
          game.spawnEnemyShot('plasma', bx, by, { speed: this.speed });
          break;
        case 'prism':
          game.spawnEnemyShot('salve', bx, by, { speed: this.speed });
          break;
        case 'eclat':
          game.spawnEnemyShot('dart', bx, by, { speed: this.speed, aim: game.player });
          break;
        case 'armored':
          this.chargeTimer = A.CONFIG.RAYON_WARN + A.CONFIG.RAYON_BEAM;
          game.spawnEnemyShot('rayon', bx, by, { owner: this });
          break;
      }
    }

    draw(ctx) {
      if (!this.visible) return;
      if (this.flash > 0 && Math.floor(this.flash * 40) % 2 === 0) return;
      const x = Math.round(this.x);
      const y = Math.round(this.y);

      if (this.type === 'saboteur' && this.phase === 'shown' && this.showTimer < 0.4
          && Math.floor(this.showTimer * 20) % 2 === 0) return;

      A.Assets.draw(ctx, this.def.sprite, x, y, this.w, this.h);

      if (this.type === 'armored' && this.hp > 1) {
        // Plaques de blindage.
        ctx.fillStyle = '#8c8c98';
        ctx.fillRect(x + 3, y + 1, 10, 2);
        ctx.fillRect(x + 1, y + 9, 14, 2);
      }
      if (this.type === 'armored' && this.chargeTimer > A.CONFIG.RAYON_BEAM) {
        ctx.fillStyle = Math.floor(this.t * 20) % 2 ? '#fce048' : '#d82828';
        ctx.fillRect(x + 7, y + this.h, 2, 2);
      }
      if (this.type === 'kamikaze') {
        const blink = this.phase === 'hover' && this.hoverTimer < 0.5 && Math.floor(this.t * 16) % 2;
        ctx.fillStyle = blink ? '#ffffff' : '#d82828';
        ctx.fillRect(x + 3, y - 2, 2, 2);
        if (this.phase === 'dive') {
          ctx.fillStyle = '#f08020';
          ctx.fillRect(Math.round(x + 3 - this.vx * 0.03), Math.round(y + 3 - this.vy * 0.03), 2, 2);
          ctx.fillStyle = '#821e1e';
          ctx.fillRect(Math.round(x + 3 - this.vx * 0.06), Math.round(y + 3 - this.vy * 0.06), 2, 2);
        }
      }
    }
  }

  A.Aliens = {
    create(type, cx, y, sector) {
      return new Alien(type, cx, y, sector);
    },
  };
})(window.Airchase = window.Airchase || {});
