# Airchase — Règles de gameplay originales

Ce document **remplace la partie gameplay de `rules.md`**. Le cadre technique, l'architecture des fichiers, l'interface minimale et la production des assets (PNG, JPEG, `image-prompts.html`) restent ceux de `rules.md`.

Les contrôles diffèrent de `rules.md` : **pas de tir latéral**, le canon tire uniquement vers le haut. Les sprites `player_bullet_left` et `player_bullet_right` restent générés pour respecter la liste d'assets, mais le jeu ne les utilise pas.

| Action | Clavier | Tactile |
|---|---|---|
| Déplacer le canon | `ArrowLeft` / `A`, `ArrowRight` / `D` | ◀ ▶ (colonne de gauche ; on peut glisser de l'un à l'autre) |
| Tirer vers le haut (on peut tirer en se déplaçant) | `Space`, `ArrowUp`, `W` | FEU (gros bouton rond, colonne de droite) |
| Démarrer / recommencer | `Enter`, clic ou tap | tap |

Airchase est un shooter à écran fixe. Le joueur pilote un canon au sol face à **la Ruche**, un vaisseau-mère qui largue des vagues d'aliens par ses trappes.

## Langue du jeu

Tout le texte affiché en jeu est **en anglais**. Ce document reste en français ; voici la correspondance des termes :

| Terme du document | Texte en jeu |
|---|---|
| Ruche / Assaut de la Ruche | HIVE / HIVE ASSAULT |
| Secteur / Secteur nettoyé / Secteur atteint | SECTOR / SECTOR CLEARED / SECTOR REACHED |
| Brèche | BREACH! |
| Surrégime | OVERDRIVE ×2 |
| Verrou | LOCKED |
| Sang-froid | COOL HEAD |
| Canon bonus | EXTRA CANNON |
| Capsules Cryo / Bouclier / Surcharge | CRYO / SHIELD / HEATSINK |
| Meilleur score / Nouveau record | BEST / NEW HIGH SCORE! |
| Bouton tactile FEU | FIRE |

## Principes propres à Airchase

| Mécanique | Règle Airchase |
|---|---|
| Vaisseau-mère | La coque est invulnérable, mais ses **3 trappes** sont vulnérables quand elles s'ouvrent pour larguer un alien. |
| Brèche | Détruire les 3 trappes provoque une **Brèche** : tous les aliens présents explosent, le secteur est gagné et le joueur touche un gros bonus. |
| Vagues | Les vagues sont des **secteurs** de taille croissante : 6 + 2 × secteur aliens, plafonné à 18. |
| Chaleur | De 70 à 99 % on est en **Surrégime** : les tirs traversent les cibles et les points sont doublés. À 100 % le canon se **verrouille** 2,4 s (pas de tir, déplacement ralenti) **sans perdre de vie**. |
| Tirs ennemis | Chaque alien tire selon son **propre type**, et non selon la page. Plasma et Comètes sont destructibles, tous les autres tirs sont invulnérables. |
| Score | Une **chaîne** de destructions rapprochées (moins de 1,2 s entre deux) monte le multiplicateur de ×1 à ×4. |
| Vies | 3 canons au départ. Un canon bonus à 25 000, 75 000 et 150 000 points, puis tous les 100 000. Le joueur garde au maximum 6 canons. |
| Score maximal | Le compteur bloque à 999999, mais la partie **continue**. |
| Fin de partie | La partie se termine uniquement quand le dernier canon est détruit. |

## Le canon

- Il se déplace au sol et tire uniquement vers le haut, y compris en se déplaçant. Le tir reste en automatique tant que la touche est maintenue.
- Chaque tir ajoute 7 % de chaleur. La chaleur redescend de 38 %/s après 0,35 s sans tirer.
- **Surrégime (70–99 %)** : tirs perforants et points ×2. Le canon rougeoie.
- **Verrou (100 %)** : impossible de tirer pendant 2,4 s, le canon se déplace à 60 % de sa vitesse et la jauge se vide.
- Le canon est détruit par un projectile ennemi, un contact avec un alien ou l'explosion d'un kamikaze.
- Après une destruction, un nouveau canon apparaît au centre avec 2 s d'invulnérabilité. Les tirs ennemis à l'écran sont effacés.

## La Ruche (vaisseau-mère)

- Elle se déplace horizontalement, rebondit sur les bords et change parfois brusquement de sens.
- Chaque largage ouvre une trappe pendant 1,2 s. Un tir sur une trappe ouverte lui retire 1 PV. Un tir sur la coque ou sur une trappe fermée est absorbé.
- Une trappe a 3 PV, plus 1 PV tous les 5 secteurs. Une trappe détruite rapporte 500 points et lâche une **capsule**.
- Les trappes détruites sont réparées au secteur suivant.
- **Assaut de la Ruche** (tous les 5 secteurs) : la Ruche descend plus bas et tire elle-même des salves par ses trappes.

## Les aliens

| Alien | Apparition | PV | Points | Déplacement | Arme |
|---|---|---:|---:|---|---|
| Drone | secteur 1 | 1 | 100 | Patrouille horizontale avec demi-tours soudains, descend par paliers puis remonte en haut | Plasma |
| Prisme | secteur 2 | 1 | 150 | Trajectoire ondulante | Salve |
| Éclat | issu d'un Prisme | 1 | 50 | Rebondit dans la zone de jeu et dérive vers le canon | Dard |
| Blindé | secteur 3 | 2 | 250 | Patrouille lente en haut d'écran | Rayon |
| Saboteur | secteur 4 | 1 | 200 | Se téléporte à basse altitude, reste visible 1,6 s puis disparaît | Comète |
| Kamikaze | secteur 6 | 1 | 150 | Plane puis plonge sur le canon et explose au sol (rayon 14 px) | — |

- Un **Prisme** touché se scinde en 2 **Éclats**. Le secteur n'est terminé que lorsque tous les aliens, Éclats compris, sont détruits.
- Le Saboteur n'est vulnérable que lorsqu'il est visible. Il faut se placer sous lui pendant sa courte apparition.

## Les projectiles ennemis

| Projectile | Tiré par | Destructible | Points | Comportement |
|---|---|---|---:|---|
| Plasma | Drone | oui | 10 | Chute lente et ondulante |
| Dard | Éclat, Ruche | non | — | Rapide, légèrement orienté vers le canon |
| Salve | Prisme, Ruche | non | — | Paquet de 3 missiles, chute moyenne |
| Rayon | Blindé | non | — | Ligne d'alerte de 0,7 s, puis faisceau vertical de 0,45 s |
| Comète | Saboteur | oui | 30 | Fonce en diagonale vers la position du canon |

Le nombre de tirs ennemis simultanés est plafonné à 3 + secteur / 2, avec un maximum de 8.

## Capsules (lâchées par les trappes détruites)

| Capsule | Effet |
|---|---|
| **C** — CRYO | Chaleur remise à 0 et verrou annulé |
| **S** — SHIELD | Absorbe le prochain coup |
| **H** — HEATSINK | Les tirs ne chauffent plus pendant 6 s |

Une capsule tombe, se pose au sol et disparaît au bout de 4 s.

## Secteurs

- Chaque secteur commence par 1,6 s d'annonce, sans largage.
- Aliens présents en même temps : au plus 4 + secteur / 2, plafonné à 9. Intervalle de largage : 1,7 − 0,08 × secteur secondes, avec un minimum de 0,55 s.
- Les vitesses de déplacement augmentent de 7 % par secteur, jusqu'à ×2. Les cadences de tir augmentent de 6 % par secteur.
- Le premier secteur où un type d'alien apparaît commence par cet alien.
- **Bonus Sang-froid** : si le canon finit le secteur avec moins de 20 % de chaleur, le joueur gagne 300 × secteur points.
- **Bonus Brèche** : 1000 × secteur points, en plus des points de chaque alien détruit par la Brèche.

## Barème

| Cible | Points |
|---|---:|
| Drone / Prisme / Éclat / Blindé / Saboteur / Kamikaze | 100 / 150 / 50 / 250 / 200 / 150 |
| Plasma / Comète détruits | 10 / 30 |
| Trappe détruite | 500 |
| Brèche | 1000 × secteur |
| Sang-froid | 300 × secteur |

Les points d'un alien sont multipliés par la chaîne (×1 à ×4), puis par 2 en Surrégime.

## Écrans et touches additionnelles

- `P` ou `Échap` : pause. La partie se met aussi en pause automatiquement quand la fenêtre perd le focus.
- `M` : coupe ou rétablit le son.
- Bruitages **style Atari 2600** : émulation simplifiée de la puce TIA (2 voix avec priorités, diviseur de fréquence 5 bits, volume 4 bits, modes carré / poly4 / poly5 / bruit poly9 / bourdon div31). Chaque son est un programme de registres modifié à chaque frame (60 Hz). Voix 0 : canon et jingles ; voix 1 : ennemis et explosions.
- Le game over affiche le score, le meilleur score (`localStorage`, clé `airchase_high_score`) et le secteur atteint.
