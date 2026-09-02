import {
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { deleteApp, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { app, db } from '../lib/firebase'
import { usersCollection, withTimestamps } from '../lib/firestore'
import { getAuthErrorMessage } from '../lib/auth-errors'
import type { AppUser, AppUserInput } from '../types/user'
import type { EntityStatus } from '../types/common'

function mapUser(id: string, data: Record<string, unknown>): AppUser {
  return {
    id,
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),
    schoolId: String(data.schoolId ?? ''),
    role: (data.role as AppUser['role']) ?? 'operador',
    status: (data.status as EntityStatus) ?? 'ativo',
    createdAt: (data.createdAt as AppUser['createdAt']) ?? null,
    updatedAt: (data.updatedAt as AppUser['updatedAt']) ?? null,
  }
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return mapUser(snap.id, snap.data())
}

export async function listUsers(): Promise<AppUser[]> {
  const snap = await getDocs(query(usersCollection, orderBy('name')))
  return snap.docs.map((item) => mapUser(item.id, item.data()))
}

export async function createAdminUserAccount(params: {
  email: string
  password: string
  profile: AppUserInput
}): Promise<string> {
  const secondaryApp = initializeApp(app.options, `secondary-${Date.now()}`)
  const secondaryAuth = getAuth(secondaryApp)

  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      params.email.trim(),
      params.password,
    )
    const uid = credential.user.uid

    await setDoc(
      doc(db, 'users', uid),
      withTimestamps(
        {
          ...params.profile,
          email: params.email.trim().toLowerCase(),
        },
        true,
      ),
    )

    return uid
  } catch (error) {
    throw new Error(getAuthErrorMessage(error))
  } finally {
    await deleteApp(secondaryApp)
  }
}

export async function createUserProfile(uid: string, profile: AppUserInput): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    withTimestamps(
      {
        ...profile,
        email: profile.email.trim().toLowerCase(),
      },
      true,
    ),
  )
}

export async function updateUser(id: string, input: Partial<AppUserInput>): Promise<void> {
  const payload = { ...input }
  if (payload.email) {
    payload.email = payload.email.trim().toLowerCase()
  }
  await updateDoc(doc(db, 'users', id), withTimestamps(payload))
}

export async function setUserStatus(id: string, status: EntityStatus): Promise<void> {
  await updateDoc(doc(db, 'users', id), withTimestamps({ status }))
}
