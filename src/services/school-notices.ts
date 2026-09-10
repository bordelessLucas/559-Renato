import { addDoc, getDocs, limit, orderBy, query, where, updateDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  guardianNoticesCollection,
  schoolNoticesCollection,
  withTimestamps,
} from '../lib/firestore'
import { isGeneralAdmin } from '../lib/permissions'
import { listStudentsForProfile } from './students'
import { getGuardianById } from './guardians'
import { enqueueNotificationAttempt } from './notifications'
import type { AppUser } from '../types/user'
import type { Student } from '../types/student'
import type {
  GuardianNotice,
  NotificationKind,
  NoticeAudienceScope,
  SchoolNotice,
} from '../types/notification'
import {
  SCHOOL_NOTICE_TEMPLATES,
  composePersonalizedNotice,
} from '../types/notification'

export { SCHOOL_NOTICE_TEMPLATES }

function mapSchoolNotice(id: string, data: Record<string, unknown>): SchoolNotice {
  return {
    id,
    schoolId: String(data.schoolId ?? ''),
    kind: (data.kind as NotificationKind) || 'custom',
    title: String(data.title ?? ''),
    body: String(data.body ?? ''),
    scope:
      data.scope === 'escola' || data.scope === 'turma' || data.scope === 'aluno'
        ? data.scope
        : 'escola',
    className: String(data.className ?? ''),
    studentId: String(data.studentId ?? ''),
    studentName: String(data.studentName ?? ''),
    createdByUid: String(data.createdByUid ?? ''),
    createdByName: String(data.createdByName ?? ''),
    studentCount: typeof data.studentCount === 'number' ? data.studentCount : 0,
    recipientCount: typeof data.recipientCount === 'number' ? data.recipientCount : 0,
    sentCount: typeof data.sentCount === 'number' ? data.sentCount : 0,
    failedCount: typeof data.failedCount === 'number' ? data.failedCount : 0,
    createdAt: (data.createdAt as SchoolNotice['createdAt']) ?? null,
    updatedAt: (data.updatedAt as SchoolNotice['updatedAt']) ?? null,
  }
}

function mapGuardianNotice(id: string, data: Record<string, unknown>): GuardianNotice {
  return {
    id,
    schoolId: String(data.schoolId ?? ''),
    schoolName: String(data.schoolName ?? ''),
    guardianUserId: String(data.guardianUserId ?? ''),
    studentId: String(data.studentId ?? ''),
    studentName: String(data.studentName ?? ''),
    noticeId: String(data.noticeId ?? ''),
    kind: (data.kind as NotificationKind) || 'custom',
    title: String(data.title ?? ''),
    body: String(data.body ?? ''),
    read: Boolean(data.read),
    createdAt: (data.createdAt as GuardianNotice['createdAt']) ?? null,
    updatedAt: (data.updatedAt as GuardianNotice['updatedAt']) ?? null,
  }
}

export function listClassNamesFromStudents(students: Student[]) {
  const set = new Set<string>()
  students.forEach((s) => {
    const name = s.className.trim()
    if (name) set.add(name)
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function resolveNoticeAudience(params: {
  students: Student[]
  scope: NoticeAudienceScope
  className?: string
  studentId?: string
}): Student[] {
  const active = params.students.filter((s) => s.status === 'ativo')
  if (params.scope === 'escola') return active
  if (params.scope === 'turma') {
    const turma = (params.className || '').trim()
    return active.filter((s) => s.className.trim() === turma)
  }
  return active.filter((s) => s.id === params.studentId)
}

export type NoticeRecipientPreview = {
  studentId: string
  studentName: string
  className: string
  guardians: Array<{ id: string; name: string; phone: string; userId: string }>
}

export async function previewNoticeRecipients(
  students: Student[],
): Promise<NoticeRecipientPreview[]> {
  const rows: NoticeRecipientPreview[] = []
  for (const student of students) {
    const guardians: NoticeRecipientPreview['guardians'] = []
    for (const guardianId of student.guardianIds) {
      const guardian = await getGuardianById(guardianId)
      if (!guardian || guardian.status !== 'ativo') continue
      guardians.push({
        id: guardian.id,
        name: guardian.name,
        phone: guardian.phonePrimary || guardian.phoneSecondary || '',
        userId: guardian.userId || '',
      })
    }
    rows.push({
      studentId: student.id,
      studentName: student.name,
      className: student.className,
      guardians,
    })
  }
  return rows
}

export async function listSchoolNoticesForProfile(
  profile: AppUser,
  max = 40,
): Promise<SchoolNotice[]> {
  if (isGeneralAdmin(profile)) {
    const snap = await getDocs(
      query(schoolNoticesCollection, orderBy('createdAt', 'desc'), limit(max)),
    )
    return snap.docs.map((item) => mapSchoolNotice(item.id, item.data()))
  }
  if (!profile.schoolId) return []
  const snap = await getDocs(
    query(
      schoolNoticesCollection,
      where('schoolId', '==', profile.schoolId),
      orderBy('createdAt', 'desc'),
      limit(max),
    ),
  )
  return snap.docs.map((item) => mapSchoolNotice(item.id, item.data()))
}

export async function listGuardianNoticesForUser(
  guardianUserId: string,
  max = 60,
): Promise<GuardianNotice[]> {
  const snap = await getDocs(
    query(
      guardianNoticesCollection,
      where('guardianUserId', '==', guardianUserId),
      orderBy('createdAt', 'desc'),
      limit(max),
    ),
  )
  return snap.docs.map((item) => mapGuardianNotice(item.id, item.data()))
}

export async function markGuardianNoticeRead(id: string) {
  await updateDoc(doc(db, 'guardianNotices', id), withTimestamps({ read: true }))
}

export async function sendSchoolNotice(params: {
  profile: AppUser
  /** Escola alvo do aviso (obrigatório; admin geral escolhe na UI). */
  schoolId: string
  schoolName: string
  kind: NotificationKind
  title: string
  body: string
  scope: NoticeAudienceScope
  className?: string
  studentId?: string
}): Promise<{
  noticeId: string
  studentCount: number
  recipientCount: number
  sentCount: number
  failedCount: number
}> {
  const schoolId = params.schoolId.trim()
  if (!schoolId) {
    throw new Error('Selecione a escola antes de enviar.')
  }
  if (!isGeneralAdmin(params.profile) && params.profile.schoolId !== schoolId) {
    throw new Error('Sem permissão para enviar avisos nesta escola.')
  }

  const allStudents = (await listStudentsForProfile(params.profile)).filter(
    (student) => student.schoolId === schoolId,
  )
  const audience = resolveNoticeAudience({
    students: allStudents,
    scope: params.scope,
    className: params.className,
    studentId: params.studentId,
  })

  if (audience.length === 0) {
    throw new Error('Nenhum aluno encontrado para este público.')
  }

  const previews = await previewNoticeRecipients(audience)
  const withGuardians = previews.filter((p) => p.guardians.length > 0)
  if (withGuardians.length === 0) {
    throw new Error('Os alunos selecionados não têm responsáveis ativos vinculados.')
  }

  const title = params.title.trim()
  const body = params.body.trim()
  if (!title || !body) {
    throw new Error('Informe título e mensagem.')
  }

  const selectedStudent =
    params.scope === 'aluno' ? audience[0] : undefined

  const noticeRef = await addDoc(
    schoolNoticesCollection,
    withTimestamps(
      {
        schoolId,
        kind: params.kind,
        title,
        body,
        scope: params.scope,
        className: params.scope === 'turma' ? params.className || '' : '',
        studentId: selectedStudent?.id || '',
        studentName: selectedStudent?.name || '',
        createdByUid: params.profile.id,
        createdByName: params.profile.name,
        studentCount: audience.length,
        recipientCount: 0,
        sentCount: 0,
        failedCount: 0,
      },
      true,
    ),
  )

  let recipientCount = 0
  let sentCount = 0
  let failedCount = 0

  for (const row of withGuardians) {
    const personalized = composePersonalizedNotice({
      title,
      body,
      aluno: row.studentName,
      escola: params.schoolName || 'escola',
      turma: row.className,
    })

    for (const guardian of row.guardians) {
      recipientCount += 1
      const phone = guardian.phone || '00000000000'
      const result = await enqueueNotificationAttempt({
        schoolId,
        studentId: row.studentId,
        studentName: row.studentName,
        movementId: '',
        movementType: '',
        kind: params.kind,
        title: personalized.title,
        noticeId: noticeRef.id,
        scope: params.scope,
        recipientPhone: phone,
        recipientName: guardian.name,
        message: personalized.body,
      })

      if (result.status === 'sent' || result.status === 'skipped' || result.status === 'queued') {
        sentCount += 1
      } else {
        failedCount += 1
      }

      if (guardian.userId) {
        await addDoc(
          guardianNoticesCollection,
          withTimestamps(
            {
              schoolId,
              schoolName: params.schoolName || '',
              guardianUserId: guardian.userId,
              studentId: row.studentId,
              studentName: row.studentName,
              noticeId: noticeRef.id,
              kind: params.kind,
              title: personalized.title,
              body: personalized.body,
              read: false,
            },
            true,
          ),
        )
      }
    }
  }

  await updateDoc(noticeRef, withTimestamps({ recipientCount, sentCount, failedCount }))

  return {
    noticeId: noticeRef.id,
    studentCount: audience.length,
    recipientCount,
    sentCount,
    failedCount,
  }
}

export function getTemplateByKind(kind: NotificationKind) {
  return SCHOOL_NOTICE_TEMPLATES.find((t) => t.id === kind) || SCHOOL_NOTICE_TEMPLATES[5]
}
