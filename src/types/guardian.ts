import type { Timestamp } from 'firebase/firestore'
import type { EntityStatus, GuardianLinkType } from './common'

export interface Guardian {
  id: string
  name: string
  cpf: string
  phonePrimary: string
  phoneSecondary: string
  email: string
  linkType: GuardianLinkType
  schoolId: string
  userId: string
  isDemo: boolean
  status: EntityStatus
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type GuardianInput = Omit<Guardian, 'id' | 'createdAt' | 'updatedAt'>
