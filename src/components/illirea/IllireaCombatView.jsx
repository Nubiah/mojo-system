import { useState } from 'react'
import { ChevronLeft, Dices, Flag, Play, Plus, Skull, SkipForward, Swords, Trash2, X } from 'lucide-react'
import { applyRoundEffects, createIllireaParticipantFromMonster, illireaLootForDead } from '../../data/combat.js'
import { defenseLabel, ILLIREA_CARACS, newIllireaId, normalizeIllireaMonster, parseAttackPool, rollAttackPool } from '../../data/illirea.js'
import { rollDiceExpression } from '../../data/dice.js'
import LootResult from '../teotl/LootResult.jsx'
import CombatLog from '../shared/CombatLog.jsx'
import ParticipantHp from '../shared/ParticipantHp.jsx'
import QuickAddForm from '../shared/QuickAddForm.jsx'
import StatusForm from '../shared/StatusForm.jsx'
import { inputCls } from '../shared/inputCls.js'

export default function IllireaCombatView({ combat, monstersById = {}, tablesById = {}, onChange, onBack, onDelete }) {
  const [addOpen, setAddOpen] = useState(false)
  const [addSel, setAddSel] = useState('')
  const [addQty, setAddQty] = useState('1')
  const [quickOpen, setQuickOpen] = useState(false)

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

  const addQuickParticipant = () => {
    const nom = quickNom.trim() || 'Obstacle'
    const pvMax = Math.max(1, Math.floor(Number(quickPv) || 10))
    const added = {
      instanceId: newIllireaId(),
      monsterId: null, // jamais sauvegardé dans le bestiaire
      nom,
      niveau: null,
      pvMax,
      pv: pvMax,
      mort: false,
      statuts: [],
      defense: { bas: 3, moyen: 4, haut: 5 },
      caracs: {},
      capacites: [],
      inventaire: [],
      lootTables: []
    }
    onChange(pushLog({ ...combat, participants: [...combat.participants, added] }, [`${nom} (${pvMax} PV) rejoint le combat.`]))
    setQuickOpen(false)
    setQuickNom('')
    setQuickPv('10')
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

  // Dégâts personnalisés (valeur fixe ou expression de dés ; négatif = soin)
  const applyDamageTo = (p, raw, clear) => {
    if (p.mort) return
    raw = (raw || '').trim()
    if (!raw) return
    const d = rollDiceExpression(raw)
    if (!d) {
      onChange(pushLog(combat, [`Valeur « ${raw} » illisible pour ${p.nom} (ex : 3, 2d6, 1d8+2).`]))
      return
    }
    if (d.total === 0) return
    const healing = d.total < 0
    const dmg = healing ? -d.total : d.total
    const pv = Math.max(0, Math.min(p.pvMax, p.pv - d.total))
    const participants = combat.participants.map((x) =>
      x.instanceId === p.instanceId
        ? {
            ...x,
            pv,
            mort: pv === 0,
            degatsDernier: healing ? `+${dmg} PV (${raw})` : `${raw} → ${d.total}`,
            degatsRound: healing ? Math.max(0, (x.degatsRound || 0) - dmg) : (x.degatsRound || 0) + dmg
          }
        : x
    )
    let next = { ...combat, participants }
    const entries = [healing ? `${p.nom} récupère ${dmg} PV (${raw} → +${dmg}).` : `${p.nom} subit ${d.detail}.`]
    if (pv === 0 && !p.mort) entries.push(`${p.nom} est mort.`)
    next = pushLog(next, entries)
    onChange(next)
    clear?.()
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
        ) : quickOpen ? (
          <QuickAddForm
            onAdd={({ nom, pvMax }) => {
              const added = {
                instanceId: newIllireaId(),
                monsterId: null, // jamais sauvegardé dans le bestiaire
                nom,
                niveau: null,
                pvMax,
                pv: pvMax,
                mort: false,
                statuts: [],
                defense: { bas: 3, moyen: 4, haut: 5 },
                caracs: {},
                capacites: [],
                inventaire: [],
                lootTables: []
              }
              onChange(pushLog({ ...combat, participants: [...combat.participants, added] }, [`${nom} (${pvMax} PV) rejoint le combat.`]))
              setQuickOpen(false)
            }}
            onCancel={() => setQuickOpen(false)}
          />
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={() => setAddOpen(true)}
              disabled={monsters.length === 0}
              title={monsters.length === 0 ? 'Le bestiaire Illirea est vide' : 'Ajouter un monstre au combat en cours'}
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

      <div className="grid items-start sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
        {combat.participants.map((p) => (
          <ParticipantCard
            key={p.instanceId}
            p={p}
            monstersById={monstersById}
            onBumpHp={bumpHp}
            onApplyDamage={applyDamageTo}
            onToggleMort={toggleMort}
            onLog={(entries) => onChange(pushLog(combat, entries))}
            onRefresh={refreshParticipant}
            onSetStatuses={setStatuses}
          />
        ))}
      </div>

      {/* Journal */}
      <CombatLog log={combat.log} />
    </div>
  )
}

function ParticipantCard({ p, monstersById = {}, onBumpHp, onApplyDamage, onToggleMort, onLog, onRefresh, onSetStatuses }) {
  const [atkOpen, setAtkOpen] = useState(false)
  const [result, setResult] = useState(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [dmgVal, setDmgVal] = useState('')

  const adHoc = !p.monsterId // participant à la volée (obstacle…) — aucune fiche bestiaire

  const caps = p.capacites || []
  const fresh = monstersById[p.monsterId]
  const statuts = p.statuts || []

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
    setResult(null)
  }

  const launchAttack = (capArg) => {
    const cap = capArg
    if (!cap) return
    const pool = parseAttackPool(cap.attaque, p.caracs)
    if (pool.error) {
      setResult({ error: pool.error, capNom: cap.nom, attaqueExpr: cap.attaque })
      return
    }
    const attack = rollAttackPool(pool.totalDice)
    onLog([`${p.nom} utilise ${cap.nom} : ${cap.attaque || '?'} → ${pool.totalDice}D6 [${attack.dice.slice(0, 60).join(' ')}${attack.dice.length > 60 ? ' …' : ''}] → ${attack.succes} succès.`])
    setResult({ capNom: cap.nom, attaqueExpr: cap.attaque, pool, attack, degatsExpr: cap.degats, damage: null, damageError: null, cap })
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
          {adHoc ? (
            <p className="text-xs text-slate-400 mt-0.5"><span className="px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">à la volée</span></p>
          ) : (
            <>
              <p className="text-xs text-slate-400 mt-0.5">
                Niv. {p.niveau} • Déf <span className="text-slate-200 font-semibold">{defenseLabel(p)}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {ILLIREA_CARACS.map((k) => `${k} ${p.caracs?.[k] ?? '–'}`).join(' • ')}
              </p>
            </>
          )}
        </div>
        <button
          onClick={() => onToggleMort(p)}
          title={p.mort ? 'Ranimer (1 PV)' : 'Marquer mort'}
          className={`p-1.5 rounded-lg ${p.mort ? 'text-emerald-300 hover:bg-emerald-300/10' : 'text-slate-400 hover:text-red-300 hover:bg-red-500/10'}`}
        >
          <Skull size={15} />
        </button>
      </div>

      {/* PV : barre, boutons ±, dégâts personnalisés, historique */}
      <ParticipantHp
        p={p}
        dmgVal={dmgVal}
        onDmgVal={setDmgVal}
        onApplyDamage={() => onApplyDamage(p, dmgVal, () => setDmgVal(''))}
        onBumpHp={(d) => onBumpHp(p, d)}
      />

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
          <StatusForm
            onCancel={() => setStatusOpen(false)}
            onAdd={({ nom, degats, duree }) => {
              onSetStatuses(
                p,
                [...statuts, { id: newIllireaId(), nom, degats, duree }],
                [`${p.nom} est ${nom.toLowerCase()}${nom.toLowerCase().endsWith('e') ? 'e' : ''} (${degats}/tour${duree ? `, ${duree} tour${duree > 1 ? 's' : ''}` : ', jusqu’à la fin'}).`]
              )
              setStatusOpen(false)
            }}
          />
        ) : (
          <button onClick={() => setStatusOpen(true)} disabled={p.mort} className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30">
            + Poison / saignement / statut
          </button>
        )}
      </div>

      {/* Attaque */}
      <div className="mt-1.5">
        <button
          onClick={() => setAtkOpen(!atkOpen)}
          disabled={p.mort || adHoc}
          title={adHoc ? 'Aucune capacité — participant ajouté à la volée' : 'Lancer une attaque (capacité de la fiche)'}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Swords size={13} /> Attaquer
        </button>

        {atkOpen && !p.mort && !adHoc && (
          <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900 p-2.5 space-y-2">
            {caps.length === 0 ? (
              <p className="text-xs text-slate-400">
                Aucune capacité sur cette fiche. Ajoute-les dans le bestiaire, puis recharge ci-dessous.
              </p>
            ) : (
              <div className="space-y-1">
                {caps.map((c) => (
                  <div key={c.id || c.nom} className="relative group/cap">
                    <button
                      onClick={() => launchAttack(c)}
                      className="w-full text-left text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:border-violet-400/40"
                    >
                      ⚔ {c.nom}{c.attaque ? <span className="text-slate-400"> — {c.attaque}{c.degats ? ` → ${c.degats}` : ''}</span> : null}
                    </button>
                    {c.description ? (
                      <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden group-hover/cap:block w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-200 shadow-lg shadow-black/50">
                        {c.description}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
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
                      <button onClick={() => launchAttack(result.cap)} className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800">
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
