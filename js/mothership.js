// La Ruche : coque invulnérable, 3 trappes vulnérables uniquement quand elles s'ouvrent.
(function (A) {
  'use strict';

  const rand = (a, b) => a + Math.random() * (b - a);
  // Centres et intérieur des 3 trappes, alignés sur assets/png/mothership.png (64 × 24).
  const HATCH_OFFSETS = [17, 32, 47];
  const HATCH_INNER = 4;
  const HATCH_INNER_Y = 16;
  const HATCH_OPEN_TIME = 1.2;

  class Mothership {
    constructor() {
      this.w = 64;
      this.h = 24;
      this.x = A.CONFIG.W / 2 - this.w / 2;
      this.y = 16;
      this.vx = 30;
      this.t = 0;
      this.hatches = HATCH_OFFSETS.map((ox) => ({ ox, hp: 0, maxHp: 0, open: 0, flash: 0, destroyed: false }));
      this.prepare(1, false);
    }

    prepare(sector, siege) {
      const hp = A.CONFIG.HATCH_HP + Math.floor(sector / 5);
      this.hatches.forEach((h) => {
        h.hp = hp;
        h.maxHp = hp;
        h.open = 0;
        h.flash = 0;
        h.destroyed = false;
      });
      this.siege = siege;
      this.targetY = siege ? 34 : 16;
      this.speed = Math.min(80, 28 + sector * 4);
      this.vx = Math.sign(this.vx || 1) * this.speed;
      this.turnTimer = rand(2, 5);
      this.dropTimer = 1;
      this.siegeTimer = 2.5;
    }

    get cx() { return this.x + this.w / 2; }

    // La coque bloque les tirs (sans dégâts) : rectangle du corps.
    bodyRect() {
      return { x: this.x, y: this.y + 2, w: this.w, h: 18 };
    }

    // Zone touchable d'une trappe : un peu plus large que son dessin pour rester jouable.
    hatchRect(h) {
      return { x: this.x + h.ox - 4, y: this.y + 14, w: 8, h: 8 };
    }

    allHatchesDestroyed() {
      return this.hatches.every((h) => h.destroyed);
    }

    update(dt, game) {
      const W = A.CONFIG.W;
      this.t += dt;
      this.x += this.vx * dt;
      if (this.x < 2) { this.x = 2; this.vx = this.speed; }
      if (this.x + this.w > W - 2) { this.x = W - 2 - this.w; this.vx = -this.speed; }
      this.turnTimer -= dt;
      if (this.turnTimer <= 0) {
        this.vx = -this.vx;
        this.turnTimer = rand(2, 5);
      }
      this.y += Math.max(-30 * dt, Math.min(30 * dt, this.targetY - this.y));

      this.hatches.forEach((h) => {
        if (h.open > 0) h.open -= dt;
        if (h.flash > 0) h.flash -= dt;
      });

      const live = this.hatches.filter((h) => !h.destroyed);
      if (!live.length || !game.isFighting()) return;

      this.dropTimer -= dt;
      if (this.dropTimer <= 0 && game.canDrop()) {
        const wave = game.wave;
        const count = 1 + Math.floor(Math.random() * wave.groupMax);
        const order = live.slice().sort(() => Math.random() - 0.5);
        for (let i = 0; i < count && game.canDrop(); i++) {
          const h = order[i % order.length];
          h.open = HATCH_OPEN_TIME;
          game.dropAlien(this.x + h.ox, this.y + 20);
        }
        this.dropTimer = wave.dropInterval * rand(0.8, 1.25);
      }

      if (this.siege) {
        this.siegeTimer -= dt;
        if (this.siegeTimer <= 0) {
          const h = live[Math.floor(Math.random() * live.length)];
          h.open = HATCH_OPEN_TIME;
          game.spawnEnemyShot(Math.random() < 0.5 ? 'salve' : 'dart', this.x + h.ox, this.y + 22);
          this.siegeTimer = rand(2, 3);
        }
      }
    }

    // Retourne 'damaged', 'destroyed' ou 'blocked'.
    damageHatch(h) {
      if (h.destroyed || h.open <= 0) return 'blocked';
      h.hp--;
      h.flash = 0.15;
      if (h.hp <= 0) {
        h.destroyed = true;
        h.open = 0;
        return 'destroyed';
      }
      return 'damaged';
    }

    draw(ctx) {
      A.Assets.draw(ctx, 'mothership', this.x, this.y);
      this.hatches.forEach((h) => {
        // Intérieur de la trappe dessinée dans le sprite (4 × 4 px).
        const x = Math.round(this.x + h.ox - HATCH_INNER / 2);
        const y = Math.round(this.y + HATCH_INNER_Y);
        if (h.destroyed) {
          ctx.fillStyle = '#000';
          ctx.fillRect(x, y, HATCH_INNER, HATCH_INNER);
          if (Math.floor(this.t * 8 + h.ox) % 3 === 0) {
            ctx.fillStyle = '#f08020';
            ctx.fillRect(x + Math.floor(Math.random() * HATCH_INNER), y + 2, 1, 1);
          }
          return;
        }
        if (h.open > 0) {
          // Trappe ouverte : cœur lumineux pulsant + points de PV sous la Ruche.
          ctx.fillStyle = h.flash > 0 ? '#ffffff' : (Math.floor(this.t * 12) % 2 ? '#fce048' : '#f08020');
          ctx.fillRect(x, y, HATCH_INNER, HATCH_INNER);
          ctx.fillStyle = '#d82828';
          const pipsX = x + HATCH_INNER / 2 - h.hp;
          for (let i = 0; i < h.hp; i++) ctx.fillRect(pipsX + i * 2, y + HATCH_INNER + 2, 1, 1);
        } else if (h.flash > 0) {
          // Trappe fermée : le sprite montre déjà le panneau, on ne fait que flasher l'impact.
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, HATCH_INNER, HATCH_INNER);
        }
      });
    }
  }

  A.Mothership = Mothership;
})(window.Airchase = window.Airchase || {});
