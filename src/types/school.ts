import type { Timestamp } from 'firebase/firestore'
import type { EntityStatus } from './common'

export interface School {
  id: string
  name: string
  tradeName: string
  cnpj: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  status: EntityStatus
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type SchoolInput = Omit<School, 'id' | 'createdAt' | 'updatedAt'>
