import type { Timestamp } from 'firebase/firestore'
import type { FaceMatchStatus } from './face-recognition'

/** Template biométrico — sem imagem facial persistida. */
export type FaceTemplateSource = 'enrollment' | 'reenrollment'

export interface FaceTemplate {
  id: string
  studentId: string
  schoolId: string
  /** Versão do modelo (ex.: mock-v1, insightface-r100-v1) */
  modelId: string
  /** Vetor L2-normalizado */
  embedding: number[]
  qualityScore: number
  source: FaceTemplateSource
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type FaceTemplateInput = Omit<FaceTemplate, 'id' | 'createdAt' | 'updatedAt'>

export type FaceMatchDecisionStatus =
  | 'matched'
  | 'needs_review'
  | 'no_match'
  | 'no_face'
  | 'error'
  | 'not_enrolled'

export interface FaceMatchDecision {
  status: FaceMatchDecisionStatus
  schoolId: string
  cameraPointId: string
  cameraPointKind: 'entrada' | 'saida' | 'ambos'
  capturedAt: string
  studentId?: string
  confidence?: number
  bestScore?: number
  secondBestScore?: number
  modelId: string
  errorMessage?: string
  /** Compatível com FaceMatchStatus legado */
  legacyStatus: FaceMatchStatus
}

export interface FaceEmbedResult {
  embedding: number[]
  qualityScore: number
}

export interface FaceEmbeddingProvider {
  readonly modelId: string
  readonly label: string
  readonly ready: boolean
  embed(imageBytes: ArrayBuffer): Promise<FaceEmbedResult>
}

/** Limiares de cosseno para vetores L2-normalizados (ArcFace-like). */
export const FACE_MATCH_THRESHOLDS = {
  /** Match automático → movimento + notificação */
  autoMatch: 0.48,
  /** Faixa cinza → revisão do operador (não notifica sozinho) */
  reviewMin: 0.38,
} as const
