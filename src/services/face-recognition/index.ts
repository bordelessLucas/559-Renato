import type {
  FaceRecognitionEvent,
  FaceRecognitionMatchResult,
  FaceRecognitionProvider,
} from '../../types/face-recognition'
import { NullFaceRecognitionProvider } from './null-provider'
import { MockFaceRecognitionProvider } from './mock-provider'
import {
  enrollFaceFromImageFile,
  processFacialMatch,
  runFacialIdentifyPipeline,
} from './pipeline'
import {
  deleteFaceEnrollmentSecureApi,
  enrollFaceFromImageFileSecure,
  enrollFaceSecureApi,
  matchFaceSecureApi,
} from './secure-gateway'

/**
 * Provider de UI: eventos legados + label do pipeline seguro.
 * Match real passa por Cloud Functions (sem embedding no client).
 */
class SecureFaceRecognitionProvider implements FaceRecognitionProvider {
  readonly id = 'secure-callable'
  readonly label = 'Face-check seguro (Callable — só SIM/NÃO)'
  readonly ready = true

  private readonly legacy = new MockFaceRecognitionProvider()

  async normalizeEvent(raw: unknown): Promise<FaceRecognitionEvent> {
    return this.legacy.normalizeEvent(raw)
  }

  async identify(params: {
    schoolId: string
    imageBytes: ArrayBuffer
    cameraPointId: string
    cameraPointKind?: FaceRecognitionEvent['cameraPointKind']
  }): Promise<FaceRecognitionMatchResult | null> {
    const result = await runFacialIdentifyPipeline({
      schoolId: params.schoolId,
      schoolName: '',
      cameraPointId: params.cameraPointId,
      cameraPointKind: params.cameraPointKind,
      imageBytes: params.imageBytes,
    })
    if (!result.check.allowed || !result.check.studentId) return null
    return {
      studentId: result.check.studentId,
      schoolId: params.schoolId,
      confidence: result.check.confidence ?? 0,
      cameraPointId: params.cameraPointId,
      cameraPointKind: params.cameraPointKind || 'entrada',
      capturedAt: new Date().toISOString(),
    }
  }
}

let activeProvider: FaceRecognitionProvider = new SecureFaceRecognitionProvider()

export function getFaceRecognitionProvider(): FaceRecognitionProvider {
  return activeProvider
}

export function setFaceRecognitionProvider(provider: FaceRecognitionProvider) {
  activeProvider = provider
}

export {
  NullFaceRecognitionProvider,
  MockFaceRecognitionProvider,
  SecureFaceRecognitionProvider,
  enrollFaceFromImageFile,
  enrollFaceFromImageFileSecure,
  enrollFaceSecureApi,
  matchFaceSecureApi,
  deleteFaceEnrollmentSecureApi,
  processFacialMatch,
  runFacialIdentifyPipeline,
}
