import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Dices, Flag, Play, Plus, Skull, SkipForward, Swords, Trash2, X } from 'lucide-react'
import { applyRoundEffects, createIllireaParticipantFromMonster, illireaLootForDead, STATUT_PRESETS } from '../../data/combat.js'
import { defenseLabel, ILLIREA_CARACS, newIllireaId, normalizeIllireaMonster, parseAttackPool, rollAttackPool } from '../../data/illirea.js'
import { rollDiceExpression } from '../../data/dice.js'
import LootResult from '../teotl/LootResult.jsx'

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/30'

export default function IllireaCombatView({ combat, monstersById = {}, tablesById = {}, onChange, onBack, onDelete }) {
  const logRef = useRef(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addSel, setAddSel] = useState('')
  const [addQty, setAddQty] = useState('1')

  useEffect(() => {
    logRef.current?.scrollTo({ top: 999999 })
  }, [combat.log.length])

  const now = () => new Date().toISOString()
  const pushLog = (base, entries) => ({
    ...base,
    log: [...base.log, ...entries.map((texte) => ({ id: newIllireaId(), round: base.round, texte, at: now() }))].slice(-300),
    updatedAt: now()
  })

  const dead = combat.participants.filter((p) => p.mort)
  const alive = combat.participants.filter((p) => !p.mort)

  const nextRound = () => {
    const { participants, entries } = applyRoundEffects(combat.participants)
    let next = { ...combat, participants, round: combat.round + 1 }
    next = pushLog(next, entries)
    next.log.push({ id: newIllireaId(), round: next.round, texte: `Début du round ${next.round}.`, at: now() })
    onChange(next)
  }

  const monsters = Object.values(monstersById)

  const addParticipants = () => {
    const src = monstersById[addSel || monsters[0]?.id]
    const n = Math.max(1, Math.min(99, Math.floor(Number(addQty) || 1)))
    if (!src) return
    const added = Array.from({ length: n }, () => createIllireaParticipantFromMonster(src))
    onChange(pushLog({ ...combat, participants: [...combat.participants, ...added] }, [`${n}× ${src.nom} rejoint${n > 1 ? 'ent' : ''} le combat.`]))
    setAddOpen(false)
    setAddSel('')
    setAddQty('1')
  }

  const setStatuses = (p, statuts, entries) => {
    const participants = combat.participants.map((x) => (x.instanceId === p.instanceId ? { ...x, statuts } : x))
    onChange(pushLog({ ...combat, participants }, entries))
  }

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

  // Recharge les données figées (capacités, caracs…) depuis la fiche bestiaire actuelle
  const refreshParticipant = (instanceId, patch) => {
    const p = combat.participants.find((x) => x.instanceId === instanceId)
    const participants = combat.participants.map((x) => (x.instanceId === instanceId ? { ...x, ...patch } : x))
    onChange(pushLog({ ...combat, participants }, [`Fiche de ${p?.nom} rechargée depuis le bestiaire.`]))
  }

  const lootDead = () => {
    if (dead.length === 0) return
    onChange({ ...combat, lootResult: { drops: illireaLootForDead(combat.participants, tablesById), at: now(), deadCount: dead.length }, updatedAt: now() })
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
          title={dead.length === 0 ? 'Aucun monstre mort pour l’instant' : `Tirer l’inventaire de ${dead.length} mort${dead.length > 1 ? 's' : ''}`}
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
              <select className={`${inputCls} !py-1.5 !text-xs`} value={addSel || monsters[0]?.id || ''} onChange={(e) => setAddSel(e.target.value)}>
                {[...monsters].sort((a, b) => (Number(b.niveau) || 0) - (Number(a.niveau) || 0)).map((m) => (
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
            disabled={monsters.length === 0}
            title={monsters.length === 0 ? 'Le bestiaire Illirea est vide' : 'Ajouter un monstre au combat en cours'}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
          >
            <Plus size={13} /> Ajouter un monstre
          </button>
        )}
      </div>

      <div className="grid items-start sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
        {combat.participants.map((p) => (
          <ParticipantCard
            key={p.instanceId}
            p={p}
            monstersById={monstersById}
            onBumpHp={bumpHp}
            onToggleMort={toggleMort}
            onLog={(entries) => onChange(pushLog(combat, entries))}
            onRefresh={refreshParticipant}
            onSetStatuses={setStatuses}
          />
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

function ParticipantCard({ p, monstersById = {}, onBumpHp, onToggleMort, onLog, onRefresh, onSetStatuses }) {
  const [atkOpen, setAtkOpen] = useState(false)
  const [capSel, setCapSel] = useState('')
  const [result, setResult] = useState(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [preset, setPreset] = useState('Poison')
  const [sNom, setSNom] = useState('Poison')
  const [sDegats, setSDegats] = useState('1d4')
  const [sDuree, setSDuree] = useState('3')

  const caps = p.capacites || []
  const selCapId = capSel || caps[0]?.id || ''
  const fresh = monstersById[p.monsterId]
  const statuts = p.statuts || []

  const openStatusForm = () => {
    setStatusOpen(true)
    setPreset('Poison')
    setSNom('Poison')
    setSDegats('1d4')
    setSDuree('3')
  }

  const addStatus = () => {
    const nom = (preset === 'Personnalisé' ? sNom : preset).trim() || 'Statut'
    const degats = sDegats.trim() || '1'
    const duree = sDuree.trim() === '' ? null : Math.max(1, Number(sDuree) || 1)
    onSetStatuses(
      p,
      [...statuts, { id: newIllireaId(), nom, degats, duree }],
      [`${p.nom} est ${nom.toLowerCase()}${nom.toLowerCase().endsWith('e') ? 'e' : ''} (${degats}/tour${duree ? `, ${duree} tour${duree > 1 ? 's' : ''}` : ', jusqu’à la fin'}).`]
    )
    setStatusOpen(false)
  }

  const removeStatus = (s) => {
    onSetStatuses(p, statuts.filter((y) => y.id !== s.id), [`${p.nom} n’est plus ${s.nom.toLowerCase()}.`])
  }

  const reload = () => {
    if (!fresh) return
    const s = normalizeIllireaMonster(fresh)
    onRefresh(p.instanceId, {
      nom: s.nom, niveau: s.niveau, pvMax: s.pvMax, pv: Math.min(p.pv, s.pvMax),
      defense: { ...s.defense }, caracs: { ...s.caracs },
      capacites: s.capacites.map((c) => ({ ...c })), inventaire: s.inventaire.map((o) => ({ ...o }))
    })
    setCapSel('')
    setResult(null)
  }

  const hpColor = () => {
    const r = p.pvMax ? p.pv / p.pvMax : 1
    return r > 0.5 ? 'bg-emerald-400' : r > 0.25 ? 'bg-amber-400' : 'bg-red-400'
  }

  const launchAttack = () => {
    const cap = caps.find((c) => (c.id || c.nom) === selCapId)
    if (!cap) return
    const pool = parseAttackPool(cap.attaque, p.caracs)
    if (pool.error) {
      setResult({ error: pool.error, capNom: cap.nom, attaqueExpr: cap.attaque })
      return
    }
    const attack = rollAttackPool(pool.totalDice)
    onLog([`${p.nom} utilise ${cap.nom} : ${cap.attaque || '?'} → ${pool.totalDice}D6 [${attack.dice.slice(0, 60).join(' ')}${attack.dice.length > 60 ? ' …' : ''}] → ${attack.succes} succès.`])
    setResult({ capNom: cap.nom, attaqueExpr: cap.attaque, pool, attack, degatsExpr: cap.degats, damage: null, damageError: null })
  }

  const launchDamage = () => setResult((r) => {
    if (!r || !r.degatsExpr?.trim()) return r
    const d = rollDiceExpression(r.degatsExpr)
    if (!d) {
      onLog([`Jet de dégâts « ${r.degatsExpr.trim()} » illisible (${r.capNom}).`])
      return { ...r, damage: null, damageError: `« ${r.degatsExpr.trim()} » illisible (ex : 2d6)` }
    }
    onLog([`Dégâts ${r.capNom} : ${d.detail}.`])
    return { ...r, damage: { total: d.total, detail: d.detail }, damageError: null }
  })

  return (
    <article className={`rounded-xl border p-3 ${p.mort ? 'border-slate-800 bg-slate-950 opacity-70' : 'border-slate-800 bg-slate-950'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-bold text-[15px] leading-snug">{p.nom}</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Niv. {p.niveau} • Déf <span className="text-slate-200 font-semibold">{defenseLabel(p)}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {ILLIREA_CARACS.map((k) => `${k} ${p.caracs?.[k] ?? '–'}`).join(' • ')}
          </p>
        </div>
        <button
          onClick={() => onToggleMort(p)}
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
          <div className={`h-full rounded-full transition-all ${hpColor()}`} style={{ width: `${p.pvMax ? Math.round((p.pv / p.pvMax) * 100) : 0}%` }} />
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {[-5, -1, 1, 5].map((d) => (
            <button
              key={d}
              onClick={() => onBumpHp(p, d)}
              disabled={p.mort}
              className="flex-1 text-xs px-2 py-1 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
            >
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>
      </div>

      {/* Statuts (dégâts sur la durée) */}
      <div className="mt-1.5">
        {statuts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {statuts.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-200">
                {s.nom} {s.degats}/t{s.duree === null ? ' ∞' : ` (${s.duree}t)`}
                <button onClick={() => removeStatus(s)} className="hover:text-white"><X size={11} /></button>
              </span>
            ))}
          </div>
        )}
        {statusOpen ? (
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
              <button onClick={() => setStatusOpen(false)} className="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200">Annuler</button>
              <button onClick={addStatus} className="text-xs px-3 py-1.5 rounded-lg bg-purple-400 text-slate-950 font-semibold hover:bg-purple-300">Ajouter</button>
            </div>
          </div>
        ) : (
          <button onClick={openStatusForm} disabled={p.mort} className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30">
            + Poison / saignement / statut
          </button>
        )}
      </div>

      {/* Attaque */}
      <div className="mt-1.5">
        <button
          onClick={() => setAtkOpen(!atkOpen)}
          disabled={p.mort}
          title="Lancer une attaque (capacité de la fiche)"
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-30"
        >
          <Swords size={13} /> Attaquer
        </button>

        {atkOpen && !p.mort && (
          <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900 p-2.5 space-y-2">
            {caps.length === 0 ? (
              <p className="text-xs text-slate-400">
                Aucune capacité sur cette fiche. Ajoute-les dans le bestiaire, puis recharge ci-dessous.
              </p>
            ) : (
              <select className={`${inputCls} !py-1.5 !text-xs`} value={selCapId} onChange={(e) => { setCapSel(e.target.value); setResult(null) }}>
                {caps.map((c) => (
                  <option key={c.id || c.nom} value={c.id || c.nom}>
                    {c.nom}{c.attaque ? ` (${c.attaque}${c.degats ? ` → ${c.degats}` : ''})` : ''}
                  </option>
                ))}
              </select>
            )}
            {fresh ? (
              <button onClick={reload} className="text-[11px] text-slate-500 hover:text-slate-200 underline underline-offset-2 text-left">
                Fiche figée au lancement — recharger depuis le bestiaire
              </button>
            ) : (
              <p className="text-[11px] text-slate-600">Fiche d’origine introuvable dans le bestiaire.</p>
            )}
            {caps.length > 0 && (
              <button onClick={launchAttack} className="text-xs px-3 py-1.5 rounded-lg bg-violet-400 text-slate-950 font-semibold hover:bg-violet-300">
                Lancer l’attaque
              </button>
            )}

            {result && (
              <div className="rounded-lg border border-violet-400/25 bg-violet-500/[0.07] p-2.5 text-xs">
                {result.error ? (
                  <p className="text-red-300">Jet d’attaque {result.error} — corrige la capacité dans la fiche (ex : AGI+3).</p>
                ) : (
                  <>
                    <p className="text-slate-300">
                      {result.attaqueExpr} → {result.pool.totalDice}D6{result.pool.carac ? ` (${result.pool.carac} ${result.pool.caracValue} + ${result.pool.bonusDice})` : ''} : {result.attack.dice.slice(0, 40).join(' ')}{result.attack.dice.length > 40 ? ' …' : ''}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-100">
                      {result.attack.succes} succès <span className="font-normal text-slate-400 text-xs">(à comparer aux seuils de ta cible)</span>
                    </p>
                    {result.damage && <p className="text-slate-200 mt-1">Dégâts {result.damage.detail}</p>}
                    {result.damageError && <p className="text-red-300 mt-1">{result.damageError}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {result.degatsExpr?.trim() && (
                        <button onClick={launchDamage} className="text-[11px] px-2.5 py-1 rounded-lg bg-violet-400 text-slate-950 font-semibold hover:bg-violet-300">
                          Lancer les dégâts{result.damage ? ' (relancer)' : ''}
                        </button>
                      )}
                      <button onClick={launchAttack} className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
                        Relancer
                      </button>
                      <button onClick={() => setResult(null)} className="text-[11px] px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-200">
                        Fermer
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
