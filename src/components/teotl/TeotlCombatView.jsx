import { useState } from 'react'
import { ChevronLeft, Dices, Flag, Play, Plus, Skull, SkipForward, Trash2, X } from 'lucide-react'
import { applyRoundEffects, createParticipantFromEnemy, participantToLootSource } from '../../data/combat.js'
import { rollDiceExpression, rollExploding } from '../../data/dice.js'
import { rollLootForEnemies } from '../../data/loot.js'
import { newId } from '../../data/teotl.js'
import LootResult from './LootResult.jsx'
import CombatLog from '../shared/CombatLog.jsx'
import ParticipantHp from '../shared/ParticipantHp.jsx'
import QuickAddForm from '../shared/QuickAddForm.jsx'
import StatusForm from '../shared/StatusForm.jsx'
import { inputCls } from '../shared/inputCls.js'

export default function TeotlCombatView({ combat, enemiesById = {}, tablesById = {}, onChange, onBack, onDelete }) {
  const [statusFor, setStatusFor] = useState(null) // instanceId | null
  const [lastRoll, setLastRoll] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addSel, setAddSel] = useState('')
  const [addQty, setAddQty] = useState('1')
  const [quickOpen, setQuickOpen] = useState(false)
  const [dmgVals, setDmgVals] = useState({}) // instanceId -> champ dégâts

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
  const addStatus = (p, { nom, degats, duree }) => {
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

  // ── Ajout d'un participant à la volée (nom + PV, jamais sauvé au bestiaire) ──
  const addQuickParticipant = ({ nom, pvMax }) => {
    const added = {
      instanceId: newId(),
      enemyId: null, // jamais sauvegardé dans le bestiaire
      nom,
      niveau: 1,
      pvMax,
      pv: pvMax,
      mort: false,
      statuts: [],
      snapshot: { armure: '', competences: [], actionsBonus: [], lootTables: [], lootIndividuel: [] }
    }
    onChange(pushLog({ ...combat, participants: [...combat.participants, added] }, [`${nom} (${pvMax} PV) rejoint le combat.`]))
    setQuickOpen(false)
  }

  // ── Dégâts personnalisés (valeur fixe ou expression de dés ; négatif = soin) ──
  const applyDamage = (p) => {
    if (p.mort) return
    const raw = (dmgVals[p.instanceId] || '').trim()
    if (!raw) return
    const d = rollDiceExpression(raw)
    if (!d) {
      onChange(pushLog(combat, [`Valeur « ${raw} » illisible pour ${p.nom} (ex : 3, 2d6, 1d8+2).`]))
      return
    }
    if (d.total === 0) return
    const healing = d.total < 0
    const pv = Math.max(0, Math.min(p.pvMax, p.pv - d.total))
    const participants = combat.participants.map((x) =>
      x.instanceId === p.instanceId
        ? {
            ...x,
            pv,
            mort: pv === 0,
            degatsDernier: healing ? `+${-d.total} PV (${raw})` : `${raw} → ${d.total}`,
            degatsRound: healing ? Math.max(0, (x.degatsRound || 0) + d.total) : (x.degatsRound || 0) + d.total
          }
        : x
    )
    let next = { ...combat, participants }
    const entries = [healing ? `${p.nom} récupère ${-d.total} PV (${raw} → +${-d.total}).` : `${p.nom} subit ${d.detail}.`]
    if (pv === 0 && !p.mort) entries.push(`${p.nom} est détruit.`)
    next = pushLog(next, entries)
    onChange(next)
    setDmgVals((prev) => ({ ...prev, [p.instanceId]: '' }))
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
        ) : quickOpen ? (
          <QuickAddForm
            onAdd={addQuickParticipant}
            onCancel={() => setQuickOpen(false)}
          />
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={() => setAddOpen(true)}
              disabled={enemies.length === 0}
              title={enemies.length === 0 ? 'Le bestiaire Teotl est vide' : 'Ajouter un monstre au combat en cours'}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
            >
              <Plus size={13} /> Ajouter un monstre
            </button>
            <button
              onClick={() => setQuickOpen(true)}
              title="Ajouter un participant temporaire (nom + PV), sans passer par le bestiaire"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <Plus size={13} /> Ajouter à la volée
            </button>
          </div>
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
                <p className="text-xs text-slate-400 mt-0.5">
                  {!p.enemyId ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">à la volée</span>
                  ) : (
                    <>Niv. {p.niveau}{p.snapshot?.armure ? ` • ${p.snapshot.armure}` : ''}</>
                  )}
                </p>
              </div>
              <button
                onClick={() => toggleMort(p)}
                title={p.mort ? 'Ranimer (1 PV)' : 'Marquer mort'}
                className={`p-1.5 rounded-lg ${p.mort ? 'text-emerald-300 hover:bg-emerald-300/10' : 'text-slate-400 hover:text-red-300 hover:bg-red-500/10'}`}
              >
                <Skull size={15} />
              </button>
            </div>

            {/* PV : barre, boutons ±, dégâts personnalisés, historique */}
            <ParticipantHp
              p={p}
              dmgVal={dmgVals[p.instanceId] || ''}
              onDmgVal={(v) => setDmgVals((prev) => ({ ...prev, [p.instanceId]: v }))}
              onApplyDamage={() => applyDamage(p)}
              onBumpHp={(d) => bumpHp(p, d)}
            />

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
                <StatusForm
                  onCancel={() => setStatusFor(null)}
                  onAdd={(s) => addStatus(p, s)}
                />
              ) : (
                <button onClick={() => setStatusFor(p.instanceId)} disabled={p.mort} className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30">
                  + Poison / saignement / statut
                </button>
              )}
            </div>

            {/* Capacités lançables */}
            {((p.snapshot?.competences || []).length > 0 || (p.snapshot?.actionsBonus || []).length > 0) && (
              <div className="mt-1.5 space-y-1">
                {(p.snapshot.competences || []).map((c) => (
                  <div key={c.id || c.nom} className="relative group/cap">
                    <button
                      onClick={() => useAbility(p, c)}
                      disabled={p.mort}
                      className="w-full text-left text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:border-violet-400/40 disabled:opacity-30"
                    >
                      ⚔ {c.nom}{c.deAttaque ? <span className="text-slate-400"> — {c.deAttaque}</span> : null}
                    </button>
                    {c.note ? (
                      <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden group-hover/cap:block w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-200 shadow-lg shadow-black/50">
                        {c.note}
                      </span>
                    ) : null}
                  </div>
                ))}
                {(p.snapshot.actionsBonus || []).map((a) => (
                  <div key={a.id || a.nom} className="relative group/cap">
                    <button
                      onClick={() => useAbility(p, a)}
                      disabled={p.mort}
                      className="w-full text-left text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-dashed border-slate-700 text-slate-300 hover:border-violet-400/40 disabled:opacity-30"
                    >
                      ✦ {a.nom}{a.deAttaque ? <span className="text-slate-400"> — {a.deAttaque}</span> : null} <span className="text-slate-500">(bonus)</span>
                    </button>
                    {a.note ? (
                      <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden group-hover/cap:block w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-200 shadow-lg shadow-black/50">
                        {a.note}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {/* Journal */}
      <CombatLog log={combat.log} />
    </div>
  )
}
