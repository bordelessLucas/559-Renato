import { addDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore'
import { alertsCollection, withTimestamps } from '../lib/firestore'
import type { SchoolAlert, SchoolAlertInput } from '../types/alert'

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

export async function createAlert(input: SchoolAlertInput): Promise<string> {
  const ref = await addDoc(alertsCollection, withTimestamps(input, true))
  return ref.id
}
