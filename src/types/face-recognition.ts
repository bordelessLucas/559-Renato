/** Contrato de eventos do reconhecimento facial (Sprint 4).
 * A implementação concreta depende do fabricante/API escolhidos pelo cliente.
 */

export type FaceMatchStatus = 'matched' | 'no_match' | 'low_confidence' | 'error'

export interface FaceRecognitionEvent {
  /** Identificador do evento no provedor (quando houver) */
  providerEventId?: string
  schoolId: string
  /** Ponto físico da câmera — default para diferenciar entrada/saída */
  cameraPointId: string
  cameraPointKind: 'entrada' | 'saida' | 'ambos'
  capturedAt: string
  status: FaceMatchStatus
  studentId?: string
  confidence?: number
  rawPayload?: Record<string, unknown>
  errorMessage?: string
}

export interface FaceRecognitionMatchResult {
  studentId: string
  schoolId: string
  confidence: number
  cameraPointId: string
  cameraPointKind: FaceRecognitionEvent['cameraPointKind']
  capturedAt: string
}

export interface FaceRecognitionProvider {
  readonly id: string
  readonly label: string
  /** true quando há integração real; false = stub aguardando cliente */
  readonly ready: boolean
  /**
   * Processa um evento bruto do provedor e devolve o contrato canônico.
   * Provedores reais mapeiam o payload da API para este formato.
   */
  normalizeEvent(raw: unknown): Promise<FaceRecognitionEvent>
  /**
   * Opcional: comparação online foto ↔ base (quando o provedor expuser).
   * Stub lança indicando bloqueio externo.
   */
  identify?(params: {
    schoolId: string
    imageBytes: ArrayBuffer
    cameraPointId: string
  }): Promise<FaceRecognitionMatchResult | null>
}
