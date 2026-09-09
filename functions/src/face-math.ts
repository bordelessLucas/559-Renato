/** Math biométrica (cópia server-side — não expor no client o armazenamento). */

export function l2Normalize(vector: number[]): number[] {
  let sum = 0
  for (const value of vector) sum += value * value
  const norm = Math.sqrt(sum)
  if (norm < 1e-12) return vector.map(() => 0)
  return vector.map((value) => value / norm)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n === 0) return 0
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

export function decideFromScores(
  bestScore: number,
  thresholds: { autoMatch: number; reviewMin: number },
): 'matched' | 'needs_review' | 'no_match' {
  if (bestScore >= thresholds.autoMatch) return 'matched'
  if (bestScore >= thresholds.reviewMin) return 'needs_review'
  return 'no_match'
}

export function deterministicUnitVector(seed: string, dimensions = 64): number[] {
  const raw: number[] = []
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

export function seedFromImageBytes(bytes: Uint8Array, salt = ''): string {
  let h = 2166136261
  const step = Math.max(1, Math.floor(bytes.length / 2048))
  for (let i = 0; i < bytes.length; i += step) {
    h ^= bytes[i]
    h = Math.imul(h, 16777619)
  }
  h ^= bytes.length
  return `${salt}:${h >>> 0}:${bytes.length}`
}

export const FACE_CHECK_THRESHOLDS = {
  autoMatch: 0.48,
  reviewMin: 0.38,
} as const

export const MODEL_ID = 'mock-v1'
