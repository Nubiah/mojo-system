// Mojo System — Moteur de dés (1d6, 1d6+2, 2d4-1, 3, d8)
export function parseDiceExpression(raw) {
  const s = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, '')
  if (s === '') return null
  if (/^[+-]?\d+$/.test(s)) return { dice: [], flat: parseInt(s, 10) }
  const m = s.match(/^(\d*)d(\d+)([+-]\d+)?$/)
  if (!m) return null
  const faces = parseInt(m[2], 10)
  if (!faces || faces < 2 || faces > 1000) return null
  return {
    dice: [{ n: Math.min(Math.max(parseInt(m[1] || '1', 10), 1), 100), faces }],
    flat: m[3] ? parseInt(m[3], 10) : 0
  }
}

// -> { total, detail } ou null si expression illisible. detail ex : "1d6+2 (4 +2)"
export function rollDiceExpression(raw, rng = Math.random) {
  const parsed = parseDiceExpression(raw)
  if (!parsed) return null
  const bits = []
  let total = parsed.flat
  parsed.dice.forEach(({ n, faces }) => {
    const rolls = []
    for (let i = 0; i < n; i++) rolls.push(1 + Math.floor(rng() * faces))
    total += rolls.reduce((a, b) => a + b, 0)
    bits.push(`${n}d${faces} (${rolls.join(' + ')})`)
  })
  if (parsed.flat) bits.push(parsed.flat > 0 ? `+${parsed.flat}` : `${parsed.flat}`)
  return { total, detail: `${String(raw).trim()} → ${bits.join(' ')} = ${total}` }
}

// Teotl — jet avec 1-échec et critiques explosifs :
// - 1 au PREMIER dé du pool -> attaque ÉCHOUÉE (failed: true)
// - tout dé au maximum de ses faces -> relance chaînée d’un dé identique (extra)
// -> { total, dice, extra, failed, exploded, detail } ou null si illisible
export function rollExploding(raw, rng = Math.random) {
  const parsed = parseDiceExpression(raw)
  if (!parsed) return null
  if (parsed.dice.length === 0) {
    return {
      total: parsed.flat, dice: [], extra: [], failed: false, exploded: false,
      detail: `${String(raw).trim()} → ${parsed.flat} (fixe)`
    }
  }
  const { n, faces } = parsed.dice[0]
  const dice = []
  for (let i = 0; i < n; i++) dice.push(1 + Math.floor(rng() * faces))
  const failed = dice.length > 0 && dice[0] === 1
  const extra = []
  let guard = 0
  const explode = (v) => {
    if (v !== faces || guard >= 100) return
    guard += 1
    const r = 1 + Math.floor(rng() * faces)
    extra.push(r)
    explode(r)
  }
  dice.forEach(explode)
  const total = dice.reduce((a, b) => a + b, 0) + extra.reduce((a, b) => a + b, 0) + parsed.flat
  const exploded = extra.length > 0
  const bits = [`${n}d${faces} (${dice.join(' + ')})`]
  if (exploded) bits.push(`explosions (${extra.join(' + ')})`)
  if (parsed.flat) bits.push(parsed.flat > 0 ? `+${parsed.flat}` : `${parsed.flat}`)
  let detail = `${String(raw).trim()} → ${bits.join(' ')} = ${total}`
  if (failed) detail += ' — ÉCHEC (1 au premier dé)'
  else if (exploded) detail += ' — CRITIQUE EXPLOSIF'
  return { total, dice, extra, failed, exploded, flat: parsed.flat, detail }
}
