import { useMemo, useState } from 'react'
import { Copy, Crown, Dices, Gift, Pencil, Plus, Search, Star, Swords, Trash2 } from 'lucide-react'
import IllireaMonsterForm from './IllireaMonsterForm.jsx'
import IllireaLootTables from './IllireaLootTables.jsx'
import { createEmptyIllireaMonster, defenseLabel, ILLIREA_CARACS, newIllireaId, parseAttackPool, rollAttackPool } from '../../data/illirea.js'
import { normalizeLootTable } from '../../data/loot.js'
import { rankOfTeotl as rankOf } from '../../data/teotl.js'
import { rollDiceExpression } from '../../data/dice.js'

const cardClsForRank = (rank) =>
  rank === 'legendaire'
    ? 'border-amber-300/50 bg-gradient-to-br from-amber-200/25 via-yellow-500/10 to-slate-950'
    : rank === 'elite'
      ? 'border-slate-300/40 bg-gradient-to-br from-slate-200/25 via-slate-400/10 to-slate-950'
      : 'border-slate-800 bg-slate-950'

export default function IllireaBestiaire({
  monsters = [],
  lootTables = [],
  onCreate, onUpdate, onDelete, onDuplicate,
  onCreateLootTable, onUpdateLootTable, onDeleteLootTable, onDuplicateLootTable
}) {
  const [tab, setTab] = useState('monstres') // monstres | loot
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [query, setQuery] = useState('')
  const [roll, setRoll] = useState(null) // { monsterId, capNom, attaqueExpr, pool, attack, degatsExpr, damage }

  const tablesById = useMemo(() => Object.fromEntries(lootTables.map((t) => [t.id, t])), [lootTables])

  const usageByTable = useMemo(() => {
    const m = {}
    monsters.forEach((e) => (e.lootTables || []).forEach((id) => { m[id] = (m[id] || 0) + 1 }))
    return m
  }, [monsters])

  const lootName = (id) => tablesById[id]?.nom || id

  // Jet d’attaque d’une capacité : pool depuis les caracs du monstre, puis succès
  const testCapacity = (m, c) => {
    const pool = parseAttackPool(c.attaque, m.caracs)
    if (pool.error) {
      setRoll({ monsterId: m.id, capNom: c.nom, attaqueExpr: c.attaque, pool: null, attack: null, degatsExpr: c.degats, damage: null, error: pool.error })
      return
    }
    setRoll({ monsterId: m.id, capNom: c.nom, attaqueExpr: c.attaque, pool, attack: rollAttackPool(pool.totalDice), degatsExpr: c.degats, damage: null, error: null })
  }

  const rerollAttack = () => setRoll((r) => (r?.pool ? { ...r, attack: rollAttackPool(r.pool.totalDice), damage: null } : r))

  const rollDamage = () => setRoll((r) => {
    if (!r || !r.degatsExpr?.trim()) return r
    const d = rollDiceExpression(r.degatsExpr)
    return { ...r, damage: d ? d.detail : `« ${r.degatsExpr.trim()} » illisible (ex : 2d6)` }
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return monsters
      .filter((m) => {
        if (!q) return true
        return (
          m.nom?.toLowerCase().includes(q) ||
          (m.tags || []).join(' ').toLowerCase().includes(q) ||
          (m.capacites || []).some((c) => c.nom?.toLowerCase().includes(q))
        )
      })
      // Tri automatique : niveau décroissant, puis nom
      .sort((a, b) => (Number(b.niveau) || 0) - (Number(a.niveau) || 0) || String(a.nom || '').localeCompare(String(b.nom || ''), 'fr'))
  }, [monsters, query])

  const openCreate = () => { setEditing(createEmptyIllireaMonster()); setShowForm(true) }
  const openEdit = (m) => { setEditing(m); setShowForm(true) }

  return (
    <div>
      {/* Sous-onglets Illirea : Monstres / Tables de loot (monde Illirea uniquement) */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setTab('monstres')}
          className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border font-medium ${tab === 'monstres' ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          <Swords size={15} /> Monstres ({monsters.length})
        </button>
        <button
          onClick={() => setTab('loot')}
          className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border font-medium ${tab === 'loot' ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          <Gift size={15} /> Tables de loot ({lootTables.length})
        </button>
      </div>

      {tab === 'loot' ? (
        <IllireaLootTables
          tables={lootTables.map(normalizeLootTable)}
          usageByTable={usageByTable}
          onCreate={onCreateLootTable}
          onUpdate={onUpdateLootTable}
          onDelete={onDeleteLootTable}
          onDuplicate={onDuplicateLootTable}
        />
      ) : (
      <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm outline-none focus:border-violet-400/60"
            placeholder="Rechercher (nom, capacité)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-teal-300 text-slate-950 font-semibold hover:bg-teal-200"
        >
          <Plus size={16} /> Nouveau monstre
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <IllireaMonsterForm
            key={editing?.id || 'new'}
            initial={editing}
            lootTablesCollection={lootTables.map(normalizeLootTable)}
            onCancel={() => { setShowForm(false); setEditing(null) }}
            onSave={(monster) => {
              try {
                if (monsters.some((m) => m.id === monster.id)) onUpdate(monster)
                else onCreate(monster)
              } catch (err) {
                console.error('[Mojo] save failed', err)
                alert('Sauvegarde impossible : ' + (err?.message || err))
                return
              }
              setShowForm(false); setEditing(null)
            }}
          />
        </div>
      )}

      {filtered.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
          Aucun monstre d’Illirea pour l’instant.
          <br />
          Clique sur <span className="text-slate-200 font-semibold">Nouveau monstre</span> pour créer ta première fiche (Gobelin éclaireur…).
        </div>
      )}

      <div className="grid items-start sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5">
        {filtered.map((m) => {
          const rank = rankOf(m.tags)
          return (
          <article key={m.id} className={`rounded-xl border p-3 ${cardClsForRank(rank)}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-[15px] leading-snug inline-flex items-center gap-2 flex-wrap">
                  {m.nom || <span className="text-slate-500">Sans nom</span>}
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
                  Niv. {m.niveau} • {m.pvMax} PV • Défense {defenseLabel(m)}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button title="Éditer" onClick={() => openEdit(m)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <Pencil size={15} />
                </button>
                <button title="Dupliquer" onClick={() => onDuplicate({ ...m, id: newIllireaId(), nom: `${m.nom} (copie)` })} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <Copy size={15} />
                </button>
                <button title="Supprimer" onClick={() => { if (confirm(`Supprimer ${m.nom} ?`)) onDelete(m.id) }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <p className="mt-1.5 text-[11px] text-slate-500">
              {ILLIREA_CARACS.map((k) => `${k} ${m.caracs?.[k] ?? 10}`).join(' • ')}
            </p>

            {(m.tags || []).length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(m.tags || []).map((t) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">{t}</span>
                ))}
              </div>
            )}

            {(m.capacites || []).length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(m.capacites || []).map((c) => (
                  <button
                    key={c.id || c.nom}
                    title="Tester le jet d’attaque"
                    onClick={() => testCapacity(m, c)}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-400/30 text-violet-200 hover:border-violet-300/70 hover:bg-violet-500/20 transition"
                  >
                    {c.nom}{c.degats ? ` — ${c.degats}` : ''}
                  </button>
                ))}
              </div>
            )}

            {/* Résultat du jet : succès d’abord, dégâts ensuite */}
            {roll?.monsterId === m.id && (
              <div className="mt-2 rounded-lg border border-violet-400/25 bg-violet-500/[0.07] p-2.5 text-xs">
                <p className="font-semibold text-violet-100 inline-flex items-center gap-1.5">
                  <Dices size={13} /> {roll.capNom}
                </p>
                {roll.error ? (
                  <p className="text-red-300 mt-1">Jet d’attaque {roll.error} — renseigne-le dans la fiche (ex : AGI+3).</p>
                ) : (
                  <>
                    <p className="text-slate-300 mt-1">
                      Attaque {roll.attaqueExpr} → {roll.pool.totalDice}D6
                      {roll.pool.carac ? ` (${roll.pool.carac} ${roll.pool.caracValue} + ${roll.pool.bonusDice})` : ''} :{' '}
                      {roll.attack.dice.length === 0 ? 'aucun dé' : roll.attack.dice.slice(0, 60).join(' ')}
                      {roll.attack.dice.length > 60 ? ` … (+${roll.attack.dice.length - 60})` : ''}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-100">
                      {roll.attack.succes} succès{roll.attack.uns > 0 ? <span className="font-normal text-slate-400"> (4/5/6 moins {roll.attack.uns} × 1)</span> : null}
                    </p>
                    <p className="text-[11px] text-slate-500">Compare aux seuils de défense de la cible.</p>
                    {roll.damage && <p className="text-slate-200 mt-1">Dégâts {roll.damage}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {roll.degatsExpr?.trim() && (
                        <button onClick={rollDamage} className="text-[11px] px-2.5 py-1 rounded-lg bg-violet-400 text-slate-950 font-semibold hover:bg-violet-300">
                          Lancer les dégâts{roll.damage ? ' (relancer)' : ''}
                        </button>
                      )}
                      <button onClick={rerollAttack} className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
                        Relancer l’attaque
                      </button>
                      <button onClick={() => setRoll(null)} className="text-[11px] px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-200">
                        Fermer
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mt-1.5 text-xs text-slate-500">
              {(m.inventaire || []).length} objet{(m.inventaire || []).length > 1 ? 's' : ''} • {(m.capacites || []).length} capacité{(m.capacites || []).length > 1 ? 's' : ''} • {(m.lootTables || []).length} table{(m.lootTables || []).length > 1 ? 's' : ''}
            </div>
            {(m.lootTables || []).length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(m.lootTables || []).map((id) => (
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
