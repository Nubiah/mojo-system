import { useState } from 'react'
import { STATUT_PRESETS } from '../../data/combat.js'
import { inputCls } from './inputCls.js'

// Formulaire de statut (poison / saignement / personnalisé) — identique dans les deux univers.
// Le parent reçoit { nom, degats, duree } (duree = number|null) et gère participant + log.
export default function StatusForm({ onCancel, onAdd }) {
  const [preset, setPreset] = useState('Poison')
  const [sNom, setSNom] = useState('Poison')
  const [sDegats, setSDegats] = useState('1d4')
  const [sDuree, setSDuree] = useState('3')

  const submit = () => {
    const nom = (preset === 'Personnalisé' ? sNom : preset).trim() || 'Statut'
    const degats = sDegats.trim() || '1'
    const duree = sDuree.trim() === '' ? null : Math.max(1, Number(sDuree) || 1)
    onAdd({ nom, degats, duree })
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
            const found = STATUT_PRESETS.find((x) => x.nom === v)
            if (found) { setSNom(found.nom); setSDegats(found.degats); setSDuree(found.duree === null ? '' : String(found.duree)) }
            else { setSNom(''); setSDegats('1d6'); setSDuree('') }
          }}
        >
          {STATUT_PRESETS.map((x) => <option key={x.nom}>{x.nom}</option>)}
          <option>Personnalisé</option>
        </select>
        <input className={`${inputCls} !py-1.5 !text-xs`} placeholder="Dégâts (1d4)" value={sDegats} onChange={(e) => setSDegats(e.target.value)} />
        <input className={`${inputCls} !py-1.5 !text-xs`} placeholder="Tours (∞ si vide)" value={sDuree} onChange={(e) => setSDuree(e.target.value)} />
      </div>
      {preset === 'Personnalisé' && (
        <input className={`${inputCls} !py-1.5 !text-xs`} placeholder="Nom du statut" value={sNom} onChange={(e) => setSNom(e.target.value)} />
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200">Annuler</button>
        <button onClick={submit} className="text-xs px-3 py-1.5 rounded-lg bg-purple-400 text-slate-950 font-semibold hover:bg-purple-300">Ajouter</button>
      </div>
    </div>
  )
}
