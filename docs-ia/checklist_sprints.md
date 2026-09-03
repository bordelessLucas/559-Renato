# Checklist de Sprints — Sistema Escolar com Reconhecimento Facial

## Sprint 0 — Setup + Base visual ✅
- [x] Projeto React + TypeScript + Vite + Tailwind CSS
- [x] Integração Firebase (Auth, Firestore, Storage, Analytics)
- [x] Design system (Button, Input, Select, Modal, Card, Table, Toast, etc.)
- [x] Home pública
- [x] Página de Login com Firebase Auth
- [x] Recuperação de senha
- [x] Layout admin (sidebar + topbar)
- [x] Responsividade (desktop, tablet, mobile)
- [x] Tokens de cores, tipografia, espaçamento
- [x] Estados visuais (loading, vazio, erro, sucesso)

## Sprint 1 — Escolas, Usuários e Responsáveis ✅
- [x] CRUD de escolas
- [x] CRUD de usuários administrativos com Firebase Auth
- [x] CRUD de responsáveis (guardians)
- [x] Estrutura multi-escola (schoolId em todos os registros)
- [x] Perfis: administrador_geral, administrador_escola, operador, responsável
- [x] Permissões por perfil (frontend + Firestore Security Rules)
- [x] Busca, filtros e paginação
- [x] Bootstrap / primeiro acesso
- [x] Seed dos 4 perfis no Firebase

## Sprint 2 — Cadastro de Alunos
- [x] Tipo e interface `Student` no Firestore
- [x] CRUD de alunos (admin)
- [x] Associação aluno ↔ escola
- [x] Associação aluno ↔ responsável(is)
- [x] Listagem, busca, filtros, detalhe
- [x] Validação de formulários
- [x] Security Rules para `students`

## Sprint 3 — Cadastro público pelo Responsável + QR Code
- [x] Cadastro de alunos na área autenticada do responsável (1 ou mais filhos)
- [x] Página pública de cadastro por escola (fluxo mockup via link/QR Code)
- [x] Geração de QR Code por escola (admin — prévia)
- [x] Autocadastro do responsável (nome, telefones) — fluxo visual, sem gravação
- [x] Cadastro do aluno pelo responsável (nome, escola, imagem) via link público — mockup
- [ ] Captura de imagem/selfie real (browser `getUserMedia`)
- [ ] Upload da imagem para Firebase Storage
- [x] Sem aprovação manual — cadastro direto (regra demonstrada no mockup)
- [x] Compartilhamento do link (WhatsApp, etc.) — prévia

## Sprint 4 — Reconhecimento Facial (integração)
- [ ] Pesquisa e definição da tecnologia/câmera (pendência do cliente)
- [ ] API de integração com câmera → backend
- [ ] Comparação da face capturada com base de alunos
- [ ] Retorno da identificação (aluno, escola, confiança)
- [ ] Tratamento de falha de leitura
- [ ] Testes de confiabilidade (taxa de acerto, iluminação, distância)

> ⚠️ **Bloqueio externo:** câmera, fabricante e API ainda não definidos pelo cliente.

## Sprint 5 — Registro de Entrada e Saída
- [ ] Coleção `movements` no Firestore
- [ ] Registro automático após identificação facial
- [ ] Dados: aluno, escola, data, horário, tipo (entrada/saída)
- [ ] Critério para diferenciar entrada vs saída (pendência de definição)
- [ ] Proteção contra duplicidade
- [ ] Histórico consultável (admin)
- [ ] Security Rules para `movements`

## Sprint 6 — Notificação aos Responsáveis
- [ ] Definição do canal (WhatsApp / SMS — pendência do cliente)
- [ ] Integração com provedor de mensageria
- [ ] Envio desacoplado do registro de movimentação
- [ ] Mensagens: "[Aluno] entrou/saiu da escola às [horário]"
- [ ] Histórico de tentativas de envio
- [ ] Tratamento de falhas (sem bloquear o registro)

> ⚠️ **Bloqueio externo:** canal e provedor de notificação ainda não definidos.

## Sprint 7 — Presença e Painel Administrativo
- [ ] Derivar presença diária a partir das movimentações
- [ ] Consulta: presentes, sem registro, entrada/saída do dia
- [ ] Dashboard com indicadores reais (entradas, saídas, presença)
- [ ] Atividades recentes

## Sprint 8 — Alertas e Ocorrências
- [ ] Atraso, ausência, ocorrência administrativa
- [ ] Regras configuráveis (horários por escola)
- [ ] Histórico de alertas
- [ ] Consulta pelo admin

## Sprint 9 — Segurança, Privacidade e Refinamento
- [ ] Revisão completa de Security Rules
- [ ] Auditoria de acesso a dados de menores e imagens
- [ ] Política de armazenamento/descarte de imagens (quando definida)
- [ ] Princípio de menor privilégio em todas as coleções
- [ ] Testes de segurança
- [ ] Refinamentos de UX do piloto

## Sprint 10 — Piloto em campo
- [ ] Deploy para ambiente de produção
- [ ] Instalação de câmera(s) na escola piloto
- [ ] Testes reais: taxa de identificação, posição, iluminação
- [ ] Coleta de feedback (escolas e responsáveis)
- [ ] Ajustes pós-piloto
- [ ] Avaliação de viabilidade técnica e comercial

---

## Funcionalidades futuras (não confirmadas)

- [ ] Atualização/confirmação semestral de cadastro
- [ ] App nativo (Play Store / App Store)
- [ ] Novos perfis de usuário
- [ ] Métricas administrativas avançadas

---

## Dependências externas (bloqueios)

| Item | Responsável | Status |
|------|-------------|--------|
| Nome/logo/identidade visual | Cliente | Pendente |
| Câmera / fabricante / API facial | Cliente + equipe técnica | Pendente |
| Canal de notificação (WhatsApp/SMS) | Cliente | Pendente |
| Provedor de mensageria | Equipe técnica | Pendente |
| Política de imagens (retenção/descarte) | Cliente | Pendente |
| Infraestrutura de internet nas escolas | Cliente | Pendente |
