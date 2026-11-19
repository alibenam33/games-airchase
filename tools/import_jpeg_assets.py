#!/usr/bin/env python3
"""Convertit les images générées (assets/jpeg/*.jpeg) en sprites PNG du jeu (assets/png).

Les JPEG générés sont des illustrations grand format. Le fond attendu est un
vert uni #00FF00 (voir image-prompts.html), détouré par incrustation ; les
anciennes images sur fond spatial sombre restent gérées (fond détouré par
remplissage depuis les bords). Les petites taches isolées sont retirées, puis
l'image est recadrée et réduite aux dimensions exactes exigées par rules.md.

Usage : python3 tools/import_jpeg_assets.py [nom ...]
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
JPEG_DIR = ROOT / "assets" / "jpeg"
PNG_DIR = ROOT / "assets" / "png"

BG_TOLERANCE = 14        # écart max (par canal) avec la couleur du fond (fond sombre)
GREEN_MARGIN = 60        # fond vert : G dépasse R et B d'au moins cette valeur
MIN_BLOB_RATIO = 0.002   # taches plus petites que 0,2 % de l'image = étoiles
ALPHA_COVERAGE = 0.5     # un pixel final est opaque si au moins 50 % de sa zone est du sprite
BACKGROUND_STAR_DIM = 0.45  # intensité des étoiles du fond (1 = inchangé)
OUTLINE_MAX = 40         # pixels plus sombres que ça = contour, exclus du calcul de couleur

# nom : (largeur, hauteur, mode, options)
#   contain : recadré puis réduit en gardant les proportions, centré
#   stretch : recadré puis étiré aux dimensions exactes
SPECS = {
    "player_cannon": (16, 16, "contain", {}),
    "player_bullet_vertical": (4, 8, "contain", {}),
    "player_bullet_left": (8, 4, "contain", {}),   # non utilisé par le jeu (tir vertical uniquement)
    "player_bullet_right": (8, 4, "contain", {}),  # non utilisé par le jeu (tir vertical uniquement)
    "mothership": (64, 24, "contain", {}),
    "alien_large_solid": (16, 16, "contain", {}),
    "alien_large_splitter": (16, 16, "contain", {}),
    "alien_small": (8, 8, "contain", {}),
    "enemy_missile": (4, 8, "contain", {}),
    "enemy_missile_group": (12, 8, "contain", {}),
    "enemy_laser": (4, 32, "stretch", {}),
    "enemy_fireball": (8, 8, "contain", {}),
    "enemy_fireball_horizontal": (8, 8, "contain", {}),
    "base": (64, 16, "ground_strip", {}),
    "temperature_bar": (48, 8, "bar_frame", {}),
    "temperature_fill": (48, 8, "bar_fill", {}),
    "background_space": (320, 240, "background", {}),
    "title_logo": (256, 64, "contain", {"largest_band": True}),
    "game_over_text": (192, 32, "contain", {"largest_band": True}),
}


def load(name, crop_x=None):
    rgb = np.asarray(Image.open(JPEG_DIR / f"{name}.jpeg").convert("RGB")).astype(np.float32)
    if crop_x:
        w = rgb.shape[1]
        rgb = rgb[:, int(w * crop_x[0]):int(w * crop_x[1])]
    return rgb


def is_green_screen(rgb):
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    r, g, b = np.median(border, axis=0)
    return g > 150 and g - max(r, b) > 80


def despill(rgb, fg):
    """Retire la teinte verte qui bave du fond sur les bords du sprite (JPEG)."""
    rb = np.maximum(rgb[..., 0], rgb[..., 2])
    spill = fg & (rgb[..., 1] > rb)
    rgb[..., 1] = np.where(spill, rb, rgb[..., 1])


def foreground_mask(rgb):
    """Vrai pour les pixels du sprite.

    Fond vert #00FF00 : tout pixel nettement vert est du fond (incrustation).
    Sinon (anciennes images sur fond sombre) : fond = zone de la couleur des bords
    connectée aux bords. Dans les deux cas, les petites taches isolées sont retirées.
    """
    if is_green_screen(rgb):
        r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        fg = ~((g > 90) & (g - np.maximum(r, b) > GREEN_MARGIN))
        despill(rgb, fg)
    else:
        border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
        bg = np.median(border, axis=0)
        near_bg = np.abs(rgb - bg).max(axis=2) <= BG_TOLERANCE
        labels, _ = ndimage.label(near_bg)
        edge_labels = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
        background = np.isin(labels, edge_labels[edge_labels > 0])
        fg = ~background
    labels, n = ndimage.label(fg)
    if n:
        sizes = ndimage.sum(fg, labels, range(1, n + 1))
        keep = np.zeros(n + 1, bool)
        keep[1:] = sizes >= MIN_BLOB_RATIO * fg.size
        fg = keep[labels]
    return fg


def bbox(mask):
    ys, xs = np.nonzero(mask)
    return ys.min(), ys.max() + 1, xs.min(), xs.max() + 1


def largest_band(mask):
    """Restreint le masque à la plus haute bande de lignes non vides (ex. le titre sans le sous-texte)."""
    rows = mask.any(axis=1)
    labels, n = ndimage.label(rows)
    heights = ndimage.sum(rows, labels, range(1, n + 1))
    best = 1 + int(np.argmax(heights))
    band = labels == best
    out = mask.copy()
    out[~band] = False
    return out


def downscale(rgb, mask, size):
    """Réduction par moyenne de zone.

    La forme (alpha) vient du masque complet ; la couleur ignore les contours
    quasi noirs, sinon ils ternissent les sprites de quelques pixels.
    """
    w, h = size
    m = mask.astype(np.float32)
    cov = np.asarray(Image.fromarray(m, "F").resize((w, h), Image.BOX))
    bright = m * (rgb.max(axis=2) > OUTLINE_MAX)
    wcol = np.asarray(Image.fromarray(bright, "F").resize((w, h), Image.BOX))
    use_bright = wcol > 1e-3
    out = np.zeros((h, w, 4), np.uint8)
    for c in range(3):
        num_b = np.asarray(Image.fromarray(rgb[..., c] * bright, "F").resize((w, h), Image.BOX))
        num_m = np.asarray(Image.fromarray(rgb[..., c] * m, "F").resize((w, h), Image.BOX))
        col = np.where(use_bright, num_b / np.maximum(wcol, 1e-6), num_m / np.maximum(cov, 1e-6))
        out[..., c] = np.clip(col, 0, 255).astype(np.uint8)
    out[..., 3] = np.where(cov >= ALPHA_COVERAGE, 255, 0)
    return Image.fromarray(out, "RGBA")


def sprite(name, w, h, mode, opts):
    rgb = load(name, opts.get("crop_x"))
    fg = foreground_mask(rgb)
    if opts.get("largest_band"):
        fg = largest_band(fg)
    y0, y1, x0, x1 = bbox(fg)
    rgb, fg = rgb[y0:y1, x0:x1], fg[y0:y1, x0:x1]
    if mode == "stretch":
        return downscale(rgb, fg, (w, h))
    bh, bw = fg.shape
    scale = min(w / bw, h / bh)
    sw, sh = max(1, round(bw * scale)), max(1, round(bh * scale))
    small = downscale(rgb, fg, (sw, sh))
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    img.paste(small, ((w - sw) // 2, (h - sh) // 2))
    return img


def ground_strip(name, w, h):
    """Bande de sol répétable.

    Fond vert : l'image est déjà une bande, elle est simplement recadrée et étirée.
    Ancienne image (bâtiment sur fond sombre) : on prélève une bande dans sa façade basse.
    """
    rgb = load(name)
    if is_green_screen(rgb):
        return sprite(name, w, h, "stretch", {})
    fg = foreground_mask(rgb)
    y0, y1, x0, x1 = bbox(fg)
    bw = x1 - x0
    sw = int(bw * 0.8)
    sh = sw * h // w
    cx = (x0 + x1) // 2
    bottom = y1 - int((y1 - y0) * 0.06)
    crop = rgb[max(0, bottom - sh):bottom, cx - sw // 2:cx + sw // 2]
    full = np.ones(crop.shape[:2], bool)
    return downscale(crop, full, (w, h))


def bar_frame(name, w, h):
    img = sprite(name, w, h, "stretch", {}).copy()
    px = img.load()
    for x in range(2, w - 2):  # intérieur sombre aligné sur la zone de remplissage du HUD
        for y in range(2, h - 2):
            px[x, y] = (12, 12, 16, 255)
    return img


def bar_fill(name, w, h):
    """Ne garde que le dégradé coloré, placé dans la zone intérieure (2..w-3, 2..h-3)."""
    rgb = load(name)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    colored = foreground_mask(rgb) & (sat > 80)
    y0, y1, x0, x1 = bbox(colored)
    pad_y = (y1 - y0) // 8
    inner = rgb[y0 + pad_y:y1 - pad_y, x0:x1]
    small = downscale(inner, np.ones(inner.shape[:2], bool), (w - 4, h - 4))
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    img.paste(small, (2, 2))
    return img


def background(name, w, h):
    img = Image.open(JPEG_DIR / f"{name}.jpeg").convert("RGB")
    iw, ih = img.size
    cw = min(iw, ih * w // h)
    left = (iw - cw) // 2
    img = img.crop((left, 0, left + cw, ih)).resize((w, h), Image.BOX)
    # Étoiles atténuées vers la couleur du fond : le décor ne doit pas gêner la lecture des sprites et du texte.
    a = np.asarray(img).astype(np.float32)
    base = np.median(a.reshape(-1, 3), axis=0)
    a = base + (a - base) * BACKGROUND_STAR_DIM
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert("RGBA")


def convert(name):
    w, h, mode, opts = SPECS[name]
    if mode == "ground_strip":
        img = ground_strip(name, w, h)
    elif mode == "bar_frame":
        img = bar_frame(name, w, h)
    elif mode == "bar_fill":
        img = bar_fill(name, w, h)
    elif mode == "background":
        img = background(name, w, h)
    else:
        img = sprite(name, w, h, mode, opts)
    assert img.size == (w, h), (name, img.size)
    img.save(PNG_DIR / f"{name}.png")


def main():
    names = sys.argv[1:] or list(SPECS)
    for name in names:
        src = JPEG_DIR / f"{name}.jpeg"
        if name not in SPECS or not src.exists():
            print(f"ignoré : {name}")
            continue
        convert(name)
        print(f"{name}.jpeg -> {name}.png {SPECS[name][:2]}")


if __name__ == "__main__":
    main()
