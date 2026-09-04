import type { Timestamp } from 'firebase/firestore'

export type AlertKind = 'atraso' | 'ausencia' | 'ocorrencia'

export interface SchoolAlert {
  id: string
  schoolId: string
  studentId: string
  studentName: string
  kind: AlertKind
  message: string
  status: 'aberto' | 'resolvido'
  occurredAt: Timestamp | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type SchoolAlertInput = Omit<SchoolAlert, 'id' | 'createdAt' | 'updatedAt'>

/** Configuração futura de horários por escola (Sprint 8) */
export interface SchoolAttendanceRules {
  schoolId: string
  entryDeadlineMinutes: number
  exitExpectedMinutes: number | null
  enabled: boolean
}
