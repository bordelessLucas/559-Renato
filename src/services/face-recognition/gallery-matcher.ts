import type {
  FaceEmbeddingProvider,
  FaceMatchDecision,
  FaceTemplate,
} from '../../types/face-embedding'
import { FACE_MATCH_THRESHOLDS } from '../../types/face-embedding'
import { cosineSimilarity, decideFromScores } from '../../lib/face-math'
import {
  listFaceTemplatesForSchool,
  replaceStudentFaceTemplates,
  touchStudentFaceFlags,
} from './templates'
import {
  DeferredFaceEmbeddingProvider,
  MockEnrollmentEmbeddingProvider,
  MockFaceEmbeddingProvider,
  mockProbeEmbeddingForStudent,
} from './embedding-providers'

export type FaceGalleryMatcher = {
  enroll(params: {
    studentId: string
    schoolId: string
    imageBytes: ArrayBuffer
    source?: 'enrollment' | 'reenrollment'
  }): Promise<FaceTemplate>
  identify(params: {
    schoolId: string
    imageBytes: ArrayBuffer
    cameraPointId: string
    cameraPointKind?: 'entrada' | 'saida' | 'ambos'
  }): Promise<FaceMatchDecision>
  /** Demo: identifica como se o frame fosse do aluno (sem bytes reais de câmera). */
  identifyAsStudent(params: {
    schoolId: string
    studentId: string
    cameraPointId: string
    cameraPointKind?: 'entrada' | 'saida' | 'ambos'
    /** força no_match para testar alerta */
    forceNoMatch?: boolean
  }): Promise<FaceMatchDecision>
}

function toLegacyStatus(status: FaceMatchDecision['status']): FaceMatchDecision['legacyStatus'] {
  if (status === 'matched') return 'matched'
  if (status === 'needs_review') return 'low_confidence'
  if (status === 'error' || status === 'no_face') return 'error'
  return 'no_match'
}

function rankGallery(probe: number[], gallery: FaceTemplate[]) {
  const scored = gallery
    .filter((t) => t.embedding.length > 0)
    .map((t) => ({
      template: t,
      score: cosineSimilarity(probe, t.embedding),
    }))
    .sort((a, b) => b.score - a.score)
  return scored
}

export function createFaceGalleryMatcher(
  embeddingProvider: FaceEmbeddingProvider = new MockFaceEmbeddingProvider(),
): FaceGalleryMatcher {
  return {
    async enroll({ studentId, schoolId, imageBytes, source = 'enrollment' }) {
      const provider =
        embeddingProvider.modelId === 'mock-v1'
          ? new MockEnrollmentEmbeddingProvider(studentId)
          : embeddingProvider

      if (!provider.ready) {
        throw new Error(provider.label)
      }

      const { embedding, qualityScore } = await provider.embed(imageBytes)
      if (qualityScore < 0.4) {
        throw new Error('Qualidade insuficiente da imagem para cadastrar o rosto. Tente outra foto.')
      }

      const { templateId, count } = await replaceStudentFaceTemplates(studentId, schoolId, {
        studentId,
        schoolId,
        modelId: provider.modelId,
        embedding,
        qualityScore,
        source,
      })
      await touchStudentFaceFlags(studentId, {
        faceEnrolled: true,
        faceTemplateCount: count,
      })

      return {
        id: templateId,
        studentId,
        schoolId,
        modelId: provider.modelId,
        embedding,
        qualityScore,
        source,
        createdAt: null,
        updatedAt: null,
      }
    },

    async identify({ schoolId, imageBytes, cameraPointId, cameraPointKind = 'entrada' }) {
      const capturedAt = new Date().toISOString()
      const base = {
        schoolId,
        cameraPointId,
        cameraPointKind,
        capturedAt,
        modelId: embeddingProvider.modelId,
      }

      try {
        if (!embeddingProvider.ready) {
          return {
            ...base,
            status: 'error' as const,
            errorMessage: 'Provedor de embedding não está pronto.',
            legacyStatus: 'error' as const,
          }
        }

        if (imageBytes.byteLength < 32) {
          return {
            ...base,
            status: 'no_face' as const,
            errorMessage: 'Frame sem imagem utilizável.',
            legacyStatus: 'error' as const,
          }
        }

        const { embedding } = await embeddingProvider.embed(imageBytes)
        const gallery = (await listFaceTemplatesForSchool(schoolId)).filter(
          (t) => t.modelId === embeddingProvider.modelId || t.modelId === 'mock-v1',
        )

        if (gallery.length === 0) {
          return {
            ...base,
            status: 'not_enrolled' as const,
            errorMessage: 'Nenhum rosto cadastrado nesta escola.',
            legacyStatus: 'no_match' as const,
          }
        }

        const ranked = rankGallery(embedding, gallery)
        const best = ranked[0]
        const second = ranked[1]
        const decision = decideFromScores(best.score, FACE_MATCH_THRESHOLDS)

        return {
          ...base,
          status: decision,
          studentId: decision === 'no_match' ? undefined : best.template.studentId,
          confidence: best.score,
          bestScore: best.score,
          secondBestScore: second?.score,
          legacyStatus: toLegacyStatus(decision),
        }
      } catch (err) {
        return {
          ...base,
          status: 'error' as const,
          errorMessage: err instanceof Error ? err.message : 'Falha no identify',
          legacyStatus: 'error' as const,
        }
      }
    },

    async identifyAsStudent({
      schoolId,
      studentId,
      cameraPointId,
      cameraPointKind = 'entrada',
      forceNoMatch = false,
    }) {
      const capturedAt = new Date().toISOString()
      const base = {
        schoolId,
        cameraPointId,
        cameraPointKind,
        capturedAt,
        modelId: embeddingProvider.modelId,
      }

      if (forceNoMatch) {
        return {
          ...base,
          status: 'no_match' as const,
          confidence: 0.12,
          bestScore: 0.12,
          legacyStatus: 'no_match' as const,
        }
      }

      const gallery = await listFaceTemplatesForSchool(schoolId)
      const mine = gallery.filter((t) => t.studentId === studentId)
      if (mine.length === 0) {
        return {
          ...base,
          status: 'not_enrolled' as const,
          studentId,
          errorMessage: 'Aluno sem template facial. Cadastre o rosto antes de depender do reconhecimento.',
          legacyStatus: 'no_match' as const,
        }
      }

      const probe = await mockProbeEmbeddingForStudent(studentId)
      const ranked = rankGallery(probe.embedding, gallery)
      const best = ranked[0]
      const second = ranked[1]
      const decision = decideFromScores(best.score, FACE_MATCH_THRESHOLDS)

      return {
        ...base,
        status: decision,
        studentId: decision === 'no_match' ? undefined : best.template.studentId,
        confidence: best.score,
        bestScore: best.score,
        secondBestScore: second?.score,
        legacyStatus: toLegacyStatus(decision),
      }
    },
  }
}

let activeEmbeddingProvider: FaceEmbeddingProvider = new MockFaceEmbeddingProvider()
let activeMatcher: FaceGalleryMatcher = createFaceGalleryMatcher(activeEmbeddingProvider)

export function getFaceEmbeddingProvider() {
  return activeEmbeddingProvider
}

export function setFaceEmbeddingProvider(provider: FaceEmbeddingProvider) {
  activeEmbeddingProvider = provider
  activeMatcher = createFaceGalleryMatcher(provider)
}

export function getFaceGalleryMatcher() {
  return activeMatcher
}

export { MockFaceEmbeddingProvider, DeferredFaceEmbeddingProvider, mockProbeEmbeddingForStudent }
