import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../../lib/firebase'
import type {
  FaceCheckResponse,
  FaceDeleteResponse,
  FaceEnrollResponse,
} from '../../types/face-check'

/**
 * Gateway seguro: a escola/app NUNCA recebe embeddings.
 * Rotas (Firebase Callable):
 * - enrollFace
 * - matchFace   → { allowed: true|false, outcome, studentId?, confidence? }
 * - deleteFaceEnrollment
 */
const functions = getFunctions(app, 'southamerica-east1')

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export async function fileToImageBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const mime = file.type || 'image/jpeg'
  return `data:${mime};base64,${arrayBufferToBase64(buffer)}`
}

export async function enrollFaceSecureApi(params: {
  studentId: string
  schoolId: string
  imageBase64: string
  source?: 'enrollment' | 'reenrollment'
}): Promise<FaceEnrollResponse> {
  try {
    const callable = httpsCallable(functions, 'enrollFace')
    const result = await callable(params)
    return result.data as FaceEnrollResponse
  } catch (err) {
    throw mapCallableError(err, 'enrollFace')
  }
}

/**
 * Face-check: retorna só SIM/NÃO (+ metadados mínimos).
 * allowed === true → catraca/check-in pode liberar
 */
export async function matchFaceSecureApi(params: {
  schoolId: string
  cameraPointId: string
  cameraPointKind?: 'entrada' | 'saida' | 'ambos'
  imageBase64?: string
  asStudentId?: string
  forceNoMatch?: boolean
}): Promise<FaceCheckResponse> {
  try {
    const callable = httpsCallable(functions, 'matchFace')
    const result = await callable(params)
    return result.data as FaceCheckResponse
  } catch (err) {
    throw mapCallableError(err, 'matchFace')
  }
}

export async function deleteFaceEnrollmentSecureApi(params: {
  studentId: string
  schoolId: string
}): Promise<FaceDeleteResponse> {
  try {
    const callable = httpsCallable(functions, 'deleteFaceEnrollment')
    const result = await callable(params)
    return result.data as FaceDeleteResponse
  } catch (err) {
    throw mapCallableError(err, 'deleteFaceEnrollment')
  }
}

function mapCallableError(err: unknown, op: string): Error {
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : ''
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err && 'message' in err
        ? String((err as { message: string }).message)
        : 'Falha no face-check seguro'

  if (code.includes('not-found') || message.toLowerCase().includes('not found')) {
    return new Error(
      `${op} indisponível: ative o plano Blaze e faça deploy das Cloud Functions (docs-ia/facial_check_seguro.md). Embeddings não são mais acessíveis pelo app.`,
    )
  }
  return new Error(message)
}

export async function enrollFaceFromImageFileSecure(params: {
  studentId: string
  schoolId: string
  file: File
  reenrollment?: boolean
}): Promise<FaceEnrollResponse> {
  const imageBase64 = await fileToImageBase64(params.file)
  return enrollFaceSecureApi({
    studentId: params.studentId,
    schoolId: params.schoolId,
    imageBase64,
    source: params.reenrollment ? 'reenrollment' : 'enrollment',
  })
}
