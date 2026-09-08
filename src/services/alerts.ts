import { addDoc, getDocs, limit, orderBy, query, where, Timestamp } from 'firebase/firestore'
import { alertsCollection, withTimestamps } from '../lib/firestore'
import { isGeneralAdmin } from '../lib/permissions'
import type { SchoolAlert, SchoolAlertInput, AlertKind } from '../types/alert'
import type { AppUser } from '../types/user'

function mapAlert(id: string, data: Record<string, unknown>): SchoolAlert {
  return {
    id,
    schoolId: String(data.schoolId ?? ''),
    studentId: String(data.studentId ?? ''),
    studentName: String(data.studentName ?? ''),
    kind:
      data.kind === 'atraso' || data.kind === 'ausencia' || data.kind === 'ocorrencia'
        ? data.kind
        : 'ocorrencia',
    message: String(data.message ?? ''),
    status: data.status === 'resolvido' ? 'resolvido' : 'aberto',
    occurredAt: (data.occurredAt as SchoolAlert['occurredAt']) ?? null,
    createdAt: (data.createdAt as SchoolAlert['createdAt']) ?? null,
    updatedAt: (data.updatedAt as SchoolAlert['updatedAt']) ?? null,
  }
}

export async function listAlertsForSchool(schoolId: string, max = 50): Promise<SchoolAlert[]> {
  const snap = await getDocs(
    query(
      alertsCollection,
      where('schoolId', '==', schoolId),
      orderBy('occurredAt', 'desc'),
      limit(max),
    ),
  )
  return snap.docs.map((item) => mapAlert(item.id, item.data()))
}

export async function listAlertsForProfile(profile: AppUser, max = 50): Promise<SchoolAlert[]> {
  if (isGeneralAdmin(profile)) {
    const snap = await getDocs(query(alertsCollection, orderBy('occurredAt', 'desc'), limit(max)))
    return snap.docs.map((item) => mapAlert(item.id, item.data()))
  }
  if (!profile.schoolId) return []
  return listAlertsForSchool(profile.schoolId, max)
}

export async function createAlert(input: SchoolAlertInput): Promise<string> {
  const ref = await addDoc(
    alertsCollection,
    withTimestamps(
      {
        ...input,
        occurredAt: input.occurredAt ?? Timestamp.now(),
      },
      true,
    ),
  )
  return ref.id
}

export const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  atraso: 'Atraso',
  ausencia: 'Ausência',
  ocorrencia: 'Ocorrência',
}
