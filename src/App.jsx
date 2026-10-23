import { useRef, useState } from 'react'
import {
  BookOpenText,
  Download,
  Sparkles,
  Swords,
  Upload,
  WifiOff,
  RotateCcw
} from 'lucide-react'
import { DragonIcon, MayaTempleIcon } from './components/icons.jsx'
import { UNIVERSES, SECTIONS } from './data/universes.js'
import { useMojoStore } from './hooks/useMojoStore.js'
import TeotlBestiaire from './components/teotl/TeotlBestiaire.jsx'
import TeotlCombatSection from './components/teotl/TeotlCombatSection.jsx'
import IllireaBestiaire from './components/illirea/IllireaBestiaire.jsx'
import IllireaCombatSection from './components/illirea/IllireaCombatSection.jsx'
import { normalizeTeotlEnemy } from './data/teotl.js'
import { normalizeIllireaMonster } from './data/illirea.js'
import { normalizeLootTable } from './data/loot.js'
import { normalizeCombat, normalizeEncounter, normalizeIllireaCombat } from './data/combat.js'

const storeKeyFor = (sectionId) => (sectionId === 'combat' ? 'combats' : 'bestiaire')

export default function App() {
  const [universeId, setUniverseId] = useState('illirea')
  const [sectionId, setSectionId] = useState('bestiaire')
  const { store, setStore, exportJSON, importJSON, reset } = useMojoStore()
  const fileRef = useRef(null)

  const universe = UNIVERSES.find((u) => u.id === universeId)
  const section = SECTIONS.find((s) => s.id === sectionId)
  const storeKey = storeKeyFor(sectionId)
  const count = store.universes?.[universeId]?.[storeKey]?.length ?? 0
  const teotlTablesRaw = store.universes?.teotl?.lootTables || []
  const teotlTablesById = Object.fromEntries(teotlTablesRaw.map((t) => [t.id, t]))
  const teotlEnemies = (store.universes?.teotl?.bestiaire || []).map((e) => normalizeTeotlEnemy(e, teotlTablesById))
  const teotlTables = teotlTablesRaw.map(normalizeLootTable)

  // Illirea : collections strictement séparées de Teotl (deux mondes, deux jeux de données)
  const illireaTablesRaw = store.universes?.illirea?.lootTables || []
  const illireaTablesById = Object.fromEntries(illireaTablesRaw.map((t) => [t.id, t]))
  const illireaTables = illireaTablesRaw.map(normalizeLootTable)
  const illireaMonsters = (store.universes?.illirea?.bestiaire || []).map(normalizeIllireaMonster)

  const patchTeotl = (patch) => {
    setStore((prev) => ({
      ...prev,
      universes: { ...prev.universes, teotl: { ...prev.universes.teotl, ...patch } }
    }))
  }
  const patchTeotlBestiaire = (next) => patchTeotl({ bestiaire: next })
  const patchIllirea = (patch) => {
    setStore((prev) => ({
      ...prev,
      universes: { ...prev.universes, illirea: { ...prev.universes.illirea, ...patch } }
    }))
  }
  const patchIllireaBestiaire = (next) => patchIllirea({ bestiaire: next })

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importJSON(file)
      alert('Import réussi : ' + file.name)
    } catch (err) {
      alert('Import impossible : ' + err.message)
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      {/* ── Header desktop ─────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-emerald-400 grid place-items-center font-black text-slate-950">
            M
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-none">Mojo System</h1>
            <p className="text-xs text-slate-400 mt-1">Compagnon de jeu de rôle — Illirea · Teotl</p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 mr-2">
            <WifiOff size={14} /> Disponible hors-ligne
          </div>

          <button
            onClick={exportJSON}
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700"
            title="Exporter tout en JSON"
          >
            <Download size={16} /> Exporter
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 font-medium"
            title="Importer un fichier JSON"
          >
            <Upload size={16} /> Importer
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>

        {/* ── Navigation univers ── */}
        <nav className="w-full px-4 sm:px-6 lg:px-8 pb-4 flex gap-2">
          {UNIVERSES.map((u) => {
            const active = u.id === universeId
            return (
              <button
                key={u.id}
                onClick={() => setUniverseId(u.id)}
                className={`flex-1 sm:flex-none sm:w-52 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition ${
                  active
                    ? u.id === 'illirea'
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                      : 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {u.id === 'illirea' ? <DragonIcon size={17} /> : <MayaTempleIcon size={17} />}
                {u.name}
              </button>
            )
          })}
        </nav>
      </header>

      {/* ── Corps ──────────────────────────────────────── */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Sous-sections : Bestiaires / Combat */}
        <aside className="lg:sticky lg:top-32 h-fit rounded-2xl border border-slate-800 bg-slate-900 p-2 flex lg:flex-col gap-2">
          {SECTIONS.map((s) => {
            const active = s.id === sectionId
            const Icon = s.id === 'bestiaire' ? BookOpenText : Swords
            return (
              <button
                key={s.id}
                onClick={() => setSectionId(s.id)}
                className={`flex-1 text-left inline-flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${
                  active
                    ? 'bg-slate-800 text-white shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon size={18} className={active ? 'text-violet-300' : ''} />
                <span>
                  <span className="block font-semibold">{s.name}</span>
                  <span className="hidden xl:block text-xs opacity-60 font-normal">{s.hint}</span>
                </span>
              </button>
            )
          })}

        </aside>

        {/* Contenu */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 min-h-96 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">
                {universe.name} • {section.name}
              </p>
              <h2 className="text-2xl font-bold mt-1 inline-flex items-center gap-2">
                {section.id === 'bestiaire' ? <Sparkles size={22} className="text-violet-300" /> : <Swords size={22} className="text-red-300" />}
                {section.id === 'bestiaire' ? `Bestiaire ${universe.name}` : `Combat — ${universe.name}`}
              </h2>
              {universeId === 'teotl' && sectionId === 'bestiaire' && (
                <p className="text-sm text-slate-400 mt-2 max-w-xl">
                  Créez, organisez et réutilisez les ennemis de vos scénarios.
                </p>
              )}
              {universeId === 'illirea' && sectionId === 'bestiaire' && (
                <p className="text-sm text-slate-400 mt-2 max-w-xl">
                  Créez et organisez les monstres de vos aventures.
                </p>
              )}
              {universeId === 'teotl' && sectionId === 'combat' && (
                <p className="text-sm text-slate-400 mt-2 max-w-xl">
                  Préparez vos rencontres, suivez les rounds et récupérez le butin des morts.
                </p>
              )}
              {universeId === 'illirea' && sectionId === 'combat' && (
                <p className="text-sm text-slate-400 mt-2 max-w-xl">
                  Rencontres, jets d’attaque contre les seuils de défense, et butin des inventaires.
                </p>
              )}
            </div>
            {universeId === 'teotl' && sectionId === 'bestiaire' && (
              <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {count} ennemi{count > 1 ? 's' : ''}
              </span>
            )}
            {universeId === 'illirea' && sectionId === 'bestiaire' && (
              <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {count} monstre{count > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Contenu : Bestiaires Teotl / Illirea, Combat Teotl, bientôt Illirea */}
          {universeId === 'teotl' && sectionId === 'bestiaire' ? (
            <TeotlBestiaire
              enemies={teotlEnemies}
              lootTables={teotlTables}
              onCreate={(enemy) => patchTeotlBestiaire([...teotlEnemies, normalizeTeotlEnemy(enemy, teotlTablesById)])}
              onUpdate={(enemy) => patchTeotlBestiaire(teotlEnemies.map((e) => (e.id === enemy.id ? normalizeTeotlEnemy(enemy, teotlTablesById) : e)))}
              onDelete={(id) => patchTeotlBestiaire(teotlEnemies.filter((e) => e.id !== id))}
              onDuplicate={(enemy) => patchTeotlBestiaire([...teotlEnemies, normalizeTeotlEnemy(enemy, teotlTablesById)])}
              onCreateLootTable={(table) => patchTeotl({ lootTables: [...teotlTables, normalizeLootTable(table)] })}
              onUpdateLootTable={(table) => patchTeotl({ lootTables: teotlTables.map((t) => (t.id === table.id ? normalizeLootTable(table) : t)) })}
              onDeleteLootTable={(id) => patchTeotl({
                lootTables: teotlTables.filter((t) => t.id !== id),
                bestiaire: teotlEnemies.map((e) => ({ ...e, lootTables: (e.lootTables || []).filter((tid) => tid !== id) }))
              })}
              onDuplicateLootTable={(table) => patchTeotl({ lootTables: [...teotlTables, normalizeLootTable(table)] })}
            />
          ) : universeId === 'teotl' && sectionId === 'combat' ? (
            <TeotlCombatSection
              enemies={teotlEnemies}
              encounters={(store.universes?.teotl?.rencontres || []).map(normalizeEncounter)}
              combats={(store.universes?.teotl?.combats || []).map(normalizeCombat)}
              tablesById={teotlTablesById}
              onCreateEncounter={(r) => patchTeotl({ rencontres: [...(store.universes.teotl.rencontres || []), normalizeEncounter(r)] })}
              onUpdateEncounter={(r) => patchTeotl({ rencontres: (store.universes.teotl.rencontres || []).map((x) => (x.id === r.id ? normalizeEncounter(r) : x)) })}
              onDeleteEncounter={(id) => patchTeotl({ rencontres: (store.universes.teotl.rencontres || []).filter((x) => x.id !== id) })}
              onDuplicateEncounter={(r) => patchTeotl({ rencontres: [...(store.universes.teotl.rencontres || []), normalizeEncounter(r)] })}
              onCreateCombat={(c) => patchTeotl({ combats: [...(store.universes.teotl.combats || []), normalizeCombat(c)] })}
              onUpdateCombat={(c) => patchTeotl({ combats: (store.universes.teotl.combats || []).map((x) => (x.id === c.id ? normalizeCombat(c) : x)) })}
              onDeleteCombat={(id) => patchTeotl({ combats: (store.universes.teotl.combats || []).filter((x) => x.id !== id) })}
            />
          ) : universeId === 'illirea' && sectionId === 'bestiaire' ? (
            <IllireaBestiaire
              monsters={illireaMonsters}
              lootTables={illireaTables}
              onCreate={(m) => patchIllireaBestiaire([...illireaMonsters, normalizeIllireaMonster(m)])}
              onUpdate={(m) => patchIllireaBestiaire(illireaMonsters.map((x) => (x.id === m.id ? normalizeIllireaMonster(m) : x)))}
              onDelete={(id) => patchIllireaBestiaire(illireaMonsters.filter((x) => x.id !== id))}
              onDuplicate={(m) => patchIllireaBestiaire([...illireaMonsters, normalizeIllireaMonster(m)])}
              onCreateLootTable={(table) => patchIllirea({ lootTables: [...illireaTables, normalizeLootTable(table)] })}
              onUpdateLootTable={(table) => patchIllirea({ lootTables: illireaTables.map((t) => (t.id === table.id ? normalizeLootTable(table) : t)) })}
              onDeleteLootTable={(id) => patchIllirea({
                lootTables: illireaTables.filter((t) => t.id !== id),
                bestiaire: illireaMonsters.map((m) => ({ ...m, lootTables: (m.lootTables || []).filter((tid) => tid !== id) }))
              })}
              onDuplicateLootTable={(table) => patchIllirea({ lootTables: [...illireaTables, normalizeLootTable(table)] })}
            />
          ) : universeId === 'illirea' && sectionId === 'combat' ? (
            <IllireaCombatSection
              monsters={illireaMonsters}
              tablesById={illireaTablesById}
              encounters={(store.universes?.illirea?.rencontres || []).map(normalizeEncounter)}
              combats={(store.universes?.illirea?.combats || []).map(normalizeIllireaCombat)}
              onCreateEncounter={(r) => patchIllirea({ rencontres: [...(store.universes.illirea.rencontres || []), normalizeEncounter(r)] })}
              onUpdateEncounter={(r) => patchIllirea({ rencontres: (store.universes.illirea.rencontres || []).map((x) => (x.id === r.id ? normalizeEncounter(r) : x)) })}
              onDeleteEncounter={(id) => patchIllirea({ rencontres: (store.universes.illirea.rencontres || []).filter((x) => x.id !== id) })}
              onDuplicateEncounter={(r) => patchIllirea({ rencontres: [...(store.universes.illirea.rencontres || []), normalizeEncounter(r)] })}
              onCreateCombat={(c) => patchIllirea({ combats: [...(store.universes.illirea.combats || []), normalizeIllireaCombat(c)] })}
              onUpdateCombat={(c) => patchIllirea({ combats: (store.universes.illirea.combats || []).map((x) => (x.id === c.id ? normalizeIllireaCombat(c) : x)) })}
              onDeleteCombat={(id) => patchIllirea({ combats: (store.universes.illirea.combats || []).filter((x) => x.id !== id) })}
            />
          ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-10 text-center">
            <Swords size={28} className="mx-auto text-slate-600" />
            <p className="font-semibold text-slate-200 mt-3">
              Suivi de combat — bientôt disponible
            </p>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Les rencontres, le suivi des rounds et la récupération du butin d’Illirea arriveront dans une prochaine version.
            </p>
          </div>
          )}

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => { if (confirm('Tout effacer (local) ? Pense à exporter avant.')) reset() }}
              className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg text-slate-500 hover:text-red-300 hover:bg-red-500/10"
            >
              <RotateCcw size={14} /> Réinitialiser le stockage local
            </button>
          </div>

        </section>
      </main>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-600">
        Mojo System — Compagnon de jeu de rôle
      </footer>
    </div>
  )
}
