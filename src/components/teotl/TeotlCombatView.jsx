import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Dices, Flag, Play, Plus, Skull, SkipForward, Trash2, X } from 'lucide-react'
import { applyRoundEffects, createParticipantFromEnemy, participantToLootSource, STATUT_PRESETS } from '../../data/combat.js'
import { rollExploding } from '../../data/dice.js'
import { rollLootForEnemies } from '../../data/loot.js'
import { newId } from '../../data/teotl.js'
import LootResult from './LootResult.jsx'

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/30'

export default function TeotlCombatView({ combat, enemiesById = {}, tablesById = {}, onChange, onBack, onDelete }) {
  const [statusFor, setStatusFor] = useState(null) // instanceId | null
  const [preset, setPreset] = useState('Poison')
  const [sNom, setSNom] = useState('Poison')
  const [sDegats, setSDegats] = useState('1d4')
  const [sDuree, setSDuree] = useState('3')
  const [lastRoll, setLastRoll] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addSel, setAddSel] = useState('')
  const [addQty, setAddQty] = useState('1')
  const logRef = useRef(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: 999999 })
  }, [combat.log.length])

  const now = () => new Date().toISOString()
  const pushLog = (base, entries) => ({
    ...base,
    log: [...base.log, ...entries.map((texte) => ({ id: newId(), round: base.round, texte, at: now() }))].slice(-300),
    updatedAt: now()
  })

  const dead = combat.participants.filter((p) => p.mort)
  const alive = combat.participants.filter((p) => !p.mort)

  // ── Round suivant : DoT + durées ──
  const nextRound = () => {
    const { participants, entries } = applyRoundEffects(combat.participants)
    let next = { ...combat, participants, round: combat.round + 1 }
    next = pushLog(next, entries)
    next.log.push({ id: newId(), round: next.round, texte: `Début du round ${next.round}.`, at: now() })
    onChange(next)
  }

  // ── PV ──
  const bumpHp = (p, d) => {
    if (p.mort) return
    const pv = Math.max(0, Math.min(p.pvMax, p.pv + d))
    const participants = combat.participants.map((x) => (x.instanceId === p.instanceId ? { ...x, pv, mort: pv === 0 } : x))
    let next = { ...combat, participants }
    if (pv === 0 && !p.mort) next = pushLog(next, [`${p.nom} est mort.`])
    else next = { ...next, updatedAt: now() }
    onChange(next)
  }

  const toggleMort = (p) => {
    const participants = combat.participants.map((x) =>
      x.instanceId === p.instanceId
        ? p.mort
          ? { ...x, mort: false, pv: Math.max(x.pv, 1) }
          : { ...x, mort: true, pv: 0 }
        : x
    )
    onChange(pushLog({ ...combat, participants }, [p.mort ? `${p.nom} se relève (1 PV).` : `${p.nom} est marqué mort.`]))
  }

  // ── Statuts ──
  const openStatusForm = (p) => {
    setStatusFor(p.instanceId)
    setPreset('Poison')
    setSNom('Poison')
    setSDegats('1d4')
    setSDuree('3')
  }

  const addStatus = (p) => {
    const nom = (preset === 'Personnalisé' ? sNom : preset).trim() || 'Statut'
    const degats = sDegats.trim() || '1'
    const duree = sDuree.trim() === '' ? null : Math.max(1, Number(sDuree) || 1)
    const participants = combat.participants.map((x) =>
      x.instanceId === p.instanceId ? { ...x, statuts: [...x.statuts, { id: newId(), nom, degats, duree }] } : x
    )
    onChange(pushLog({ ...combat, participants }, [`${p.nom} est ${nom.toLowerCase()}${nom.toLowerCase().endsWith('e') ? 'e' : ''} (${degats}/tour${duree ? `, ${duree} tour${duree > 1 ? 's' : ''}` : ', jusqu’à la fin'}).`]))
    setStatusFor(null)
  }

  const removeStatus = (p, s) => {
    const participants = combat.participants.map((x) =>
      x.instanceId === p.instanceId ? { ...x, statuts: x.statuts.filter((y) => y.id !== s.id) } : x
    )
    onChange(pushLog({ ...combat, participants }, [`${p.nom} n’est plus ${s.nom.toLowerCase()}.`]))
  }

  // ── Capacités (1 au premier dé = échec, dé max = critique explosif) ──
  const useAbility = (p, cap) => {
    if (p.mort) return
    const expr = cap.deAttaque?.trim()
    const roll = expr ? rollExploding(expr) : null
    const texte = roll
      ? `${p.nom} utilise ${cap.nom} : ${roll.detail}${cap.note ? ` — ${cap.note}` : ''}`
      : `${p.nom} utilise ${cap.nom}${expr ? ` (${expr}, illisible)` : ''}${cap.note ? ` — ${cap.note}` : ''}`
    onChange(pushLog(combat, [texte]))
    setLastRoll(texte)
  }

  // ── Ajout de participants en cours de combat ──
  const enemies = Object.values(enemiesById)
  const addParticipants = () => {
    const src = enemiesById[addSel || enemies[0]?.id]
    const n = Math.max(1, Math.min(99, Math.floor(Number(addQty) || 1)))
    if (!src) return
    const added = Array.from({ length: n }, () => createParticipantFromEnemy(src))
    onChange(pushLog({ ...combat, participants: [...combat.participants, ...added] }, [`${n}× ${src.nom} rejoint${n > 1 ? 'ent' : ''} le combat.`]))
    setAddOpen(false)
    setAddSel('')
    setAddQty('1')
  }

  // ── Butin des morts ──
  const lootDead = () => {
    if (dead.length === 0) return
    const drops = rollLootForEnemies(dead.map(participantToLootSource), tablesById)
    onChange({ ...combat, lootResult: { drops, at: now(), deadCount: dead.length }, updatedAt: now() })
  }

  const finish = (termine) => {
    onChange(pushLog({ ...combat, statut: termine ? 'termine' : 'encours' }, [termine ? 'Le combat est terminé.' : 'Le combat reprend.']))
  }

  const hpColor = (p) => {
    const r = p.pvMax ? p.pv / p.pvMax : 1
    return r > 0.5 ? 'bg-emerald-400' : r > 0.25 ? 'bg-amber-400' : 'bg-red-400'
  }

  return (
    <div>
      {/* Barre combat */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
          <ChevronLeft size={15} /> Combats
        </button>
        <div className="flex-1 min-w-40">
          <h3 className="font-bold leading-tight">{combat.nom}</h3>
          <p className="text-[11px] text-slate-500">
            Round {combat.round} • {alive.length} en vie • {dead.length} mort{dead.length > 1 ? 's' : ''} •{' '}
            <span className={combat.statut === 'termine' ? 'text-slate-400' : 'text-emerald-300'}>{combat.statut === 'termine' ? 'Terminé' : 'En cours'}</span>
          </p>
        </div>
        <button onClick={nextRound} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 hover:bg-slate-700">
          <SkipForward size={15} /> Round suivant
        </button>
        <button
          onClick={lootDead}
          disabled={dead.length === 0}
          title={dead.length === 0 ? 'Aucun monstre mort pour l’instant' : `Tirer le butin de ${dead.length} mort${dead.length > 1 ? 's' : ''}`}
          className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-teal-300 text-slate-950 font-semibold hover:bg-teal-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Dices size={15} /> Butin des morts ({dead.length})
        </button>
        {combat.statut === 'termine' ? (
          <button onClick={() => finish(false)} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
            <Play size={15} /> Reprendre
          </button>
        ) : (
          <button onClick={() => finish(true)} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
            <Flag size={15} /> Terminer
          </button>
        )}
        <button onClick={() => { if (confirm(`Supprimer ${combat.nom} ?`)) onDelete(combat.id) }} className="p-2 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10">
          <Trash2 size={15} />
        </button>
      </div>

      {lastRoll && (
        <p className="mb-3 text-xs px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-400/25 text-violet-100">🎲 {lastRoll}</p>
      )}

      {combat.lootResult && (
        <div className="mb-4">
          <LootResult
            drops={combat.lootResult.drops}
            title={`Butin — ${combat.lootResult.deadCount} mort${combat.lootResult.deadCount > 1 ? 's' : ''}`}
            onReroll={lootDead}
            onClear={() => onChange({ ...combat, lootResult: null, updatedAt: now() })}
          />
        </div>
      )}

      {combat.participants.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
          Aucun participant — ajoute des monstres ci-dessous.
        </div>
      )}

      <div className="mb-2.5">
        {addOpen ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-slate-400 mb-1.5">Monstre du bestiaire</label>
              <select className={`${inputCls} !py-1.5 !text-xs`} value={addSel || enemies[0]?.id || ''} onChange={(e) => setAddSel(e.target.value)}>
                {[...enemies].sort((a, b) => (Number(b.niveau) || 0) - (Number(a.niveau) || 0)).map((m) => (
                  <option key={m.id} value={m.id}>{m.nom} — niv. {m.niveau} • {m.pvMax} PV</option>
                ))}
              </select>
            </div>
            <div className="w-20">
              <label className="block text-xs text-slate-400 mb-1.5">Nombre</label>
              <input className={`${inputCls} !py-1.5 !text-xs`} inputMode="numeric" value={addQty} onChange={(e) => setAddQty(e.target.value)} />
            </div>
            <button onClick={addParticipants} className="text-xs px-3 py-1.5 rounded-lg bg-teal-300 text-slate-950 font-semibold hover:bg-teal-200">
              Ajouter
            </button>
            <button onClick={() => setAddOpen(false)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddOpen(true)}
            disabled={enemies.length === 0}
            title={enemies.length === 0 ? 'Le bestiaire Teotl est vide' : 'Ajouter un monstre au combat en cours'}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
          >
            <Plus size={13} /> Ajouter un monstre
          </button>
        )}
      </div>

      {/* Participants */}
      <div className="grid items-start md:grid-cols-2 2xl:grid-cols-3 gap-2.5">
        {combat.participants.map((p) => (
          <article key={p.instanceId} className={`rounded-xl border p-3 ${p.mort ? 'border-slate-800 bg-slate-950 opacity-70' : 'border-slate-800 bg-slate-950'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-[15px] leading-snug inline-flex items-center gap-2">
                  {p.nom}
                  {p.mort && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/15 border border-red-400/30 text-red-300">
                      <Skull size={11} /> Mort
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Niv. {p.niveau}{p.snapshot?.armure ? ` • ${p.snapshot.armure}` : ''}</p>
              </div>
              <button
                onClick={() => toggleMort(p)}
                title={p.mort ? 'Ranimer (1 PV)' : 'Marquer mort'}
                className={`p-1.5 rounded-lg ${p.mort ? 'text-emerald-300 hover:bg-emerald-300/10' : 'text-slate-400 hover:text-red-300 hover:bg-red-500/10'}`}
              >
                <Skull size={15} />
              </button>
            </div>

            {/* PV */}
            <div className="mt-1.5">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">PV</span>
                <span className="font-bold text-slate-100">{p.pv} / {p.pvMax}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${hpColor(p)}`} style={{ width: `${p.pvMax ? Math.round((p.pv / p.pvMax) * 100) : 0}%` }} />
              </div>
              <div className="mt-1.5 flex gap-1.5">
                {[-5, -1, 1, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => bumpHp(p, d)}
                    disabled={p.mort}
                    className="flex-1 text-xs px-2 py-1 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
                  >
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
              </div>
            </div>

            {/* Statuts */}
            <div className="mt-1.5">
              {(p.statuts || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {p.statuts.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-200">
                      {s.nom} {s.degats}/t{s.duree === null ? ' ∞' : ` (${s.duree}t)`}
                      <button onClick={() => removeStatus(p, s)} className="hover:text-white"><X size={11} /></button>
                    </span>
                  ))}
                </div>
              )}
              {statusFor === p.instanceId ? (
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
                    <button onClick={() => setStatusFor(null)} className="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200">Annuler</button>
                    <button onClick={() => addStatus(p)} className="text-xs px-3 py-1.5 rounded-lg bg-purple-400 text-slate-950 font-semibold hover:bg-purple-300">Ajouter</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => openStatusForm(p)} disabled={p.mort} className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30">
                  + Poison / saignement / statut
                </button>
              )}
            </div>

            {/* Capacités lançables */}
            {((p.snapshot?.competences || []).length > 0 || (p.snapshot?.actionsBonus || []).length > 0) && (
              <div className="mt-1.5 space-y-1">
                {(p.snapshot.competences || []).map((c) => (
                  <button
                    key={c.id || c.nom}
                    onClick={() => useAbility(p, c)}
                    disabled={p.mort}
                    className="w-full text-left text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:border-violet-400/40 disabled:opacity-30"
                  >
                    ⚔ {c.nom}{c.deAttaque ? <span className="text-slate-400"> — {c.deAttaque}</span> : null}
                  </button>
                ))}
                {(p.snapshot.actionsBonus || []).map((a) => (
                  <button
                    key={a.id || a.nom}
                    onClick={() => useAbility(p, a)}
                    disabled={p.mort}
                    className="w-full text-left text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-dashed border-slate-700 text-slate-300 hover:border-violet-400/40 disabled:opacity-30"
                  >
                    ✦ {a.nom}{a.deAttaque ? <span className="text-slate-400"> — {a.deAttaque}</span> : null} <span className="text-slate-500">(bonus)</span>
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {/* Journal */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-[11px] tracking-wider text-slate-500 font-medium mb-2">JOURNAL DU COMBAT</p>
        <div ref={logRef} className="space-y-1 max-h-56 overflow-auto pr-1">
          {combat.log.length === 0 && <p className="text-xs text-slate-500">Aucun événement.</p>}
          {combat.log.map((l) => (
            <p key={l.id} className="text-xs text-slate-300">
              <span className="text-slate-500">R{l.round} — </span>{l.texte}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
