// Mojo System — Rencontres prédéfinies + suivi de combat (Teotl)
import { newId, normalizeTeotlEnemy } from './teotl.js'
import { normalizeIllireaMonster } from './illirea.js'
import { rollDiceExpression } from './dice.js'
import { rollLootTable } from './loot.js'

export const STATUT_PRESETS = [
  { nom: 'Poison', degats: '1d4', duree: 3 },
  { nom: 'Saignement', degats: '1', duree: null }
]

// ── Rencontres ──────────────────────────────────────────
export function createEmptyEncounter() {
  const now = new Date().toISOString()
  return { id: newId(), nom: '', notes: '', entries: [], createdAt: now, updatedAt: now }
}

export function normalizeEncounter(raw) {
  const base = createEmptyEncounter()
  return {
    ...base,
    ...raw,
    id: raw?.id || base.id,
    nom: raw?.nom || '',
    notes: raw?.notes || '',
    entries: Array.isArray(raw?.entries)
      ? raw.entries.map((e) => ({ instanceId: e?.instanceId || newId(), enemyId: e?.enemyId })).filter((e) => e.enemyId)
      : []
  }
}

// Niveau de rencontre = somme des niveaux des monstres présents (introuvables = 0)
export function encounterLevel(encounter, enemiesById = {}) {
  return (encounter.entries || []).reduce((sum, e) => sum + (Number(enemiesById[e.enemyId]?.niveau) || 0), 0)
}

// Regroupement pour affichage : [{ enemyId, nom, niveau, qty }]
export function encounterGroups(encounter, enemiesById = {}) {
  const map = new Map()
  ;(encounter.entries || []).forEach((e) => {
    const src = enemiesById[e.enemyId]
    if (!map.has(e.enemyId)) {
      map.set(e.enemyId, {
        enemyId: e.enemyId,
        nom: src?.nom || 'Fiche introuvable',
        niveau: Number(src?.niveau) || 0,
        missing: !src,
        qty: 0
      })
    }
    map.get(e.enemyId).qty += 1
  })
  return [...map.values()]
}

// ── Combats ─────────────────────────────────────────────
export function createParticipantFromEnemy(enemy) {
  const s = normalizeTeotlEnemy(enemy)
  return {
    instanceId: newId(),
    enemyId: s.id,
    nom: s.nom,
    niveau: s.niveau,
    pvMax: s.pvMax,
    pv: s.pvMax,
    mort: false,
    statuts: [], // [{ id, nom, degats, duree: number|null }]
    snapshot: {
      armure: s.armure,
      competences: s.competences || [],
      actionsBonus: s.actionsBonus || [],
      lootTables: s.lootTables || [],
      lootIndividuel: s.lootIndividuel || []
    }
  }
}

function makeCombat(nom, participants, missing = 0, encounterId = null) {
  const now = new Date().toISOString()
  return {
    id: newId(),
    nom: nom || 'Combat',
    encounterId,
    round: 1,
    statut: 'encours', // encours | termine
    participants,
    log: [
      {
        id: newId(),
        round: 1,
        texte: `Le combat commence : ${participants.length} participant${participants.length > 1 ? 's' : ''}.${missing > 0 ? ` ${missing} fiche${missing > 1 ? 's' : ''} introuvable${missing > 1 ? 's' : ''} ignorée${missing > 1 ? 's' : ''}.` : ''}`,
        at: now
      }
    ],
    lootResult: null,
    createdAt: now,
    updatedAt: now
  }
}

export function createCombatFromEncounter(encounter, enemiesById = {}) {
  const participants = (encounter.entries || [])
    .map((e) => (enemiesById[e.enemyId] ? createParticipantFromEnemy(enemiesById[e.enemyId]) : null))
    .filter(Boolean)
  const missing = (encounter.entries || []).length - participants.length
  return makeCombat(encounter.nom, participants, missing, encounter.id || null)
}

// Combat créé à la main : picks = [{ id, qty }]
export function createCombatManual({ nom, picks = [] }, enemiesById = {}) {
  const participants = []
  picks.forEach(({ id, qty }) => {
    const enemy = enemiesById[id]
    if (!enemy) return
    const n = Math.max(1, Math.floor(Number(qty) || 1))
    for (let i = 0; i < n; i += 1) participants.push(createParticipantFromEnemy(enemy))
  })
  return makeCombat(nom, participants)
}

export function normalizeCombat(raw) {
  const now = new Date().toISOString()
  return {
    id: raw?.id || newId(),
    nom: raw?.nom || 'Combat',
    encounterId: raw?.encounterId || null,
    round: Math.max(1, Number(raw?.round) || 1),
    statut: raw?.statut === 'termine' ? 'termine' : 'encours',
    participants: Array.isArray(raw?.participants)
      ? raw.participants.map((p) => ({
          instanceId: p?.instanceId || newId(),
          enemyId: p?.enemyId || null,
          nom: p?.nom || 'Sans nom',
          niveau: Number(p?.niveau) || 1,
          pvMax: Math.max(1, Number(p?.pvMax) || 1),
          pv: Math.max(0, Math.min(Number(p?.pv ?? p?.pvMax ?? 1), Math.max(1, Number(p?.pvMax) || 1))),
          mort: !!p?.mort,
          statuts: Array.isArray(p?.statuts)
            ? p.statuts.map((s) => ({ id: s?.id || newId(), nom: s?.nom || 'Statut', degats: String(s?.degats ?? '1'), duree: s?.duree === null ? null : Math.max(1, Number(s?.duree) || 1) }))
            : [],
          snapshot: {
            armure: p?.snapshot?.armure || '',
            competences: Array.isArray(p?.snapshot?.competences) ? p.snapshot.competences : [],
            actionsBonus: Array.isArray(p?.snapshot?.actionsBonus) ? p.snapshot.actionsBonus : [],
            lootTables: Array.isArray(p?.snapshot?.lootTables) ? p.snapshot.lootTables : [],
            lootIndividuel: Array.isArray(p?.snapshot?.lootIndividuel) ? p.snapshot.lootIndividuel : []
          }
        }))
      : [],
    log: Array.isArray(raw?.log) ? raw.log.slice(-300) : [],
    lootResult: raw?.lootResult || null,
    createdAt: raw?.createdAt || now,
    updatedAt: raw?.updatedAt || now
  }
}

// Applique les dégâts sur la durée + décrémente les durées. Ne touche pas aux morts.
// -> { participants, entries } (entries = lignes de log, sans id/round)
export function applyRoundEffects(participants = [], rng = Math.random) {
  const entries = []
  const next = participants.map((p) => {
    if (p.mort) return p
    let dot = 0
    const details = []
    const kept = []
    ;(p.statuts || []).forEach((s) => {
      const roll = rollDiceExpression(s.degats, rng)
      const dmg = roll ? Math.max(0, roll.total) : 0
      dot += dmg
      details.push(`${s.nom} ${roll ? roll.detail.split('→')[1].trim() : '(illisible, 0)'}`)
      if (s.duree === null) {
        kept.push(s)
      } else {
        const left = s.duree - 1
        if (left > 0) kept.push({ ...s, duree: left })
        else entries.push(`${p.nom} n’est plus ${s.nom.toLowerCase()}${s.nom.toLowerCase().endsWith('e') ? 'e' : ''}.`)
      }
    })
    if (dot <= 0 && details.length === 0) return { ...p, statuts: kept }
    const pv = Math.max(0, p.pv - dot)
    if (dot > 0) entries.push(`${p.nom} subit ${dot} dégâts (${details.join(', ')}) — ${pv}/${p.pvMax} PV.`)
    if (pv === 0 && !p.mort) entries.push(`${p.nom} est mort.`)
    return { ...p, pv, statuts: kept, mort: pv === 0 ? true : p.mort }
  })
  return { participants: next, entries }
}

// Mise en forme d’un participant pour le tirage de butin (morts uniquement en général)
export function participantToLootSource(p) {
  return { nom: p.nom, lootTables: p.snapshot?.lootTables || [], lootIndividuel: p.snapshot?.lootIndividuel || [] }
}

// ── Combat Illirea ──────────────────────────────────────
export function createIllireaParticipantFromMonster(monster) {
  const s = normalizeIllireaMonster(monster)
  return {
    instanceId: newId(),
    monsterId: s.id,
    nom: s.nom,
    niveau: s.niveau,
    pvMax: s.pvMax,
    pv: s.pvMax,
    mort: false,
    statuts: [],
    defense: { ...s.defense },
    caracs: { ...s.caracs },
    capacites: (s.capacites || []).map((c) => ({ ...c })),
    inventaire: (s.inventaire || []).map((o) => ({ ...o })),
    lootTables: [...(s.lootTables || [])]
  }
}

export function createIllireaCombatFromEncounter(encounter, monstersById = {}) {
  const participants = (encounter.entries || [])
    .map((e) => (monstersById[e.enemyId] ? createIllireaParticipantFromMonster(monstersById[e.enemyId]) : null))
    .filter(Boolean)
  const missing = (encounter.entries || []).length - participants.length
  return makeCombat(encounter.nom, participants, missing, encounter.id || null)
}

// Combat Illirea créé à la main : picks = [{ id, qty }]
export function createIllireaCombatManual({ nom, picks = [] }, monstersById = {}) {
  const participants = []
  picks.forEach(({ id, qty }) => {
    const monster = monstersById[id]
    if (!monster) return
    const n = Math.max(1, Math.floor(Number(qty) || 1))
    for (let i = 0; i < n; i += 1) participants.push(createIllireaParticipantFromMonster(monster))
  })
  return makeCombat(nom, participants)
}

export function normalizeIllireaCombat(raw) {
  const now = new Date().toISOString()
  return {
    id: raw?.id || newId(),
    nom: raw?.nom || 'Combat',
    encounterId: raw?.encounterId || null,
    round: Math.max(1, Number(raw?.round) || 1),
    statut: raw?.statut === 'termine' ? 'termine' : 'encours',
    participants: Array.isArray(raw?.participants)
      ? raw.participants.map((p) => {
          const pvMax = Math.max(1, Number(p?.pvMax) || 1)
          return {
            instanceId: p?.instanceId || newId(),
            monsterId: p?.monsterId || null,
            nom: p?.nom || 'Sans nom',
            niveau: Number(p?.niveau) || 1,
            pvMax,
            pv: Math.max(0, Math.min(Number(p?.pv ?? pvMax), pvMax)),
            mort: !!p?.mort,
            statuts: Array.isArray(p?.statuts)
              ? p.statuts.map((s) => ({ id: s?.id || newId(), nom: s?.nom || 'Statut', degats: String(s?.degats ?? '1'), duree: s?.duree === null ? null : Math.max(1, Number(s?.duree) || 1) }))
              : [],
            defense: {
              bas: Number(p?.defense?.bas ?? 3),
              moyen: Number(p?.defense?.moyen ?? 4),
              haut: Number(p?.defense?.haut ?? 5)
            },
            caracs: p?.caracs && typeof p.caracs === 'object' ? { ...p.caracs } : {},
            capacites: Array.isArray(p?.capacites)
              ? p.capacites.map((c) => ({ id: c?.id || newId(), nom: c?.nom || '', attaque: String(c?.attaque ?? ''), degats: String(c?.degats ?? ''), description: c?.description || '' }))
              : [],
            inventaire: Array.isArray(p?.inventaire)
              ? p.inventaire.map((o) => ({ id: o?.id || newId(), nom: o?.nom || '', detail: o?.detail || '', chance: Math.min(100, Math.max(0, Number(o?.chance ?? 100))), quantite: String(o?.quantite ?? '1') }))
              : [],
            lootTables: Array.isArray(p?.lootTables) ? p.lootTables : []
          }
        })
      : [],
    log: Array.isArray(raw?.log) ? raw.log.slice(-300) : [],
    lootResult: raw?.lootResult || null,
    createdAt: raw?.createdAt || now,
    updatedAt: raw?.updatedAt || now
  }
}

// Verdict d’un jet d’attaque vs seuils de défense de la cible :
// < bas → raté ; < moyen → 50 % ; < haut → 100 % ; >= haut → 150 %
export function verdictIllirea(succes, defense = {}) {
  const bas = Number(defense.bas ?? 3)
  const moyen = Number(defense.moyen ?? 4)
  const haut = Number(defense.haut ?? 5)
  if (succes < bas) return { label: 'Raté', facteur: 0 }
  if (succes < moyen) return { label: '50 % des dégâts', facteur: 0.5 }
  if (succes < haut) return { label: '100 % des dégâts', facteur: 1 }
  return { label: '150 % des dégâts', facteur: 1.5 }
}

// Dégâts scalés (arrondi inférieur, calcul affiché pour interprétation MJ)
export function scaledDamage(total, facteur) {
  return Math.max(0, Math.floor((Number(total) || 0) * facteur))
}

// Butin de fin de combat : tables d’Illirea assignées + inventaires des morts.
// tablesById = universes.illirea.lootTables (monde Illirea uniquement).
export function illireaLootForDead(participants = [], tablesById = {}, rng = Math.random) {
  const drops = []
  participants
    .filter((p) => p.mort)
    .forEach((p) => {
      ;(p.lootTables || []).forEach((tableId) => {
        const table = tablesById[tableId]
        if (!table) return
        rollLootTable(table, rng).forEach((r) => {
          drops.push({ nom: r.nom, detail: r.detail, quantite: r.quantiteRolled, source: `${p.nom} — table ${table.nom}` })
        })
      })
      rollLootTable({ id: p.instanceId, nom: `Inventaire — ${p.nom}`, entries: p.inventaire || [] }, rng).forEach((r) => {
        drops.push({ nom: r.nom, detail: r.detail, quantite: r.quantiteRolled, source: `${p.nom} — inventaire` })
      })
    })
  return drops
}
