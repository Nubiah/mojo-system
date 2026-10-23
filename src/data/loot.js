// Mojo System — Tables de loot Teotl (probas configurables + tirage post-combat)
import { newId } from './teotl.js'
import { rollDiceExpression } from './dice.js'

export function createEmptyLootEntry() {
  return { id: newId(), nom: '', detail: '', chance: 50, quantite: '1' }
}

export function createEmptyLootTable() {
  return {
    id: newId(),
    nom: '',
    description: '',
    entries: [createEmptyLootEntry()],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

export function normalizeLootTable(raw) {
  const base = createEmptyLootTable()
  return {
    ...base,
    ...raw,
    id: raw?.id || base.id,
    nom: raw?.nom || '',
    description: raw?.description || '',
    entries: Array.isArray(raw?.entries)
      ? raw.entries.map((e) => ({
          id: e?.id || newId(),
          nom: e?.nom || '',
          detail: e?.detail || '',
          chance: Math.min(100, Math.max(0, Number(e?.chance) ?? 0)),
          quantite: String(e?.quantite ?? '1')
        }))
      : []
  }
}

// Lance une quantité type "1", "3", "1d6", "2d4+1", "1d8-1" -> nombre
export function rollQuantity(qtyStr, rng = Math.random) {
  const r = rollDiceExpression(qtyStr, rng)
  return r ? Math.max(0, r.total) : 1
}

// Tirage d'une table : chaque entrée est testée indépendamment (d100 <= chance)
export function rollLootTable(table, rng = Math.random) {
  const t = normalizeLootTable(table)
  return t.entries
    .filter((e) => e.nom.trim())
    .map((e) => {
      const roll = rng() * 100
      const dropped = roll < e.chance
      return { ...e, roll: Math.round(roll * 10) / 10, dropped, quantiteRolled: dropped ? rollQuantity(e.quantite, rng) : 0 }
    })
    .filter((r) => r.dropped)
}

// Loot post-combat : tables assignées aux ennemis + loot individuel (toujours acquis)
export function rollLootForEnemies(enemies = [], tablesById = {}, rng = Math.random) {
  const drops = []
  enemies.forEach((enemy) => {
    ;(enemy.lootTables || []).forEach((tableId) => {
      const table = tablesById[tableId]
      if (!table) return
      rollLootTable(table, rng).forEach((r) => {
        drops.push({
          nom: r.nom,
          detail: r.detail,
          quantite: r.quantiteRolled,
          source: `${enemy.nom || 'Ennemi'} — table ${table.nom}`,
          tableId: table.id
        })
      })
    })
    ;(enemy.lootIndividuel || []).forEach((l) => {
      if (!l.nom?.trim()) return
      drops.push({
        nom: l.nom,
        detail: l.detail || '',
        quantite: rollQuantity(l.quantite || '1', rng),
        source: `${enemy.nom || 'Ennemi'} — individuel`,
        tableId: null
      })
    })
  })
  return drops
}
