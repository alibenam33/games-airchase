#!/usr/bin/env bash
# Construit android/build/Airchase.apk (WebView du jeu HTML5, paysage) sans Gradle.
# Requiert : JDK 11+ (javac, keytool), Android SDK "platforms;android-34" + "build-tools;34.0.0" (ANDROID_HOME, défaut ~/Android/Sdk), Pillow.
# Bruitages : joués par le SoundPool natif (window.NativeAudio) ; le Web Audio de la WebView a ~1 s de latence sur tablette Huawei.
#   assets/sfx/<nom>.wav = sons TIA pré-rendus par tools/render_sounds.py (relancé si js/assets.js est plus récent).
#   Musiques assets/music/music_1.ogg / music_2.ogg et jingle game_over.wav lus par <audio>.
# Installation : copier android/build/Airchase.apk sur la tablette et l'ouvrir (ou adb install -r).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$HERE")"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
BT="$SDK/build-tools/${BUILD_TOOLS:-34.0.0}"; JAR="$SDK/platforms/android-${API:-34}/android.jar"
for f in "$BT/aapt2" "$BT/d8" "$BT/zipalign" "$BT/apksigner" "$JAR"; do [ -e "$f" ] || { echo "Manquant : $f (ANDROID_HOME, platform/build-tools)"; exit 1; }; done
command -v javac >/dev/null || { echo "Manquant : javac (JDK 11+)"; exit 1; }

if [ ! -d "$ROOT/assets/sfx" ] || [ -n "$(find "$ROOT/js/assets.js" -newer "$ROOT/assets/sfx/shoot.wav" 2>/dev/null)" ] || [ ! -f "$ROOT/assets/sfx/shoot.wav" ]; then
  python3 "$ROOT/tools/render_sounds.py"
fi

# musique : vérifiée avant le rm -rf, pour ne jamais vider le build sans pouvoir le refaire
for f in music_1.ogg music_2.ogg game_over.wav; do
  [ -f "$ROOT/assets/music/$f" ] || { echo "Manquant : assets/music/$f"; exit 1; }
done

B="$HERE/build"; W="$B/assets/www"; rm -rf "$B"; mkdir -p "$W/assets" "$B/classes" "$B/dex" "$B/res"
cp "$ROOT"/index.html "$W/"
cp -r "$ROOT/css" "$ROOT/js" "$W/"
cp -r "$ROOT/assets/png" "$ROOT/assets/sfx" "$ROOT/assets/music" "$W/assets/"

# icône : l'alien pixel art agrandi sans lissage sur le fond du jeu, coins arrondis
python3 - "$ROOT/assets/png/alien_large_solid.png" "$B/res" <<'PY'
import sys, os
from PIL import Image, ImageDraw
al = Image.open(sys.argv[1]).convert('RGBA')
for d, px in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    os.makedirs(f'{sys.argv[2]}/mipmap-{d}', exist_ok=True)
    ic = Image.new('RGBA', (px, px), (5, 6, 15, 255)); a = round(px * 0.7)
    ic.alpha_composite(al.resize((a, a), Image.NEAREST), ((px - a) // 2, (px - a) // 2))
    m = Image.new('L', (px, px), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, px - 1, px - 1), radius=px // 5, fill=255)
    ic.putalpha(m); ic.save(f'{sys.argv[2]}/mipmap-{d}/ic_launcher.png')
PY

"$BT/aapt2" compile --dir "$B/res" -o "$B/res.zip"
"$BT/aapt2" link -o "$B/base.apk" --manifest "$HERE/AndroidManifest.xml" -I "$JAR" -R "$B/res.zip" -A "$B/assets" -0 wav -0 ogg --auto-add-overlay
javac -source 8 -target 8 -nowarn -cp "$JAR" -d "$B/classes" $(find "$HERE/src" -name '*.java') 2>&1 | grep -v "^warning" || true
"$BT/d8" --lib "$JAR" --min-api 24 --output "$B/dex" $(find "$B/classes" -name '*.class')
(cd "$B/dex" && zip -q "$B/base.apk" classes.dex)
"$BT/zipalign" -f -p 4 "$B/base.apk" "$B/aligned.apk"

KS="$HERE/airchase.keystore"   # à conserver : les mises à jour doivent être signées avec la même clé
[ -f "$KS" ] || keytool -genkeypair -keystore "$KS" -storepass airchase -keypass airchase -alias airchase \
  -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Airchase" >/dev/null
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:airchase --key-pass pass:airchase --out "$B/Airchase.apk" "$B/aligned.apk"
echo "OK : $B/Airchase.apk ($(du -h "$B/Airchase.apk" | cut -f1))"
