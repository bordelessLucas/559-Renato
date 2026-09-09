# Reconhecimento facial por vetorização

## Princípio

**Não persistimos fotos de crianças** para reconhecimento. O fluxo é:

1. Foto temporária (cadastro / captura)
2. Vetorização (embedding facial)
3. Descarte da imagem
4. Match por similaridade de cosseno contra a galeria da escola
5. Só então: movimento + notificação aos pais

## Por que não OpenAI

Modelos gerais (CLIP/Vision) medem semelhança semântica de imagem, não identidade facial. Isso aumenta **falso negativo** (criança na escola sem aviso). O contrato do produto usa embeddings **faciais** (ArcFace/InsightFace ou Face API cloud). Hoje: **`MockFaceEmbeddingProvider` (`mock-v1`)**.

## Componentes no código

| Peça | Onde |
|------|------|
| Math (cosseno / limiares) | `src/lib/face-math.ts` |
| Tipos | `src/types/face-embedding.ts` |
| Coleção | `faceTemplates` |
| Matcher | `src/services/face-recognition/gallery-matcher.ts` |
| Pipeline | `src/services/face-recognition/pipeline.ts` |
| Enroll UI | formulários responsável / admin / signup público |
| Identify UI | `/app/movimentacoes` |

## Limiares (cosseno)

- `autoMatch` ≥ 0,48 → movimento + notificação
- `reviewMin` ≥ 0,38 → alerta `revisao_facial` (sem notificar sozinho)
- abaixo → alerta `nao_reconhecido` + fallback manual

## Roteiro de validação (demo)

1. Responsável cadastra dependente **com foto** → toast “rosto vetorizado”; detalhe mostra “Reconhecimento ok”
2. Operador em **Entrada e saída** → “Simular match” → movimento `facial` + tentativa de notificação
3. “Simular sem match” → alerta aberto; **não** cria movimento automático
4. Registro **manual** como fallback para avisar a família
5. `npm run test:face` — checagens de cosseno/limiar

## Depois (API real)

- Trocar `MockFaceEmbeddingProvider` por Cloud Function + modelo ArcFace/InsightFace
- Manter o mesmo `FaceGalleryMatcher` / pipeline
- Ideal: match no backend (galeria não no browser)
