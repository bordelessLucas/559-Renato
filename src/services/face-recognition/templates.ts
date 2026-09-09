import {
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { faceTemplatesCollection, withTimestamps } from '../../lib/firestore'
import type { FaceTemplate, FaceTemplateInput, FaceTemplateSource } from '../../types/face-embedding'

function mapTemplate(id: string, data: Record<string, unknown>): FaceTemplate {
  const embedding = Array.isArray(data.embedding)
    ? data.embedding.map((v) => Number(v)).filter((v) => Number.isFinite(v))
    : []
  const source: FaceTemplateSource =
    data.source === 'reenrollment' ? 'reenrollment' : 'enrollment'

  return {
    id,
    studentId: String(data.studentId ?? ''),
    schoolId: String(data.schoolId ?? ''),
    modelId: String(data.modelId ?? ''),
    embedding,
    qualityScore: typeof data.qualityScore === 'number' ? data.qualityScore : 0,
    source,
    createdAt: (data.createdAt as FaceTemplate['createdAt']) ?? null,
    updatedAt: (data.updatedAt as FaceTemplate['updatedAt']) ?? null,
  }
}

export async function listFaceTemplatesForSchool(schoolId: string): Promise<FaceTemplate[]> {
  const snap = await getDocs(
    query(faceTemplatesCollection, where('schoolId', '==', schoolId)),
  )
  return snap.docs.map((item) => mapTemplate(item.id, item.data()))
}

export async function listFaceTemplatesForStudent(studentId: string): Promise<FaceTemplate[]> {
  const snap = await getDocs(
    query(faceTemplatesCollection, where('studentId', '==', studentId)),
  )
  return snap.docs.map((item) => mapTemplate(item.id, item.data()))
}

export async function createFaceTemplate(input: FaceTemplateInput): Promise<string> {
  const ref = await addDoc(faceTemplatesCollection, withTimestamps(input, true))
  return ref.id
}

export async function replaceStudentFaceTemplates(
  studentId: string,
  schoolId: string,
  next: FaceTemplateInput,
): Promise<{ templateId: string; count: number }> {
  const existing = await listFaceTemplatesForStudent(studentId)
  await Promise.all(
    existing
      .filter((t) => t.schoolId === schoolId)
      .map((t) => deleteDoc(doc(db, 'faceTemplates', t.id))),
  )
  const templateId = await createFaceTemplate(next)
  return { templateId, count: 1 }
}

export async function deleteFaceTemplatesForStudent(studentId: string): Promise<number> {
  const existing = await listFaceTemplatesForStudent(studentId)
  await Promise.all(existing.map((t) => deleteDoc(doc(db, 'faceTemplates', t.id))))
  return existing.length
}

export async function touchStudentFaceFlags(
  studentId: string,
  flags: { faceEnrolled: boolean; faceTemplateCount: number },
) {
  await updateDoc(doc(db, 'students', studentId), withTimestamps(flags))
}
