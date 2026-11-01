# AGENTS.md — Guide pour LLM / agents travaillant sur Mojo System

Compagnon de JDR (PWA hors-ligne) pour deux univers maison : **Illirea** et **Teotl**.
Auteur : Nubiah (JeeBay). Langue du projet : **français** (code, commentaires, commits, UI).

## Stack

- React 18 · Vite 6 · Tailwind CSS 4 · lucide-react
- Données 100 % `localStorage` (clé `mojo-system-v1`), export/import JSON unique (version 3)
- Déploiement : GitHub Pages via `.github/workflows/deploy.yml` (push sur `main`)

## Commandes

```bash
npm install        # une fois après un clone frais
npm run dev        # serveur de dev
npm run build      # build de production dans dist/ — VÉRIFICATION OBLIGATOIRE avant de finir
npm run preview    # prévisualiser dist/ (port 4173)
```

Le lint (`npm run lint`) est permissif ; la vraie vérification est `npm run build`.

## Structure

```
src/
  data/            # Logique pure, SANS UI — le cœur du projet
    universes.js   #   définition des 2 univers + sections
    illirea.js     #   fiche monstre Illirea (caracs FOR/AGI/CON/VOL/INT/CHA, défenses bas/moyen/haut)
    teotl.js       #   fiche ennemi Teotl (armure, taille, passifs, compétences, actions bonus, tags Elite/Légendaire)
    dice.js        #   parser d'expressions de dés (2d6+1), jets Illirea (succès sur 4/5/6), dés explosifs Teotl (rollExploding)
    loot.js        #   tables de butin (chance %, quantité en dés) + tirage
    combat.js      #   rencontres, suivi de combat, DoT (applyRoundEffects), numérotation des doublons (renumberDuplicates), bibliothèque de statuts (createDotPreset/normalizeDotPreset), normalize* de tout
  hooks/
    useMojoStore.js  # store localStorage + export/import + undo global (undo/canUndo)
  components/
    illirea/       # UI Illirea (mirroir de teotl/, mais règles différentes)
    teotl/         # UI Teotl
    shared/        # composants partagés aux deux univers : ParticipantHp, QuickAddForm, StatusForm, CombatLog, inputCls
    icons.jsx      # DragonIcon (Illirea), MayaTempleIcon (Teotl)
```

## Règles du modèle de données (NE PAS CASSER)

1. **Lien bestiaire** : `monsterId` (participants Illirea) vs `enemyId` (participants Teotl). `null` = participant « à la volée » (obstacle, PNJ éphémère) : légitime, prévu par les `normalize*`, persiste sans migration. Ne JAMAIS écrire un participant ad-hoc dans le bestiaire.
2. **Les `normalize*` de `src/data/` sont défensifs** (import de vieux JSON, champs partiels). Toute nouvelle donnée de participant/fiche doit passer par la création par défaut + le normalize correspondant, sinon l'import JSON la perd silencieusement.
3. Historique de dégâts par participant : `degatsDernier` (string affichable, ex `2d6 → 7`) et `degatsRound` (cumul du round, remis à zéro par `applyRoundEffects`). Les deux sont normalisés dans `normalizeCombat` / `normalizeIllireaCombat`.
4. Undo : `useMojoStore` remplace `setStore` par une version historisée (30 états). Toute mutation du store doit passer par ce `setStore` pour rester annulable — n'appelle jamais `localStorage.setItem` directement pour des données du store.
5. **Bibliothèque de statuts** : `universes.<u>.dotPresets` (champs `{ id, nom, degats, duree, critique, cumulable }`), merge défensif existant suffit. Un statut appliqué en combat embarque `critique`/`cumulable` (normalisés à `false` si absents).
6. **Numérotation des doublons** : `renumberDuplicates` est appelé dans `makeCombat` et à chaque ajout en combat ; la numérotation est persistée dans `participant.nom` (pas recalculée au rendu) pour garder logs et statuts cohérents.

## Conventions établies

- **Deux univers, symétrie obligatoire** : toute feature combat/bestiaire s'implémente dans les deux, en respectant les différences (`monsterId`/`enemyId`, `snapshot` Teotl vs champs directs Illirea, « est mort » vs « est détruit » pour un obstacle).
- **Composants partagés** (`src/components/shared/`) : les utiliser, ne pas dupliquer. Un bloc identique dans les deux univers doit y vivre.
- **Dés** : tout champ de valeur passe par `rollDiceExpression` (accepte `3`, `2d6`, `1d8+2` ; valeur négative = soin). Teotl utilise `rollExploding` pour les attaques.
- **DoT critique, cloisonné à Teotl** : `applyRoundEffects(participants, rng, dotMode)` — `dotMode='teotl'` lance les DoT critiques via `rollExploding(…, { noFail: true })` (un DoT n'échoue JAMAIS : 1 = 1, max du dé = explosion) ; `dotMode='plain'` (Illirea) = jet simple, les dégâts valent le dé. La case « Peut critiquer » est masquée côté Illirea (`StatusForm` prop `showCrit={false}`).
- **Statut non cumulable** : si le même statut existe déjà sur la cible et que `cumulable` est faux, l'ajout est refusé avec entrée de journal (jamais silencieux).
- **UI combat** : les deux vues rendent `[...alive, ...dead]` (morts toujours en bas) ; dernier jet Teotl = toast `fixed bottom-4` fermable ; grille Teotl `md:2 / lg:3 / 2xl:4`.
- **Journal** : tout événement de combat passe par `pushLog` (jamais de mutation silencieuse).
- **Tooltips de capacités** : CSS pur via `group-hover/cap`, pas de `title=` natif.
- Vocabulaire UI français soigné (accents, typographie `’`).

## Piège connu

- Dans `IllireaCombatView.jsx`, la logique de dégâts vit dans le **parent** (`applyDamageTo`) car `combat` n'est pas dans la portée de `ParticipantCard`. Ne pas la redescendre sans passer `combat` en prop.

## Workflow pour une feature

1. Lire la vue concernée en ENTIER (fichiers de 200–500 lignes, tout le JSX est dedans).
2. Vérifier le `normalize*` correspondant dans `src/data/` AVANT d'inventer une structure de données.
3. Implémenter dans les deux univers (ou dans `shared/` si identique).
4. `npm run build` doit passer.
5. Commit en Conventional Commits français (`feat(combat): ...`), ne jamais push sans accord explicite de l'auteur.
