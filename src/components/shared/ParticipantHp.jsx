import { inputCls } from './inputCls.js'

// Bloc PV d'un participant — identique dans les deux univers :
// barre de vie, boutons ±, champ de dégâts personnalisé, historique du round.
//
// Props :
// - p                : participant (pv, pvMax, mort, degatsDernier, degatsRound)
// - dmgVal           : valeur courante du champ de dégâts (contrôlé par le parent)
// - onDmgVal(v)      : saisie du champ
// - onApplyDamage()  : application des dégâts (le parent gère le log)
// - onBumpHp(d)      : boutons ± fixes
export default function ParticipantHp({ p, dmgVal, onDmgVal, onApplyDamage, onBumpHp }) {
  const hpColor = () => {
    const r = p.pvMax ? p.pv / p.pvMax : 1
    return r > 0.5 ? 'bg-emerald-400' : r > 0.25 ? 'bg-amber-400' : 'bg-red-400'
  }

  const historyParts = []
  if (p.degatsRound > 0) historyParts.push(`${p.degatsRound} ce round`)
  if (p.degatsDernier) historyParts.push(`dernier : ${p.degatsDernier}`)

  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-400">PV</span>
        <span className="font-bold text-slate-100">{p.pv} / {p.pvMax}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${hpColor()}`} style={{ width: `${p.pvMax ? Math.round((p.pv / p.pvMax) * 100) : 0}%` }} />
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {[-5, -1, 1, 5].map((d) => (
          <button
            key={d}
            onClick={() => onBumpHp(d)}
            disabled={p.mort}
            className="flex-1 text-xs px-2 py-1 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
          >
            {d > 0 ? `+${d}` : d}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <input
          className={`${inputCls} !py-1 !text-xs flex-1`}
          placeholder="Dégâts : 3, 2d6, 1d8+2…"
          inputMode="text"
          value={dmgVal}
          onChange={(e) => onDmgVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onApplyDamage() }}
        />
        <button
          onClick={onApplyDamage}
          disabled={p.mort || !(dmgVal || '').trim()}
          title="Infliger ces dégâts (une valeur négative soigne)"
          className="text-xs px-2.5 py-1 rounded-lg bg-red-400 text-slate-950 font-semibold hover:bg-red-300 disabled:opacity-30"
        >
          Infliger
        </button>
      </div>
      {historyParts.length > 0 && (
        <p className="mt-1 text-[11px] text-slate-500">{historyParts.join(' • ')}</p>
      )}
    </div>
  )
}
