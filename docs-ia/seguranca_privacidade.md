# Segurança e privacidade — Sprint 9 (base)

## Princípios aplicados

- Isolamento por `schoolId` nas coleções operacionais
- Perfis com menor privilégio (admin geral / escola / operador / responsável)
- Autocadastro público só cria `responsavel` em escola **ativa**
- Imagens de alunos em Storage sob `students/{schoolId}/{studentId}/` com regras por perfil
- Responsável só acessa alunos em que `guardianUserIds` contém seu UID

## Pendências do cliente

- Política de retenção e descarte de imagens faciais
- Prazo de armazenamento de movimentações e tentativas de notificação
- DPO / base legal LGPD para tratamento de dados de menores

## Checklist de revisão contínua

- [x] Rules Firestore com papéis explícitos
- [x] Rules Storage com tipo/tamanho de imagem
- [x] Cadastro público sem aprovação, mas com conta Auth
- [ ] Auditoria periódica de acesso a imagens
- [ ] Testes automatizados de rules (quando CI estiver configurado)
- [ ] Política de retenção documentada e aplicada
