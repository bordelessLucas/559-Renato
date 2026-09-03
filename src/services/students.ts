import {
  addDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { studentsCollection, withTimestamps } from '../lib/firestore'
import { isGeneralAdmin } from '../lib/permissions'
import type { Student, StudentInput } from '../types/student'
import type { EntityStatus, StudentShift } from '../types/common'
import type { AppUser } from '../types/user'
import type { Guardian } from '../types/guardian'

const PHOTO_MAX_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function mapStudent(id: string, data: Record<string, unknown>): Student {
  const rawGuardians = Array.isArray(data.guardianIds) ? data.guardianIds : []
  const shift = String(data.shift ?? '') as StudentShift | ''

  return {
    id,
    name: String(data.name ?? ''),
    birthDate: String(data.birthDate ?? ''),
    enrollmentCode: String(data.enrollmentCode ?? ''),
    className: String(data.className ?? ''),
    shift: shift === 'manha' || shift === 'tarde' || shift === 'noite' || shift === 'integral' ? shift : '',
    notes: String(data.notes ?? ''),
    photoUrl: String(data.photoUrl ?? ''),
    photoPath: String(data.photoPath ?? ''),
    schoolId: String(data.schoolId ?? ''),
    guardianIds: rawGuardians.map((item) => String(item)).filter(Boolean),
    guardianUserIds: (Array.isArray(data.guardianUserIds) ? data.guardianUserIds : [])
      .map((item) => String(item))
      .filter(Boolean),
    isDemo: Boolean(data.isDemo),
    status: (data.status as EntityStatus) ?? 'ativo',
    createdAt: (data.createdAt as Student['createdAt']) ?? null,
    updatedAt: (data.updatedAt as Student['updatedAt']) ?? null,
  }
}

export async function listStudents(): Promise<Student[]> {
  const snap = await getDocs(query(studentsCollection, orderBy('name')))
  return snap.docs.map((item) => mapStudent(item.id, item.data()))
}

export async function listStudentsForProfile(profile: AppUser): Promise<Student[]> {
  if (isGeneralAdmin(profile)) {
    return listStudents()
  }

  const snap = await getDocs(
    query(studentsCollection, where('schoolId', '==', profile.schoolId)),
  )
  return snap.docs
    .map((item) => mapStudent(item.id, item.data()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export async function listStudentsByGuardianId(guardianId: string): Promise<Student[]> {
  const snap = await getDocs(
    query(studentsCollection, where('guardianIds', 'array-contains', guardianId)),
  )
  return snap.docs
    .map((item) => mapStudent(item.id, item.data()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export async function listStudentsForGuardianUser(userId: string): Promise<Student[]> {
  const snap = await getDocs(
    query(studentsCollection, where('guardianUserIds', 'array-contains', userId)),
  )
  return snap.docs
    .map((item) => mapStudent(item.id, item.data()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export function userIdsFromGuardians(guardians: Guardian[], guardianIds: string[]) {
  return [
    ...new Set(
      guardians
        .filter((guardian) => guardianIds.includes(guardian.id) && guardian.userId)
        .map((guardian) => guardian.userId),
    ),
  ]
}

export async function getStudentById(id: string): Promise<Student | null> {
  const snap = await getDoc(doc(db, 'students', id))
  if (!snap.exists()) return null
  return mapStudent(snap.id, snap.data())
}

export async function createStudent(input: StudentInput): Promise<string> {
  const ref = await addDoc(studentsCollection, withTimestamps(input, true))
  return ref.id
}

export async function updateStudent(id: string, input: Partial<StudentInput>): Promise<void> {
  await updateDoc(doc(db, 'students', id), withTimestamps(input))
}

export async function setStudentStatus(id: string, status: EntityStatus): Promise<void> {
  await updateDoc(doc(db, 'students', id), withTimestamps({ status }))
}

export function validateStudentPhoto(file: File) {
  if (!PHOTO_TYPES.includes(file.type)) {
    throw new Error('Use uma imagem JPG, PNG ou WEBP.')
  }
  if (file.size > PHOTO_MAX_BYTES) {
    throw new Error('A imagem deve ter no máximo 5 MB.')
  }
}

export async function uploadStudentPhoto(studentId: string, schoolId: string, file: File) {
  validateStudentPhoto(file)
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const photoPath = `students/${schoolId}/${studentId}/photo.${extension}`
  const storageRef = ref(storage, photoPath)
  await uploadBytes(storageRef, file, { contentType: file.type })
  const photoUrl = await getDownloadURL(storageRef)
  return { photoPath, photoUrl }
}

export async function deleteStudentPhoto(photoPath: string) {
  if (!photoPath) return
  await deleteObject(ref(storage, photoPath))
}

export async function relocateStudentPhoto(student: Student, newSchoolId: string) {
  if (!student.photoUrl || !student.photoPath || student.schoolId === newSchoolId) {
    return { photoUrl: student.photoUrl, photoPath: student.photoPath }
  }

  const response = await fetch(student.photoUrl)
  if (!response.ok) {
    return { photoUrl: student.photoUrl, photoPath: student.photoPath }
  }

  const blob = await response.blob()
  const file = new File([blob], 'photo', { type: blob.type || 'image/jpeg' })
  const uploaded = await uploadStudentPhoto(student.id, newSchoolId, file)
  try {
    await deleteStudentPhoto(student.photoPath)
  } catch {
    // a foto antiga pode permanecer se a exclusão falhar
  }
  return uploaded
}
