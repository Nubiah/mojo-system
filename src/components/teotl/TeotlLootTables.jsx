import { useState } from 'react'
import { Copy, Dices, Pencil, Plus, Trash2, X } from 'lucide-react'
import { createEmptyLootTable, createEmptyLootEntry, normalizeLootTable, rollLootTable } from '../../data/loot.js'
import { newId } from '../../data/teotl.js'

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/30'
const labelCls = 'block text-xs text-slate-400 mb-1.5'
const addBtnCls =
  'inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition'

export default function TeotlLootTables({ tables = [], usageByTable = {}, onCreate, onUpdate, onDelete, onDuplicate }) {
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [simu, setSimu] = useState({}) // { tableId: drops[] }

  const openCreate = () => { setEditing(createEmptyLootTable()); setShowForm(true) }
  const openEdit = (t) => { setEditing(normalizeLootTable(t)); setShowForm(true) }

  const simulate = (table) => {
    setSimu((prev) => ({ ...prev, [table.id]: rollLootTable(table) }))
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <p className="text-xs text-slate-400 flex-1 min-w-52">
          Chaque entrée est testée indépendamment après le combat : tirage 0–100, acquis si tirage &lt; chance. Quantité : nombre fixe ou dés (<span className="text-slate-200">1, 1d6, 2d4+1</span>).
        </p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-teal-300 text-slate-950 font-semibold hover:bg-teal-200"
        >
          <Plus size={16} /> Nouvelle table
        </button>
      </div>

      {showForm && (
        <LootTableForm
          key={editing?.id || 'new-table'}
          initial={editing}
          onCancel={() => { setShowForm(false); setEditing(null) }}
          onSave={(table) => {
            if (tables.some((t) => t.id === table.id)) onUpdate(table)
            else onCreate(table)
            setShowForm(false); setEditing(null)
          }}
        />
      )}

      {tables.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
          Aucune table de loot. Crée par ex. <span className="text-slate-200 font-semibold">Gobelins — butin</span> puis assigne-la à tes ennemis.
        </div>
      )}

      <div className="grid items-start sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5">
        {tables.map((t) => {
          const usage = usageByTable[t.id] || 0
          const lastSimu = simu[t.id]
          return (
            <article key={t.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-[15px] leading-snug">{t.nom || <span className="text-slate-500">Sans nom</span>}</h4>
                  {t.description && <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>}
                  <p className="text-[11px] text-slate-500 mt-1">
                    {(t.entries || []).length} entrée{(t.entries || []).length > 1 ? 's' : ''} • utilisée par {usage} ennemi{usage > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button title="Simuler un butin" onClick={() => simulate(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-teal-200 hover:bg-slate-800">
                    <Dices size={15} />
                  </button>
                  <button title="Éditer" onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                    <Pencil size={15} />
                  </button>
                  <button title="Dupliquer" onClick={() => onDuplicate({ ...normalizeLootTable(t), id: newId(), nom: `${t.nom} (copie)` })} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                    <Copy size={15} />
                  </button>
                  <button
                    title="Supprimer"
                    onClick={() => {
                      if (usage > 0 && !confirm(`Supprimer ${t.nom} ? ${usage} ennemi(s) la référençai(en)t — leurs liens seront retirés.`)) return
                      if (usage === 0 && !confirm(`Supprimer ${t.nom} ?`)) return
                      onDelete(t.id)
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <ul className="mt-2 space-y-1 text-xs">
                {(t.entries || []).map((e) => (
                  <li key={e.id} className="flex justify-between gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-200">{e.nom || <span className="text-slate-500">—</span>} <span className="text-slate-500">×{e.quantite}</span></span>
                    <span className="text-slate-400 shrink-0">{e.chance}%</span>
                  </li>
                ))}
              </ul>

              {lastSimu && (
                <div className="mt-2 text-xs px-2.5 py-2 rounded-lg bg-teal-300/10 border border-teal-300/20 text-teal-100">
                  {lastSimu.length === 0
                    ? 'Simulation : rien obtenu.'
                    : `Simulation : ${lastSimu.map((r) => `${r.nom} ×${r.quantiteRolled}`).join(', ')}`}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function LootTableForm({ initial, onSave, onCancel }) {
  const [nom, setNom] = useState(initial?.nom || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [entries, setEntries] = useState(initial?.entries?.length ? initial.entries : [createEmptyLootEntry()])
  const [error, setError] = useState('')

  const upd = (id, patch) => setEntries(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const del = (id) => setEntries(entries.filter((e) => e.id !== id))

  const save = () => {
    if (!nom.trim()) { setError('Nom de table obligatoire (ex : Gobelins — butin).'); return }
    const clean = entries
      .filter((e) => e.nom.trim())
      .map((e) => ({ ...e, chance: Math.min(100, Math.max(0, Number(e.chance) || 0)), quantite: String(e.quantite || '1').trim() || '1' }))
    if (clean.length === 0) { setError('Ajoute au moins une entrée avec un nom d’objet.'); return }
    onSave({ ...(initial || {}), nom: nom.trim(), description: description.trim(), entries: clean, updatedAt: new Date().toISOString() })
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 mb-6">
      <h3 className="text-lg font-bold mb-4">{initial?.id && initial?.nom ? 'Modifier la table' : 'Nouvelle table de loot'}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Nom de la table</label>
          <input className={inputCls} placeholder="Ex : Gobelins — butin" value={nom} onChange={(e) => setNom(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Description (optionnel)</label>
          <input className={inputCls} placeholder="Ex : fouille après combat" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <p className="text-[11px] tracking-wider text-slate-400 font-medium mt-5 mb-2">ENTRÉES (OBJET + CHANCE % + QUANTITÉ)</p>
      <div className="space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="flex gap-2">
            <input className={`${inputCls} min-w-0 flex-1`} placeholder="Objet (ex : Oreille de gobelin)" value={e.nom} onChange={(ev) => upd(e.id, { nom: ev.target.value })} />
            <input className={`${inputCls} !w-24 shrink-0`} title="Chance %" type="number" min={0} max={100} value={e.chance} onChange={(ev) => upd(e.id, { chance: ev.target.value })} />
            <input className={`${inputCls} !w-24 shrink-0`} title='Quantité (1, 1d6, 2d4+1)' placeholder="1d6" value={e.quantite} onChange={(ev) => upd(e.id, { quantite: ev.target.value })} />
            <button onClick={() => del(e.id)} className="shrink-0 w-8 h-9 grid place-items-center rounded-lg bg-red-500/90 hover:bg-red-500 text-white">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button className={addBtnCls} onClick={() => setEntries([...entries, createEmptyLootEntry()])}>
          + Ajouter une entrée
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm border border-slate-700 text-slate-300 hover:bg-slate-800">Annuler</button>
        <button onClick={save} className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-300 text-slate-950 hover:bg-teal-200">Enregistrer</button>
      </div>
    </div>
  )
}
