/**
 * Testes leves de cosseno/limiar (sem vitest).
 * Rodar: node scripts/test-face-math.mjs
 */

function l2Normalize(vector) {
  let sum = 0
  for (const value of vector) sum += value * value
  const norm = Math.sqrt(sum)
  if (norm < 1e-12) return vector.map(() => 0)
  return vector.map((value) => value / norm)
}

function cosineSimilarity(a, b) {
  const n = Math.min(a.length, b.length)
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < n; i += 1) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  if (denom < 1e-12) return 0
  return dot / denom
}

function decideFromScores(bestScore, thresholds) {
  if (bestScore >= thresholds.autoMatch) return 'matched'
  if (bestScore >= thresholds.reviewMin) return 'needs_review'
  return 'no_match'
}

function deterministicUnitVector(seed, dimensions = 64) {
  const raw = []
  let state = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    state ^= seed.charCodeAt(i)
    state = Math.imul(state, 16777619)
  }
  for (let d = 0; d < dimensions; d += 1) {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    raw.push(((state >>> 0) % 10000) / 5000 - 1)
  }
  return l2Normalize(raw)
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const a = deterministicUnitVector('probe:aluno-1')
const b = deterministicUnitVector('probe:aluno-1')
const c = deterministicUnitVector('probe:aluno-2')
assert(Math.abs(cosineSimilarity(a, b) - 1) < 1e-9, 'mesmo seed deve ter cosseno ~1')
assert(cosineSimilarity(a, c) < 0.95, 'seeds diferentes não devem ser idênticos')

const base = deterministicUnitVector('probe:x')
const noise = deterministicUnitVector('noise:x')
const mixed = l2Normalize(base.map((v, i) => v * 0.92 + noise[i] * 0.08))
const score = cosineSimilarity(base, mixed)
assert(score >= 0.48, `enroll misturado deve auto-match (score=${score})`)

assert(decideFromScores(0.55, { autoMatch: 0.48, reviewMin: 0.38 }) === 'matched', 'auto')
assert(decideFromScores(0.4, { autoMatch: 0.48, reviewMin: 0.38 }) === 'needs_review', 'review')
assert(decideFromScores(0.1, { autoMatch: 0.48, reviewMin: 0.38 }) === 'no_match', 'no')

console.log('face-math OK')
