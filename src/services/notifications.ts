import type { NotificationChannelProvider } from '../types/notification'
import type { MovementType } from '../types/movement'

/** Provedor stub — canal WhatsApp/SMS ainda não definido pelo cliente. */
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

let activeNotificationProvider: NotificationChannelProvider = new PendingNotificationProvider()

export function getNotificationProvider(): NotificationChannelProvider {
  return activeNotificationProvider
}

export function setNotificationProvider(provider: NotificationChannelProvider) {
  activeNotificationProvider = provider
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

/**
 * Enfileira envio sem bloquear o registro de movimentação.
 * Enquanto o canal estiver pendente, marca como skipped.
 */
export async function enqueueMovementNotification(params: {
  schoolId: string
  studentId: string
  movementId: string
  movementType: MovementType
  recipientPhone: string
  message: string
}): Promise<{ status: 'skipped' | 'queued' | 'failed'; reason?: string }> {
  const provider = getNotificationProvider()
  if (!provider.ready || provider.channel === 'pending') {
    return {
      status: 'skipped',
      reason: 'Provedor de notificação aguardando definição do cliente.',
    }
  }

  try {
    const result = await provider.send({
      phone: params.recipientPhone,
      message: params.message,
    })
    if (!result.ok) {
      return { status: 'failed', reason: result.errorMessage }
    }
    return { status: 'queued' }
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Falha ao enfileirar notificação',
    }
  }
}
