import type { FaceRecognitionProvider } from '../../types/face-recognition'
import { NullFaceRecognitionProvider } from './null-provider'
import { MockFaceRecognitionProvider } from './mock-provider'

/** Default: mock pronto para demos (sem hardware). Troque por null quando quiser sinalizar bloqueio. */
let activeProvider: FaceRecognitionProvider = new MockFaceRecognitionProvider()

export function getFaceRecognitionProvider(): FaceRecognitionProvider {
  return activeProvider
}

export function setFaceRecognitionProvider(provider: FaceRecognitionProvider) {
  activeProvider = provider
}

export { NullFaceRecognitionProvider, MockFaceRecognitionProvider }
