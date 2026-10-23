import { useMemo, useState } from 'react'
import { Plus, Swords, Users } from 'lucide-react'
import IllireaEncounters from './IllireaEncounters.jsx'
import IllireaCombatView from './IllireaCombatView.jsx'
import CombatBuilder from '../CombatBuilder.jsx'
import { createIllireaCombatFromEncounter, createIllireaCombatManual, normalizeEncounter, normalizeIllireaCombat } from '../../data/combat.js'

// Section Combat Illirea : onglets Rencontres prédéfinies / Combats suivis
export default function IllireaCombatSection({
  monsters = [],
  encounters = [],
  combats = [],
  tablesById = {},
  onCreateEncounter, onUpdateEncounter, onDeleteEncounter, onDuplicateEncounter,
  onCreateCombat, onUpdateCombat, onDeleteCombat
}) {
  const [tab, setTab] = useState('combats') // combats | rencontres
  const [openCombatId, setOpenCombatId] = useState(null)
  const [builderOpen, setBuilderOpen] = useState(false)

  const monstersById = useMemo(() => Object.fromEntries(monsters.map((m) => [m.id, m])), [monsters])
  const sortedCombats = useMemo(
    () => [...combats].map(normalizeIllireaCombat).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
    [combats]
  )
  const openCombat = openCombatId ? sortedCombats.find((c) => c.id === openCombatId) || null : null

  const launch = (encounter) => {
    const combat = createIllireaCombatFromEncounter(encounter, monstersById)
    onCreateCombat(combat)
    setOpenCombatId(combat.id)
    setTab('combats')
  }

  const createManual = ({ nom, picks }) => {
    const combat = createIllireaCombatManual({ nom, picks }, monstersById)
    onCreateCombat(combat)
    setBuilderOpen(false)
    setOpenCombatId(combat.id)
    setTab('combats')
  }

  if (openCombat) {
    return (
      <IllireaCombatView
        combat={openCombat}
        monstersById={monstersById}
        tablesById={tablesById}
        onChange={onUpdateCombat}
        onBack={() => setOpenCombatId(null)}
        onDelete={(id) => { onDeleteCombat(id); setOpenCombatId(null) }}
      />
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setTab('combats')}
          className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border font-medium ${tab === 'combats' ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          <Swords size={15} /> Combats ({combats.length})
        </button>
        <button
          onClick={() => setTab('rencontres')}
          className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border font-medium ${tab === 'rencontres' ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          <Users size={15} /> Rencontres ({encounters.length})
        </button>
        <button
          onClick={() => { setTab('combats'); setBuilderOpen(true) }}
          className="ml-auto inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-teal-300 text-slate-950 font-semibold hover:bg-teal-200"
        >
          <Plus size={16} /> Nouveau combat
        </button>
      </div>

      {tab === 'rencontres' ? (
        <IllireaEncounters
          encounters={encounters.map(normalizeEncounter)}
          monsters={monsters}
          onCreate={onCreateEncounter}
          onUpdate={onUpdateEncounter}
          onDelete={onDeleteEncounter}
          onDuplicate={onDuplicateEncounter}
          onLaunch={launch}
        />
      ) : (
        <>
          {builderOpen && (
            <CombatBuilder items={monsters} onCancel={() => setBuilderOpen(false)} onCreate={createManual} />
          )}
          {sortedCombats.length === 0 && !builderOpen && (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
              Aucun combat pour l’instant.
              <br />
              Clique sur <span className="text-slate-200 font-semibold">Nouveau combat</span> pour ajouter les monstres à la main,
              ou prépare une <span className="text-slate-200 font-semibold">Rencontre</span> puis lance-la.
            </div>
          )}
          <div className="grid items-start sm:grid-cols-2 2xl:grid-cols-3 gap-3">
            {sortedCombats.map((c) => {
              const alive = c.participants.filter((p) => !p.mort).length
              return (
                <button
                  key={c.id}
                  onClick={() => setOpenCombatId(c.id)}
                  className="text-left rounded-xl border border-slate-800 bg-slate-950 p-4 hover:border-slate-600 transition"
                >
                  <span className="block font-bold leading-tight text-slate-100">{c.nom}</span>
                  <span className="block text-xs text-slate-400 mt-0.5">
                    Round {c.round} • {alive}/{c.participants.length} en vie •{' '}
                    <span className={c.statut === 'termine' ? 'text-slate-500' : 'text-emerald-300'}>{c.statut === 'termine' ? 'Terminé' : 'En cours'}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
