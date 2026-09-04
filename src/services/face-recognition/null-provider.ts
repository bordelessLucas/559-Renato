import type { FaceRecognitionEvent, FaceRecognitionProvider } from '../../types/face-recognition'

/**
 * Provedor nulo — usado até o cliente definir câmera/API.
 * Não inventa integração; apenas documenta o contrato.
 */
export class NullFaceRecognitionProvider implements FaceRecognitionProvider {
  readonly id = 'null'
  readonly label = 'Aguardando definição do cliente'
  readonly ready = false

  async normalizeEvent(raw: unknown): Promise<FaceRecognitionEvent> {
    const payload = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    return {
      providerEventId: typeof payload.id === 'string' ? payload.id : undefined,
      schoolId: String(payload.schoolId ?? ''),
      cameraPointId: String(payload.cameraPointId ?? 'undefined'),
      cameraPointKind:
        payload.cameraPointKind === 'saida' || payload.cameraPointKind === 'ambos'
          ? payload.cameraPointKind
          : 'entrada',
      capturedAt:
        typeof payload.capturedAt === 'string' ? payload.capturedAt : new Date().toISOString(),
      status: 'error',
      errorMessage:
        'Reconhecimento facial bloqueado: fabricante/API ainda não definidos pelo cliente.',
      rawPayload: payload,
    }
  }

  async identify(): Promise<null> {
    throw new Error(
      'PoC de reconhecimento facial indisponível até a escolha da câmera/API pelo cliente.',
    )
  }
}
