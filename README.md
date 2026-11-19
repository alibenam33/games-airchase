# Airchase

A fixed-screen arcade shooter in HTML5. You drive a ground cannon against **the Hive**, a mothership that drops waves of aliens through three hatches. Shoot the aliens, dodge their fire, manage your cannon's heat, and blow open all three hatches to trigger a **BREACH**.

- Vanilla HTML5 / CSS / JavaScript, Canvas 2D, Web Audio. No engine, no dependencies, no build step.
- 320×240 pixel-art canvas (4:3), landscape only, scaled without smoothing.
- Atari 2600–style sound effects, synthesized by a small TIA chip emulator.
- Keyboard and touch controls, plus an Android APK (a WebView shell).

## Play

Open `index.html` in a browser. It works straight from `file://` because the scripts are classic scripts, not ES modules. You can also serve the folder:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

### Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | `←` / `A`, `→` / `D` | ◀ ▶ (left column, you can slide between them) |
| Fire upward (works while moving) | `Space`, `↑`, `W` | FIRE (round button, right column) |
| Start / restart | `Enter`, click | tap |
| Pause | `P`, `Esc` | automatic when the page is hidden |
| Mute | `M` | — |

The cannon only fires upward. On a touch device held in portrait, a "rotate" overlay appears and the game pauses. The first touch requests fullscreen and a landscape orientation lock.

## Gameplay

The full rules are in [`DESIGN.md`](DESIGN.md), written in French. They replace the gameplay part of `rules.md`. Here are the main points:

- **Sectors.** Each wave is a sector of 6 + 2 × sector aliens, capped at 18. Speed, fire rate, drop rate and the cap on enemy shots all grow with the sector. Every 5th sector is a **HIVE ASSAULT**: the Hive flies lower and fires salvos itself.
- **The Hive.** Its hull can't be damaged. Its 3 hatches can only be hit while they are open to drop an alien. Each destroyed hatch is worth 500 points and drops a capsule. Destroying all three triggers a **BREACH**: every alien on screen explodes, the sector is cleared, and you get a 1000 × sector bonus.
- **Heat.** Each shot adds heat. From 70 to 99 % you are in **OVERDRIVE ×2**: shots pierce through targets and points are doubled. At 100 % the cannon is **LOCKED** for 2.4 s: it can't fire and moves slower, but you don't lose a life.
- **Chain.** Kills less than 1.2 s apart raise a score multiplier from ×1 up to ×4.
- **Aliens.**

  | Alien | Behavior |
  |---|---|
  | Drone | Patrols and drops in steps, fires slow plasma that you can shoot down |
  | Prism | Moves in waves, splits into 2 Shards when hit |
  | Shard | Bounces around and drifts toward the cannon |
  | Armored | Takes 2 hits, fires a vertical beam after a warning line |
  | Saboteur | Teleports and can only be hit while visible, fires comets |
  | Kamikaze | Hovers, then dives at the cannon and explodes |

- **Capsules.** **C** CRYO resets heat and cancels a lock. **S** SHIELD absorbs one hit. **H** HEATSINK stops shots from adding heat for 6 s.
- **Bonuses.** COOL HEAD: 300 × sector if the sector ends with heat below 20 %. EXTRA CANNON at 25 000, 75 000 and 150 000 points, then every 100 000 points, up to 6 cannons.
- The score counter stops at 999 999, but the game goes on until the last cannon is destroyed. The high score is saved in `localStorage` under the key `airchase_high_score`.

## Project layout

```
index.html            Page, canvas, touch controls, rotate overlay
css/style.css         Layout (4:3 canvas, side columns for touch controls)
js/                   Game modules (IIFEs on window.Airchase), in load order:
  assets.js           Sprite loading, TIA sound emulator (A.Sfx), music (A.Music)
  input.js            Keyboard and multi-touch input
  score.js            Score, chain multiplier, high score
  ui.js               HUD, screens, 3×5 bitmap font
  player.js           Cannon, heat, lock, shield
  mothership.js       The Hive and its hatches
  aliens.js           Alien types and behaviors
  projectiles.js      Player bullets and enemy shots
  collisions.js       Collision checks between entities, once per frame
  effects.js          Pixel explosions and particles
  game.js             A.CONFIG (all tunable values) and the Game state machine
  main.js             Startup and main loop
assets/png/           Sprites loaded by the game
assets/jpeg/          Source images (generated externally)
assets/sfx/           TIA sounds pre-rendered to WAV (used by the APK)
assets/music/         In-game music and game-over jingle
tools/                Asset and sound pipeline (Python)
android/              APK shell and build script
rules.md              Original brief (tech constraints, file layout, assets)
DESIGN.md             Airchase's own gameplay rules
```

### Architecture

- Each `js/*.js` file attaches to the global namespace `window.Airchase`. The load order set in `index.html` matters.
- `game.js` holds `A.CONFIG` and the `Game` class. `Game` runs the states `TITLE` → `PLAYING` → `GAME_OVER` and, within each sector, the phases `intro` → `fight` → `clear`. Entities never touch each other's arrays: they call back into `Game` (`spawnPlayerBullet`, `spawnEnemyShot`, `dropAlien`, `killAlien`, `onHatchDestroyed`, `breach`, `playerHit`, …).
- `buildWave(sector)` builds the alien queue, the drop interval, the group size, the maximum number of aliens alive and the enemy shot cap.
- **Sound.** Each effect is a per-frame (60 Hz) program of TIA register values `[AUDC, AUDF, AUDV]`. It is played on one of 2 voices, and a new sound only interrupts a sound of lower or equal priority. Each program is rendered once to an AudioBuffer. The in-game music is the one exception: `assets/music/music_1.ogg` and `music_2.ogg` loop at 40 % volume, and `game_over.wav` plays once at game over.

## Art pipeline

This pipeline needs Python 3 with Pillow, numpy and scipy.

1. `python3 tools/generate_assets.py` writes `image-prompts.html`, with one detailed prompt per sprite, and creates placeholder images **only for files that are missing**. Avoid `--force`: it overwrites the real art.
2. Generate each image from its prompt on a flat `#00FF00` background and save it as `assets/jpeg/<name>.jpeg`. The only exception is `background_space`, which is a full-frame starfield.
3. `python3 tools/import_jpeg_assets.py [name ...]` removes the green background, cleans the edges, crops, and downsamples each image to its exact size in `assets/png/`.

If `mothership.png` changes, measure the hatch positions again and update `HATCH_OFFSETS`, `HATCH_INNER` and `HATCH_INNER_Y` in `js/mothership.js`.

## Android

```sh
android/build.sh   # → android/build/Airchase.apk
```

The build needs JDK 17 and the Android SDK in `~/Android/Sdk` (build-tools 34.0.0, platform android-34), plus Pillow. It doesn't use Gradle. The APK package is `com.airchase.game`, with minSdk 24. It runs in landscape and immersive mode. The game is served from `https://appassets.androidplatform.net/`.

- The web code is the source of truth. Gameplay changes go in `js/`, never in `android/`.
- In the APK, sound effects play through a native `SoundPool` bridge (`window.NativeAudio`) instead of Web Audio, because Web Audio lags in some WebViews. `tools/render_sounds.py` pre-renders the WAVs in headless Firefox. The build runs it again whenever `js/assets.js` changes.
- Bump `versionCode` in `android/AndroidManifest.xml` for each release. Keep `android/airchase.keystore` safe and outside version control: every update must be signed with the same key.
