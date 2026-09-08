import type { Timestamp } from 'firebase/firestore'
import type { EntityStatus, StudentGender, StudentShift } from './common'

export interface Student {
  id: string
  name: string
  birthDate: string
  enrollmentCode: string
  className: string
  shift: StudentShift | ''
  /** Usado no avatar de demonstração quando não há foto. */
  gender: StudentGender | ''
  notes: string
  photoUrl: string
  photoPath: string
  schoolId: string
  guardianIds: string[]
  guardianUserIds: string[]
  isDemo: boolean
  status: EntityStatus
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type StudentInput = Omit<Student, 'id' | 'createdAt' | 'updatedAt'>
