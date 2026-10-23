import { useMemo, useState } from 'react'
import { Check, Copy, Dices, Eraser } from 'lucide-react'

// Affichage groupé d’un tirage de butin + copie presse-papiers.
// drops: [{ nom, detail, quantite, source }]
export default function LootResult({ drops = [], title = 'Butin', onReroll, onClear, emptyText = 'Rien obtenu cette fois — les dés n’étaient pas avec vous.' }) {
  const [copied, setCopied] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map()
    drops.forEach((d) => {
      const key = `${d.nom}||${d.detail || ''}`
      if (!map.has(key)) map.set(key, { nom: d.nom, detail: d.detail, quantite: 0, sources: [] })
      const g = map.get(key)
      g.quantite += d.quantite
      g.sources.push(d.source)
    })
    return [...map.values()]
  }, [drops])

  const copy = async () => {
    const text = grouped.length === 0
      ? `${title} : rien obtenu.`
      : [`${title}`, ...grouped.map((g) => `• ${g.nom} ×${g.quantite}${g.detail ? ` (${g.detail})` : ''}`)].join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-teal-300/25 bg-teal-300/[0.07] p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-teal-100">{title}</p>
        <div className="flex flex-wrap gap-2">
          {onReroll && (
            <button onClick={onReroll} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-teal-300/30 text-teal-100 hover:bg-teal-300/10">
              <Dices size={13} /> Relancer
            </button>
          )}
          <button onClick={copy} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-teal-300/30 text-teal-100 hover:bg-teal-300/10">
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copié !' : 'Copier'}
          </button>
          {onClear && (
            <button onClick={onClear} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200">
              <Eraser size={13} /> Effacer
            </button>
          )}
        </div>
      </div>
      {grouped.length === 0 ? (
        <p className="text-sm text-slate-300">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {grouped.map((g) => (
            <li key={`${g.nom}-${g.detail}`} className="text-sm px-3 py-2 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-100 font-medium">{g.nom} ×{g.quantite}</span>
              {g.detail && <span className="text-slate-400"> — {g.detail}</span>}
              <span className="block text-[11px] text-slate-500 mt-0.5">{[...new Set(g.sources)].join(' · ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
