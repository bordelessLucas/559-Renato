# Segurança e privacidade — Sprint 9 (base)

## Princípios aplicados

- Isolamento por `schoolId` nas coleções operacionais
- Perfis com menor privilégio (admin geral / escola / operador / responsável)
- Autocadastro público só cria `responsavel` em escola **ativa**
- **Biometria:** foto só na request de enroll/match; persiste-se template no server; **client nunca lê embedding**
- Face-check público: Callable `matchFace` → `{ allowed: true|false }` (`docs-ia/facial_check_seguro.md`)
- Responsável só acessa alunos em que `guardianUserIds` contém seu UID
- Storage de imagens de aluno é legado/opcional — não é requisito do match

## Templates biométricos

- Coleção `faceTemplates`: Admin SDK apenas (`allow read, write: if false` no client)
- Flags no aluno: `faceEnrolled`, `faceTemplateCount` (não exponem o vetor)
- Auditoria: `faceAuditLogs` (sem vetor/imagem); leitura admin geral
- API: `enrollFace` / `matchFace` / `deleteFaceEnrollment`

## Pendências do cliente

- Provedor real de embedding **dentro** das Functions (ArcFace/InsightFace)
- DPO / base legal LGPD para templates de menores
- Prazo de retenção de templates e logs
- Endpoint HTTP + API key para câmera/catraca (hoje Callable autenticado)

## Checklist de revisão contínua

- [x] Rules Firestore com papéis explícitos
- [x] Rules Storage com tipo/tamanho de imagem (legado)
- [x] Cadastro público sem aprovação, mas com conta Auth
- [x] Pipeline enroll → embedding → discard documentado
- [x] Client sem GET de embeddings
- [x] Face-check retorna só SIM/NÃO (+ metadados mínimos)
- [x] Sem match automático ⇒ alerta + fallback manual
- [x] Audit log de enroll/match
- [ ] Testes automatizados de rules (quando CI estiver configurado)
- [ ] Política de retenção de templates documentada e aplicada
