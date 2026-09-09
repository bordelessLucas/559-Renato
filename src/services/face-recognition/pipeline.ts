import { Timestamp } from 'firebase/firestore'
import { getStudentById } from '../students'
import { getGuardianById } from '../guardians'
import { movementTypeFromCameraPoint, recordMovement } from '../movements'
import {
  buildMovementNotificationMessage,
  enqueueMovementNotification,
} from '../notifications'
import { createAlert } from '../alerts'
import { matchFaceSecureApi, enrollFaceFromImageFileSecure } from './secure-gateway'
import type { FaceCheckResponse } from '../../types/face-check'
import type { FaceMatchDecision } from '../../types/face-embedding'
import type { MovementType } from '../../types/movement'

export type FacialPipelineResult = {
  decision: FaceMatchDecision
  check: FaceCheckResponse
  movementId?: string
  duplicated?: boolean
  notified?: boolean
  alertId?: string
  message: string
}

function checkToDecision(check: FaceCheckResponse): FaceMatchDecision {
  const status =
    check.outcome === 'allow'
      ? 'matched'
      : check.outcome === 'review'
        ? 'needs_review'
        : check.outcome === 'not_enrolled'
          ? 'not_enrolled'
          : check.outcome === 'error'
            ? 'error'
            : 'no_match'

  return {
    status,
    schoolId: '', // preenchido pelo caller via check context se necessário
    cameraPointId: check.cameraPointId || '',
    cameraPointKind: check.cameraPointKind || 'entrada',
    capturedAt: new Date().toISOString(),
    studentId: check.studentId,
    confidence: check.confidence,
    bestScore: check.confidence,
    modelId: check.modelId,
    errorMessage: check.outcome === 'allow' ? undefined : check.message,
    legacyStatus:
      status === 'matched'
        ? 'matched'
        : status === 'needs_review'
          ? 'low_confidence'
          : status === 'error'
            ? 'error'
            : 'no_match',
  }
}

async function notifyGuardians(params: {
  schoolId: string
  schoolName: string
  studentId: string
  studentName: string
  movementId: string
  movementType: MovementType
}) {
  const student = await getStudentById(params.studentId)
  if (!student) return false

  const timeLabel = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const message = buildMovementNotificationMessage({
    studentName: params.studentName,
    schoolName: params.schoolName,
    type: params.movementType,
    timeLabel,
  })

  let any = false
  for (const guardianId of student.guardianIds) {
    const guardian = await getGuardianById(guardianId)
    const phone = guardian?.phonePrimary || guardian?.phoneSecondary || '00000000000'
    const result = await enqueueMovementNotification({
      schoolId: params.schoolId,
      studentId: params.studentId,
      movementId: params.movementId,
      movementType: params.movementType,
      recipientPhone: phone,
      message,
    })
    if (result.status === 'sent' || result.status === 'skipped' || result.status === 'queued') {
      any = true
    }
  }
  return any
}

/**
 * Orquestra face-check seguro (SIM/NÃO) → movimento+notify OU alerta.
 * Embeddings nunca chegam ao client.
 */
export async function processFaceCheck(params: {
  check: FaceCheckResponse
  schoolId: string
  schoolName: string
  studentNameFallback?: string
  fallbackMovementType?: MovementType
}): Promise<FacialPipelineResult> {
  const { check, schoolId, schoolName } = params
  const decision = checkToDecision(check)
  decision.schoolId = schoolId

  const movementType = movementTypeFromCameraPoint(
    check.cameraPointKind || 'entrada',
    params.fallbackMovementType ?? 'entrada',
  )

  if (check.allowed && check.studentId) {
    const student = await getStudentById(check.studentId)
    const studentName = student?.name || params.studentNameFallback || 'Aluno'
    const recorded = await recordMovement({
      schoolId,
      studentId: check.studentId,
      studentName,
      type: movementType,
      source: 'facial',
      cameraPointId: check.cameraPointId || 'secure-check',
      confidence: check.confidence ?? null,
      providerEventId: check.requestId,
    })

    let notified = false
    if (!recorded.duplicated) {
      notified = await notifyGuardians({
        schoolId,
        schoolName,
        studentId: check.studentId,
        studentName,
        movementId: recorded.id,
        movementType,
      })
    }

    return {
      decision,
      check,
      movementId: recorded.id,
      duplicated: recorded.duplicated,
      notified,
      message: recorded.duplicated
        ? 'SIM (já havia movimentação recente).'
        : `SIM — ${studentName} · ${movementType}${notified ? ' · aviso enfileirado' : ''}`,
    }
  }

  if (check.outcome === 'review') {
    const student = check.studentId ? await getStudentById(check.studentId) : null
    const alertId = await createAlert({
      schoolId,
      studentId: check.studentId || '',
      studentName: student?.name || 'Possível aluno',
      kind: 'revisao_facial',
      message: check.message,
      status: 'aberto',
      occurredAt: Timestamp.now(),
    })
    return {
      decision,
      check,
      alertId,
      message: 'REVISÃO — sem liberação automática. Use registro manual se confirmar.',
    }
  }

  if (check.outcome === 'not_enrolled') {
    const alertId = await createAlert({
      schoolId,
      studentId: check.studentId || '',
      studentName: params.studentNameFallback || 'Aluno',
      kind: 'nao_reconhecido',
      message: check.message,
      status: 'aberto',
      occurredAt: Timestamp.now(),
    })
    return {
      decision,
      check,
      alertId,
      message: 'Sem template — NÃO liberar. Cadastre o rosto ou registre manualmente.',
    }
  }

  const alertId = await createAlert({
    schoolId,
    studentId: '',
    studentName: 'Não identificado',
    kind: 'nao_reconhecido',
    message: check.message,
    status: 'aberto',
    occurredAt: Timestamp.now(),
  })
  return {
    decision,
    check,
    alertId,
    message: 'NÃO — alerta aberto. Fallback: registro manual para avisar a família.',
  }
}

export async function runFacialIdentifyPipeline(params: {
  schoolId: string
  schoolName: string
  cameraPointId: string
  cameraPointKind?: 'entrada' | 'saida' | 'ambos'
  imageBytes?: ArrayBuffer
  asStudentId?: string
  forceNoMatch?: boolean
  fallbackMovementType?: MovementType
  studentNameFallback?: string
}): Promise<FacialPipelineResult> {
  let imageBase64: string | undefined
  if (params.imageBytes && params.imageBytes.byteLength > 0) {
    const bytes = new Uint8Array(params.imageBytes)
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    imageBase64 = `data:application/octet-stream;base64,${btoa(binary)}`
  }

  const check = await matchFaceSecureApi({
    schoolId: params.schoolId,
    cameraPointId: params.cameraPointId,
    cameraPointKind: params.cameraPointKind,
    imageBase64,
    asStudentId: params.asStudentId,
    forceNoMatch: params.forceNoMatch,
  })

  return processFaceCheck({
    check,
    schoolId: params.schoolId,
    schoolName: params.schoolName,
    studentNameFallback: params.studentNameFallback,
    fallbackMovementType: params.fallbackMovementType,
  })
}

/** Enroll via Callable — imagem sobe só na request; vetor fica no server. */
export async function enrollFaceFromImageFile(params: {
  studentId: string
  schoolId: string
  file: File
  reenrollment?: boolean
}) {
  const result = await enrollFaceFromImageFileSecure(params)
  return {
    id: result.requestId,
    studentId: result.studentId,
    schoolId: result.schoolId,
    modelId: result.modelId,
    embedding: [] as number[],
    qualityScore: 1,
    source: params.reenrollment ? ('reenrollment' as const) : ('enrollment' as const),
    createdAt: null,
    updatedAt: null,
  }
}

export { processFaceCheck as processFacialMatch }
