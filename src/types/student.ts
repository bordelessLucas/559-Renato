import type { Timestamp } from 'firebase/firestore'
import type { EntityStatus, StudentShift } from './common'

export interface Student {
  id: string
  name: string
  birthDate: string
  enrollmentCode: string
  className: string
  shift: StudentShift | ''
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
