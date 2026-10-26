# Mojo System

Compagnon de jeu de rôle (PWA hors-ligne) pour deux univers maison : **Illirea** et **Teotl**.

## Fonctionnalités

- **Bestiaires séparés par univers** : fiches complètes, tags Elite / Légendaire, recherche et tri par niveau.
- **Tables de butin** : probabilités, quantités en dés, simulation et tirage de butin.
- **Rencontres prédéfinies** : composition d'embuscades réutilisables, niveau = somme des niveaux.
- **Suivi de combat** : rounds, PV, dégâts sur la durée (poison, saignement, statuts personnalisés), butin des morts.
- **Création de combat à la main** : ajout de monstres du bestiaire sans passer par une rencontre, possible aussi en cours de combat.
- **Participants à la volée** : obstacle ou PNJ éphémère (nom + PV max) dans le combat, sans toucher au bestiaire.
- **Dégâts personnalisés** : champ libre sur chaque participant (valeur fixe, `2d6`, `1d8+2`… ; négatif = soin), avec historique (dernier jet + cumul du round).
- **Undo** : bouton « Annuler » qui remonte les 30 dernières actions (dégâts, ajouts, statuts, import…).
- **Tooltips de capacités** : description au survol des capacités en combat (Illirea) et notes des compétences / actions bonus (Teotl).
- **Jets de dés** : pools Illirea (succès sur 4/5/6) et dés explosifs Teotl (1 = échec, dé max = relance chaînée).
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

Les collections sont strictement séparées entre les deux univers. Les participants « à la volée » vivent uniquement dans les combats (`monsterId`/`enemyId` à `null`).

## Déploiement

Le dossier `dist/` est statique et peut être servi tel quel (Netlify, Vercel, GitHub Pages, etc.).

### GitHub Pages

Le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) construit et publie l'application à chaque push sur `main`.

1. Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
2. Pousser sur `main` (ou lancer le workflow manuellement depuis l'onglet Actions).
3. L'application est servie sur `https://nubiah.github.io/mojo-system/`.

Le build reçoit automatiquement le bon chemin de base (`VITE_BASE_PATH`), le service worker et le manifest s'adaptant au sous-dossier.

## Contribuer (humains & agents IA)

Les agents LLM doivent lire [AGENTS.md](AGENTS.md) avant toute modification : architecture, règles du modèle de données à ne pas casser, conventions et workflow de vérification.
