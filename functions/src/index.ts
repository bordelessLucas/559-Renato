import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import {
  deleteFaceEnrollmentSecure,
  enrollFaceSecure,
  loadUserProfile,
  matchFaceSecure,
} from './face-service'

admin.initializeApp()
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 20 })

function requireAuth(request: { auth?: { uid: string } }) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Autenticação obrigatória.')
  }
  return request.auth.uid
}

/**
 * POST callable enrollFace
 * Entrada: { studentId, schoolId, imageBase64, source? }
 * Saída: FaceEnrollResponse (sem embedding)
 */
export const enrollFace = onCall({ cors: true }, async (request) => {
  try {
    const uid = requireAuth(request)
    const profile = await loadUserProfile(uid)
    const data = request.data as {
      studentId?: string
      schoolId?: string
      imageBase64?: string
      source?: 'enrollment' | 'reenrollment'
    }
    if (!data.studentId || !data.schoolId || !data.imageBase64) {
      throw new HttpsError('invalid-argument', 'studentId, schoolId e imageBase64 são obrigatórios.')
    }
    return await enrollFaceSecure({
      uid,
      role: profile.role,
      schoolIdOfUser: profile.schoolId,
      studentId: data.studentId,
      schoolId: data.schoolId,
      imageBase64: data.imageBase64,
      source: data.source,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha no enroll'
    if (err instanceof HttpsError) throw err
    throw new HttpsError('failed-precondition', message)
  }
})

/**
 * POST callable matchFace  (face-check)
 * Entrada: { schoolId, cameraPointId, cameraPointKind?, imageBase64? | asStudentId?, forceNoMatch? }
 * Saída: { allowed: boolean, outcome, studentId?, confidence?, message } — SEM embedding
 *
 * Uso escola:
 * - allowed === true  → liberar catraca / check-in
 * - allowed === false → negar / revisão / fallback manual
 */
export const matchFace = onCall({ cors: true }, async (request) => {
  try {
    const uid = requireAuth(request)
    const profile = await loadUserProfile(uid)
    const data = request.data as {
      schoolId?: string
      cameraPointId?: string
      cameraPointKind?: 'entrada' | 'saida' | 'ambos'
      imageBase64?: string
      asStudentId?: string
      forceNoMatch?: boolean
    }
    if (!data.schoolId || !data.cameraPointId) {
      throw new HttpsError('invalid-argument', 'schoolId e cameraPointId são obrigatórios.')
    }
    return await matchFaceSecure({
      uid,
      role: profile.role,
      schoolIdOfUser: profile.schoolId,
      schoolId: data.schoolId,
      cameraPointId: data.cameraPointId,
      cameraPointKind: data.cameraPointKind,
      imageBase64: data.imageBase64,
      asStudentId: data.asStudentId,
      forceNoMatch: data.forceNoMatch,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha no match'
    if (err instanceof HttpsError) throw err
    throw new HttpsError('failed-precondition', message)
  }
})

/**
 * POST callable deleteFaceEnrollment — LGPD / revogação
 */
export const deleteFaceEnrollment = onCall({ cors: true }, async (request) => {
  try {
    const uid = requireAuth(request)
    const profile = await loadUserProfile(uid)
    const data = request.data as { studentId?: string; schoolId?: string }
    if (!data.studentId || !data.schoolId) {
      throw new HttpsError('invalid-argument', 'studentId e schoolId são obrigatórios.')
    }
    return await deleteFaceEnrollmentSecure({
      uid,
      role: profile.role,
      schoolIdOfUser: profile.schoolId,
      studentId: data.studentId,
      schoolId: data.schoolId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao apagar biometria'
    if (err instanceof HttpsError) throw err
    throw new HttpsError('failed-precondition', message)
  }
})
