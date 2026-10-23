import { useMemo, useState } from 'react'
import { Minus, Plus, Search } from 'lucide-react'

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/30'
const labelCls = 'block text-xs text-slate-400 mb-1.5'

const defaultName = () => `Combat du ${new Date().toLocaleDateString('fr-FR')}`

// Compose un combat à la main, sans passer par une rencontre prédéfinie.
export default function CombatBuilder({ items = [], onCancel, onCreate }) {
  const [nom, setNom] = useState('')
  const [q, setQ] = useState('')
  const [qty, setQty] = useState({})
  const [error, setError] = useState('')

  const sorted = useMemo(
    () => [...items].sort((a, b) => (Number(b.niveau) || 0) - (Number(a.niveau) || 0) || String(a.nom || '').localeCompare(String(b.nom || ''), 'fr')),
    [items]
  )
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return sorted
    return sorted.filter((i) => String(i.nom || '').toLowerCase().includes(needle))
  }, [sorted, q])

  const picks = useMemo(() => Object.entries(qty).map(([id, n]) => ({ id, qty: Number(n) })).filter((p) => p.qty > 0), [qty])
  const byId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items])
  const count = picks.reduce((s, p) => s + p.qty, 0)
  const level = picks.reduce((s, p) => s + (Number(byId[p.id]?.niveau) || 0) * p.qty, 0)
  const selected = picks.map((p) => ({ ...p, item: byId[p.id] })).filter((p) => p.item)

  const bump = (id, d) =>
    setQty((prev) => {
      const next = Math.max(0, Math.min(99, (Number(prev[id]) || 0) + d))
      return { ...prev, [id]: next }
    })
  const setValue = (id, v) =>
    setQty((prev) => ({ ...prev, [id]: Math.max(0, Math.min(99, Math.floor(Number(v) || 0))) }))

  const create = () => {
    if (picks.length === 0) {
      setError('Ajoute au moins un monstre au combat.')
      return
    }
    onCreate({ nom: nom.trim() || defaultName(), picks })
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 mb-6">
      <h3 className="text-lg font-bold mb-4">Nouveau combat</h3>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Nom du combat</label>
          <input className={inputCls} placeholder={defaultName()} value={nom} onChange={(e) => setNom(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Rechercher un monstre</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className={`${inputCls} pl-9`} placeholder="Nom…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      <p className="text-[11px] tracking-wider text-slate-400 font-medium mt-5 mb-2">
        MONSTRES — NIVEAU TOTAL : <span className="text-slate-100 font-bold">{level}</span> ({count} monstre{count > 1 ? 's' : ''})
      </p>

      {items.length === 0 ? (
        <p className="text-xs text-slate-500">Le bestiaire est vide : crée d’abord un monstre pour composer un combat.</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-slate-500">Aucun monstre ne correspond à « {q.trim()} ».</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-auto pr-1">
          {filtered.map((i) => {
            const n = Number(qty[i.id]) || 0
            return (
              <div key={i.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${n > 0 ? 'bg-slate-800/80 border-teal-300/40' : 'bg-slate-900 border-slate-800'}`}>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-slate-100 truncate">{i.nom || 'Sans nom'}</span>
                  <span className="block text-[11px] text-slate-500">Niv. {i.niveau} • {i.pvMax} PV</span>
                </span>
                <button onClick={() => bump(i.id, -1)} disabled={n === 0} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30">
                  <Minus size={14} />
                </button>
                <input
                  className="w-10 text-center text-sm font-bold bg-transparent text-slate-100 outline-none"
                  inputMode="numeric"
                  value={n}
                  onChange={(e) => setValue(i.id, e.target.value)}
                  aria-label={`Quantité de ${i.nom}`}
                />
                <button onClick={() => bump(i.id, 1)} className="p-1.5 rounded-lg text-teal-200 hover:bg-teal-300/10">
                  <Plus size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span key={p.id} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              {p.qty}× {p.item.nom} (niv. {p.item.niveau})
            </span>
          ))}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm border border-slate-700 text-slate-300 hover:bg-slate-800">Annuler</button>
        <button onClick={create} className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-300 text-slate-950 hover:bg-teal-200">
          Lancer le combat
        </button>
      </div>
    </div>
  )
}
