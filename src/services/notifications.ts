import { addDoc, getDocs, limit, orderBy, query, where, Timestamp } from 'firebase/firestore'
import { notificationAttemptsCollection, withTimestamps } from '../lib/firestore'
import { isGeneralAdmin } from '../lib/permissions'
import type {
  NotificationAttempt,
  NotificationAttemptStatus,
  NotificationChannelProvider,
} from '../types/notification'
import type { MovementType } from '../types/movement'
import type { AppUser } from '../types/user'

/** Mock: simula envio sem WhatsApp/SMS real. */
export class MockNotificationProvider implements NotificationChannelProvider {
  readonly id = 'mock'
  readonly channel = 'whatsapp' as const
  readonly ready = true

  async send(params: { phone: string; message: string }) {
    if (!params.phone.trim()) {
      return { ok: false, errorMessage: 'Telefone do responsável não informado.' }
    }
    return { ok: true, providerMessageId: `mock-${Date.now()}` }
  }
}

export class PendingNotificationProvider implements NotificationChannelProvider {
  readonly id = 'pending'
  readonly channel = 'pending' as const
  readonly ready = false

  async send(): Promise<{ ok: boolean; errorMessage: string }> {
    return {
      ok: false,
      errorMessage: 'Canal de notificação ainda não definido (WhatsApp vs SMS).',
    }
  }
}

/** Default mock para demos — troca para Pending quando quiser sinalizar bloqueio. */
let activeNotificationProvider: NotificationChannelProvider = new MockNotificationProvider()

export function getNotificationProvider(): NotificationChannelProvider {
  return activeNotificationProvider
}

export function setNotificationProvider(provider: NotificationChannelProvider) {
  activeNotificationProvider = provider
}

function mapAttempt(id: string, data: Record<string, unknown>): NotificationAttempt {
  return {
    id,
    schoolId: String(data.schoolId ?? ''),
    studentId: String(data.studentId ?? ''),
    movementId: String(data.movementId ?? ''),
    movementType: data.movementType === 'saida' ? 'saida' : 'entrada',
    channel:
      data.channel === 'sms' || data.channel === 'whatsapp' || data.channel === 'pending'
        ? data.channel
        : 'pending',
    recipientPhone: String(data.recipientPhone ?? ''),
    message: String(data.message ?? ''),
    status: (['queued', 'sent', 'failed', 'skipped'].includes(String(data.status))
      ? data.status
      : 'skipped') as NotificationAttemptStatus,
    errorMessage: String(data.errorMessage ?? ''),
    createdAt: (data.createdAt as NotificationAttempt['createdAt']) ?? null,
    updatedAt: (data.updatedAt as NotificationAttempt['updatedAt']) ?? null,
  }
}

export function buildMovementNotificationMessage(params: {
  studentName: string
  schoolName: string
  type: MovementType
  timeLabel: string
}) {
  const verb = params.type === 'entrada' ? 'entrou' : 'saiu'
  return `${params.studentName} ${verb} da ${params.schoolName} às ${params.timeLabel}.`
}

export async function listNotificationAttemptsForProfile(
  profile: AppUser,
  max = 80,
): Promise<NotificationAttempt[]> {
  if (isGeneralAdmin(profile)) {
    const snap = await getDocs(
      query(notificationAttemptsCollection, orderBy('createdAt', 'desc'), limit(max)),
    )
    return snap.docs.map((item) => mapAttempt(item.id, item.data()))
  }
  if (!profile.schoolId) return []
  const snap = await getDocs(
    query(
      notificationAttemptsCollection,
      where('schoolId', '==', profile.schoolId),
      orderBy('createdAt', 'desc'),
      limit(max),
    ),
  )
  return snap.docs.map((item) => mapAttempt(item.id, item.data()))
}

/**
 * Persiste tentativa e simula envio. Nunca lança — falhas viram status failed/skipped.
 */
export async function enqueueMovementNotification(params: {
  schoolId: string
  studentId: string
  movementId: string
  movementType: MovementType
  recipientPhone: string
  message: string
}): Promise<{ status: NotificationAttemptStatus; reason?: string; attemptId?: string }> {
  const provider = getNotificationProvider()

  if (!provider.ready || provider.channel === 'pending') {
    const ref = await addDoc(
      notificationAttemptsCollection,
      withTimestamps(
        {
          ...params,
          channel: 'pending',
          status: 'skipped',
          errorMessage: 'Provedor real aguardando definição do cliente (demo mock disponível).',
        },
        true,
      ),
    )
    return {
      status: 'skipped',
      reason: 'Canal real pendente — tentativa registrada como skipped.',
      attemptId: ref.id,
    }
  }

  try {
    const result = await provider.send({
      phone: params.recipientPhone,
      message: params.message,
    })
    const status: NotificationAttemptStatus = result.ok ? 'sent' : 'failed'
    const ref = await addDoc(
      notificationAttemptsCollection,
      withTimestamps(
        {
          ...params,
          channel: provider.channel,
          status,
          errorMessage: result.errorMessage ?? '',
        },
        true,
      ),
    )
    return {
      status,
      reason: result.errorMessage,
      attemptId: ref.id,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao enfileirar notificação'
    const ref = await addDoc(
      notificationAttemptsCollection,
      withTimestamps(
        {
          ...params,
          channel: provider.channel,
          status: 'failed',
          errorMessage: message,
        },
        true,
      ),
    )
    return { status: 'failed', reason: message, attemptId: ref.id }
  }
}

export async function simulateMovementNotification(params: {
  schoolId: string
  studentId: string
  studentName: string
  schoolName: string
  movementType: MovementType
  recipientPhone: string
}) {
  const timeLabel = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const message = buildMovementNotificationMessage({
    studentName: params.studentName,
    schoolName: params.schoolName,
    type: params.movementType,
    timeLabel,
  })
  return enqueueMovementNotification({
    schoolId: params.schoolId,
    studentId: params.studentId,
    movementId: `manual-${Timestamp.now().toMillis()}`,
    movementType: params.movementType,
    recipientPhone: params.recipientPhone,
    message,
  })
}
