# Airchase — Cahier des charges et règles complètes

**Airchase** est un jeu HTML5 de type *fixed-screen space shooter*, inspiré fidèlement des règles du jeu **Assault** sur Atari 2600 (édité par Bomb, 1983). Le joueur contrôle un canon au bas de l’écran, détruit des aliens déployés par un vaisseau-mère indestructible, évite leurs projectiles et gère la surchauffe de son arme. Les règles ci-dessous reproduisent le comportement d’Assault : vaisseau-mère mobile et indestructible, dix aliens par vague, tirs verticaux et horizontaux, projectiles ennemis indestructibles sauf les fireballs horizontaux, surchauffe létale, score maximal de 999999 et bonus de canon tous les 10000 points. [2]

## Objectif du jeu

- Le joueur doit survivre et marquer un maximum de points.
- À chaque vague, appelée **page**, le vaisseau-mère dépose exactement **10 aliens**.
- Le joueur détruit les aliens pour passer à la page suivante.
- Le vaisseau-mère ne peut jamais être détruit.
- La partie se termine si tous les canons du joueur sont détruits ou si le score atteint **999999**. [2]

## Structure de l’écran

L’écran de jeu est fixe, sans défilement.

| Zone | Contenu |
|---|---|
| Haut de l’écran | Score sur 6 chiffres, format `000000` |
| Partie supérieure | Vaisseau-mère se déplaçant horizontalement |
| Zone centrale | Aliens, projectiles ennemis et tirs du joueur |
| Bas de l’écran | Canon du joueur, base et réserve de canons |
| Bas droite | Jauge de température / surchauffe |

Le score doit être affiché sur **6 chiffres**, avec zéros non significatifs : `000900`, par exemple. [2]

## Contrôles

### Sans bouton de tir maintenu

- **Gauche** : déplacer le canon vers la gauche.
- **Droite** : déplacer le canon vers la droite.
- **Haut** : tirer un missile verticalement vers le haut.
- **Bas** : aucune action obligatoire ; peut être ignorée ou réservée à l’interface.

### Avec bouton de tir maintenu

- **Haut ou aucune direction** : tirer verticalement vers le haut.
- **Gauche maintenu + bouton de tir** : tirer horizontalement vers la gauche.
- **Droite maintenu + bouton de tir** : tirer horizontalement vers la droite.

Le canon peut donc attaquer les aliens **verticalement ou horizontalement**, selon la position du joueur et la direction choisie. [2]

### Mapping HTML5 recommandé

| Action Atari | Contrôle HTML5 |
|---|---|
| Déplacement gauche | `ArrowLeft` ou `A` |
| Déplacement droite | `ArrowRight` ou `D` |
| Tir vertical | `ArrowUp`, `W` ou `Space` |
| Tir horizontal gauche | `ArrowLeft` ou `A` maintenu avec `Space` |
| Tir horizontal droite | `ArrowRight` ou `D` maintenu avec `Space` |
| Démarrer / recommencer | `Enter` ou clic/tap |

Sur mobile, prévoir une zone tactile gauche/droite pour se déplacer et un bouton de tir.

## Vaisseau-mère

- Le vaisseau-mère apparaît en haut de l’écran.
- Il se déplace horizontalement le long du haut de l’écran.
- Il est **indestructible** : les tirs du joueur ne lui causent aucun dégât et ne doivent pas le faire disparaître.
- Il dépose progressivement les aliens de la vague en cours.
- Il dépose un total de **10 aliens par page**.
- Il peut déposer les aliens par groupes ; une implémentation fidèle peut en faire apparaître jusqu’à **3 à la fois**. [2][9]

## Aliens

### Nombre et apparition

- Chaque page contient exactement **10 aliens**.
- Les aliens apparaissent depuis le vaisseau-mère ou dans la zone de jeu supérieure.
- La vague est terminée lorsque les 10 aliens ont été détruits.
- Le vaisseau-mère passe alors à la génération de la page suivante.

### Types d’aliens

Il existe notamment deux grandes catégories :

1. **Grand alien indestructible par fragmentation** : lorsqu’il est touché, il est simplement détruit.
2. **Grand alien fragmentable** : lorsqu’il est touché, il se divise en **deux petits aliens**.

Les petits aliens issus d’une fragmentation doivent être détruits individuellement pour terminer la page. [2]

### Comportements de déplacement

Les comportements varient selon la page :

- Déplacement horizontal avec changements de direction soudains.
- Déplacement vertical et horizontal avec changements de direction soudains.
- Apparition soudaine à des positions aléatoires pendant une durée courte.

Les aliens et leurs armes doivent avoir des vitesses et des trajectoires différentes selon les pages. [2]

### Armes des aliens

L’alien situé le plus bas à l’écran peut tirer. Selon la page, ses attaques peuvent être :

- Un missile unique.
- Un groupe de missiles.
- Un laser.
- Des fireballs.

Les projectiles ennemis ne peuvent **pas** être détruits par les tirs du joueur, **sauf les fireballs se déplaçant horizontalement**. [2]

## Projectiles ennemis

- Les missiles, lasers et groupes de missiles traversent l’écran sans pouvoir être détruits.
- Les tirs du joueur ne les neutralisent pas.
- Si un projectile ennemi atteint le canon ou la base, le canon est détruit.
- Les fireballs qui atteignent la base se déplacent ensuite horizontalement pour attaquer le canon.
- Ces fireballs horizontaux sont les seuls projectiles ennemis que le joueur peut détruire. [2]

## Canon du joueur

- Le canon se déplace uniquement horizontalement au bas de l’écran.
- Il peut tirer vers le haut, vers la gauche ou vers la droite.
- Il est détruit s’il entre en collision avec une arme ennemie.
- Il est également détruit en cas de **surchauffe**, indiquée par la jauge de température.
- À chaque destruction, le joueur perd un canon de sa réserve.
- Lorsque tous les canons sont perdus, la partie est terminée. [2]

## Surchauffe

- Chaque tir augmente la température du canon.
- La température est affichée par une jauge, appelée `TEMP` dans le jeu original.
- Si la jauge atteint son maximum, le canon est détruit.
- Ne pas tirer permet au canon de refroidir.
- Le joueur doit donc alterner tirs et pauses pour éviter la surchauffe. [2]

### Règle d’équilibrage recommandée

| Paramètre | Valeur initiale |
|---|---|
| Chaleur par tir | 8 % |
| Refroidissement passif | 1,5 % par frame à 60 FPS, soit environ 90 % par seconde |
| Seuil de surchauffe | 100 % |
| Conséquence | Perte d’un canon |

Ces valeurs sont des paramètres d’implémentation ajustables, mais la règle essentielle doit rester : tirer continuellement provoque la destruction du canon.

## Vies et bonus

- Le joueur commence avec un nombre de canons défini, idéalement **3**.
- Un canon bonus est accordé tous les **10000 points**.
- Le nombre maximal de chances supplémentaires est de **4**.
- La réserve de canons doit donc être plafonnée à **4 chances bonus** au-delà du stock initial. [2]

### Exemple d’implémentation

- Score initial : `0`
- Canons initiaux : `3`
- Premier bonus : à `10000`
- Deuxième bonus : à `20000`
- Troisième bonus : à `30000`
- Quatrième bonus : à `40000`
- Aucun canon bonus au-delà du quatrième.

## Score

- Chaque alien détruit rapporte des points.
- Les petits aliens issus d’une fragmentation peuvent rapporter des points.
- La destruction d’un fireball horizontal peut rapporter des points.
- Le score est affiché sur 6 chiffres.
- Le score maximal est **999999**.
- Atteindre `999999` met fin à la partie. [2]

### Barème recommandé

| Cible | Points |
|---|---:|
| Grand alien non fragmentable | 100 |
| Grand alien fragmentable | 100 |
| Petit alien issu d’une fragmentation | 50 |
| Fireball horizontal détruit | 50 |
| Fin de page | 0, la progression seule constitue la récompense |

## Progression des pages

Une page est terminée lorsque ses 10 aliens ont été détruits.

À chaque nouvelle page :

- Le vaisseau-mère continue de se déplacer.
- De nouveaux aliens sont générés, jusqu’à 10 par page.
- Les schémas de déplacement changent.
- Les types d’armes ennemies changent.
- Les vitesses des aliens et de leurs projectiles augmentent ou varient.
- Le jeu devient progressivement plus difficile. [2]

### Séquence de difficulté recommandée

| Page | Comportement des aliens | Armes ennemies |
|---:|---|---|
| 1 | Horizontal lent avec changements de direction | Missile unique |
| 2 | Horizontal plus rapide | Groupes de missiles |
| 3 | Vertical + horizontal | Missile unique et groupes |
| 4 | Apparitions aléatoires courtes | Laser |
| 5 | Mélange des comportements précédents | Fireballs |
| 6+ | Cycle des comportements avec vitesse accrue | Toutes les armes, en alternance |

## Conditions de fin

La partie se termine dans l’un des cas suivants :

- Tous les canons du joueur sont détruits.
- Le score atteint `999999`. [2]

À la fin de partie, afficher :

- Le score final sur 6 chiffres.
- Le meilleur score local, via `localStorage`.
- Un bouton ou une touche pour recommencer.

## Règle de refroidissement stratégique

Le manuel original conseille explicitement d’éviter les tirs inutiles afin de laisser refroidir le canon. Avant de détruire le dernier alien d’une page, le joueur peut attendre que la température baisse afin d’aborder la page suivante avec un canon froid. [2]

Cette règle doit être conservée dans Airchase : la gestion de la chaleur fait partie intégrante du gameplay.

## Instructions complètes pour l’outil IA développeur

Tu dois développer **Airchase**, un jeu HTML5 solo, en un seul projet web autonome, fidèle aux règles d’Assault sur Atari 2600 décrites dans ce document.

### Contraintes techniques

- Langages : HTML5, CSS3 et JavaScript vanilla, sans framework obligatoire.
- Rendu : `<canvas>` en 2D.
- Résolution logique recommandée : `320 x 240` pixels, mise à l’échelle avec `image-rendering: pixelated`.
- Boucle de jeu : `requestAnimationFrame`, avec delta-time.
- États de jeu : `TITLE`, `PLAYING`, `GAME_OVER`.
- Sauvegarde du meilleur score dans `localStorage` sous la clé `airchase_high_score`.
- Aucune dépendance externe obligatoire.
- Le jeu doit fonctionner hors ligne après chargement des assets.
- Le code doit être modulaire : `input`, `player`, `mothership`, `aliens`, `bullets`, `enemyProjectiles`, `collision`, `score`, `ui`, `assets`.

### Architecture des fichiers

```text
airchase/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── game.js
│   ├── input.js
│   ├── player.js
│   ├── mothership.js
│   ├── aliens.js
│   ├── projectiles.js
│   ├── collisions.js
│   ├── score.js
│   ├── ui.js
│   └── assets.js
└── assets/
    ├── png/
    └── jpeg/
```

### Boucle de jeu

À chaque frame :

1. Lire les entrées clavier et tactiles.
2. Mettre à jour le canon du joueur.
3. Mettre à jour le vaisseau-mère.
4. Générer les aliens jusqu’à atteindre 10 par page.
5. Mettre à jour les aliens et leurs trajectoires.
6. Faire tirer l’alien le plus bas selon la page.
7. Mettre à jour les tirs du joueur.
8. Mettre à jour les projectiles ennemis.
9. Gérer les collisions.
10. Mettre à jour la chaleur du canon.
11. Mettre à jour le score, les bonus et l’état de partie.
12. Dessiner la scène.

### Gestion des collisions

Implémenter ces collisions :

- Tir joueur contre alien.
- Tir joueur contre fireball horizontal.
- Projectile ennemi contre canon.
- Projectile ennemi contre base.
- Fireball contre base.
- Fireball horizontal contre canon.
- Alien contre canon, si l’alien atteint la zone du canon.

Une collision projectile ennemi contre canon détruit le canon. Une surchauffe complète détruit également le canon. [2]

### Comportement du vaisseau-mère

- Position initiale : haut de l’écran.
- Mouvement : horizontal, avec rebond sur les bords gauche et droit.
- Invulnérable : ignorer toute collision avec les tirs du joueur.
- Génération : déposer 10 aliens par page.
- Cadence recommandée : un dépôt toutes les 1 à 2 secondes, par groupes de 1 à 3 aliens.

### Comportement des aliens

Implémenter trois comportements :

1. **Horizontal** : l’alien avance horizontalement et inverse brutalement sa direction aux bords ou à intervalles aléatoires.
2. **Vertical + horizontal** : l’alien combine un déplacement latéral et un déplacement vertical, avec inversions soudaines.
3. **Apparition aléatoire** : l’alien apparaît brièvement à une position aléatoire, disparaît, puis réapparaît ailleurs.

Le comportement doit dépendre de la page en cours.

### Fragmentation

- Certains grands aliens, en étant touchés, se divisent en deux petits aliens.
- Les deux petits aliens doivent apparaître à proximité du point d’impact.
- Ils doivent avoir une trajectoire propre.
- La page n’est terminée que lorsque le grand alien et ses deux petits aliens sont détruits.

### Système de tir du joueur

- Le tir vertical part du canon vers le haut.
- Le tir horizontal gauche part du canon vers la gauche.
- Le tir horizontal droit part du canon vers la droite.
- Limiter la cadence pour permettre la surchauffe.
- Chaque tir augmente la chaleur.
- Sans tir, la chaleur diminue progressivement.
- À 100 % de chaleur, détruire le canon.

### Projectiles ennemis

- Les missiles tombent vers le bas ou sont dirigés vers le canon.
- Les groupes de missiles contiennent plusieurs projectiles espacés.
- Le laser est un rayon vertical ou oblique de courte ou moyenne durée.
- Les fireballs descendent vers la base.
- Une fois la base atteinte, un fireball se déplace horizontalement vers le canon.
- Les fireballs horizontaux peuvent être détruits par les tirs du joueur.
- Tous les autres projectiles ennemis sont invulnérables. [2]

### UI minimale

Afficher :

- Score sur 6 chiffres en haut.
- Nombre de canons restants en bas à gauche.
- Jauge `TEMP` en bas à droite.
- Numéro de page, optionnel mais recommandé.
- Écran titre avec le nom `AIRCHASE`.
- Écran de game over avec score final et meilleur score.

## Génération des placeholders PNG

Créer d’abord des images placeholder au format **PNG**, dans `assets/png/`. Elles doivent être simples, lisibles et adaptées à un rendu pixel art.

### Liste des PNG à générer

| Fichier | Dimensions | Fond | Description |
|---|---:|---|---|
| `player_cannon.png` | 16 x 16 | Transparent | Canon du joueur, style vaisseau ou tourelle |
| `player_bullet_vertical.png` | 4 x 8 | Transparent | Missile vertical du joueur |
| `player_bullet_left.png` | 8 x 4 | Transparent | Missile horizontal vers la gauche |
| `player_bullet_right.png` | 8 x 4 | Transparent | Missile horizontal vers la droite |
| `mothership.png` | 64 x 24 | Transparent | Grand vaisseau-mère alien |
| `alien_large_solid.png` | 16 x 16 | Transparent | Grand alien non fragmentable |
| `alien_large_splitter.png` | 16 x 16 | Transparent | Grand alien qui se divise en deux |
| `alien_small.png` | 8 x 8 | Transparent | Petit alien issu d’une fragmentation |
| `enemy_missile.png` | 4 x 8 | Transparent | Missile ennemi |
| `enemy_missile_group.png` | 12 x 8 | Transparent | Groupe de missiles ennemis |
| `enemy_laser.png` | 4 x 32 | Transparent | Laser ennemi |
| `enemy_fireball.png` | 8 x 8 | Transparent | Fireball ennemi |
| `enemy_fireball_horizontal.png` | 8 x 8 | Transparent | Fireball se déplaçant horizontalement |
| `base.png` | 64 x 16 | Transparent | Base protectrice ou plateforme du canon |
| `temperature_bar.png` | 48 x 8 | Transparent | Cadre de la jauge de température |
| `temperature_fill.png` | 48 x 8 | Transparent | Remplissage de la jauge de température |
| `background_space.png` | 320 x 240 | Noir ou bleu très sombre | Fond spatial avec étoiles |
| `title_logo.png` | 256 x 64 | Transparent | Logo du titre `AIRCHASE` |
| `game_over_text.png` | 192 x 32 | Transparent | Texte `GAME OVER` |

### Règles visuelles des PNG

- Format exact : `.png`.
- Transparence obligatoire pour tous les sprites, sauf le fond spatial.
- Palette limitée, style Atari 2600 / pixel art.
- Aucun texte dans les sprites de gameplay, sauf `AIRCHASE` et `GAME OVER`.
- Les sprites doivent être centrés dans leur canvas.
- Ne pas utiliser d’anticrénelage important : privilégier des pixels nets.

## Génération des fichiers JPEG

Après validation des PNG, générer des versions **JPEG** dans `assets/jpeg/`. Le format doit être `.jpeg`, et non `.jpg`.

### Liste des JPEG à générer

| Fichier source PNG | Fichier JPEG généré | Dimensions | Fond requis |
|---|---|---:|---|
| `player_cannon.png` | `player_cannon.jpeg` | 16 x 16 | Vert |
| `player_bullet_vertical.png` | `player_bullet_vertical.jpeg` | 4 x 8 | Vert |
| `player_bullet_left.png` | `player_bullet_left.jpeg` | 8 x 4 | Vert |
| `player_bullet_right.png` | `player_bullet_right.jpeg` | 8 x 4 | Vert |
| `mothership.png` | `mothership.jpeg` | 64 x 24 | Vert |
| `alien_large_solid.png` | `alien_large_solid.jpeg` | 16 x 16 | Vert |
| `alien_large_splitter.png` | `alien_large_splitter.jpeg` | 16 x 16 | Vert |
| `alien_small.png` | `alien_small.jpeg` | 8 x 8 | Vert |
| `enemy_missile.png` | `enemy_missile.jpeg` | 4 x 8 | Vert |
| `enemy_missile_group.png` | `enemy_missile_group.jpeg` | 12 x 8 | Vert |
| `enemy_laser.png` | `enemy_laser.jpeg` | 4 x 32 | Vert |
| `enemy_fireball.png` | `enemy_fireball.jpeg` | 8 x 8 | Vert |
| `enemy_fireball_horizontal.png` | `enemy_fireball_horizontal.jpeg` | 8 x 8 | Vert |
| `base.png` | `base.jpeg` | 64 x 16 | Vert |
| `temperature_bar.png` | `temperature_bar.jpeg` | 48 x 8 | Vert |
| `temperature_fill.png` | `temperature_fill.jpeg` | 48 x 8 | Vert |
| `background_space.png` | `background_space.jpeg` | 320 x 240 | Fond original conservé |
| `title_logo.png` | `title_logo.jpeg` | 256 x 64 | Vert |
| `game_over_text.png` | `game_over_text.jpeg` | 192 x 32 | Vert |

### Règles des JPEG

- Extension obligatoire : `.jpeg`.
- Qualité recommandée : 90 %.
- Fond vert obligatoire pour tous les sprites destinés à la découpe ou à la composition, sauf `background_space.jpeg`.
- Le vert doit être uniforme : `#00FF00`.
- Ne pas compresser avec un fond transparent : le JPEG ne gère pas la transparence.
- Conserver les PNG comme assets de jeu définitifs.
- Les JPEG servent principalement aux prompts visuels, à la génération d’images et aux tests de découpe.

## Fichier HTML des prompts d’images

Créer un fichier `image-prompts.html` contenant les prompts textuels de **toutes** les images à générer.

Le fichier doit contenir :

- Un titre : `Airchase — Prompts de génération d’images`.
- Une section par image.
- Le nom du fichier PNG attendu.
- Le nom du fichier JPEG attendu.
- Les dimensions exactes.
- L’indication du fond : transparent pour le PNG, vert `#00FF00` pour le JPEG, sauf le fond spatial.
- Le prompt textuel complet à copier dans un générateur d’images.
- Un style global commun : `pixel art rétro Atari 2600, palette limitée, contours nets, sprite centré, fond uni, haute lisibilité, sans texte sauf indication contraire`.

### Prompts à inclure

#### `player_cannon`

```text
Pixel art rétro Atari 2600 d’un canon spatial du joueur, vue de face, petite tourelle blanche et cyan avec base sombre, style 8-bit, sprite centré, contours nets, palette limitée, haute lisibilité, sans texte.
```

#### `player_bullet_vertical`

```text
Pixel art rétro Atari 2600 d’un petit missile vertical blanc et jaune, orienté vers le haut, style 8-bit, sprite centré, contours nets, palette limitée, sans texte.
```

#### `player_bullet_left`

```text
Pixel art rétro Atari 2600 d’un petit missile horizontal blanc et jaune, orienté vers la gauche, style 8-bit, sprite centré, contours nets, palette limitée, sans texte.
```

#### `player_bullet_right`

```text
Pixel art rétro Atari 2600 d’un petit missile horizontal blanc et jaune, orienté vers la droite, style 8-bit, sprite centré, contours nets, palette limitée, sans texte.
```

#### `mothership`

```text
Pixel art rétro Atari 2600 d’un immense vaisseau-mère alien, silhouette large et menaçante, coque grise, violette et rouge, détails lumineux cyan, style 8-bit, vue de face, sprite centré, contours nets, palette limitée, sans texte.
```

#### `alien_large_solid`

```text
Pixel art rétro Atari 2600 d’un grand alien hostile non fragmentable, forme insectoïde symétrique, couleurs magenta, orange et blanc, yeux lumineux, style 8-bit, sprite centré, contours nets, palette limitée, sans texte.
```

#### `alien_large_splitter`

```text
Pixel art rétro Atari 2600 d’un grand alien hostile capable de se diviser, forme organique symétrique avec une fissure centrale lumineuse, couleurs vert acide, violet et blanc, style 8-bit, sprite centré, contours nets, palette limitée, sans texte.
```

#### `alien_small`

```text
Pixel art rétro Atari 2600 d’un petit alien rapide issu d’une fragmentation, forme compacte et agressive, couleurs cyan, rouge et blanc, style 8-bit, sprite centré, contours nets, palette limitée, sans texte.
```

#### `enemy_missile`

```text
Pixel art rétro Atari 2600 d’un missile ennemi vertical, ogive rouge, corps gris et traînée jaune, orienté vers le bas, style 8-bit, sprite centré, contours nets, palette limitée, sans texte.
```

#### `enemy_missile_group`

```text
Pixel art rétro Atari 2600 d’un groupe compact de trois petits missiles ennemis rouges et jaunes, orientés vers le bas, style 8-bit, sprite centré, contours nets, palette limitée, sans texte.
```

#### `enemy_laser`

```text
Pixel art rétro Atari 2600 d’un rayon laser ennemi vertical, faisceau fin rouge et magenta avec cœur blanc, style 8-bit, sprite vertical centré, contours nets, palette limitée, sans texte.
```

#### `enemy_fireball`

```text
Pixel art rétro Atari 2600 d’une boule de feu alien, sphère orange et rouge avec cœur jaune lumineux, traînée courte vers le bas, style 8-bit, sprite centré, contours nets, palette limitée, sans texte.
```

#### `enemy_fireball_horizontal`

```text
Pixel art rétro Atari 2600 d’une boule de feu alien se déplaçant horizontalement, sphère orange et rouge avec cœur jaune, traînée horizontale vers la gauche, style 8-bit, sprite centré, contours nets, palette limitée, sans texte.
```

#### `base`

```text
Pixel art rétro Atari 2600 d’une base défensive futuriste au sol, plateforme métallique grise et bleue avec lumières cyan, style 8-bit, sprite horizontal centré, contours nets, palette limitée, sans texte.
```

#### `temperature_bar`

```text
Pixel art rétro Atari 2600 d’un cadre de jauge de température horizontal, bordure blanche et grise, intérieur vide noir, style 8-bit, sprite centré, contours nets, palette limitée, sans texte.
```

#### `temperature_fill`

```text
Pixel art rétro Atari 2600 d’un remplissage de jauge de température horizontal, dégradé discret du vert au jaune puis au rouge, style 8-bit, sprite centré, contours nets, palette limitée, sans texte.
```

#### `background_space`

```text
Pixel art rétro Atari 2600 d’un fond spatial fixe, ciel noir profond avec quelques étoiles blanches et bleues discrètes, très sombre pour laisser lire les sprites, style 8-bit, sans vaisseau, sans alien, sans texte.
```

#### `title_logo`

```text
Pixel art rétro Atari 2600 du titre AIRCHASE en grandes lettres arcade blanches, cyan et rouges, style 8-bit, composition horizontale centrée, contours nets, palette limitée, texte exact : AIRCHASE.
```

#### `game_over_text`

```text
Pixel art rétro Atari 2600 du texte GAME OVER en grandes lettres arcade rouges et blanches, style 8-bit, composition horizontale centrée, contours nets, palette limitée, texte exact : GAME OVER.
```

## Checklist de conformité

L’outil IA développeur doit valider les points suivants avant de considérer Airchase comme conforme :

- [ ] Le vaisseau-mère est indestructible.
- [ ] Le vaisseau-mère génère exactement 10 aliens par page.
- [ ] Les aliens utilisent les trois comportements décrits.
- [ ] Certains grands aliens se divisent en deux petits aliens.
- [ ] Le joueur tire verticalement, à gauche et à droite.
- [ ] Les projectiles ennemis sont indestructibles, sauf les fireballs horizontaux.
- [ ] Les fireballs atteignant la base attaquent ensuite le canon horizontalement.
- [ ] La surchauffe détruit le canon.
- [ ] Un projectile ennemi qui touche le canon le détruit.
- [ ] Un canon bonus est accordé tous les 10000 points, avec un maximum de 4 bonus.
- [ ] Le score est affiché sur 6 chiffres.
- [ ] La partie se termine à `999999` ou lorsque tous les canons sont perdus.
- [ ] Les placeholders PNG sont générés dans `assets/png/`.
- [ ] Les fichiers JPEG sont générés dans `assets/jpeg/` avec l’extension `.jpeg`.
- [ ] Les JPEG de sprites ont un fond vert `#00FF00`.
- [ ] Le fichier `image-prompts.html` contient les prompts de toutes les images.
