import { useMemo, useState } from 'react'
import { Copy, Crown, Dices, Pencil, Plus, Search, Star, Swords, Trash2, Gift } from 'lucide-react'
import TeotlEnemyForm from './TeotlEnemyForm.jsx'
import TeotlLootTables from './TeotlLootTables.jsx'
import TeotlLootRoll from './TeotlLootRoll.jsx'
import { createEmptyTeotlEnemy, newId, rankOfTeotl } from '../../data/teotl.js'
import { normalizeLootTable } from '../../data/loot.js'

const cardClsForRank = (rank) =>
  rank === 'legendaire'
    ? 'border-amber-300/50 bg-gradient-to-br from-amber-200/25 via-yellow-500/10 to-slate-950'
    : rank === 'elite'
      ? 'border-slate-300/40 bg-gradient-to-br from-slate-200/25 via-slate-400/10 to-slate-950'
      : 'border-slate-800 bg-slate-950'

export default function TeotlBestiaire({
  enemies = [],
  lootTables = [],
  onCreate, onUpdate, onDelete, onDuplicate,
  onCreateLootTable, onUpdateLootTable, onDeleteLootTable, onDuplicateLootTable
}) {
  const [tab, setTab] = useState('ennemis') // ennemis | loot | butin
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [query, setQuery] = useState('')

  const tablesById = useMemo(() => Object.fromEntries(lootTables.map((t) => [t.id, t])), [lootTables])

  const usageByTable = useMemo(() => {
    const m = {}
    enemies.forEach((e) => (e.lootTables || []).forEach((id) => { m[id] = (m[id] || 0) + 1 }))
    return m
  }, [enemies])

  const existingPassifs = useMemo(() => {
    const map = new Map()
    enemies.forEach((e) => (e.passifs || []).forEach((p) => { if (p.nom && !map.has(p.nom)) map.set(p.nom, p) }))
    return [...map.values()]
  }, [enemies])

  const lootName = (id) => tablesById[id]?.nom || id

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return enemies
      .filter((e) => {
        if (!q) return true
        return (
          e.nom?.toLowerCase().includes(q) ||
          (e.tags || []).join(' ').toLowerCase().includes(q) ||
          e.armure?.toLowerCase().includes(q)
        )
      })
      // Tri automatique : niveau décroissant, puis nom
      .sort((a, b) => (Number(b.niveau) || 0) - (Number(a.niveau) || 0) || String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'))
  }, [enemies, query])

  const openCreate = () => { setEditing(createEmptyTeotlEnemy()); setShowForm(true) }
  const openEdit = (e) => { setEditing(e); setShowForm(true) }

  return (
    <div>
      {/* Sous-onglets Teotl : Ennemis / Tables de loot / Butin */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setTab('ennemis')}
          className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border font-medium ${tab === 'ennemis' ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          <Swords size={15} /> Ennemis ({enemies.length})
        </button>
        <button
          onClick={() => setTab('loot')}
          className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border font-medium ${tab === 'loot' ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          <Gift size={15} /> Tables de loot ({lootTables.length})
        </button>
        <button
          onClick={() => setTab('butin')}
          className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border font-medium ${tab === 'butin' ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          <Dices size={15} /> Butin
        </button>
      </div>

      {tab === 'butin' ? (
        <TeotlLootRoll enemies={enemies} tablesById={tablesById} />
      ) : tab === 'loot' ? (
        <TeotlLootTables
          tables={lootTables.map(normalizeLootTable)}
          usageByTable={usageByTable}
          onCreate={onCreateLootTable}
          onUpdate={onUpdateLootTable}
          onDelete={onDeleteLootTable}
          onDuplicate={onDuplicateLootTable}
        />
      ) : (
      <>
      {/* Barre d’actions */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm outline-none focus:border-violet-400/60"
            placeholder="Rechercher (nom, tag, armure)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-teal-300 text-slate-950 font-semibold hover:bg-teal-200"
        >
          <Plus size={16} /> Nouvel ennemi
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <TeotlEnemyForm
            key={editing?.id || 'new'}
            initial={editing}
            existingPassifs={existingPassifs}
            lootTablesCollection={lootTables.map(normalizeLootTable)}
            onCancel={() => { setShowForm(false); setEditing(null) }}
            onSave={(enemy) => {
              if (enemies.some((e) => e.id === enemy.id)) onUpdate(enemy)
              else onCreate(enemy)
              setShowForm(false); setEditing(null)
            }}
          />
        </div>
      )}

      {filtered.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
          Aucun ennemi Teotl pour l’instant.
          <br />
          Clique sur <span className="text-slate-200 font-semibold">Nouvel ennemi</span> pour créer ta première fiche (Gobelin…).
        </div>
      )}

      <div className="grid items-start sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5">
        {filtered.map((e) => {
          const rank = rankOfTeotl(e.tags)
          return (
          <article key={e.id} className={`rounded-xl border p-3 ${cardClsForRank(rank)}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-[15px] leading-snug inline-flex items-center gap-2 flex-wrap">
                  {e.nom || <span className="text-slate-500">Sans nom</span>}
                  {rank === 'legendaire' && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-300/20 border border-amber-300/40 text-amber-200">
                      <Crown size={11} /> Légendaire
                    </span>
                  )}
                  {rank === 'elite' && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/15 border border-slate-300/30 text-slate-200">
                      <Star size={11} /> Élite
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Niv. {e.niveau} • {e.pvMax} PV • {e.armure} • {e.taille} • {e.deplacement} cases
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button title="Éditer" onClick={() => openEdit(e)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <Pencil size={15} />
                </button>
                <button title="Dupliquer" onClick={() => onDuplicate({ ...e, id: newId(), nom: `${e.nom} (copie)` })} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <Copy size={15} />
                </button>
                <button title="Supprimer" onClick={() => { if (confirm(`Supprimer ${e.nom} ?`)) onDelete(e.id) }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {(e.tags || []).length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(e.tags || []).map((t) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">{t}</span>
                ))}
              </div>
            )}

            <div className="mt-1.5 text-xs text-slate-500">
              {e.passifs?.length || 0} passif{(e.passifs?.length || 0) > 1 ? 's' : ''} • {e.competences?.length || 0} compétence{(e.competences?.length || 0) > 1 ? 's' : ''} • {e.actionsBonus?.length || 0} bonus • {e.lootTables?.length || 0} loot
            </div>
            {(e.lootTables || []).length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(e.lootTables || []).map((id) => (
                  <span key={id} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-200">{lootName(id)}</span>
                ))}
              </div>
            )}
          </article>
          )
        })}
      </div>
      </>
      )}
    </div>
  )
}
