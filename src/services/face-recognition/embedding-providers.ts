import type { FaceEmbedResult, FaceEmbeddingProvider } from '../../types/face-embedding'
import { deterministicUnitVector, l2Normalize, seedFromImageBytes } from '../../lib/face-math'

const DIM = 64

/**
 * Vetorizador mock determinístico — mesmo bytes ⇒ mesmo vetor.
 * Trocar por InsightFace/API Face sem mudar o restante do pipeline.
 */
export class MockFaceEmbeddingProvider implements FaceEmbeddingProvider {
  readonly modelId = 'mock-v1'
  readonly label = 'Mock facial embeddings (demo)'
  readonly ready = true

  async embed(imageBytes: ArrayBuffer): Promise<FaceEmbedResult> {
    if (!imageBytes || imageBytes.byteLength < 32) {
      throw new Error('Imagem inválida ou muito pequena para vetorizar.')
    }
    const seed = await seedFromImageBytes(imageBytes)
    const embedding = deterministicUnitVector(seed, DIM)
    const qualityScore = Math.min(1, 0.55 + imageBytes.byteLength / (2 * 1024 * 1024))
    return { embedding, qualityScore }
  }
}

/**
 * No enroll: ancora o vetor no studentId (como a sonda de demo) + ruído leve dos bytes.
 * Assim identifyAsStudent(studentId) encontra o template com score alto.
 */
export class MockEnrollmentEmbeddingProvider implements FaceEmbeddingProvider {
  readonly modelId = 'mock-v1'
  readonly label = 'Mock facial embeddings (demo)'
  readonly ready = true
  private readonly studentId: string

  constructor(studentId: string) {
    this.studentId = studentId
  }

  async embed(imageBytes: ArrayBuffer): Promise<FaceEmbedResult> {
    if (!imageBytes || imageBytes.byteLength < 32) {
      throw new Error('Imagem inválida ou muito pequena para vetorizar.')
    }
    const byteSeed = await seedFromImageBytes(imageBytes, this.studentId)
    const base = deterministicUnitVector(`probe:${this.studentId}`, DIM)
    const noise = deterministicUnitVector(byteSeed, DIM)
    const mixed = base.map((v, i) => v * 0.92 + noise[i] * 0.08)
    const qualityScore = Math.min(1, 0.6 + imageBytes.byteLength / (2 * 1024 * 1024))
    return { embedding: l2Normalize(mixed), qualityScore }
  }
}

/** Sonda de portaria demo: “frame” do aluno X. */
export async function mockProbeEmbeddingForStudent(studentId: string): Promise<FaceEmbedResult> {
  return {
    embedding: deterministicUnitVector(`probe:${studentId}`, DIM),
    qualityScore: 0.9,
  }
}

export class DeferredFaceEmbeddingProvider implements FaceEmbeddingProvider {
  readonly modelId = 'deferred'
  readonly label = 'Provedor real pendente (API facial)'
  readonly ready = false

  async embed(): Promise<FaceEmbedResult> {
    throw new Error(
      'Provedor real de embeddings ainda não configurado. Use o mock até haver API ArcFace/InsightFace ou Face cloud.',
    )
  }
}
