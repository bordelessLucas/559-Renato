import * as admin from 'firebase-admin'
import {
  FACE_CHECK_THRESHOLDS,
  MODEL_ID,
  cosineSimilarity,
  decideFromScores,
  deterministicUnitVector,
  l2Normalize,
  seedFromImageBytes,
} from './face-math'

const db = () => admin.firestore()

export type FaceCheckOutcome = 'allow' | 'deny' | 'review' | 'error' | 'not_enrolled'

export type FaceCheckResult = {
  allowed: boolean
  outcome: FaceCheckOutcome
  studentId?: string
  confidence?: number
  cameraPointId?: string
  cameraPointKind?: 'entrada' | 'saida' | 'ambos'
  modelId: string
  requestId: string
  message: string
}

function requestId() {
  return `fc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function roundConfidence(score: number) {
  return Math.round(score * 1000) / 1000
}

function decodeImageBase64(imageBase64: string): Uint8Array {
  const cleaned = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const buf = Buffer.from(cleaned, 'base64')
  if (buf.byteLength < 32) {
    throw new Error('Imagem inválida ou muito pequena.')
  }
  if (buf.byteLength > 5 * 1024 * 1024) {
    throw new Error('Imagem excede 5 MB.')
  }
  return new Uint8Array(buf)
}

/** Mock enroll: ancora no studentId + bytes (mesma lógica do app anterior). */
export function embedForEnrollment(studentId: string, bytes: Uint8Array): {
  embedding: number[]
  qualityScore: number
} {
  const byteSeed = seedFromImageBytes(bytes, studentId)
  const base = deterministicUnitVector(`probe:${studentId}`)
  const noise = deterministicUnitVector(byteSeed)
  const mixed = base.map((v, i) => v * 0.92 + noise[i] * 0.08)
  return {
    embedding: l2Normalize(mixed),
    qualityScore: Math.min(1, 0.6 + bytes.byteLength / (2 * 1024 * 1024)),
  }
}

export function embedProbeFromBytes(bytes: Uint8Array): number[] {
  const seed = seedFromImageBytes(bytes)
  return deterministicUnitVector(seed)
}

export function embedProbeAsStudent(studentId: string): number[] {
  return deterministicUnitVector(`probe:${studentId}`)
}

async function writeAudit(entry: Record<string, unknown>) {
  await db().collection('faceAuditLogs').add({
    ...entry,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}

export async function enrollFaceSecure(params: {
  uid: string
  role: string
  schoolIdOfUser: string
  studentId: string
  schoolId: string
  imageBase64: string
  source?: 'enrollment' | 'reenrollment'
}) {
  const id = requestId()
  const studentRef = db().collection('students').doc(params.studentId)
  const studentSnap = await studentRef.get()
  if (!studentSnap.exists) {
    throw new Error('Aluno não encontrado.')
  }
  const student = studentSnap.data()!
  if (student.schoolId !== params.schoolId) {
    throw new Error('Aluno não pertence a esta escola.')
  }

  const isGeneral = params.role === 'administrador_geral' || params.role === 'administrador'
  const isSchoolStaff =
    (params.role === 'administrador_escola' || params.role === 'operador') &&
    params.schoolIdOfUser === params.schoolId
  const guardianIds: string[] = Array.isArray(student.guardianUserIds)
    ? student.guardianUserIds
    : []
  const isGuardian =
    params.role === 'responsavel' &&
    guardianIds.includes(params.uid) &&
    params.schoolIdOfUser === params.schoolId

  if (!isGeneral && !isSchoolStaff && !isGuardian) {
    throw new Error('Sem permissão para cadastrar biometria deste aluno.')
  }

  const bytes = decodeImageBase64(params.imageBase64)
  const { embedding, qualityScore } = embedForEnrollment(params.studentId, bytes)
  if (qualityScore < 0.4) {
    throw new Error('Qualidade insuficiente da imagem para cadastrar o rosto.')
  }

  const existing = await db()
    .collection('faceTemplates')
    .where('studentId', '==', params.studentId)
    .where('schoolId', '==', params.schoolId)
    .get()

  const batch = db().batch()
  existing.docs.forEach((doc) => batch.delete(doc.ref))
  const templateRef = db().collection('faceTemplates').doc()
  batch.set(templateRef, {
    studentId: params.studentId,
    schoolId: params.schoolId,
    modelId: MODEL_ID,
    embedding,
    qualityScore,
    source: params.source === 'reenrollment' ? 'reenrollment' : 'enrollment',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  batch.update(studentRef, {
    faceEnrolled: true,
    faceTemplateCount: 1,
    photoUrl: '',
    photoPath: '',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  await batch.commit()

  await writeAudit({
    requestId: id,
    action: 'enroll',
    actorUid: params.uid,
    studentId: params.studentId,
    schoolId: params.schoolId,
    modelId: MODEL_ID,
    ok: true,
    // sem embedding / sem imagem
  })

  return {
    ok: true,
    studentId: params.studentId,
    schoolId: params.schoolId,
    faceEnrolled: true,
    faceTemplateCount: 1,
    modelId: MODEL_ID,
    requestId: id,
    message: 'Rosto vetorizado com segurança. A imagem não foi armazenada.',
  }
}

export async function matchFaceSecure(params: {
  uid: string
  role: string
  schoolIdOfUser: string
  schoolId: string
  cameraPointId: string
  cameraPointKind?: 'entrada' | 'saida' | 'ambos'
  /** Frame real (base64). Alternativa demo: asStudentId */
  imageBase64?: string
  asStudentId?: string
  forceNoMatch?: boolean
}): Promise<FaceCheckResult> {
  const id = requestId()
  const kind: 'entrada' | 'saida' | 'ambos' =
    params.cameraPointKind === 'saida' || params.cameraPointKind === 'ambos'
      ? params.cameraPointKind
      : 'entrada'

  const isGeneral = params.role === 'administrador_geral' || params.role === 'administrador'
  const isStaff =
    params.role === 'administrador_escola' ||
    params.role === 'operador' ||
    isGeneral
  if (!isStaff) {
    throw new Error('Somente staff da escola pode solicitar face-check.')
  }
  if (!isGeneral && params.schoolIdOfUser !== params.schoolId) {
    throw new Error('Escola do usuário não confere com o check solicitado.')
  }

  const base = {
    modelId: MODEL_ID,
    requestId: id,
    cameraPointId: params.cameraPointId,
    cameraPointKind: kind,
  }

  if (params.forceNoMatch) {
    const result: FaceCheckResult = {
      ...base,
      allowed: false,
      outcome: 'deny',
      confidence: 0.1,
      message: 'Negado (simulação sem match). Liberação não autorizada.',
    }
    await writeAudit({
      requestId: id,
      action: 'match',
      actorUid: params.uid,
      schoolId: params.schoolId,
      outcome: result.outcome,
      allowed: false,
    })
    return result
  }

  let probe: number[]
  if (params.asStudentId) {
    probe = embedProbeAsStudent(params.asStudentId)
  } else if (params.imageBase64) {
    probe = embedProbeFromBytes(decodeImageBase64(params.imageBase64))
  } else {
    throw new Error('Informe imageBase64 ou asStudentId (demo).')
  }

  const gallerySnap = await db()
    .collection('faceTemplates')
    .where('schoolId', '==', params.schoolId)
    .get()

  if (gallerySnap.empty) {
    const result: FaceCheckResult = {
      ...base,
      allowed: false,
      outcome: 'not_enrolled',
      message: 'Nenhum template na escola. Cadastre rostos antes do check.',
    }
    await writeAudit({
      requestId: id,
      action: 'match',
      actorUid: params.uid,
      schoolId: params.schoolId,
      outcome: result.outcome,
      allowed: false,
    })
    return result
  }

  type Ranked = { studentId: string; score: number }
  const ranked: Ranked[] = []
  gallerySnap.docs.forEach((doc) => {
    const data = doc.data()
    const embedding = Array.isArray(data.embedding) ? (data.embedding as number[]) : []
    if (!embedding.length) return
    ranked.push({
      studentId: String(data.studentId),
      score: cosineSimilarity(probe, embedding),
    })
  })
  ranked.sort((a, b) => b.score - a.score)
  const best = ranked[0]

  if (params.asStudentId) {
    const mine = ranked.find((r) => r.studentId === params.asStudentId)
    if (!mine) {
      const result: FaceCheckResult = {
        ...base,
        allowed: false,
        outcome: 'not_enrolled',
        studentId: params.asStudentId,
        message: 'Aluno sem template facial.',
      }
      await writeAudit({
        requestId: id,
        action: 'match',
        actorUid: params.uid,
        schoolId: params.schoolId,
        studentId: params.asStudentId,
        outcome: result.outcome,
        allowed: false,
      })
      return result
    }
  }

  const decision = decideFromScores(best.score, FACE_CHECK_THRESHOLDS)
  let result: FaceCheckResult

  if (decision === 'matched') {
    result = {
      ...base,
      allowed: true,
      outcome: 'allow',
      studentId: best.studentId,
      confidence: roundConfidence(best.score),
      message: 'SIM — identidade confirmada. Pode liberar catraca/check-in.',
    }
  } else if (decision === 'needs_review') {
    result = {
      ...base,
      allowed: false,
      outcome: 'review',
      studentId: best.studentId,
      confidence: roundConfidence(best.score),
      message: 'REVISÃO — confiança baixa. Não liberar automaticamente.',
    }
  } else {
    result = {
      ...base,
      allowed: false,
      outcome: 'deny',
      confidence: roundConfidence(best.score),
      message: 'NÃO — sem correspondência. Negar liberação / registrar manualmente.',
    }
  }

  await writeAudit({
    requestId: id,
    action: 'match',
    actorUid: params.uid,
    schoolId: params.schoolId,
    studentId: result.studentId ?? null,
    outcome: result.outcome,
    allowed: result.allowed,
    confidence: result.confidence ?? null,
  })

  return result
}

export async function deleteFaceEnrollmentSecure(params: {
  uid: string
  role: string
  schoolIdOfUser: string
  studentId: string
  schoolId: string
}) {
  const id = requestId()
  const studentRef = db().collection('students').doc(params.studentId)
  const studentSnap = await studentRef.get()
  if (!studentSnap.exists) throw new Error('Aluno não encontrado.')
  const student = studentSnap.data()!

  const isGeneral = params.role === 'administrador_geral' || params.role === 'administrador'
  const isSchoolAdmin =
    params.role === 'administrador_escola' && params.schoolIdOfUser === params.schoolId
  const guardianIds: string[] = Array.isArray(student.guardianUserIds)
    ? student.guardianUserIds
    : []
  const isGuardian =
    params.role === 'responsavel' &&
    guardianIds.includes(params.uid) &&
    params.schoolIdOfUser === params.schoolId

  if (!isGeneral && !isSchoolAdmin && !isGuardian) {
    throw new Error('Sem permissão para apagar biometria.')
  }

  const existing = await db()
    .collection('faceTemplates')
    .where('studentId', '==', params.studentId)
    .where('schoolId', '==', params.schoolId)
    .get()

  const batch = db().batch()
  existing.docs.forEach((doc) => batch.delete(doc.ref))
  batch.update(studentRef, {
    faceEnrolled: false,
    faceTemplateCount: 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  await batch.commit()

  await writeAudit({
    requestId: id,
    action: 'delete',
    actorUid: params.uid,
    studentId: params.studentId,
    schoolId: params.schoolId,
    deletedCount: existing.size,
  })

  return {
    ok: true,
    studentId: params.studentId,
    deletedCount: existing.size,
    requestId: id,
    message: 'Templates biométricos removidos.',
  }
}

export async function loadUserProfile(uid: string) {
  const snap = await db().collection('users').doc(uid).get()
  if (!snap.exists) throw new Error('Perfil de usuário não encontrado.')
  const data = snap.data()!
  if (data.status !== 'ativo') throw new Error('Usuário inativo.')
  return {
    role: String(data.role ?? ''),
    schoolId: String(data.schoolId ?? ''),
  }
}
