import { useState } from 'react'
import { X } from 'lucide-react'
import { ILLIREA_CARACS, newIllireaId } from '../../data/illirea.js'
import { createEmptyLootEntry } from '../../data/loot.js'

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/30'
const labelCls = 'block text-xs text-slate-400 mb-1.5'
const boxCls = 'rounded-xl border border-slate-800 bg-slate-900/60 p-4 mt-4'
const boxTitleCls = 'text-xs text-slate-400 mb-3'
const addBtnCls =
  'inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition'
const removeBtnCls =
  'shrink-0 w-8 h-9 grid place-items-center rounded-lg bg-red-500/90 hover:bg-red-500 text-white transition'

export default function IllireaMonsterForm({ initial, lootTablesCollection = [], onSave, onCancel }) {
  const [nom, setNom] = useState(initial?.nom || '')
  const [tagsRaw, setTagsRaw] = useState((initial?.tags || []).join(', '))
  const [niveau, setNiveau] = useState(initial?.niveau ?? 1)
  const [pvMax, setPvMax] = useState(initial?.pvMax ?? 20)
  const [defense, setDefense] = useState({
    bas: initial?.defense?.bas ?? 3,
    moyen: initial?.defense?.moyen ?? 4,
    haut: initial?.defense?.haut ?? 5
  })
  const [caracs, setCaracs] = useState(() => Object.fromEntries(ILLIREA_CARACS.map((k) => [k, initial?.caracs?.[k] ?? 10])))
  const [inventaire, setInventaire] = useState(initial?.inventaire || [])
  const [lootTables, setLootTables] = useState(initial?.lootTables || [])
  const [capacites, setCapacites] = useState(initial?.capacites || [])
  const [error, setError] = useState('')
  const [nomError, setNomError] = useState(false)

  const updList = (list, setList, id, patch) => setList(list.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const delList = (list, setList, id) => setList(list.filter((r) => r.id !== id))

  const handleSave = () => {
    if (!nom.trim()) {
      setError('Donne un nom à ton monstre pour l’enregistrer (ex : Gobelin éclaireur).')
      setNomError(true)
      requestAnimationFrame(() => {
        const el = document.getElementById('illirea-monstre-nom')
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el?.focus({ preventScroll: true })
      })
      return
    }
    try {
      const num = (v, fb) => (String(v).trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : fb)
      onSave({
        ...(initial || {}),
        nom: nom.trim(),
        tags: tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
        niveau: Math.max(1, num(niveau, 1)),
        pvMax: Math.max(1, num(pvMax, 20)),
        defense: {
          bas: num(defense.bas, 3),
          moyen: num(defense.moyen, 4),
          haut: num(defense.haut, 5)
        },
        caracs: Object.fromEntries(ILLIREA_CARACS.map((k) => [k, num(caracs[k], 10)])),
        inventaire: inventaire
          .filter((o) => o.nom?.trim())
          .map((o) => ({ ...o, nom: o.nom.trim(), detail: o.detail?.trim() || '', chance: Math.min(100, Math.max(0, Number(o.chance ?? 100))), quantite: String(o.quantite || '1').trim() || '1' })),
        capacites: capacites
          .filter((c) => c.nom?.trim())
          .map((c) => ({ ...c, nom: c.nom.trim(), attaque: String(c.attaque ?? '').trim(), degats: String(c.degats ?? '').trim(), description: c.description?.trim() || '' })),
        lootTables,
        updatedAt: new Date().toISOString()
      })
    } catch (err) {
      console.error('[Mojo] sauvegarde monstre Illirea impossible', err)
      setError('Sauvegarde impossible : ' + (err?.message || 'erreur inconnue — ouvre la console (F12) et envoie-moi le message.'))
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <h3 className="text-lg font-bold mb-4">{initial?.id && initial?.nom ? 'Modifier le monstre' : 'Créer un monstre'}</h3>

      <div>
        <label className={labelCls}>Nom</label>
        <input
          id="illirea-monstre-nom"
          className={`${inputCls} ${nomError ? '!border-red-400/70 !ring-1 !ring-red-400/40' : ''}`}
          placeholder="Ex : Gobelin éclaireur"
          value={nom}
          onChange={(e) => { setNom(e.target.value); if (nomError) setNomError(false) }}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <div>
          <label className={labelCls}>Niveau</label>
          <input type="number" min={1} className={inputCls} value={niveau} onChange={(e) => setNiveau(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>PV max</label>
          <input type="number" min={1} className={inputCls} value={pvMax} onChange={(e) => setPvMax(e.target.value)} />
        </div>
      </div>

      <div className="mt-4">
        <label className={labelCls}>Tags (séparés par des virgules — ex : Elite, Légendaire)</label>
        <input
          className={inputCls}
          placeholder="Ex : Humanoïde, Elite, Volant..."
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
        />
      </div>

      {/* Défense */}
      <div className={boxCls}>
        <p className={boxTitleCls}>Défense — seuils Bas / Moyen / Haut (ex : 3/4/5)</p>
        <div className="grid grid-cols-3 gap-4">
          {['bas', 'moyen', 'haut'].map((k) => (
            <div key={k}>
              <label className={labelCls}>Seuil {k}</label>
              <input
                type="number"
                className={inputCls}
                value={defense[k]}
                onChange={(e) => setDefense({ ...defense, [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
          Notation : Bas/Moyen/Haut. Ex 3/4/5 → raté à 0-2, 50% à 3, 100% à 4, 150% à 5+.
        </p>
      </div>

      {/* Caractéristiques */}
      <div className={boxCls}>
        <p className={boxTitleCls}>Caractéristiques (saisie libre)</p>
        <div className="grid grid-cols-3 gap-4">
          {ILLIREA_CARACS.map((k) => (
            <div key={k}>
              <label className={labelCls}>{k}</label>
              <input
                type="number"
                className={inputCls}
                value={caracs[k]}
                onChange={(e) => setCaracs({ ...caracs, [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Inventaire = mini table de loot */}
      <div className={boxCls}>
        <p className={boxTitleCls}>Inventaire — objet structuré (tiré comme butin après les combats)</p>
        <div className="space-y-2">
          {inventaire.map((o) => (
            <div key={o.id} className="flex gap-2">
              <input className={`${inputCls} min-w-0 flex-[2]`} placeholder="Objet" value={o.nom || ''} onChange={(e) => updList(inventaire, setInventaire, o.id, { nom: e.target.value })} />
              <input className={`${inputCls} min-w-0 flex-[2]`} placeholder="Détail" value={o.detail || ''} onChange={(e) => updList(inventaire, setInventaire, o.id, { detail: e.target.value })} />
              <input className={`${inputCls} !w-20 shrink-0`} title="Chance %" type="number" min={0} max={100} value={o.chance ?? 100} onChange={(e) => updList(inventaire, setInventaire, o.id, { chance: e.target.value })} />
              <input className={`${inputCls} !w-20 shrink-0`} title="Quantité (1, 1d6...)" placeholder="1" value={o.quantite ?? '1'} onChange={(e) => updList(inventaire, setInventaire, o.id, { quantite: e.target.value })} />
              <button className={removeBtnCls} onClick={() => delList(inventaire, setInventaire, o.id)} title="Retirer">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <button className={addBtnCls} onClick={() => setInventaire([...inventaire, { ...createEmptyLootEntry(), id: newIllireaId() }])}>
            + Ajouter objet
          </button>
        </div>
      </div>

      {/* Tables de loot d’Illirea (collection du monde Illirea, séparée de Teotl) */}
      <div className={boxCls}>
        <p className={boxTitleCls}>Tables de loot</p>
        {lootTables.length === 0 ? (
          <p className="text-xs text-slate-500 mb-2">Aucune table de loot assignée.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-2">
            {lootTables.map((id) => {
              const table = lootTablesCollection.find((t) => t.id === id)
              return (
                <span key={id} className="inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
                  {table ? table.nom : id}
                  <button className="text-slate-400 hover:text-red-300" onClick={() => setLootTables(lootTables.filter((x) => x !== id))}>
                    <X size={13} />
                  </button>
                </span>
              )
            })}
          </div>
        )}
        {lootTablesCollection.length > 0 ? (
          <select
            className={`${inputCls} !w-auto text-xs`}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value && !lootTables.includes(e.target.value)) setLootTables([...lootTables, e.target.value])
              e.target.value = ''
            }}
          >
            <option value="">... ajouter une table de loot</option>
            {lootTablesCollection.filter((t) => !lootTables.includes(t.id)).map((t) => (
              <option key={t.id} value={t.id}>{t.nom}</option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-slate-500">
            Aucune table pour l’instant — crée-en dans l’onglet <span className="text-slate-200">Tables de loot</span>.
          </p>
        )}
      </div>

      {/* Capacités : nom + jet d’attaque + jet de dégâts + description */}
      <div className={boxCls}>
        <p className={boxTitleCls}>Capacités — champs structurés</p>
        <div className="space-y-2">
          {capacites.map((c) => (
            <div key={c.id} className="flex gap-2">
              <input className={`${inputCls} min-w-0 flex-1`} placeholder="Nom" value={c.nom || ''} onChange={(e) => updList(capacites, setCapacites, c.id, { nom: e.target.value })} />
              <input className={`${inputCls} min-w-0 flex-1`} placeholder="Attaque (ex : AGI+3)" value={c.attaque || ''} onChange={(e) => updList(capacites, setCapacites, c.id, { attaque: e.target.value })} />
              <input className={`${inputCls} min-w-0 flex-1`} placeholder="Dégâts (ex : 2d6)" value={c.degats || ''} onChange={(e) => updList(capacites, setCapacites, c.id, { degats: e.target.value })} />
              <input className={`${inputCls} min-w-0 flex-[2]`} placeholder="Description" value={c.description || ''} onChange={(e) => updList(capacites, setCapacites, c.id, { description: e.target.value })} />
              <button className={removeBtnCls} onClick={() => delList(capacites, setCapacites, c.id)} title="Retirer">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <button className={addBtnCls} onClick={() => setCapacites([...capacites, { id: newIllireaId(), nom: '', attaque: '', degats: '', description: '' }])}>
            + Ajouter capacité
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm border border-slate-700 text-slate-300 hover:bg-slate-800">
          Annuler
        </button>
        <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-300 text-slate-950 hover:bg-teal-200">
          Enregistrer
        </button>
      </div>
    </div>
  )
}
