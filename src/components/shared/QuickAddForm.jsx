import { useState } from 'react'
import { inputCls } from './inputCls.js'

// Formulaire d'ajout d'un participant à la volée (nom + PV max) — identique dans les deux univers.
// Le participant n'est JAMAIS sauvegardé au bestiaire : le parent reçoit { nom, pvMax }.
export default function QuickAddForm({ onAdd, onCancel, placeholder = 'Porte barricadée' }) {
  const [nom, setNom] = useState('')
  const [pv, setPv] = useState('10')

  const submit = () => {
    onAdd({ nom: nom.trim() || 'Obstacle', pvMax: Math.max(1, Math.floor(Number(pv) || 10)) })
    setNom('')
    setPv('10')
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-48">
        <label className="block text-xs text-slate-400 mb-1.5">Nom (obstacle, élément… non sauvegardé au bestiaire)</label>
        <input
          className={`${inputCls} !py-1.5 !text-xs`}
          placeholder={placeholder}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        />
      </div>
      <div className="w-20">
        <label className="block text-xs text-slate-400 mb-1.5">PV max</label>
        <input
          className={`${inputCls} !py-1.5 !text-xs`}
          inputMode="numeric"
          value={pv}
          onChange={(e) => setPv(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        />
      </div>
      <button onClick={submit} className="text-xs px-3 py-1.5 rounded-lg bg-teal-300 text-slate-950 font-semibold hover:bg-teal-200">
        Ajouter
      </button>
      <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
        Annuler
      </button>
    </div>
  )
}
