import { useMemo, useState } from 'react'
import { Copy, Minus, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { createEmptyEncounter, encounterGroups, encounterLevel, normalizeEncounter } from '../../data/combat.js'
import { newId } from '../../data/teotl.js'

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/30'
const labelCls = 'block text-xs text-slate-400 mb-1.5'

export default function TeotlEncounters({ encounters = [], enemies = [], onCreate, onUpdate, onDelete, onDuplicate, onLaunch }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const enemiesById = useMemo(() => Object.fromEntries(enemies.map((e) => [e.id, e])), [enemies])

  const sortedEnemies = useMemo(
    () => [...enemies].sort((a, b) => (Number(b.niveau) || 0) - (Number(a.niveau) || 0) || String(a.nom || '').localeCompare(String(b.nom || ''), 'fr')),
    [enemies]
  )

  const openCreate = () => { setEditing(createEmptyEncounter()); setShowForm(true) }
  const openEdit = (r) => { setEditing(normalizeEncounter(r)); setShowForm(true) }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <p className="text-xs text-slate-400 flex-1 min-w-52">
          Prépare tes rencontres à l’avance : le niveau affiché est la somme des niveaux des monstres présents.
        </p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-teal-300 text-slate-950 font-semibold hover:bg-teal-200"
        >
          <Plus size={16} /> Nouvelle rencontre
        </button>
      </div>

      {showForm && (
        <EncounterForm
          key={editing?.id || 'new'}
          initial={editing}
          enemies={sortedEnemies}
          onCancel={() => { setShowForm(false); setEditing(null) }}
          onSave={(r) => {
            if (encounters.some((x) => x.id === r.id)) onUpdate(r)
            else onCreate(r)
            setShowForm(false); setEditing(null)
          }}
        />
      )}

      {encounters.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
          Aucune rencontre prédéfinie.
          <br />
          Clique sur <span className="text-slate-200 font-semibold">Nouvelle rencontre</span> pour composer ta première embuscade réutilisable.
        </div>
      )}

      <div className="grid items-start sm:grid-cols-2 2xl:grid-cols-3 gap-3">
        {encounters.map((r) => {
          const level = encounterLevel(r, enemiesById)
          const groups = encounterGroups(r, enemiesById)
          const total = (r.entries || []).length
          return (
            <article key={r.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold leading-tight">{r.nom || <span className="text-slate-500">Sans nom</span>}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Niveau de rencontre : <span className="text-slate-100 font-semibold">{level}</span> • {total} monstre{total > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button title="Lancer le combat" onClick={() => onLaunch(r)} className="p-1.5 rounded-lg text-teal-200 hover:bg-teal-300/10">
                    <Play size={15} />
                  </button>
                  <button title="Éditer" onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                    <Pencil size={15} />
                  </button>
                  <button title="Dupliquer" onClick={() => onDuplicate({ ...normalizeEncounter(r), id: newId(), nom: `${r.nom} (copie)` })} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                    <Copy size={15} />
                  </button>
                  <button title="Supprimer" onClick={() => { if (confirm(`Supprimer ${r.nom} ?`)) onDelete(r.id) }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {groups.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {groups.map((g) => (
                    <span key={g.enemyId} className={`text-[11px] px-2 py-0.5 rounded-full border ${g.missing ? 'bg-red-500/10 border-red-400/30 text-red-300' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                      {g.qty}× {g.nom}{!g.missing && ` (niv. ${g.niveau})`}
                    </span>
                  ))}
                </div>
              )}
              {r.notes && <p className="mt-2 text-xs text-slate-500">{r.notes}</p>}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function EncounterForm({ initial, enemies, onSave, onCancel }) {
  const [nom, setNom] = useState(initial?.nom || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [entryIds, setEntryIds] = useState((initial?.entries || []).map((e) => e.enemyId))
  const [error, setError] = useState('')

  const enemiesById = useMemo(() => Object.fromEntries(enemies.map((e) => [e.id, e])), [enemies])
  const qtyOf = (id) => entryIds.filter((x) => x === id).length
  const addOne = (id) => setEntryIds([...entryIds, id])
  const removeOne = (id) => {
    const i = entryIds.lastIndexOf(id)
    if (i >= 0) setEntryIds(entryIds.filter((_, idx) => idx !== i))
  }

  const level = entryIds.reduce((s, id) => s + (Number(enemiesById[id]?.niveau) || 0), 0)

  const save = () => {
    if (!nom.trim()) { setError('Donne un nom à ta rencontre (ex : Embuscade gobeline).'); return }
    if (entryIds.length === 0) { setError('Ajoute au moins un monstre à la rencontre.'); return }
    try {
      onSave({
        ...(initial || {}),
        nom: nom.trim(),
        notes: notes.trim(),
        entries: entryIds.map((enemyId) => ({ instanceId: newId(), enemyId })),
        updatedAt: new Date().toISOString()
      })
    } catch (err) {
      console.error('[Mojo] sauvegarde rencontre impossible', err)
      setError('Sauvegarde impossible : ' + (err?.message || 'erreur inconnue'))
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 mb-6">
      <h3 className="text-lg font-bold mb-4">{initial?.id && initial?.nom ? 'Modifier la rencontre' : 'Nouvelle rencontre'}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Nom</label>
          <input className={inputCls} placeholder="Ex : Embuscade gobeline" value={nom} onChange={(e) => setNom(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Notes (optionnel)</label>
          <input className={inputCls} placeholder="Ex : forêt, de nuit, avec chef" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <p className="text-[11px] tracking-wider text-slate-400 font-medium mt-5 mb-2">
        MONSTRES — NIVEAU DE RENCONTRE : <span className="text-slate-100 font-bold">{level}</span> ({entryIds.length} monstre{entryIds.length > 1 ? 's' : ''})
      </p>
      {enemies.length === 0 ? (
        <p className="text-xs text-slate-500">Crée d’abord des monstres dans l’onglet Ennemis du bestiaire.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-auto pr-1">
          {enemies.map((e) => {
            const qty = qtyOf(e.id)
            return (
              <div key={e.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${qty > 0 ? 'bg-slate-800/80 border-teal-300/40' : 'bg-slate-900 border-slate-800'}`}>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-slate-100 truncate">{e.nom}</span>
                  <span className="block text-[11px] text-slate-500">Niv. {e.niveau} • {e.pvMax} PV</span>
                </span>
                <button onClick={() => removeOne(e.id)} disabled={qty === 0} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30">
                  <Minus size={14} />
                </button>
                <span className="text-sm font-bold w-5 text-center text-slate-100">{qty}</span>
                <button onClick={() => addOne(e.id)} className="p-1.5 rounded-lg text-teal-200 hover:bg-teal-300/10">
                  <Plus size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm border border-slate-700 text-slate-300 hover:bg-slate-800">Annuler</button>
        <button onClick={save} className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-300 text-slate-950 hover:bg-teal-200">Enregistrer</button>
      </div>
    </div>
  )
}
