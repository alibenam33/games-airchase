// Chargement des sprites PNG et bruitages façon Atari 2600 (émulation TIA via WebAudio).
(function (A) {
  'use strict';

  const NAMES = [
    'player_cannon', 'player_bullet_vertical',
    'mothership', 'alien_large_solid', 'alien_large_splitter', 'alien_small',
    'enemy_missile', 'enemy_missile_group', 'enemy_laser', 'enemy_fireball',
    'enemy_fireball_horizontal', 'base', 'temperature_bar', 'temperature_fill',
    'background_space', 'title_logo', 'game_over_text',
  ];

  const images = {};

  A.Assets = {
    load(onDone) {
      let pending = NAMES.length;
      NAMES.forEach((name) => {
        const img = new Image();
        img.onload = img.onerror = () => {
          if (img.naturalWidth) images[name] = img;
          if (--pending === 0) onDone();
        };
        img.src = 'assets/png/' + name + '.png';
      });
    },

    get(name) {
      return images[name] || null;
    },

    // Dessine un sprite ; si l'image manque, un rectangle de secours garde le jeu jouable.
    draw(ctx, name, x, y, w, h, flipX) {
      const img = images[name];
      x = Math.round(x);
      y = Math.round(y);
      if (!img) {
        ctx.fillStyle = '#d0d';
        ctx.fillRect(x, y, w || 8, h || 8);
        return;
      }
      w = w || img.width;
      h = h || img.height;
      if (flipX) {
        ctx.save();
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(img, x, y, w, h);
      }
    },
  };

  // Musique de partie : music_1.ogg puis music_2.ogg en boucle, à 40 % du volume.
  // game_over.wav est joué une fois à l'affichage de l'écran de game over.
  // Exception voulue par l'utilisateur au son façon TIA : ce sont des fichiers audio ordinaires.
  A.Music = {
    TRACKS: ['music_1.ogg', 'music_2.ogg'],
    GAME_OVER: 'game_over.wav',
    VOLUME: 0.4,
    audio: null,
    jingle: null,
    track: 0,
    playing: false,

    load(i) {
      if (!this.audio) {
        this.audio = new Audio();
        this.audio.addEventListener('ended', () => this.load(this.track + 1));
      }
      this.track = i % this.TRACKS.length;
      this.audio.src = this.TRACKS[this.track];
      this.audio.volume = this.VOLUME;
      this.audio.muted = A.Sfx.muted;
      if (this.playing) this.resume();
    },

    // Début de partie : reprend depuis le début de la première piste
    start() {
      this.stopGameOver();
      this.playing = true;
      this.load(0);
    },

    // Écran de game over : la musique s'arrête et le jingle est joué une fois
    gameOver() {
      this.stop();
      if (!this.jingle) this.jingle = new Audio(this.GAME_OVER);
      this.jingle.volume = this.VOLUME;
      this.jingle.muted = A.Sfx.muted;
      this.jingle.currentTime = 0;
      this.jingle.play().catch(() => {});
    },

    stopGameOver() {
      if (this.jingle) {
        this.jingle.pause();
        this.jingle.currentTime = 0;
      }
    },

    stop() {
      this.playing = false;
      if (this.audio) {
        this.audio.pause();
        this.audio.currentTime = 0;
      }
    },

    pause() {
      if (this.audio) this.audio.pause();
    },

    resume() {
      // play() est refusé tant que la page n'a reçu aucune interaction : on ignore l'erreur
      if (this.playing && this.audio) this.audio.play().catch(() => {});
    },

    setMuted(muted) {
      if (this.audio) this.audio.muted = muted;
      if (this.jingle) this.jingle.muted = muted;
    },
  };

  // APK : window.NativeAudio (SoundPool Android) joue les bruitages pré-rendus assets/sfx/<nom>.wav
  // (tools/render_sounds.py), car le Web Audio de la WebView a ~1 s de latence sur tablette Huawei.
  A.Sfx = {
    ctx: null,
    muted: false,
    native: window.NativeAudio || null,
    unlocked: false,
    VOLUME: 0.16,

    unlock() {
      if (this.native) {
        this.unlocked = true;
        return;
      }
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { this.ctx = new AC(); } catch (e) { return; }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    // Rend un programme de registres TIA (une entrée [AUDC, AUDF, AUDV] par frame à 60 Hz).
    render(prog) {
      const ac = this.ctx;
      const sr = ac.sampleRate;
      const frameLen = Math.round(sr / 60);
      const buf = ac.createBuffer(1, frameLen * prog.length, sr);
      const data = buf.getChannelData(0);
      const ticksPerSample = TIA_CLOCK / sr;
      let acc = 0;
      let div = 0;
      let pos = 0;
      for (let fi = 0; fi < prog.length; fi++) {
        const [c, f, v] = prog[fi];
        const pattern = WAVEFORMS[c];
        const amp = (v / 15) * 0.5;
        for (let i = 0; i < frameLen; i++) {
          acc += ticksPerSample;
          while (acc >= 1) {
            acc -= 1;
            if (++div > f) {
              div = 0;
              pos = (pos + 1) % pattern.length;
            }
          }
          data[fi * frameLen + i] = pattern[pos % pattern.length] ? amp : -amp;
        }
      }
      return buf;
    },

    play(name) {
      const def = SOUNDS[name];
      if (this.muted || !def) return;
      if (this.native) {
        if (this.unlocked) this.playNative(name, def);
        return;
      }
      if (!this.ctx || this.ctx.state !== 'running') return;
      const ac = this.ctx;
      // Deux voix comme le TIA : un son ne coupe la voix que s'il est au moins aussi prioritaire.
      const voice = this.voices[def.ch];
      if (voice && ac.currentTime < voice.end) {
        if (voice.prio > def.prio) return;
        try { voice.src.stop(); } catch (e) { /* déjà arrêtée */ }
      }
      if (!this.master) {
        this.master = ac.createGain();
        this.master.gain.value = this.VOLUME;
        this.master.connect(ac.destination);
      }
      const buf = this.cache[name] || (this.cache[name] = this.render(def.prog));
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(this.master);
      src.start();
      this.voices[def.ch] = { src, prio: def.prio, end: ac.currentTime + buf.duration };
    },

    // Mêmes 2 voix et priorités que ci-dessus ; le côté natif coupe le son en cours sur la voix `ch`
    // et joue le nouveau sur son propre fil, sans bloquer le jeu.
    playNative(name, def) {
      const now = performance.now() / 1000;
      const voice = this.voices[def.ch];
      if (voice && now < voice.end && voice.prio > def.prio) return;
      try { this.native.play('assets/sfx/' + name + '.wav', this.VOLUME, def.ch); } catch (e) { return; }
      this.voices[def.ch] = { prio: def.prio, end: now + def.prog.length / 60 };
    },

    voices: [null, null],
    cache: {},
    master: null,
  };

  // --- Émulation simplifiée du son TIA de l'Atari 2600 -----------------------

  const TIA_CLOCK = 31440; // horloge audio du TIA (Hz) ; fréquence de note = horloge / (AUDF + 1) / longueur du motif

  function lfsr(bits, tapA, tapB) {
    const out = [];
    let s = (1 << bits) - 1;
    for (let i = 0; i < (1 << bits) - 1; i++) {
      out.push(s & 1);
      const fb = ((s >> tapA) ^ (s >> tapB)) & 1;
      s = (s >> 1) | (fb << (bits - 1));
    }
    return out;
  }

  const stretch = (pattern, n) => pattern.flatMap((b) => Array(n).fill(b));

  const POLY4 = lfsr(4, 0, 1);
  const POLY5 = lfsr(5, 0, 2);
  const POLY9 = lfsr(9, 0, 4);
  const DIV31 = Array(13).fill(1).concat(Array(18).fill(0));

  // poly4 cadencé par poly5 (mode 3 du TIA).
  const POLY5_4 = [];
  for (let i = 0, j = 0; i < 31 * 15; i++) {
    if (POLY5[i % 31]) j = (j + 1) % 15;
    POLY5_4.push(POLY4[j]);
  }

  // Motif de sortie de chaque mode AUDC (0-15).
  const WAVEFORMS = [
    [1], POLY4, stretch(POLY4, 31), POLY5_4,
    [1, 0], [1, 0], DIV31, POLY5,
    POLY9, POLY5, DIV31, [1],
    [1, 1, 1, 0, 0, 0], [1, 1, 1, 0, 0, 0], stretch(DIV31, 3), stretch(POLY5, 3),
  ];

  // Modes utilisés : 4 = carré aigu, 12 = carré grave, 6 = bourdon div31, 7 = poly5, 8 = bruit blanc poly9.
  const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
  const notes = (mode, freqs, len, vol) => freqs.flatMap((f) => Array(len - 1).fill([mode, f, vol]).concat([[0, 0, 0]]));

  // ch = voix TIA (0 : canon / jingles, 1 : ennemis / explosions), prio = priorité sur la voix.
  const SOUNDS = {
    shoot: { ch: 0, prio: 1, prog: range(7, (i) => [4, 3 + i * 2, 9 - i]) },
    shootHot: { ch: 0, prio: 1, prog: range(7, (i) => [12, 2 + i, 10 - i]) },
    unlock: { ch: 0, prio: 2, prog: range(6, (i) => [4, 18 - i * 2, 8]) },
    lock: { ch: 0, prio: 3, prog: range(30, (i) => [6, 8 + Math.floor(i / 3), i % 4 < 2 ? 10 : 6]) },
    pickup: { ch: 0, prio: 3, prog: notes(4, [19, 15, 11, 8], 4, 9) },
    shield: { ch: 0, prio: 3, prog: range(10, (i) => [12, 14 - i, 9]) },
    wave: { ch: 0, prio: 2, prog: notes(12, [15, 15, 11], 6, 9) },
    clear: { ch: 0, prio: 3, prog: notes(12, [11, 15, 11, 8], 7, 10) },
    life: { ch: 0, prio: 4, prog: notes(4, [23, 19, 15, 11, 15, 11, 8], 5, 10) },

    clink: { ch: 1, prio: 0, prog: [[4, 2, 5], [4, 2, 3]] },
    hit: { ch: 1, prio: 1, prog: [[12, 18, 7], [12, 20, 6], [12, 22, 4]] },
    pop: { ch: 1, prio: 1, prog: range(5, (i) => [7, 4 + i, 8 - i]) },
    warn: { ch: 1, prio: 1, prog: [[4, 5, 5], [4, 5, 5], [0, 0, 0], [4, 5, 4]] },
    warp: { ch: 1, prio: 1, prog: range(9, (i) => [4, 26 - i * 3, 7]) },
    beam: { ch: 1, prio: 2, prog: range(26, (i) => [6, 3, i < 20 ? 9 : 26 - i]) },
    armorHit: { ch: 1, prio: 1, prog: [[1, 1, 10], [1, 2, 8], [12, 6, 6], [12, 7, 4], [12, 8, 2]] },
    // Explosions d'aliens : petit = bruit aigu bref, moyen = bruit qui descend, gros = déflagration puis grondement.
    killSmall: { ch: 1, prio: 2, prog: range(11, (i) => [8, 2 + (i >> 1), Math.max(1, 11 - i)]) },
    kill: {
      ch: 1, prio: 2,
      prog: [[4, 2, 12], [4, 3, 10]].concat(range(20, (i) => [8, 6 + (i >> 1), Math.max(1, 13 - Math.floor(i * 0.6))])),
    },
    killBig: {
      ch: 1, prio: 3,
      prog: [[4, 1, 14], [8, 4, 15]].concat(
        range(8, (i) => [8, 6 + i, 15 - (i >> 2)]),
        range(22, (i) => [3, Math.min(31, 8 + (i >> 1)), Math.max(1, 12 - (i >> 1))]),
      ),
    },
    hatch: { ch: 1, prio: 3, prog: range(32, (i) => [8, Math.min(31, 14 + (i >> 1)), Math.max(1, 15 - (i >> 1))]) },
    breach: {
      ch: 1, prio: 4,
      prog: range(24, (i) => [8, 10 + (i >> 1), 15 - (i >> 1)]).concat(notes(12, [23, 19, 15, 11], 6, 12)),
    },
    dead: { ch: 1, prio: 5, prog: range(50, (i) => [8, Math.min(31, 4 + (i >> 1)), Math.max(1, 15 - (i >> 2))]) },
  };

  A.Sfx.SOUNDS = SOUNDS;
  if (A.Sfx.native) {
    Object.keys(SOUNDS).forEach((name) => {
      try { A.Sfx.native.load('assets/sfx/' + name + '.wav'); } catch (e) { /* son absent : il restera muet */ }
    });
  }
})(window.Airchase = window.Airchase || {});
