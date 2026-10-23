// Mojo System — définition des 2 univers (extensible pour règles Bestiaire/Combat)
export const UNIVERSES = [
  {
    id: 'illirea',
    name: 'Illirea',
    tagline: 'Bestiaire et suivi de combat pour l’univers Illirea',
    description:
      'Gérez le bestiaire et les combats de vos parties dans l’univers Illirea.',
    accent: 'emerald', // utilisé pour les pastilles / bordures
  },
  {
    id: 'teotl',
    name: 'Teotl',
    tagline: 'Bestiaire et suivi de combat pour l’univers Teotl',
    description:
      'Gérez le bestiaire et les combats de vos parties dans l’univers Teotl.',
    accent: 'amber',
  }
]

export const SECTIONS = [
  { id: 'bestiaire', name: 'Bestiaires', hint: 'Créer des monstres selon les règles de l’univers' },
  { id: 'combat', name: 'Combat', hint: 'Mettre en scène et suivre les combats' }
]
