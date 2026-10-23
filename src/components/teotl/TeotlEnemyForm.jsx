import { useState } from 'react'
import { X } from 'lucide-react'
import { TEOTL_ARMURES, TEOTL_TAILLES, newId } from '../../data/teotl.js'

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/30'
const labelCls = 'block text-xs text-slate-400 mb-1.5'
const sectionTitleCls = 'text-[11px] tracking-wider text-slate-400 font-medium mt-5 mb-2'
const addBtnCls =
  'inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition'
const removeBtnCls =
  'shrink-0 w-8 h-9 grid place-items-center rounded-lg bg-red-500/90 hover:bg-red-500 text-white transition'

export default function TeotlEnemyForm({ initial, existingPassifs = [], lootTablesCollection = [], existingLootTables = [], onSave, onCancel }) {
  const [nom, setNom] = useState(initial?.nom || '')
  const [niveau, setNiveau] = useState(initial?.niveau ?? 1)
  const [pvMax, setPvMax] = useState(initial?.pvMax ?? 10)
  const [armure, setArmure] = useState(initial?.armure || 'Légère')
  const [taille, setTaille] = useState(initial?.taille || 'Moyen')
  const [deplacement, setDeplacement] = useState(initial?.deplacement ?? 6)
  const [tagsRaw, setTagsRaw] = useState((initial?.tags || []).join(', '))
  const [passifs, setPassifs] = useState(initial?.passifs || [])
  const [competences, setCompetences] = useState(initial?.competences || [])
  const [actionsBonus, setActionsBonus] = useState(initial?.actionsBonus || [])
  const [lootTables, setLootTables] = useState(initial?.lootTables || [])
  const [lootIndividuel, setLootIndividuel] = useState(initial?.lootIndividuel || [])
  const [error, setError] = useState('')
  const [nomError, setNomError] = useState(false)

  const upd = (list, setList, id, patch) => setList(list.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const del = (list, setList, id) => setList(list.filter((r) => r.id !== id))

  const handleSave = () => {
    if (!nom.trim()) {
      setError('Donne un nom à ton ennemi pour l’enregistrer (ex : Gobelin).')
      setNomError(true)
      requestAnimationFrame(() => {
        const el = document.getElementById('teotl-enemy-nom')
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el?.focus({ preventScroll: true })
      })
      return
    }
    try {
      const niv = Number(niveau)
    onSave({
      ...(initial || {}),
      nom: nom.trim(),
      niveau: niv > 0 ? niv : 1,
      pvMax: Math.max(1, Number(pvMax) || 1),
      armure,
      taille,
      deplacement: Math.max(0, Number(deplacement) || 0),
      tags: tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
      passifs: passifs.filter((p) => p.nom?.trim() || p.effet?.trim()),
      competences: competences.filter((c) => c.nom?.trim() || c.deAttaque?.trim()),
      actionsBonus: actionsBonus.filter((a) => a.nom?.trim()),
      lootTables,
      lootIndividuel: lootIndividuel.filter((l) => l.nom?.trim()),
      updatedAt: new Date().toISOString()
      })
    } catch (err) {
      console.error('[Mojo] sauvegarde ennemi impossible', err)
      setError('Sauvegarde impossible : ' + (err?.message || 'erreur inconnue — ouvre la console (F12) et envoie-moi le message.'))
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <h3 className="text-lg font-bold mb-4">{initial?.id ? 'Modifier l’ennemi' : 'Nouvel ennemi'}</h3>

      {/* ── Ligne 1 : Nom / Niveau ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Nom</label>
          <input
            id="teotl-enemy-nom"
            className={`${inputCls} ${nomError ? '!border-red-400/70 !ring-1 !ring-red-400/40' : ''}`}
            placeholder="Ex : Gobelin"
            value={nom}
            onChange={(e) => { setNom(e.target.value); if (nomError) setNomError(false) }}
          />
        </div>
        <div>
          <label className={labelCls}>Niveau</label>
          <input type="number" min={0} step="any" className={inputCls} value={niveau} onChange={(e) => setNiveau(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Points de vie max</label>
          <input type="number" min={1} className={inputCls} value={pvMax} onChange={(e) => setPvMax(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Armure</label>
          <select className={inputCls} value={armure} onChange={(e) => setArmure(e.target.value)}>
            {TEOTL_ARMURES.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Taille</label>
          <select className={inputCls} value={taille} onChange={(e) => setTaille(e.target.value)}>
            {TEOTL_TAILLES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Déplacement / tour (cases)</label>
          <input type="number" min={0} className={inputCls} value={deplacement} onChange={(e) => setDeplacement(e.target.value)} />
        </div>
      </div>

      <div className="mt-4">
        <label className={labelCls}>Tags (séparés par des virgules)</label>
        <input
          className={inputCls}
          placeholder="Ex : Humanoïde, Chef, Volant..."
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
        />
      </div>

      {/* ── Passifs ── */}
      <p className={sectionTitleCls}>PASSIFS (NOM + EFFET)</p>
      <div className="space-y-2">
        {passifs.map((p) => (
          <div key={p.id} className="flex gap-2">
            <input className={`${inputCls} min-w-0 flex-1`} placeholder="Nom" value={p.nom || ''} onChange={(e) => upd(passifs, setPassifs, p.id, { nom: e.target.value })} />
            <input className={`${inputCls} min-w-0 flex-[2]`} placeholder="Effet" value={p.effet || ''} onChange={(e) => upd(passifs, setPassifs, p.id, { effet: e.target.value })} />
            <button className={removeBtnCls} onClick={() => del(passifs, setPassifs, p.id)} title="Retirer">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button className={addBtnCls} onClick={() => setPassifs([...passifs, { id: newId(), nom: '', effet: '' }])}>
          + Ajouter un passif
        </button>
        {existingPassifs.length > 0 && (
          <select
            className={`${inputCls} !w-auto text-xs`}
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return
              const found = existingPassifs.find((p) => p.nom === e.target.value)
              if (found) setPassifs([...passifs, { ...found, id: newId() }])
              e.target.value = ''
            }}
          >
            <option value="">... ajouter un passif existant</option>
            {existingPassifs.map((p) => (
              <option key={p.nom} value={p.nom}>
                {p.nom}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Compétences ── */}
      <p className={sectionTitleCls}>COMPÉTENCES (NOM + DÉ D’ATTAQUE + NOTE ÉVENTUELLE)</p>
      <div className="space-y-2">
        {competences.map((c) => (
          <div key={c.id} className="flex gap-2">
            <input className={`${inputCls} min-w-0 flex-1`} placeholder="Nom" value={c.nom || ''} onChange={(e) => upd(competences, setCompetences, c.id, { nom: e.target.value })} />
            <input className={`${inputCls} min-w-0 flex-1`} placeholder="Dé d’attaque (1d6+)" value={c.deAttaque || ''} onChange={(e) => upd(competences, setCompetences, c.id, { deAttaque: e.target.value })} />
            <input className={`${inputCls} min-w-0 flex-1`} placeholder="Note (optionnel)" value={c.note || ''} onChange={(e) => upd(competences, setCompetences, c.id, { note: e.target.value })} />
            <button className={removeBtnCls} onClick={() => del(competences, setCompetences, c.id)}>
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <button className={addBtnCls} onClick={() => setCompetences([...competences, { id: newId(), nom: '', deAttaque: '', note: '' }])}>
          + Ajouter une compétence
        </button>
      </div>

      {/* ── Actions bonus ── */}
      <p className={sectionTitleCls}>ACTIONS BONUS (NOM + DÉ D’ATTAQUE ÉVENTUEL + NOTE)</p>
      <div className="space-y-2">
        {actionsBonus.map((a) => (
          <div key={a.id} className="flex gap-2">
            <input className={`${inputCls} min-w-0 flex-1`} placeholder="Nom" value={a.nom || ''} onChange={(e) => upd(actionsBonus, setActionsBonus, a.id, { nom: e.target.value })} />
            <input className={`${inputCls} min-w-0 flex-1`} placeholder="Dé d’attaque (optionnel)" value={a.deAttaque || ''} onChange={(e) => upd(actionsBonus, setActionsBonus, a.id, { deAttaque: e.target.value })} />
            <input className={`${inputCls} min-w-0 flex-1`} placeholder="Note (optionnel)" value={a.note || ''} onChange={(e) => upd(actionsBonus, setActionsBonus, a.id, { note: e.target.value })} />
            <button className={removeBtnCls} onClick={() => del(actionsBonus, setActionsBonus, a.id)}>
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <button className={addBtnCls} onClick={() => setActionsBonus([...actionsBonus, { id: newId(), nom: '', deAttaque: '', note: '' }])}>
          + Ajouter une action bonus
        </button>
      </div>

      {/* ── Loot : tables configurées (IDs) ── */}
      <p className={sectionTitleCls}>TABLES DE LOOT</p>
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

      <p className={sectionTitleCls}>LOOT INDIVIDUEL (OPTIONNEL)</p>
      <div className="space-y-2">
        {lootIndividuel.map((l) => (
          <div key={l.id} className="flex gap-2">
            <input className={`${inputCls} min-w-0 flex-1`} placeholder="Objet (ex : Dague rouillée)" value={l.nom || ''} onChange={(e) => upd(lootIndividuel, setLootIndividuel, l.id, { nom: e.target.value })} />
            <input className={`${inputCls} min-w-0 flex-1`} placeholder="Détail (optionnel)" value={l.detail || ''} onChange={(e) => upd(lootIndividuel, setLootIndividuel, l.id, { detail: e.target.value })} />
            <button className={removeBtnCls} onClick={() => del(lootIndividuel, setLootIndividuel, l.id)}>
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <button className={addBtnCls} onClick={() => setLootIndividuel([...lootIndividuel, { id: newId(), nom: '', detail: '' }])}>
          + Ajouter un objet de loot
        </button>
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

function NewLootTableInline({ onAdd }) {
  const [val, setVal] = useState('')
  return (
    <span className="inline-flex gap-2">
      <input
        className={`${inputCls} !w-44 !py-1.5 text-xs`}
        placeholder="Nouvelle table…"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <button
        className={addBtnCls}
        onClick={() => {
          const name = val.trim()
          if (!name) return
          onAdd(name)
          setVal('')
        }}
      >
        + Table
      </button>
    </span>
  )
}
