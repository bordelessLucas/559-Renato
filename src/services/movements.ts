import {
  addDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { movementsCollection, withTimestamps } from '../lib/firestore'
import { isGeneralAdmin } from '../lib/permissions'
import type { Movement, MovementInput, MovementType } from '../types/movement'
import type { AppUser } from '../types/user'

/** Janela anti-duplicidade (segundos) para o mesmo aluno/tipo */
export const MOVEMENT_DEDUPE_SECONDS = 90

function mapMovement(id: string, data: Record<string, unknown>): Movement {
  return {
    id,
    schoolId: String(data.schoolId ?? ''),
    studentId: String(data.studentId ?? ''),
    studentName: String(data.studentName ?? ''),
    type: data.type === 'saida' ? 'saida' : 'entrada',
    source:
      data.source === 'manual' || data.source === 'import' || data.source === 'facial'
        ? data.source
        : 'facial',
    cameraPointId: String(data.cameraPointId ?? ''),
    confidence: typeof data.confidence === 'number' ? data.confidence : null,
    providerEventId: String(data.providerEventId ?? ''),
    occurredAt: (data.occurredAt as Movement['occurredAt']) ?? null,
    createdAt: (data.createdAt as Movement['createdAt']) ?? null,
    updatedAt: (data.updatedAt as Movement['updatedAt']) ?? null,
  }
}

export function movementTypeFromCameraPoint(
  kind: 'entrada' | 'saida' | 'ambos',
  fallback: MovementType = 'entrada',
): MovementType {
  if (kind === 'saida') return 'saida'
  if (kind === 'entrada') return 'entrada'
  return fallback
}

export async function listMovementsForSchool(schoolId: string, max = 100): Promise<Movement[]> {
  const snap = await getDocs(
    query(
      movementsCollection,
      where('schoolId', '==', schoolId),
      orderBy('occurredAt', 'desc'),
      limit(max),
    ),
  )
  return snap.docs.map((item) => mapMovement(item.id, item.data()))
}

export async function listMovementsForProfile(profile: AppUser, max = 100): Promise<Movement[]> {
  if (isGeneralAdmin(profile)) {
    const snap = await getDocs(query(movementsCollection, orderBy('occurredAt', 'desc'), limit(max)))
    return snap.docs.map((item) => mapMovement(item.id, item.data()))
  }
  if (!profile.schoolId) return []
  return listMovementsForSchool(profile.schoolId, max)
}

export async function findRecentDuplicate(params: {
  schoolId: string
  studentId: string
  type: MovementType
  withinSeconds?: number
}): Promise<Movement | null> {
  const within = params.withinSeconds ?? MOVEMENT_DEDUPE_SECONDS
  const since = Timestamp.fromMillis(Date.now() - within * 1000)
  const snap = await getDocs(
    query(
      movementsCollection,
      where('schoolId', '==', params.schoolId),
      where('studentId', '==', params.studentId),
      where('type', '==', params.type),
      where('occurredAt', '>=', since),
      limit(1),
    ),
  )
  if (snap.empty) return null
  return mapMovement(snap.docs[0].id, snap.docs[0].data())
}

/**
 * Registra movimentação com anti-duplicidade.
 * Chamado após identificação facial (quando o provedor estiver pronto).
 */
export async function recordMovement(
  input: Omit<MovementInput, 'occurredAt'> & { occurredAt?: Timestamp },
): Promise<{ id: string; duplicated: boolean }> {
  const duplicate = await findRecentDuplicate({
    schoolId: input.schoolId,
    studentId: input.studentId,
    type: input.type,
  })
  if (duplicate) {
    return { id: duplicate.id, duplicated: true }
  }

  const ref = await addDoc(
    movementsCollection,
    withTimestamps(
      {
        ...input,
        occurredAt: input.occurredAt ?? Timestamp.now(),
      },
      true,
    ),
  )
  return { id: ref.id, duplicated: false }
}
