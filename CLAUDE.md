# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Airchase is a fixed-screen HTML5 shooter. **All player-facing text must be in English** (canvas strings, `index.html`). Code comments and the docs (`rules.md`, `DESIGN.md`) are in French; `DESIGN.md` maps its French terms to the in-game English names. The bitmap font in `ui.js` only has uppercase A–Z, digits and a few symbols. Two specs exist:

- `rules.md` is the original brief. It is authoritative for the tech constraints, file layout, minimal UI and asset production (PNG/JPEG/`image-prompts.html`). Controls are the exception: by user request there is **no horizontal fire**. The cannon only shoots upward (see `DESIGN.md`).
- `DESIGN.md` **replaces the gameplay rules of `rules.md`**. Airchase deliberately uses its own original rules rather than reproducing any existing game. Keep gameplay changes original and update `DESIGN.md` when you change them.

The game must stay **landscape**. The canvas is 4:3. On touch devices in portrait, a `#rotate` overlay is shown and the game auto-pauses. On the first touch the game tries fullscreen plus `screen.orientation.lock('landscape')`.

## Commands

- Run: open `index.html` directly. It works from `file://` because the scripts are classic scripts, not ES modules. You can also serve the folder with `python3 -m http.server`.
- Asset pipeline. It requires Pillow, numpy and scipy.
  1. `python3 tools/generate_assets.py` rewrites `image-prompts.html` from the detailed prompts in `PROMPTS`. It writes the ASCII-art placeholder PNG/JPEG files **only when they are missing**. `--force` overwrites everything, including the real art, so don't use it casually.
  2. The user generates each image from its prompt on a **flat `#00FF00` background** (no green inside the subject) and saves it as `assets/jpeg/<name>.jpeg`. The only exception is `background_space`, a full-frame starfield.
  3. `python3 tools/import_jpeg_assets.py [name ...]` chroma-keys the green, despills the edges, drops isolated specks, crops, and area-downsamples to the exact sizes in `SPECS`. The results go to `assets/png/`, which is what the game loads. Images on the older dark background are still handled through a border flood-fill.
  - `player_bullet_left` and `player_bullet_right` are unused by the game, which only fires upward.
  - `HATCH_OFFSETS`, `HATCH_INNER` and `HATCH_INNER_Y` in `js/mothership.js` match the hatch positions drawn in `assets/png/mothership.png`. Re-measure them whenever that sprite changes.
- There is no build step, linter or test suite for the web version. For headless checks, snap Firefox only reads files under `$HOME` and needs its own profile: `firefox --headless --no-remote --profile <dir> --screenshot out.png file://...`.

## Architecture

- Each `js/*.js` file is an IIFE that attaches to the global namespace `window.Airchase` (`A`). Load order matters and is set in `index.html`: assets, input, score, ui, player, mothership, aliens, projectiles, collisions, effects, game, main. Cross-module references are resolved at call time, so a module may use `A.CONFIG` even though `game.js` defines it later.
- `game.js` holds `A.CONFIG`, which contains every tunable value (heat, speeds, points, life thresholds…), and the `Game` class. `Game` runs the `TITLE`/`PLAYING`/`GAME_OVER` state machine and per-sector phases (`intro` → `fight` → `clear`). The other modules call back into it through `spawnPlayerBullet`, `spawnEnemyShot`, `dropAlien`, `killAlien`, `onHatchDestroyed`, `breach`, `playerHit`, `explode` and `burst`. Entities never touch each other's arrays directly.
- `buildWave(sector)` builds the alien type queue, drop interval, group size, max alive count and enemy shot cap. The `Mothership` drops aliens from its 3 hatches (`canDrop`/`dropAlien`). A sector is cleared when the queue and `game.aliens` are both empty, or when all hatches are destroyed (breach).
- `effects.js` holds the animated pixel `Explosion` (sizes `spark`/`small`/`medium`/`large`). Spawn one with `game.spawnExplosion(x, y, size, color)`. Alien deaths go through `game.alienExplosion(alien)`, which picks the size and the matching TIA sound (`killSmall`/`kill`/`killBig`). Non-lethal hits go through `game.alienHit`.
- `collisions.js` resolves every pair once per frame. Player bullets carry a `hits` Set so overdrive (piercing) bullets hit each target once. Newly split Éclats are added to that Set.
- Rendering: logical size 320×240, `imageSmoothingEnabled = false`, and text drawn with the 3×5 bitmap font in `ui.js` (accents are stripped). `A.Assets.draw` falls back to colored rectangles when a PNG is missing.
- Sound must stay Atari 2600–style. `A.Sfx` in `assets.js` emulates the TIA chip. Each effect in `SOUNDS` is a per-frame (60 Hz) list of `[AUDC, AUDF, AUDV]` register values (mode 0–15, divider 0–31, volume 0–15), rendered once to an AudioBuffer and cached. Only 2 voices exist (`ch` 0/1), and a sound only interrupts a voice of lower or equal `prio`. Add new sounds as register programs, not as WebAudio oscillators. The one exception, requested by the user, is the in-game music: `A.Music` (`assets.js`) plays `music_1.ogg` then `music_2.ogg` in a loop at 40% volume. It starts in `newRun()`, stops at game over, follows pause, and is muted with `M`. At game over, `A.Music.gameOver()` plays `game_over.wav` once, at the same volume. By user request, sound effects are WAV and music is OGG. The `*.mp3` files at the root are the unused originals. Audio is unlocked on the first input. High score is stored in `localStorage` under `airchase_high_score`.

## Touch controls

- `input.js` adds the `touch` class on `<html>` when the device is touch (`pointer: coarse` or `maxTouchPoints > 0`). The CSS then reserves two side columns (`--side`, buttons sized by `--btn`) and shrinks the 4:3 canvas to fit between them: ◀ ▶ on the left, a round FIRE on the right. Without a touch screen, the layout is unchanged.
- Fingers are tracked per `pointerId` on `#touch`, with the button under each finger found through `elementFromPoint`. So sliding from ◀ to ▶ switches direction, and FIRE works at the same time as an arrow. The `.on` class lights up held buttons. Hiding the page (`visibilitychange`) pauses the game.

## Android APK

- Run `android/build.sh` (JDK, `~/Android/Sdk` with build-tools 34.0.0 and android-34, Pillow) to build `android/build/Airchase.apk`. It is landscape (`sensorLandscape`, immersive). The WebView serves `assets/www` under `https://appassets.androidplatform.net/`.
- Sound effects go through the native `SoundPool` (`window.NativeAudio`: `load(path)`, `play(path, vol, ch)`), because the WebView's Web Audio lags about 1 s on the user's Huawei tablet. `A.Sfx.playNative` applies the priorities of the 2 TIA voices. Java then stops the stream playing on voice `ch` and starts the new one on a dedicated `audio` thread: `play` returns immediately, since a synchronous JS→Java call that waits on `SoundPool` made the game freeze when firing. The files `assets/sfx/<name>.wav` are the TIA programs pre-rendered with `A.Sfx.render` by `python3 tools/render_sounds.py` (headless Firefox, `tools/render_sounds.html`). The build re-renders them when `js/assets.js` is newer, and stores WAV and OGG uncompressed (`aapt2 -0`). The web version keeps rendering sounds through Web Audio.
- Keep `android/airchase.keystore`: updates must be signed with the same key.
