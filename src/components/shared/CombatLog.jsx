import { useEffect, useRef } from 'react'

// Journal de combat — identique dans les deux univers
// log : [{ id, round, texte }]
export default function CombatLog({ log = [] }) {
  const logRef = useRef(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: 999999 })
  }, [log.length])

  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-[11px] tracking-wider text-slate-500 font-medium mb-2">JOURNAL DU COMBAT</p>
      <div ref={logRef} className="space-y-1 max-h-56 overflow-auto pr-1">
        {log.length === 0 && <p className="text-xs text-slate-500">Aucun événement.</p>}
        {log.map((l) => (
          <p key={l.id} className="text-xs text-slate-300">
            <span className="text-slate-500">R{l.round} — </span>{l.texte}
          </p>
        ))}
      </div>
    </div>
  )
}
