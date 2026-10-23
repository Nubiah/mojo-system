// Mojo System — Référentiel Teotl (fiche ennemi)
export const TEOTL_ARMURES = ['Légère', 'Moyenne', 'Lourde']

export const TEOTL_TAILLES = ['Minuscule', 'Très petit', 'Petit', 'Moyen', 'Grand', 'Énorme', 'Gigantesque']

// Rang visuel déduit des tags (insensible casse/accents) : normal | elite | legendaire
export function rankOfTeotl(tags = []) {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const list = (Array.isArray(tags) ? tags : []).map(norm)
  if (list.includes('legendaire')) return 'legendaire'
  if (list.includes('elite')) return 'elite'
  return 'normal'
}

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

export function createEmptyTeotlEnemy() {
  return {
    id: newId(),
    nom: '',
    niveau: 1,
    pvMax: 10,
    armure: 'Légère',
    taille: 'Moyen',
    deplacement: 6,
    tags: [],
    passifs: [], // [{ id, nom, effet }]
    competences: [], // [{ id, nom, deAttaque, note }]
    actionsBonus: [], // [{ id, nom, deAttaque, note }]
    lootTables: [], // [tableId: string] -> voir universes.teotl.lootTables
    lootIndividuel: [], // [{ id, nom, detail }]
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

// Normalise un ennemi importé depuis JSON (vieux fichiers / saisie partielle)
export function normalizeTeotlEnemy(raw, tablesById = {}) {
  const base = createEmptyTeotlEnemy()
  const armure = TEOTL_ARMURES.includes(raw?.armure) ? raw.armure : 'Légère'
  // Compat : anciennes fiches stockaient des NOMS de tables ; on convertit en IDs quand possible
  let lootTables = Array.isArray(raw?.lootTables) ? raw.lootTables : []
  if (tablesById && Object.keys(tablesById).length > 0) {
    const byName = new Map(Object.values(tablesById).map((t) => [t.nom, t.id]))
    lootTables = lootTables.map((v) => byName.get(v) || v)
  }
  return {
    ...base,
    ...raw,
    id: raw?.id || base.id,
    armure,
    niveau: Number(raw?.niveau) || 1,
    pvMax: Number(raw?.pvMax) || 1,
    deplacement: Number(raw?.deplacement) || 0,
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    passifs: Array.isArray(raw?.passifs) ? raw.passifs : [],
    competences: Array.isArray(raw?.competences) ? raw.competences : [],
    actionsBonus: Array.isArray(raw?.actionsBonus) ? raw.actionsBonus : [],
    lootTables,
    lootIndividuel: Array.isArray(raw?.lootIndividuel) ? raw.lootIndividuel : []
  }
}
