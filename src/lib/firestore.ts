import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from './firebase'

export const schoolsCollection = collection(db, 'schools')
export const usersCollection = collection(db, 'users')
export const guardiansCollection = collection(db, 'guardians')
export const studentsCollection = collection(db, 'students')
export const systemSettingsRef = doc(db, 'settings', 'system')

export function withTimestamps(data: DocumentData, isCreate = false) {
  return {
    ...data,
    ...(isCreate ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  }
}

export async function getSystemInitialized() {
  const snap = await getDoc(systemSettingsRef)
  return Boolean(snap.exists() && snap.data()?.initialized === true)
}

export async function markSystemInitialized(schoolId: string, adminUid: string) {
  await setDoc(systemSettingsRef, withTimestamps({
    initialized: true,
    firstSchoolId: schoolId,
    firstAdminUid: adminUid,
  }, true))
}

export async function listCollection(
  col: typeof schoolsCollection,
  constraints: QueryConstraint[] = [],
) {
  const q = query(col, ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export { doc, getDoc, getDocs, query, orderBy, limit, setDoc, serverTimestamp }
