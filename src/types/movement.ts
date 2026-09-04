import type { Timestamp } from 'firebase/firestore'

export type MovementType = 'entrada' | 'saida'

export interface Movement {
  id: string
  schoolId: string
  studentId: string
  studentName: string
  type: MovementType
  /** Origem do registro */
  source: 'facial' | 'manual' | 'import'
  cameraPointId: string
  confidence: number | null
  providerEventId: string
  occurredAt: Timestamp | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type MovementInput = Omit<Movement, 'id' | 'createdAt' | 'updatedAt'>
