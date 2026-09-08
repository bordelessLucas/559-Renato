import type {
  FaceRecognitionEvent,
  FaceRecognitionMatchResult,
  FaceRecognitionProvider,
} from '../../types/face-recognition'

/**
 * Provedor mock para demos sem câmera/hardware.
 * Emite um evento matched a partir de aluno escolhido na UI.
 */
export class MockFaceRecognitionProvider implements FaceRecognitionProvider {
  readonly id = 'mock'
  readonly label = 'Simulação (mock — sem câmera)'
  readonly ready = true

  async normalizeEvent(raw: unknown): Promise<FaceRecognitionEvent> {
    const payload = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const kind =
      payload.cameraPointKind === 'saida' || payload.cameraPointKind === 'ambos'
        ? payload.cameraPointKind
        : 'entrada'

    return {
      providerEventId:
        typeof payload.providerEventId === 'string'
          ? payload.providerEventId
          : `mock-${Date.now()}`,
      schoolId: String(payload.schoolId ?? ''),
      cameraPointId: String(payload.cameraPointId ?? `mock-${kind}`),
      cameraPointKind: kind,
      capturedAt:
        typeof payload.capturedAt === 'string' ? payload.capturedAt : new Date().toISOString(),
      status: payload.studentId ? 'matched' : 'no_match',
      studentId: payload.studentId ? String(payload.studentId) : undefined,
      confidence: typeof payload.confidence === 'number' ? payload.confidence : 0.92,
      rawPayload: payload,
    }
  }

  async identify(params: {
    schoolId: string
    imageBytes: ArrayBuffer
    cameraPointId: string
  }): Promise<FaceRecognitionMatchResult | null> {
    void params
    return null
  }
}
