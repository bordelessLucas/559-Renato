import type { FaceRecognitionProvider } from '../../types/face-recognition'
import { NullFaceRecognitionProvider } from './null-provider'

let activeProvider: FaceRecognitionProvider = new NullFaceRecognitionProvider()

/** Retorna o provedor ativo (null até definição do cliente). */
export function getFaceRecognitionProvider(): FaceRecognitionProvider {
  return activeProvider
}

/**
 * Troca o provedor (ex.: após implementar Hikvision/Intelbras/etc.).
 * Só chamar com implementação real aprovada — não usar em produção sem PoC.
 */
export function setFaceRecognitionProvider(provider: FaceRecognitionProvider) {
  activeProvider = provider
}

export { NullFaceRecognitionProvider }
