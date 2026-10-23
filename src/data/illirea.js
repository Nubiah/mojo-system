// Mojo System — Référentiel Illirea (fiche monstre)
import { createEmptyLootEntry } from './loot.js'

export const ILLIREA_CARACS = ['FOR', 'AGI', 'CON', 'VOL', 'INT', 'CHA']

export function newIllireaId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

export function createEmptyIllireaMonster() {
  const now = new Date().toISOString()
  return {
    id: newIllireaId(),
    nom: '',
    niveau: 1,
    pvMax: 20,
    tags: [],
    // Seuils de défense Bas / Moyen / Haut (usage combat à définir)
    defense: { bas: 3, moyen: 4, haut: 5 },
    caracs: { FOR: 10, AGI: 10, CON: 10, VOL: 10, INT: 10, CHA: 10 },
    // Inventaire = mini table de loot inline : [{ id, nom, detail, chance, quantite }]
    inventaire: [],
    // Tables de loot partagées d’Illirea (collection universes.illirea.lootTables, séparée de Teotl)
    lootTables: [],
    // Capacités : [{ id, nom, degats (optionnel), description }]
    capacites: [],
    createdAt: now,
    updatedAt: now
  }
}

export function normalizeIllireaMonster(raw) {
  const base = createEmptyIllireaMonster()
  const num = (v, fb) => (Number.isFinite(Number(v)) && String(v).trim() !== '' ? Number(v) : fb)
  return {
    ...base,
    ...raw,
    id: raw?.id || base.id,
    nom: raw?.nom || '',
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    lootTables: Array.isArray(raw?.lootTables) ? raw.lootTables : [],
    niveau: Math.max(1, num(raw?.niveau, 1)),
    pvMax: Math.max(1, num(raw?.pvMax, 20)),
    defense: {
      bas: num(raw?.defense?.bas, 3),
      moyen: num(raw?.defense?.moyen, 4),
      haut: num(raw?.defense?.haut, 5)
    },
    caracs: Object.fromEntries(ILLIREA_CARACS.map((k) => [k, num(raw?.caracs?.[k], 10)])),
    inventaire: Array.isArray(raw?.inventaire)
      ? raw.inventaire.map((o) => ({
          ...createEmptyLootEntry(),
          ...o,
          id: o?.id || newIllireaId(),
          nom: o?.nom || '',
          detail: o?.detail || '',
          chance: Math.min(100, Math.max(0, Number(o?.chance ?? 100))),
          quantite: String(o?.quantite ?? '1')
        }))
      : [],
    capacites: Array.isArray(raw?.capacites)
      ? raw.capacites.map((c) => ({
          id: c?.id || newIllireaId(),
          nom: c?.nom || '',
          attaque: String(c?.attaque ?? '').trim(),
          degats: String(c?.degats ?? '').trim(),
          description: c?.description || ''
        }))
      : []
  }
}

// Libellé défense compact : "3/4/5"
export function defenseLabel(monster) {
  const d = monster?.defense || {}
  return `${d.bas ?? 3}/${d.moyen ?? 4}/${d.haut ?? 5}`
}

// ── Jets d’attaque Illirea ──────────────────────────────
// Formats acceptés : "AGI+3" | "FOR+2d6" | "AGI" | "4d6" | "4"
// -> { carac, caracValue, bonusDice, totalDice } ou { error }
export function parseAttackPool(raw, caracs = {}) {
  const s = String(raw ?? '').trim().toUpperCase().replace(/\s+/g, '')
  if (!s) return { error: 'vide' }
  let m = s.match(/^(AGI|FOR)\+(\d+)(D6)?$/)
  if (m) {
    const caracValue = Math.max(0, Number(caracs[m[1]]) || 0)
    const bonusDice = parseInt(m[2], 10)
    return { carac: m[1], caracValue, bonusDice, totalDice: caracValue + bonusDice }
  }
  m = s.match(/^(AGI|FOR)$/)
  if (m) {
    const caracValue = Math.max(0, Number(caracs[m[1]]) || 0)
    return { carac: m[1], caracValue, bonusDice: 0, totalDice: caracValue }
  }
  m = s.match(/^(\d+)(D6)?$/)
  if (m) {
    const n = parseInt(m[1], 10)
    return { carac: null, caracValue: 0, bonusDice: n, totalDice: n }
  }
  return { error: `« ${String(raw).trim()} » illisible (ex : AGI+3)` }
}

// Lance N d6 : succès = dés 4/5/6 moins dés 1 (peut être négatif, au MJ d’interpréter)
export function rollAttackPool(totalDice, rng = Math.random) {
  const n = Math.min(Math.max(Number(totalDice) || 0, 0), 200)
  const dice = []
  for (let i = 0; i < n; i++) dice.push(1 + Math.floor(rng() * 6))
  const hits = dice.filter((d) => d >= 4).length
  const ones = dice.filter((d) => d === 1).length
  return { dice: [...dice].sort((a, b) => b - a), succes: hits - ones, uns: ones }
}
