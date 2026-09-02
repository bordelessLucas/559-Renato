import {
  addDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { guardiansCollection, withTimestamps } from '../lib/firestore'
import type { Guardian, GuardianInput } from '../types/guardian'
import type { EntityStatus } from '../types/common'

function mapGuardian(id: string, data: Record<string, unknown>): Guardian {
  return {
    id,
    name: String(data.name ?? ''),
    cpf: String(data.cpf ?? ''),
    phonePrimary: String(data.phonePrimary ?? ''),
    phoneSecondary: String(data.phoneSecondary ?? ''),
    email: String(data.email ?? ''),
    linkType: (data.linkType as Guardian['linkType']) ?? 'outro',
    schoolId: String(data.schoolId ?? ''),
    status: (data.status as EntityStatus) ?? 'ativo',
    createdAt: (data.createdAt as Guardian['createdAt']) ?? null,
    updatedAt: (data.updatedAt as Guardian['updatedAt']) ?? null,
  }
}

export async function listGuardians(): Promise<Guardian[]> {
  const snap = await getDocs(query(guardiansCollection, orderBy('name')))
  return snap.docs.map((item) => mapGuardian(item.id, item.data()))
}

export async function getGuardianById(id: string): Promise<Guardian | null> {
  const snap = await getDoc(doc(db, 'guardians', id))
  if (!snap.exists()) return null
  return mapGuardian(snap.id, snap.data())
}

export async function createGuardian(input: GuardianInput): Promise<string> {
  const ref = await addDoc(guardiansCollection, withTimestamps(input, true))
  return ref.id
}

export async function updateGuardian(id: string, input: Partial<GuardianInput>): Promise<void> {
  await updateDoc(doc(db, 'guardians', id), withTimestamps(input))
}

export async function setGuardianStatus(id: string, status: EntityStatus): Promise<void> {
  await updateDoc(doc(db, 'guardians', id), withTimestamps({ status }))
}
