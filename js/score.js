// Score, chaîne de destructions, canons bonus et meilleur score.
(function (A) {
  'use strict';

  function lifeThreshold(i) {
    const cfg = A.CONFIG;
    const fixed = cfg.LIFE_THRESHOLDS;
    if (i < fixed.length) return fixed[i];
    return fixed[fixed.length - 1] + cfg.LIFE_STEP_AFTER * (i - fixed.length + 1);
  }

  A.Score = {
    value: 0,
    high: 0,
    chain: 0,
    chainTimer: 0,
    livesAwarded: 0,
    pendingLives: 0,

    reset() {
      this.value = 0;
      this.chain = 0;
      this.chainTimer = 0;
      this.livesAwarded = 0;
      this.pendingLives = 0;
    },

    update(dt) {
      if (this.chainTimer > 0) {
        this.chainTimer -= dt;
        if (this.chainTimer <= 0) this.chain = 0;
      }
    },

    multiplier() {
      if (this.chain < 1) return 1;
      return Math.min(A.CONFIG.MAX_MULT, 1 + Math.floor((this.chain - 1) / 3));
    },

    breakChain() {
      this.chain = 0;
      this.chainTimer = 0;
    },

    add(points) {
      this.value = Math.min(A.CONFIG.SCORE_MAX, this.value + points);
      while (this.value >= lifeThreshold(this.livesAwarded)) {
        this.livesAwarded++;
        this.pendingLives++;
      }
      return points;
    },

    // Points d'un alien : chaîne (×1 à ×4) puis ×2 en Surrégime.
    addKill(base, overdrive) {
      this.chain++;
      this.chainTimer = A.CONFIG.CHAIN_WINDOW;
      return this.add(base * this.multiplier() * (overdrive ? 2 : 1));
    },

    takeExtraLives() {
      const n = this.pendingLives;
      this.pendingLives = 0;
      return n;
    },

    loadHigh() {
      try {
        this.high = parseInt(localStorage.getItem(A.CONFIG.HIGH_SCORE_KEY), 10) || 0;
      } catch (e) {
        this.high = 0;
      }
    },

    // Retourne vrai si le score courant est un nouveau record.
    saveHigh() {
      if (this.value <= this.high) return false;
      this.high = this.value;
      try { localStorage.setItem(A.CONFIG.HIGH_SCORE_KEY, String(this.high)); } catch (e) { /* stockage indisponible */ }
      return true;
    },

    format(n) {
      return String(Math.min(n, A.CONFIG.SCORE_MAX)).padStart(6, '0');
    },
  };
})(window.Airchase = window.Airchase || {});
