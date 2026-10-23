import { useState } from 'react'
import { Dices } from 'lucide-react'
import { rollLootForEnemies } from '../../data/loot.js'
import LootResult from './LootResult.jsx'

export default function TeotlLootRoll({ enemies = [], tablesById = {} }) {
  const [selected, setSelected] = useState(() => enemies.map((e) => e.id))
  const [result, setResult] = useState(null) // { drops, at, count }

  const lootLabel = (e) => {
    const tables = (e.lootTables || []).map((id) => tablesById[id]?.nom || id).filter(Boolean)
    const indiv = (e.lootIndividuel || []).filter((l) => l.nom?.trim()).length
    const parts = []
    if (tables.length > 0) parts.push(tables.join(', '))
    if (indiv > 0) parts.push(`${indiv} objet${indiv > 1 ? 's' : ''} individuel${indiv > 1 ? 's' : ''}`)
    return parts.length > 0 ? parts.join(' • ') : 'Aucun loot assigné'
  }

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const selectAll = () => setSelected(enemies.map((e) => e.id))
  const selectNone = () => setSelected([])

  const roll = () => {
    const fighters = enemies.filter((e) => selected.includes(e.id))
    setResult({ drops: rollLootForEnemies(fighters, tablesById), at: new Date(), count: fighters.length })
  }

  if (enemies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
        Crée d’abord des ennemis dans l’onglet <span className="text-slate-200 font-semibold">Ennemis</span> pour pouvoir tirer leur butin ici.
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-slate-400 mb-3">
        Coche les ennemis du combat terminé, puis récupère tout le butin d’un coup (tables à probas + objets individuels).
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={selectAll} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
          Tout cocher
        </button>
        <button onClick={selectNone} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
          Tout décocher
        </button>
        <span className="text-xs text-slate-500">{selected.length} / {enemies.length} coché{selected.length > 1 ? 's' : ''}</span>
        <span className="flex-1" />
        <button
          onClick={roll}
          disabled={selected.length === 0}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-teal-300 text-slate-950 font-semibold hover:bg-teal-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Dices size={16} /> Récupérer le butin
        </button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2 max-h-72 overflow-auto pr-1">
        {enemies.map((e) => {
          const checked = selected.includes(e.id)
          return (
            <label
              key={e.id}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition ${checked ? 'bg-slate-800/80 border-teal-300/40' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(e.id)} className="mt-1 accent-teal-300" />
              <span>
                <span className="block text-sm font-semibold text-slate-100">{e.nom || 'Sans nom'}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">{lootLabel(e)}</span>
              </span>
            </label>
          )
        })}
      </div>

      {result && (
        <div className="mt-4">
          <LootResult
            drops={result.drops}
            title={`Butin — ${result.count} ennemi${result.count > 1 ? 's' : ''}`}
            onReroll={roll}
            onClear={() => setResult(null)}
          />
        </div>
      )}
    </div>
  )
}
