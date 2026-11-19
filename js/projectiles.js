// Tirs du joueur, projectiles ennemis et capsules.
(function (A) {
  'use strict';

  // Tir du joueur : toujours vertical, vers le haut.
  class PlayerBullet {
    constructor(x, y, overdrive) {
      this.x = x;
      this.y = y;
      this.w = 4;
      this.h = 8;
      this.vy = -A.CONFIG.BULLET_SPEED;
      this.overdrive = overdrive;
      this.hits = new Set(); // cibles déjà traversées (tirs perforants)
      this.dead = false;
    }

    update(dt) {
      this.y += this.vy * dt;
      if (this.y + this.h < 0) this.dead = true;
    }

    draw(ctx) {
      A.Assets.draw(ctx, 'player_bullet_vertical', this.x, this.y);
      if (this.overdrive) {
        ctx.fillStyle = '#d82828';
        ctx.fillRect(Math.round(this.x) + 1, Math.round(this.y) + 8, 2, 3);
      }
    }
  }

  // Types : plasma, dart, salve, comet (destructibles : plasma, comet), rayon.
  const SHOTS = {
    plasma: { sprite: 'enemy_fireball', w: 8, h: 8, destroyable: true },
    dart: { sprite: 'enemy_missile', w: 4, h: 8, destroyable: false },
    salve: { sprite: 'enemy_missile_group', w: 12, h: 8, destroyable: false },
    comet: { sprite: 'enemy_fireball_horizontal', w: 8, h: 8, destroyable: true },
    rayon: { sprite: 'enemy_laser', w: 4, h: 0, destroyable: false },
  };

  class EnemyShot {
    constructor(kind, cx, y, opts) {
      const cfg = A.CONFIG;
      const def = SHOTS[kind];
      opts = opts || {};
      const s = opts.speed || 1;
      this.kind = kind;
      this.def = def;
      this.w = def.w;
      this.h = def.h;
      this.x = cx - this.w / 2;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.t = 0;
      this.dead = false;

      switch (kind) {
        case 'plasma':
          this.vy = 55 * s;
          break;
        case 'dart':
          this.vy = 130 * s;
          if (opts.aim && opts.aim.alive) {
            this.vx = Math.max(-35, Math.min(35, (opts.aim.cx - cx) * 0.4));
          }
          break;
        case 'salve':
          this.vy = 95 * s;
          break;
        case 'comet': {
          const target = opts.target;
          const dx = target.cx - cx;
          const dy = target.y + 8 - y;
          const len = Math.hypot(dx, dy) || 1;
          const v = 95 * s;
          this.vx = (dx / len) * v;
          this.vy = (dy / len) * v;
          break;
        }
        case 'rayon':
          this.owner = opts.owner;
          this.phase = 'warn';
          this.timer = cfg.RAYON_WARN;
          this.top = y;
          this.h = cfg.GROUND_Y - y;
          A.Sfx.play('warn');
          break;
      }
    }

    get destroyable() { return this.def.destroyable; }
    get cx() { return this.x + this.w / 2; }

    // Rectangle dangereux, ou null si le projectile ne blesse pas encore.
    hitRect() {
      if (this.kind === 'rayon') {
        return this.phase === 'beam' ? { x: this.x, y: this.top, w: this.w, h: this.h } : null;
      }
      return this;
    }

    update(dt, game) {
      const cfg = A.CONFIG;
      this.t += dt;

      if (this.kind === 'rayon') {
        this.timer -= dt;
        if (this.phase === 'warn') {
          if (this.owner.dead) { this.dead = true; return; }
          if (this.timer <= 0) {
            this.phase = 'beam';
            this.timer = cfg.RAYON_BEAM;
            A.Sfx.play('beam');
          }
        } else if (this.timer <= 0) {
          this.dead = true;
        }
        return;
      }

      if (this.kind === 'plasma') this.x += Math.sin(this.t * 6) * 18 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (this.y + this.h >= cfg.GROUND_Y) {
        this.dead = true;
        game.burst(this.cx, cfg.GROUND_Y - 1, '#f08020', 4, 40);
      }
      if (this.x + this.w < 0 || this.x > cfg.W) this.dead = true;
    }

    draw(ctx) {
      if (this.kind === 'rayon') {
        const x = Math.round(this.x);
        if (this.phase === 'warn') {
          if (Math.floor(this.t * 16) % 2) return;
          ctx.fillStyle = '#d82828';
          for (let y = Math.round(this.top); y < A.CONFIG.GROUND_Y; y += 4) ctx.fillRect(x + 1, y, 1, 2);
          return;
        }
        for (let y = this.top; y < A.CONFIG.GROUND_Y; y += 32) {
          A.Assets.draw(ctx, 'enemy_laser', x, y, 4, Math.min(32, A.CONFIG.GROUND_Y - y));
        }
        return;
      }
      A.Assets.draw(ctx, this.def.sprite, this.x, this.y, this.w, this.h, this.kind === 'comet' && this.vx < 0);
    }
  }

  const PICKUP_COLORS = { cryo: '#54b8ec', shield: '#78dc28', surge: '#fce048' };
  const PICKUP_LETTERS = { cryo: 'C', shield: 'S', surge: 'H' };

  class Pickup {
    constructor(kind, cx, y) {
      this.kind = kind;
      this.w = 8;
      this.h = 10;
      this.x = cx - this.w / 2;
      this.y = y;
      this.vy = 35;
      this.landedTimer = 0;
      this.t = 0;
      this.dead = false;
    }

    update(dt) {
      const ground = A.CONFIG.GROUND_Y;
      this.t += dt;
      if (this.y + this.h < ground) {
        this.y = Math.min(ground - this.h, this.y + this.vy * dt);
      } else {
        this.landedTimer += dt;
        if (this.landedTimer > A.CONFIG.PICKUP_GROUND_TIME) this.dead = true;
      }
    }

    draw(ctx) {
      if (this.landedTimer > A.CONFIG.PICKUP_GROUND_TIME - 1 && Math.floor(this.t * 10) % 2) return;
      const x = Math.round(this.x);
      const y = Math.round(this.y);
      ctx.fillStyle = '#ececec';
      ctx.fillRect(x + 1, y, 6, 10);
      ctx.fillRect(x, y + 1, 8, 8);
      ctx.fillStyle = PICKUP_COLORS[this.kind];
      ctx.fillRect(x + 1, y + 1, 6, 8);
      A.UI.text(ctx, PICKUP_LETTERS[this.kind], x + 4, y + 3, '#1c1c2c', 1, 'center');
    }
  }

  A.Projectiles = {
    PlayerBullet,
    EnemyShot,
    Pickup,
    PICKUP_KINDS: ['cryo', 'shield', 'surge'],
  };
})(window.Airchase = window.Airchase || {});
