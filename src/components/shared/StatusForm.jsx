import { useState } from 'react'
import { STATUT_PRESETS } from '../../data/combat.js'
import { inputCls } from './inputCls.js'

// Formulaire de statut (poison / saignement / personnalisé) — identique dans les deux univers.
// Le parent reçoit { nom, degats, duree, critique, cumulable, savePreset } (duree = number|null)
// et gère participant + log + sauvegarde éventuelle en bibliothèque (onSavePreset).
//
// Props :
// - libraryPresets : bibliothèque globale de l'univers [{ id, nom, degats, duree, critique, cumulable }]
// - onSavePreset(preset) : enregistre dans la bibliothèque (création à la volée en combat)
// - showCrit : false = masque la case « Peut critiquer » (règle du dé explosif propre à Teotl)
export default function StatusForm({ onCancel, onAdd, onSavePreset, libraryPresets = [], showCrit = true }) {
  const [preset, setPreset] = useState('Poison')
  const [sNom, setSNom] = useState('Poison')
  const [sDegats, setSDegats] = useState('1d4')
  const [sDuree, setSDuree] = useState('3')
  const [sCritique, setSCritique] = useState(false)
  const [sCumulable, setCumulable] = useState(false)
  const [sSave, setSSave] = useState(false)

  const applyFields = ({ nom, degats, duree, critique, cumulable }) => {
    setSNom(nom)
    setSDegats(degats)
    setSDuree(duree === null ? '' : String(duree))
    setSCritique(!!critique)
    setCumulable(!!cumulable)
  }

  const submit = () => {
    const nom = (preset === 'Personnalisé' ? sNom : preset.split(':').pop()).trim() || 'Statut'
    const degats = sDegats.trim() || '1'
    const duree = sDuree.trim() === '' ? null : Math.max(1, Number(sDuree) || 1)
    onAdd({ nom, degats, duree, critique: sCritique, cumulable: sCumulable, savePreset: sSave && onSavePreset ? { nom, degats, duree, critique: sCritique, cumulable: sCumulable } : null })
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-2.5 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <select
          className={`${inputCls} !py-1.5 !text-xs`}
          value={preset}
          onChange={(e) => {
            const v = e.target.value
            setPreset(v)
            if (v.startsWith('lib:')) {
              const found = libraryPresets.find((x) => x.id === v.slice(4))
              if (found) applyFields(found)
            } else {
              const found = STATUT_PRESETS.find((x) => x.nom === v)
              if (found) applyFields(found)
              else applyFields({ nom: '', degats: '1d6', duree: null, critique: false, cumulable: false })
            }
          }}
        >
          {libraryPresets.map((x) => <option key={x.id} value={`lib:${x.id}`}>{x.nom} ★</option>)}
          {STATUT_PRESETS.map((x) => <option key={x.nom} value={x.nom}>{x.nom}</option>)}
          <option>Personnalisé</option>
        </select>
        <input className={`${inputCls} !py-1.5 !text-xs`} placeholder="Dégâts (1d4)" value={sDegats} onChange={(e) => setSDegats(e.target.value)} />
        <input className={`${inputCls} !py-1.5 !text-xs`} placeholder="Tours (∞ si vide)" value={sDuree} onChange={(e) => setSDuree(e.target.value)} />
      </div>
      {(preset === 'Personnalisé' || preset.startsWith('lib:')) && (
        <input className={`${inputCls} !py-1.5 !text-xs`} placeholder="Nom du statut" value={sNom} onChange={(e) => setSNom(e.target.value)} />
      )}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
        {showCrit && (
          <label className="inline-flex items-center gap-1.5 cursor-pointer" title="Les dés des dégâts sont lancés en dés explosifs (dé max = relance ; un DoT n'échoue jamais)">
            <input type="checkbox" className="accent-violet-400" checked={sCritique} onChange={(e) => setSCritique(e.target.checked)} />
            Peut critiquer (dé explosif)
          </label>
        )}
        <label className="inline-flex items-center gap-1.5 cursor-pointer" title="Plusieurs instances indépendantes de ce statut peuvent s'empiler sur la même cible (dégâts et durée séparés)">
          <input type="checkbox" className="accent-violet-400" checked={sCumulable} onChange={(e) => setCumulable(e.target.checked)} />
          Cumulable
        </label>
        {onSavePreset && (
          <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-400" title="Ajouter ce statut à la bibliothèque de l'univers (★), réutilisable dans tous les combats">
            <input type="checkbox" className="accent-teal-400" checked={sSave} onChange={(e) => setSSave(e.target.checked)} />
            Enregistrer en bibliothèque ★
          </label>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200">Annuler</button>
        <button onClick={submit} className="text-xs px-3 py-1.5 rounded-lg bg-purple-400 text-slate-950 font-semibold hover:bg-purple-300">Ajouter</button>
      </div>
    </div>
  )
}
