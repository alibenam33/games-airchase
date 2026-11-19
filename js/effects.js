// Explosions animées en pixel art (flash, noyau en losange, onde de choc, éclats).
(function (A) {
  'use strict';

  const rand = (a, b) => a + Math.random() * (b - a);

  // Tailles d'explosion : rayon max (px), durée (s), nombre d'éclats.
  const SIZES = {
    spark: { radius: 4, duration: 0.18, shards: 4 },
    small: { radius: 9, duration: 0.4, shards: 8 },
    medium: { radius: 14, duration: 0.55, shards: 12 },
    large: { radius: 22, duration: 0.75, shards: 18 },
  };

  class Explosion {
    // palette : couleurs du début à la fin de l'explosion.
    constructor(x, y, size, color) {
      const def = SIZES[size];
      this.x = x;
      this.y = y;
      this.radius = def.radius;
      this.duration = def.duration;
      this.t = 0;
      this.dead = false;
      this.palette = ['#ffffff', '#fce048', '#f08020', color || '#d82828', '#d82828', '#821e1e'];
      this.shards = [];
      for (let i = 0; i < def.shards; i++) {
        const angle = (i / def.shards) * Math.PI * 2 + rand(-0.3, 0.3);
        this.shards.push({
          cos: Math.cos(angle),
          sin: Math.sin(angle),
          reach: rand(0.6, 1.25),
          size: Math.random() < 0.4 ? 2 : 1,
          shade: Math.floor(rand(0, 2)),
        });
      }
    }

    update(dt) {
      this.t += dt;
      if (this.t >= this.duration) this.dead = true;
    }

    color(k, offset) {
      const i = Math.min(this.palette.length - 1, Math.floor(k * this.palette.length) + (offset || 0));
      return this.palette[i];
    }

    draw(ctx) {
      const k = this.t / this.duration;
      const cx = Math.round(this.x);
      const cy = Math.round(this.y);
      const r = this.radius;

      // Noyau en losange : flash blanc, puis il gonfle et s'éteint (premier tiers).
      if (k < 0.35) {
        const s = Math.max(1, Math.round(r * 0.45 * (0.4 + k * 2.2)));
        ctx.fillStyle = k < 0.08 ? '#ffffff' : this.color(k);
        for (let dy = -s; dy <= s; dy++) {
          const w = s - Math.abs(dy);
          ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
        }
        if (k > 0.1) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - 1, cy - 1, 2, 2);
        }
      }

      // Onde de choc pointillée.
      if (k > 0.1 && k < 0.7) {
        const rr = r * (0.3 + k * 1.1);
        const dots = Math.max(8, Math.round(rr * 1.6));
        ctx.fillStyle = this.color(k, 1);
        for (let i = 0; i < dots; i += 2) {
          const a = (i / dots) * Math.PI * 2;
          ctx.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), 1, 1);
        }
      }

      // Éclats projetés vers l'extérieur qui ralentissent puis retombent.
      const ease = 1 - (1 - k) * (1 - k);
      const fall = k * k * r * 0.6;
      this.shards.forEach((s) => {
        const d = r * s.reach * ease;
        const size = k > 0.75 ? 1 : s.size;
        if (k > 0.85 && Math.floor(this.t * 30 + s.shade) % 2) return; // scintille avant de disparaître
        ctx.fillStyle = this.color(k, s.shade);
        ctx.fillRect(Math.round(cx + s.cos * d), Math.round(cy + s.sin * d + fall), size, size);
      });
    }
  }

  A.Effects = { Explosion };
})(window.Airchase = window.Airchase || {});
