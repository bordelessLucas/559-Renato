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
import { schoolsCollection, withTimestamps } from '../lib/firestore'
import type { School, SchoolInput } from '../types/school'
import type { EntityStatus } from '../types/common'

function mapSchool(id: string, data: Record<string, unknown>): School {
  return {
    id,
    name: String(data.name ?? ''),
    tradeName: String(data.tradeName ?? ''),
    cnpj: String(data.cnpj ?? ''),
    phone: String(data.phone ?? ''),
    email: String(data.email ?? ''),
    address: String(data.address ?? ''),
    city: String(data.city ?? ''),
    state: String(data.state ?? ''),
    status: (data.status as EntityStatus) ?? 'ativo',
    createdAt: (data.createdAt as School['createdAt']) ?? null,
    updatedAt: (data.updatedAt as School['updatedAt']) ?? null,
  }
}

export async function listSchools(): Promise<School[]> {
  const snap = await getDocs(query(schoolsCollection, orderBy('name')))
  return snap.docs.map((item) => mapSchool(item.id, item.data()))
}

export async function getSchoolById(id: string): Promise<School | null> {
  const snap = await getDoc(doc(db, 'schools', id))
  if (!snap.exists()) return null
  return mapSchool(snap.id, snap.data())
}

export async function createSchool(input: SchoolInput): Promise<string> {
  const ref = await addDoc(schoolsCollection, withTimestamps(input, true))
  return ref.id
}

export async function updateSchool(id: string, input: Partial<SchoolInput>): Promise<void> {
  await updateDoc(doc(db, 'schools', id), withTimestamps(input))
}

export async function setSchoolStatus(id: string, status: EntityStatus): Promise<void> {
  await updateDoc(doc(db, 'schools', id), withTimestamps({ status }))
}
