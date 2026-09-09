/**
 * Resposta pública do check biométrico.
 * Nunca inclui embedding, foto ou galeria.
 */
export type FaceCheckOutcome = 'allow' | 'deny' | 'review' | 'error' | 'not_enrolled'

export type FaceCheckResponse = {
  /** SIM/NÃO para catraca / liberação */
  allowed: boolean
  outcome: FaceCheckOutcome
  /** Presente só quando allowed === true (check-in precisa saber quem) */
  studentId?: string
  /** Score agregado 0–1; opcional e arredondado — não é o vetor */
  confidence?: number
  cameraPointId?: string
  cameraPointKind?: 'entrada' | 'saida' | 'ambos'
  modelId: string
  requestId: string
  message: string
}

export type FaceEnrollResponse = {
  ok: boolean
  studentId: string
  schoolId: string
  faceEnrolled: boolean
  faceTemplateCount: number
  modelId: string
  requestId: string
  message: string
}

export type FaceDeleteResponse = {
  ok: boolean
  studentId: string
  deletedCount: number
  requestId: string
  message: string
}

/** Limiares espelhados no backend (Functions). */
export const FACE_CHECK_THRESHOLDS = {
  autoMatch: 0.48,
  reviewMin: 0.38,
} as const
