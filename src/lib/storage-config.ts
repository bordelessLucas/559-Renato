/**
 * Controle de Storage enquanto o cliente não ativa o produto.
 * - false (default): foto opcional; upload não bloqueia cadastro
 * - true: tenta upload; recomenda foto no fluxo público
 *
 * Ative com VITE_STORAGE_ENABLED=true no .env quando o Storage estiver no ar.
 */
export function isStorageEnabled() {
  return String(import.meta.env.VITE_STORAGE_ENABLED ?? 'false').toLowerCase() === 'true'
}

export const STORAGE_PENDING_MESSAGE =
  'Foto pendente — o armazenamento de imagens ainda não está ativo neste ambiente.'
