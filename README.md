# Mojo System

Compagnon de jeu de rôle (PWA hors-ligne) pour deux univers maison : **Illirea** et **Teotl**.

## Fonctionnalités

- **Bestiaires séparés par univers** : fiches complètes, tags Elite / Légendaire, recherche et tri par niveau.
- **Tables de butin** : probabilités, quantités en dés, simulation et tirage de butin.
- **Rencontres prédéfinies** : composition d'embuscades réutilisables, niveau = somme des niveaux.
- **Suivi de combat** : rounds, PV, dégâts sur la durée (poison, saignement, statuts personnalisés), butin des morts.
- **Création de combat à la main** : ajout de monstres du bestiaire sans passer par une rencontre, possible aussi en cours de combat.
- **Jets de dés** : pools Illirea (succès sur 4/5/6) et dés explosifs Teotl.
- **Sauvegarde locale** + export / import d'un fichier JSON unique.
- **Installable et hors-ligne** (manifest + service worker).

## Stack

React 18 · Vite 6 · Tailwind CSS 4 · lucide-react

## Démarrage

```bash
npm install
npm run dev      # serveur de développement
npm run build    # build de production dans dist/
npm run preview  # prévisualisation du build
npm run lint     # eslint
```

## Données

Tout est stocké dans le navigateur (`localStorage`, clé `mojo-system-v1`) et peut être exporté en JSON :

```json
{
  "version": 3,
  "universes": {
    "illirea": { "bestiaire": [], "combats": [], "lootTables": [], "rencontres": [] },
    "teotl": { "bestiaire": [], "combats": [], "lootTables": [], "rencontres": [] }
  }
}
```

Les collections sont strictement séparées entre les deux univers.

## Déploiement

Le dossier `dist/` est statique et peut être servi tel quel (Netlify, Vercel, GitHub Pages, etc.).
