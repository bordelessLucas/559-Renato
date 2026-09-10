import type { Timestamp } from 'firebase/firestore'
import type { MovementType } from './movement'

export type NotificationChannel = 'whatsapp' | 'sms' | 'pending'

export type NotificationAttemptStatus = 'queued' | 'sent' | 'failed' | 'skipped'

/** Origem do aviso: movimento facial ou comunicação da escola. */
export type NotificationKind =
  | 'entrada'
  | 'saida'
  | 'advertencia'
  | 'aviso_geral'
  | 'lembrete'
  | 'reuniao'
  | 'ocorrencia'
  | 'custom'

export type NoticeAudienceScope = 'escola' | 'turma' | 'aluno'

export interface NotificationAttempt {
  id: string
  schoolId: string
  studentId: string
  studentName: string
  movementId: string
  movementType: MovementType | ''
  kind: NotificationKind
  title: string
  noticeId: string
  scope: NoticeAudienceScope | ''
  channel: NotificationChannel
  recipientPhone: string
  recipientName: string
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

/** Campanha enviada pela escola aos responsáveis. */
export interface SchoolNotice {
  id: string
  schoolId: string
  kind: NotificationKind
  title: string
  body: string
  scope: NoticeAudienceScope
  className: string
  studentId: string
  studentName: string
  createdByUid: string
  createdByName: string
  studentCount: number
  recipientCount: number
  sentCount: number
  failedCount: number
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type SchoolNoticeInput = Omit<SchoolNotice, 'id' | 'createdAt' | 'updatedAt'>

/** Inbox do responsável (sempre ligado a um dependente). */
export interface GuardianNotice {
  id: string
  schoolId: string
  schoolName: string
  guardianUserId: string
  studentId: string
  studentName: string
  noticeId: string
  kind: NotificationKind
  title: string
  body: string
  read: boolean
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type GuardianNoticeInput = Omit<GuardianNotice, 'id' | 'createdAt' | 'updatedAt'>

export type SchoolNoticeTemplate = {
  id: NotificationKind
  label: string
  description: string
  defaultTitle: string
  defaultBody: string
}

export const SCHOOL_NOTICE_TEMPLATES: SchoolNoticeTemplate[] = [
  {
    id: 'advertencia',
    label: 'Advertência',
    description: 'Registro formal sobre conduta.',
    defaultTitle: 'Advertência escolar',
    defaultBody:
      'Informamos que seu filho(a) recebeu uma advertência nesta data. Pedimos a atenção da família. Em caso de dúvidas, procure a secretaria.',
  },
  {
    id: 'aviso_geral',
    label: 'Aviso geral',
    description: 'Comunicado para as famílias.',
    defaultTitle: 'Aviso da escola',
    defaultBody:
      'Comunicado importante da escola. Leia com atenção e, se necessário, responda à secretaria.',
  },
  {
    id: 'lembrete',
    label: 'Lembrete',
    description: 'Material, uniforme ou horário.',
    defaultTitle: 'Lembrete',
    defaultBody:
      'Lembrete importante: complete aqui o detalhe (material, uniforme, horário…). Contamos com a parceria da família.',
  },
  {
    id: 'reuniao',
    label: 'Reunião',
    description: 'Convocação de reunião.',
    defaultTitle: 'Convocação / reunião',
    defaultBody:
      'Solicitamos a presença do responsável para uma reunião. A secretaria confirmará data e horário, ou responda esta mensagem.',
  },
  {
    id: 'ocorrencia',
    label: 'Ocorrência',
    description: 'Saúde, atraso ou similar.',
    defaultTitle: 'Ocorrência registrada',
    defaultBody:
      'Registramos uma ocorrência envolvendo seu filho(a). A família pode procurar a coordenação para mais detalhes.',
  },
  {
    id: 'custom',
    label: 'Personalizado',
    description: 'Escreva do zero.',
    defaultTitle: '',
    defaultBody: '',
  },
]

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  advertencia: 'Advertência',
  aviso_geral: 'Aviso geral',
  lembrete: 'Lembrete',
  reuniao: 'Reunião',
  ocorrencia: 'Ocorrência',
  custom: 'Personalizado',
}

/** Personaliza o aviso sem exigir códigos {{}} do usuário leigo. */
export function composePersonalizedNotice(params: {
  title: string
  body: string
  aluno: string
  escola: string
  turma?: string
}) {
  const title = params.title.trim()
  const body = params.body.trim()
  const about =
    params.turma && params.turma.trim()
      ? `Sobre: ${params.aluno} · ${params.turma.trim()} · ${params.escola}`
      : `Sobre: ${params.aluno} · ${params.escola}`

  return {
    title,
    body: `${about}\n\n${body}`,
  }
}

/** @deprecated Prefer composePersonalizedNotice — mantido só para limpar textos antigos. */
export function fillNoticeTemplate(
  template: string,
  vars: { aluno: string; escola: string; turma?: string },
) {
  return template
    .replaceAll('{{aluno}}', vars.aluno)
    .replaceAll('{{escola}}', vars.escola)
    .replaceAll('{{turma}}', vars.turma || 'turma')
}
