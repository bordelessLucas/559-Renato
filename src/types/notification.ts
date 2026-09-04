import type { Timestamp } from 'firebase/firestore'
import type { MovementType } from './movement'

export type NotificationChannel = 'whatsapp' | 'sms' | 'pending'

export type NotificationAttemptStatus = 'queued' | 'sent' | 'failed' | 'skipped'

export interface NotificationAttempt {
  id: string
  schoolId: string
  studentId: string
  movementId: string
  movementType: MovementType
  channel: NotificationChannel
  recipientPhone: string
  message: string
  status: NotificationAttemptStatus
  errorMessage: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type NotificationAttemptInput = Omit<NotificationAttempt, 'id' | 'createdAt' | 'updatedAt'>

export interface NotificationChannelProvider {
  readonly id: string
  readonly channel: NotificationChannel
  readonly ready: boolean
  send(params: {
    phone: string
    message: string
  }): Promise<{ ok: boolean; providerMessageId?: string; errorMessage?: string }>
}
