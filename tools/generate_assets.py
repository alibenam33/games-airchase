#!/usr/bin/env python3
"""Génère les placeholders PNG (assets/png), leurs copies JPEG sur fond vert
(assets/jpeg) et la page image-prompts.html.

Les fichiers existants ne sont jamais écrasés (ils peuvent contenir les images
générées et importées via tools/import_jpeg_assets.py), sauf avec --force.

Usage : python3 tools/generate_assets.py [--force]
"""
import html
import random
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PNG_DIR = ROOT / "assets" / "png"
JPEG_DIR = ROOT / "assets" / "jpeg"
GREEN = (0, 255, 0)

PALETTE = {
    "W": (236, 236, 236),
    "C": (84, 184, 236),
    "c": (24, 104, 160),
    "K": (28, 28, 44),
    "G": (140, 140, 152),
    "g": (84, 84, 100),
    "Y": (252, 224, 72),
    "O": (240, 128, 32),
    "R": (216, 40, 40),
    "r": (130, 20, 30),
    "M": (220, 60, 200),
    "P": (124, 64, 200),
    "V": (120, 220, 40),
    "B": (40, 80, 200),
}

# Police 3x5 identique à celle de js/ui.js.
FONT = {
    "A": "010101111101101", "C": "011100100100011", "E": "111100110100111",
    "G": "011100101101011", "H": "101101111101101", "I": "111010010010111",
    "M": "101111111101101", "O": "010101101101010", "R": "110101110101101",
    "S": "011100010001110", "V": "101101101101010", " ": "000000000000000",
}


def blank(size):
    return Image.new("RGBA", size, (0, 0, 0, 0))


def put(img, x, y, ch):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), PALETTE[ch] + (255,))


def from_ascii(rows, size, mirror=False):
    """Dessine un sprite ASCII ('.' = transparent), centré dans `size`."""
    width = max(len(r) for r in rows)
    rows = [r.ljust(width, ".") for r in rows]
    if mirror:
        rows = [r[::-1] for r in rows]
    w, h = size
    assert width <= w and len(rows) <= h, (width, len(rows), size)
    img = blank(size)
    ox, oy = (w - width) // 2, (h - len(rows)) // 2
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                put(img, ox + x, oy + y, ch)
    return img


PLAYER_CANNON = [
    ".......WW.......",
    ".......WW.......",
    "......WCCW......",
    "......WCCW......",
    "......WCCW......",
    ".....WWCCWW.....",
    "....WCCCCCCW....",
    "...WCCcWWcCCW...",
    "..WCCcWWWWcCCW..",
    ".WCCCCCCCCCCCCW.",
    "WWWWWWWWWWWWWWWW",
    "WKKKKKKKKKKKKKKW",
    "KcCcKcCcKcCcKcCK",
    ".KKKKKKKKKKKKKK.",
]

BULLET_VERTICAL = [".WW.", ".WW.", "WYYW", ".YY.", ".YY.", ".YY.", ".OO.", ".OO."]
BULLET_RIGHT = ["..OYYYW.", "OOYYYYWW", "OOYYYYWW", "..OYYYW."]

ALIEN_SOLID = [
    "..M..........M..",
    "...M........M...",
    "....MMMMMMMM....",
    "...MMOMMMMOMM...",
    "..MMWWOMMOWWMM..",
    "..MMWKOMMOKWMM..",
    ".MMMMMMMMMMMMMM.",
    "MMOMMMMMMMMMMOMM",
    "M.OOMMMMMMMMOO.M",
    "M..MMOOOOOOMM..M",
    "...MM......MM...",
    "..MM........MM..",
    ".OO..........OO.",
]

ALIEN_SPLITTER = [
    ".....VVVVVV.....",
    "...VVVVWWVVVV...",
    "..VVPVVWWVVPVV..",
    ".VVPPVVWWVVPPVV.",
    ".VVWWVVWWVVWWVV.",
    "VVVWKVVWWVVKWVVV",
    "VVVVVVVWWVVVVVVV",
    "VPVVVVVWWVVVVVPV",
    "VPPVVVVWWVVVVPPV",
    ".VPPVVVWWVVVPPV.",
    "..VV.VVWWVV.VV..",
    ".VV...V..V...VV.",
    "VV............VV",
]

ALIEN_SMALL = [
    "..CCCC..",
    ".CWCCWC.",
    "CCRCCRCC",
    "CCCCCCCC",
    ".CRRRRC.",
    ".C....C.",
    "C......C",
]

ENEMY_MISSILE = ["..Y.", ".YO.", ".GG.", ".GG.", "GGGG", ".GG.", ".RR.", ".RR."]

ENEMY_MISSILE_GROUP = [
    ".Y...Y...Y.",
    ".O...O...O.",
    "RGR.RGR.RGR",
    ".G...G...G.",
    ".G...G...G.",
    ".R...R...R.",
]

ENEMY_FIREBALL = [
    "...R....",
    "..R..R..",
    ".ROOOOR.",
    "ORYYYYRO",
    "ORYWWYRO",
    ".OYWWYO.",
    "..OYYO..",
    "...OO...",
]

ENEMY_FIREBALL_H = [
    "........",
    "R..OOO..",
    ".ROYYYO.",
    "RROYWWYO",
    ".ROYWWYO",
    "R.ROYYO.",
    "...OOO..",
]


def mothership():
    img = blank((64, 24))
    # Dôme
    for y in range(1, 10):
        for x in range(64):
            dx, dy = (x + 0.5 - 32) / 13, (y + 0.5 - 10) / 9
            if dx * dx + dy * dy <= 1:
                put(img, x, y, "P")
    for x, y in [(26, 3), (27, 3), (25, 4), (26, 4), (25, 5)]:
        put(img, x, y, "W")
    for x in (23, 24, 31, 32, 39, 40):
        put(img, x, 7, "C")
    # Coque : demi-largeur par ligne
    half = {9: 22, 10: 27, 11: 30, 12: 31, 13: 32, 14: 32, 15: 31, 16: 29, 17: 26}
    for y, hw in half.items():
        for x in range(32 - hw, 32 + hw):
            put(img, x, y, "G" if y < 13 else "g")
    for x in range(0, 64):
        put(img, x, 13, "R")
        if x % 6 == 2:
            put(img, x, 13, "C")
    for y, hw in half.items():
        put(img, 32 - hw, y, "W" if y < 13 else "K")
        put(img, 32 + hw - 1, y, "W" if y < 13 else "K")
    # Baies des trappes (centres 12, 32, 52)
    for cx in (12, 32, 52):
        for x in range(cx - 4, cx + 4):
            for y in range(18, 22):
                edge = x in (cx - 4, cx + 3) or y == 21
                put(img, x, y, "g" if edge else "r")
    return img


def laser():
    img = blank((4, 32))
    for y in range(32):
        side = "M" if (y // 2) % 2 == 0 else "R"
        put(img, 0, y, side)
        put(img, 3, y, side)
        put(img, 1, y, "W")
        put(img, 2, y, "W")
    return img


def base():
    img = blank((64, 16))
    for x in range(64):
        put(img, x, 0, "G")
        put(img, x, 1, "K" if x % 8 in (0, 7) else ("C" if x % 8 in (3, 4) else "c"))
        for y in range(2, 6):
            put(img, x, y, "B")
        for y in range(6, 16):
            put(img, x, y, "K" if x % 16 == 0 else ("G" if y == 6 else "g"))
        if x % 16 == 8:
            put(img, x, 3, "W")
            put(img, x, 10, "c")
    return img


def temperature_bar():
    img = blank((48, 8))
    for x in range(48):
        for y in range(8):
            if y in (0, 7) or x in (0, 47):
                put(img, x, y, "W")
            elif y in (1, 6) or x in (1, 46):
                put(img, x, y, "G")
            else:
                put(img, x, y, "K")
    return img


def temperature_fill():
    img = blank((48, 8))
    stops = [(60, 200, 60), (252, 224, 72), (216, 40, 40)]
    for x in range(2, 46):
        t = round(((x - 2) / 43) * 7) / 7  # 8 paliers pour un rendu pixel art
        if t < 0.5:
            a, b, k = stops[0], stops[1], t / 0.5
        else:
            a, b, k = stops[1], stops[2], (t - 0.5) / 0.5
        col = tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))
        for y in range(2, 6):
            c = tuple(min(255, v + 40) for v in col) if y == 2 else col
            img.putpixel((x, y), c + (255,))
    return img


def background_space():
    img = Image.new("RGBA", (320, 240), (5, 6, 16, 255))
    rng = random.Random(4207)
    for _ in range(150):
        x, y = rng.randrange(320), rng.randrange(240)
        col = rng.choice([(90, 90, 120), (120, 140, 220), (200, 200, 220)])
        img.putpixel((x, y), col + (255,))
    for _ in range(10):
        x, y = rng.randrange(2, 318), rng.randrange(2, 238)
        img.putpixel((x, y), (236, 236, 255, 255))
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            img.putpixel((x + dx, y + dy), (80, 100, 170, 255))
    return img


def pixel_text(text, size, scale, top, body, shadow, underline=None):
    img = blank(size)
    cols = len(text) * 4 - 1
    tw, th = cols * scale, 5 * scale
    total_h = th + (scale + 3 if underline else 0)
    ox, oy = (size[0] - tw) // 2, (size[1] - total_h) // 2

    def draw(dx, dy, colorer):
        for i, ch in enumerate(text):
            bits = FONT[ch]
            for gy in range(5):
                for gx in range(3):
                    if bits[gy * 3 + gx] == "1":
                        c = colorer(gy)
                        for sy in range(scale):
                            for sx in range(scale):
                                put(img, ox + dx + (i * 4 + gx) * scale + sx,
                                    oy + dy + gy * scale + sy, c)

    draw(2, 2, lambda gy: shadow)
    draw(0, 0, lambda gy: top if gy < 2 else body)
    if underline:
        for x in range(ox, ox + tw):
            for y in range(oy + th + scale, oy + th + scale + 3):
                put(img, x, y, underline)
    return img


# nom, (largeur, hauteur), fabrique, prompt
ASSETS = [
    ("player_cannon", (16, 16), lambda s: from_ascii(PLAYER_CANNON, s),
     "Pixel art rétro Atari 2600 d’un canon spatial du joueur, vue de face, petite tourelle blanche et cyan avec base sombre, style 8-bit, sprite centré, contours nets, palette limitée, haute lisibilité, sans texte."),
    ("player_bullet_vertical", (4, 8), lambda s: from_ascii(BULLET_VERTICAL, s),
     "Pixel art rétro Atari 2600 d’un petit missile vertical blanc et jaune, orienté vers le haut, style 8-bit, sprite centré, contours nets, palette limitée, sans texte."),
    ("player_bullet_left", (8, 4), lambda s: from_ascii(BULLET_RIGHT, s, mirror=True),
     "Pixel art rétro Atari 2600 d’un petit missile horizontal blanc et jaune, orienté vers la gauche, style 8-bit, sprite centré, contours nets, palette limitée, sans texte."),
    ("player_bullet_right", (8, 4), lambda s: from_ascii(BULLET_RIGHT, s),
     "Pixel art rétro Atari 2600 d’un petit missile horizontal blanc et jaune, orienté vers la droite, style 8-bit, sprite centré, contours nets, palette limitée, sans texte."),
    ("mothership", (64, 24), lambda s: mothership(),
     "Pixel art rétro Atari 2600 d’un immense vaisseau-mère alien, silhouette large et menaçante, coque grise, violette et rouge, détails lumineux cyan, style 8-bit, vue de face, sprite centré, contours nets, palette limitée, sans texte."),
    ("alien_large_solid", (16, 16), lambda s: from_ascii(ALIEN_SOLID, s),
     "Pixel art rétro Atari 2600 d’un grand alien hostile non fragmentable, forme insectoïde symétrique, couleurs magenta, orange et blanc, yeux lumineux, style 8-bit, sprite centré, contours nets, palette limitée, sans texte."),
    ("alien_large_splitter", (16, 16), lambda s: from_ascii(ALIEN_SPLITTER, s),
     "Pixel art rétro Atari 2600 d’un grand alien hostile capable de se diviser, forme organique symétrique avec une fissure centrale lumineuse, couleurs vert acide, violet et blanc, style 8-bit, sprite centré, contours nets, palette limitée, sans texte."),
    ("alien_small", (8, 8), lambda s: from_ascii(ALIEN_SMALL, s),
     "Pixel art rétro Atari 2600 d’un petit alien rapide issu d’une fragmentation, forme compacte et agressive, couleurs cyan, rouge et blanc, style 8-bit, sprite centré, contours nets, palette limitée, sans texte."),
    ("enemy_missile", (4, 8), lambda s: from_ascii(ENEMY_MISSILE, s),
     "Pixel art rétro Atari 2600 d’un missile ennemi vertical, ogive rouge, corps gris et traînée jaune, orienté vers le bas, style 8-bit, sprite centré, contours nets, palette limitée, sans texte."),
    ("enemy_missile_group", (12, 8), lambda s: from_ascii(ENEMY_MISSILE_GROUP, s),
     "Pixel art rétro Atari 2600 d’un groupe compact de trois petits missiles ennemis rouges et jaunes, orientés vers le bas, style 8-bit, sprite centré, contours nets, palette limitée, sans texte."),
    ("enemy_laser", (4, 32), lambda s: laser(),
     "Pixel art rétro Atari 2600 d’un rayon laser ennemi vertical, faisceau fin rouge et magenta avec cœur blanc, style 8-bit, sprite vertical centré, contours nets, palette limitée, sans texte."),
    ("enemy_fireball", (8, 8), lambda s: from_ascii(ENEMY_FIREBALL, s),
     "Pixel art rétro Atari 2600 d’une boule de feu alien, sphère orange et rouge avec cœur jaune lumineux, traînée courte vers le bas, style 8-bit, sprite centré, contours nets, palette limitée, sans texte."),
    ("enemy_fireball_horizontal", (8, 8), lambda s: from_ascii(ENEMY_FIREBALL_H, s),
     "Pixel art rétro Atari 2600 d’une boule de feu alien se déplaçant horizontalement, sphère orange et rouge avec cœur jaune, traînée horizontale vers la gauche, style 8-bit, sprite centré, contours nets, palette limitée, sans texte."),
    ("base", (64, 16), lambda s: base(),
     "Pixel art rétro Atari 2600 d’une base défensive futuriste au sol, plateforme métallique grise et bleue avec lumières cyan, style 8-bit, sprite horizontal centré, contours nets, palette limitée, sans texte."),
    ("temperature_bar", (48, 8), lambda s: temperature_bar(),
     "Pixel art rétro Atari 2600 d’un cadre de jauge de température horizontal, bordure blanche et grise, intérieur vide noir, style 8-bit, sprite centré, contours nets, palette limitée, sans texte."),
    ("temperature_fill", (48, 8), lambda s: temperature_fill(),
     "Pixel art rétro Atari 2600 d’un remplissage de jauge de température horizontal, dégradé discret du vert au jaune puis au rouge, style 8-bit, sprite centré, contours nets, palette limitée, sans texte."),
    ("background_space", (320, 240), lambda s: background_space(),
     "Pixel art rétro Atari 2600 d’un fond spatial fixe, ciel noir profond avec quelques étoiles blanches et bleues discrètes, très sombre pour laisser lire les sprites, style 8-bit, sans vaisseau, sans alien, sans texte."),
    ("title_logo", (256, 64), lambda s: pixel_text("AIRCHASE", s, 7, "W", "C", "c", underline="R"),
     "Pixel art rétro Atari 2600 du titre AIRCHASE en grandes lettres arcade blanches, cyan et rouges, style 8-bit, composition horizontale centrée, contours nets, palette limitée, texte exact : AIRCHASE."),
    ("game_over_text", (192, 32), lambda s: pixel_text("GAME OVER", s, 5, "W", "R", "r"),
     "Pixel art rétro Atari 2600 du texte GAME OVER en grandes lettres arcade rouges et blanches, style 8-bit, composition horizontale centrée, contours nets, palette limitée, texte exact : GAME OVER."),
]

GLOBAL_STYLE = ("pixel art rétro Atari 2600, palette limitée, contours nets, sprite centré, "
                "fond uni, haute lisibilité, sans texte sauf indication contraire")

# --- Prompts détaillés pour les générateurs d'images ---------------------------
# Tous les sprites sont demandés sur un fond vert chroma #00FF00 uni (détouré par
# tools/import_jpeg_assets.py) ; aucun sprite ne doit donc contenir de vert.

GREEN_BACKGROUND = (
    "FOND : vert chroma pur #00FF00 (RVB 0, 255, 0), parfaitement uni et plat sur toute la surface de l’image. "
    "Aucun dégradé, aucune texture, aucun vignettage, aucun bruit, aucune étoile, aucun décor, aucun sol, "
    "aucune ombre portée, aucun reflet, aucune lueur ni halo qui déborde sur le fond. "
    "Le sujet ne contient AUCUN pixel vert (ni vert clair, ni vert foncé, ni vert-jaune, ni turquoise tirant sur le vert) "
    "pour pouvoir être détouré par incrustation. Un contour noir #000000 net entoure tout le sujet et le sépare du vert."
)

ONE_SUBJECT = (
    "Un seul sujet, entier, centré, sans copie ni variante à côté, sans texte, sans lettres, sans chiffres, "
    "sans signature, sans filigrane, sans cadre, sans bordure d’image, sans interface."
)


def pixel_style(w, h, colors):
    return (
        f"STYLE : pixel art rétro façon Atari 2600 / 8-bit. Pixels carrés parfaitement nets, alignés sur une grille régulière, "
        f"sans anticrénelage, sans flou, sans dégradé lissé ; ombrage en aplats (2 tons maximum par couleur). "
        f"Palette stricte de {colors} couleurs. Le dessin doit rester lisible une fois réduit à {w} × {h} pixels : "
        f"silhouette simple et massive, gros volumes, forts contrastes, aucun détail plus fin qu’un pixel de l’image finale."
    )


def framing(ratio, orientation, fill="85 %"):
    return (
        f"CADRAGE : image au format {ratio} ({orientation}). Le sujet occupe environ {fill} de la largeur et de la hauteur, "
        f"avec une marge régulière de vert uni tout autour, sans toucher les bords."
    )


# nom : (sujet détaillé, nombre de couleurs, format, orientation, éléments à éviter en plus)
PROMPTS = {
    "player_cannon": (
        "SUJET : le canon défensif du joueur, une petite tourelle spatiale vue strictement de face, symétrique gauche/droite. "
        "En haut, un canon vertical unique, fin et long (environ un tiers de la hauteur), blanc #ECECEC avec la pointe cyan #54B8EC. "
        "Au centre, une coupole arrondie blanche avec un hublot cyan #54B8EC et un reflet blanc pur. "
        "En bas, un socle large et trapu en métal gris foncé #545464 et gris moyen #8C8C98, plus large que la coupole, "
        "avec deux petits réacteurs latéraux cyan. Le socle est posé à plat, base horizontale bien droite.",
        6, "carré 1:1", "carré", "pas de personnage, pas de pilote visible, pas de flammes",
    ),
    "player_bullet_vertical": (
        "SUJET : le projectile du joueur, un petit missile vertical pointant vers le HAUT, vu de profil, parfaitement droit. "
        "Ogive pointue blanche #FFFFFF en haut, corps étroit jaune vif #FCE048, petites ailettes orange #F08020 à la base, "
        "courte flamme orange et jaune en bas. Forme très allongée et fine (environ 1 de large pour 2 à 3 de haut).",
        5, "portrait 1:2", "vertical", "pas de fumée, pas de traînée longue, pas de panneaux ou bandes sur les côtés",
    ),
    "player_bullet_left": (
        "SUJET : le même petit missile du joueur, couché à l’horizontale et pointant vers la GAUCHE. Ogive blanche #FFFFFF à gauche, "
        "corps jaune vif #FCE048, ailettes orange #F08020 et courte flamme orange à droite. Forme allongée et fine.",
        5, "paysage 2:1", "horizontal", "pas de fumée, pas de traînée longue",
    ),
    "player_bullet_right": (
        "SUJET : le même petit missile du joueur, couché à l’horizontale et pointant vers la DROITE. Ogive blanche #FFFFFF à droite, "
        "corps jaune vif #FCE048, ailettes orange #F08020 et courte flamme orange à gauche. Forme allongée et fine.",
        5, "paysage 2:1", "horizontal", "pas de fumée, pas de traînée longue",
    ),
    "mothership": (
        "SUJET : la Ruche, un immense vaisseau-mère alien vu strictement de face, symétrique, beaucoup plus large que haut. "
        "Silhouette de soucoupe massive : un dôme central violet #7C40C8 avec un grand œil cyan #54B8EC lumineux au sommet, "
        "posé sur une coque large gris métal #8C8C98 et gris foncé #545464, cerclée d’une bande rouge #D82828 ponctuée de petits feux cyan. "
        "Les deux extrémités de la coque se terminent par des ailes courtes et anguleuses. "
        "Sous la coque, exactement TROIS trappes de largage rectangulaires, bien visibles et régulièrement espacées "
        "(une à gauche, une au centre, une à droite), à bord gris clair et intérieur rouge sombre #821E1E.",
        8, "paysage 8:3", "horizontal, très large", "pas de tentacules longues, pas de rayon tracteur, pas d’aliens autour",
    ),
    "alien_large_solid": (
        "SUJET : un Drone alien hostile, créature insectoïde massive vue strictement de face, parfaitement symétrique. "
        "Corps compact et trapu (tête et thorax réunis en un bloc presque carré) magenta #DC3CC8, "
        "deux grands yeux blancs #FFFFFF avec pupille noire, mandibules orange #F08020, "
        "deux antennes courtes en haut et quatre pattes courtes et épaisses orange sur les côtés, repliées près du corps. "
        "La silhouette tient dans un carré, sans membres longs ni fins.",
        5, "carré 1:1", "carré", "pas de pattes longues et fines, pas d’ailes transparentes",
    ),
    "alien_large_splitter": (
        "SUJET : un Prisme alien, créature organique ronde et bombée vue strictement de face, parfaitement symétrique, "
        "qui semble prête à se scinder en deux. Corps violet #7C40C8 avec plaques magenta #DC3CC8, "
        "une large fissure verticale lumineuse au centre, blanche #FFFFFF au cœur et cyan #54B8EC sur les bords, qui coupe le corps en deux moitiés. "
        "Deux yeux jaune ambre #FCE048 de part et d’autre de la fissure, quatre petites griffes ambre en bas. "
        "Silhouette ronde et massive qui tient dans un carré.",
        6, "carré 1:1", "carré", "pas de vert acide, pas de bave, pas de détails filiformes",
    ),
    "alien_small": (
        "SUJET : un Éclat, petit alien rapide et agressif issu de la fragmentation, vu strictement de face, symétrique. "
        "Corps rond et compact rouge #D82828 avec un gros œil blanc #FFFFFF unique au centre, "
        "deux pinces courtes et épaisses cyan #54B8EC de chaque côté. Forme très simple, lisible même en 8 × 8 pixels.",
        4, "carré 1:1", "carré", "pas de pattes fines, pas de petits détails",
    ),
    "enemy_missile": (
        "SUJET : un Dard, missile ennemi vertical pointant vers le BAS, vu de profil, parfaitement droit. "
        "Ogive rouge vif #D82828 en bas, corps étroit gris métal #8C8C98, petites ailettes gris foncé, "
        "courte flamme jaune #FCE048 en haut (le missile descend). Forme très allongée et fine.",
        4, "portrait 1:2", "vertical", "pas de fumée, pas de traînée longue",
    ),
    "enemy_missile_group": (
        "SUJET : une Salve, groupe serré de trois petits missiles ennemis identiques pointant vers le BAS, côte à côte, "
        "celui du milieu légèrement plus bas que les deux autres. Chaque missile : ogive rouge #D82828 en bas, "
        "corps jaune #FCE048, petite flamme orange #F08020 en haut. Les trois missiles sont bien séparés par un petit espace.",
        4, "paysage 3:2", "horizontal", "pas de fumée, pas d’explosion",
    ),
    "enemy_laser": (
        "SUJET : un segment de rayon laser ennemi vertical, colonne droite et uniforme qui traverse toute la hauteur de l’image, "
        "de bord à bord en haut et en bas (c’est un motif répétable verticalement). Cœur blanc #FFFFFF au centre, "
        "bandes rouge #D82828 et magenta #DC3CC8 de chaque côté, largeur constante sur toute la hauteur. "
        "Exception au cadrage : le rayon touche le haut et le bas de l’image ; il ne touche pas les côtés.",
        4, "portrait très étroit 1:8 (ou le plus étroit possible)", "vertical", "pas de source ni d’impact visibles, pas d’étincelles",
    ),
    "enemy_fireball": (
        "SUJET : un Plasma, boule de feu alien qui tombe vers le bas. Sphère ronde orange #F08020 cerclée de rouge #D82828, "
        "cœur jaune #FCE048 et point blanc #FFFFFF au centre, courte traînée de flammes vers le HAUT (la boule descend). "
        "La sphère occupe la plus grande partie de l’image.",
        5, "carré 1:1", "carré", "pas de fumée, pas d’étincelles dispersées",
    ),
    "enemy_fireball_horizontal": (
        "SUJET : une Comète, boule de feu alien qui fonce vers la DROITE. Sphère ronde orange #F08020 cerclée de rouge #D82828 "
        "sur la moitié droite de l’image, cœur jaune #FCE048 et point blanc #FFFFFF, traînée de flammes courte et effilée vers la GAUCHE.",
        5, "carré 1:1", "carré", "pas de fumée, pas d’étincelles dispersées",
    ),
    "base": (
        "SUJET : une bande de sol de base défensive futuriste vue strictement de face, conçue comme un MOTIF RÉPÉTABLE horizontalement : "
        "le bord gauche doit se raccorder parfaitement au bord droit. "
        "En haut, un liseré gris clair #8C8C98, puis une rangée de petits voyants cyan #54B8EC régulièrement espacés sur un bandeau bleu #2850C8, "
        "puis un épais soubassement en plaques de métal gris foncé #545464 séparées par des joints verticaux noirs réguliers. "
        "Exception au cadrage : la bande occupe toute la largeur de l’image, de bord à bord ; seul un peu de vert apparaît au-dessus et en dessous.",
        6, "paysage 4:1", "horizontal, bande", "pas de bâtiment, pas de tours, pas de perspective, pas de rochers",
    ),
    "temperature_bar": (
        "SUJET : le cadre vide d’une jauge horizontale d’interface, rectangle très allongé vu de face. "
        "Bordure extérieure blanche #ECECEC épaisse, bordure intérieure grise #8C8C98, intérieur entièrement noir #0C0C10 et vide. "
        "Coins à angle droit ou très légèrement coupés, épaisseur de bordure identique sur les quatre côtés. "
        "Exception au cadrage : le cadre occupe presque toute la largeur de l’image.",
        3, "paysage très allongé 6:1", "horizontal", "pas de graduations, pas d’icône, pas de remplissage coloré",
    ),
    "temperature_fill": (
        "SUJET : le remplissage d’une jauge de température horizontale, simple barre rectangulaire pleine, sans cadre. "
        "Dégradé en paliers nets (6 à 8 bandes verticales de couleur unie) de gauche à droite : cyan #54B8EC, bleu clair, "
        "jaune #FCE048, orange #F08020, rouge #D82828. Une fine ligne plus claire en haut de la barre pour le relief. "
        "Exception au cadrage : la barre occupe presque toute la largeur de l’image.",
        6, "paysage très allongé 6:1", "horizontal", "pas de cadre, pas de vert, pas de graduations",
    ),
    "title_logo": (
        "SUJET : le logo titre du jeu, le mot exact « AIRCHASE » en une seule ligne, en grandes lettres capitales d’arcade "
        "épaisses et carrées en pixel art. Lettres blanches #ECECEC dans la moitié haute et cyan #54B8EC dans la moitié basse, "
        "ombre portée décalée bleu foncé #1868A0 vers le bas à droite, contour noir. Un trait horizontal rouge #D82828 souligne le mot. "
        "Orthographe exacte : A-I-R-C-H-A-S-E.",
        5, "paysage 4:1", "horizontal", "aucun autre mot, pas de sous-titre, pas de « presents », pas de vaisseau",
    ),
    "game_over_text": (
        "SUJET : le texte exact « GAME OVER » en une seule ligne, en grandes lettres capitales d’arcade épaisses et carrées "
        "en pixel art. Lettres rouge vif #D82828 avec un reflet blanc #ECECEC sur le haut de chaque lettre, "
        "ombre portée rouge sombre #821E1E décalée vers le bas à droite, contour noir. Orthographe exacte : G-A-M-E O-V-E-R.",
        4, "paysage 6:1", "horizontal", "aucun autre mot, pas de « insert coin », pas de « play again », pas de score",
    ),
}

BACKGROUND_PROMPT = (
    "SUJET : le fond fixe du jeu, un ciel spatial vu de face qui remplit TOUTE l’image de bord à bord. "
    "Noir profond #05060F uniforme, parsemé d’environ 150 étoiles minuscules d’un seul pixel, blanches #ECECEC, "
    "bleu pâle #7890DC et gris #5A5A78, réparties au hasard mais régulièrement, plus une dizaine d’étoiles un peu plus brillantes "
    "en forme de petite croix. Très sombre pour que les sprites restent lisibles.\n\n"
    "STYLE : pixel art rétro façon Atari 2600 / 8-bit, pixels carrés nets, sans anticrénelage, sans flou. "
    "Palette stricte de 4 couleurs.\n\n"
    "CADRAGE : image au format paysage 4:3, entièrement remplie par le ciel.\n\n"
    "Cette image est la seule SANS fond vert : c’est elle-même le fond du jeu.\n\n"
    "À ÉVITER : nébuleuse, galaxie, planète, lune, soleil, vaisseau, alien, sol, texte, vert, dégradé lumineux."
)


def full_prompt(name, w, h):
    if name == "background_space":
        return BACKGROUND_PROMPT
    subject, colors, ratio, orientation, avoid = PROMPTS[name]
    return "\n\n".join([
        subject,
        pixel_style(w, h, colors),
        framing(ratio, orientation),
        GREEN_BACKGROUND,
        ONE_SUBJECT,
        "À ÉVITER : " + avoid + ", fond autre que #00FF00, vert dans le sujet, ombre au sol, "
        "style 3D, rendu réaliste, flou, anticrénelage, plusieurs objets.",
    ])


def write_prompts_page():
    sections = []
    for name, (w, h), _, _ in ASSETS:
        prompt = full_prompt(name, w, h)
        is_bg = name == "background_space"
        png_bg = "noir / bleu très sombre (opaque)" if is_bg else "transparent (vert détouré)"
        jpeg_bg = "ciel étoilé plein cadre (pas de vert)" if is_bg else "vert uni <code>#00FF00</code> uniquement"
        sections.append(f"""
    <section class="card" id="{name}">
      <div class="head">
        <img src="assets/png/{name}.png" alt="" width="{w}" height="{h}" style="--w:{w}px;--h:{h}px">
        <h2>{name}</h2>
      </div>
      <dl>
        <dt>PNG</dt><dd><code>assets/png/{name}.png</code></dd>
        <dt>JPEG</dt><dd><code>assets/jpeg/{name}.jpeg</code></dd>
        <dt>Dimensions</dt><dd>{w} × {h} px</dd>
        <dt>Fond PNG</dt><dd>{png_bg}</dd>
        <dt>Fond JPEG</dt><dd>{jpeg_bg}</dd>
      </dl>
      <pre>{html.escape(prompt)}</pre>
      <button type="button" data-copy>Copier le prompt</button>
    </section>""")
    page = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Airchase — Prompts de génération d’images</title>
<style>
  :root {{ --bg:#0b0d1a; --card:#151a2e; --text:#e6e8f0; --muted:#9aa3c0; --accent:#54b8ec; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; padding:24px 16px; background:var(--bg); color:var(--text);
         font:15px/1.5 system-ui, sans-serif; }}
  main {{ max-width:900px; margin:0 auto; }}
  h1 {{ font-size:1.6rem; margin:0 0 8px; }}
  .style {{ background:var(--card); border-left:4px solid var(--accent); padding:12px 16px; border-radius:6px; }}
  .grid {{ display:grid; gap:16px; grid-template-columns:repeat(auto-fill, minmax(min(100%, 400px), 1fr)); margin-top:24px; }}
  .card {{ background:var(--card); border-radius:8px; padding:16px; }}
  .head {{ display:flex; align-items:center; gap:12px; }}
  .head img {{ image-rendering:pixelated; width:calc(var(--w) * 3); height:calc(var(--h) * 3);
              max-width:160px; object-fit:contain; background:#000; padding:4px; border-radius:4px; }}
  h2 {{ font-size:1.05rem; margin:0; font-family:ui-monospace, monospace; }}
  dl {{ display:grid; grid-template-columns:auto 1fr; gap:2px 12px; margin:12px 0; color:var(--muted); font-size:.9rem; }}
  dt {{ font-weight:600; }} dd {{ margin:0; overflow-wrap:anywhere; }}
  code {{ color:var(--text); }}
  pre {{ white-space:pre-wrap; background:#0b0d1a; padding:12px; border-radius:6px; margin:0 0 10px; font-size:.88rem; }}
  button {{ background:var(--accent); color:#0b0d1a; border:0; border-radius:4px; padding:6px 12px; font-weight:600; cursor:pointer; }}
</style>
</head>
<body>
<main>
  <h1>Airchase — Prompts de génération d’images</h1>
  <p class="style"><strong>Style global commun :</strong> {GLOBAL_STYLE}.</p>
  <p><strong>Fond :</strong> chaque sprite est généré <strong>uniquement sur un fond vert uni <code>#00FF00</code></strong>,
     sans étoiles ni décor, et sans aucun vert dans le sujet. Seul <code>background_space</code> est un ciel plein cadre.</p>
  <p><strong>Procédure :</strong> générez chaque image avec son prompt, enregistrez-la sous
     <code>assets/jpeg/&lt;nom&gt;.jpeg</code>, puis lancez <code>python3 tools/import_jpeg_assets.py</code> :
     le vert est détouré et l’image est réduite aux dimensions exactes dans <code>assets/png/</code>
     (les PNG sont les assets définitifs du jeu).</p>
  <div class="grid">{"".join(sections)}
  </div>
</main>
<script>
  document.querySelectorAll('[data-copy]').forEach(function (btn) {{
    btn.addEventListener('click', function () {{
      var text = btn.previousElementSibling.textContent;
      navigator.clipboard.writeText(text).then(function () {{
        btn.textContent = 'Copié !';
        setTimeout(function () {{ btn.textContent = 'Copier le prompt'; }}, 1200);
      }});
    }});
  }});
</script>
</body>
</html>
"""
    (ROOT / "image-prompts.html").write_text(page, encoding="utf-8")


def main():
    force = "--force" in sys.argv[1:]
    PNG_DIR.mkdir(parents=True, exist_ok=True)
    JPEG_DIR.mkdir(parents=True, exist_ok=True)
    written = 0
    for name, size, make, _ in ASSETS:
        png_path = PNG_DIR / f"{name}.png"
        jpeg_path = JPEG_DIR / f"{name}.jpeg"
        if not force and png_path.exists() and jpeg_path.exists():
            continue
        img = make(size)
        assert img.size == size, (name, img.size)
        if force or not png_path.exists():
            img.save(png_path)
            written += 1
        if force or not jpeg_path.exists():
            if name == "background_space":
                rgb = img.convert("RGB")
            else:
                rgb = Image.new("RGB", size, GREEN)
                rgb.paste(img, mask=img.split()[3])
            rgb.save(jpeg_path, "JPEG", quality=90, subsampling=0)
            written += 1
    write_prompts_page()
    print(f"{written} placeholder(s) écrit(s), image-prompts.html régénéré.")


if __name__ == "__main__":
    main()
