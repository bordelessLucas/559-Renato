import type { Timestamp } from 'firebase/firestore'
import type { EntityStatus, UserRole } from './common'

export interface AppUser {
  id: string
  name: string
  email: string
  phone: string
  schoolId: string
  role: UserRole
  status: EntityStatus
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type AppUserInput = Omit<AppUser, 'id' | 'createdAt' | 'updatedAt'>
