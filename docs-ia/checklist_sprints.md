# Checklist de Sprints — Olhar+IA

## Sprint Brand — Identidade Olhar+IA ✅
- [x] Assets oficiais em `docs-ia/marca/` e `public/brand/`
- [x] `docs-ia/design_system.md` com nome, tagline, cores e tipografia
- [x] `docs-ia/escopo.md` com nome oficial **Olhar+IA**
- [x] Tokens CSS (`brand` petróleo, `accent` azul claro, `highlight` amarelo)
- [x] Tipografia Nunito (aproximação de Nunito Rounded)
- [x] BrandMark, Home, Login e layouts com marca Olhar+IA

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

## Sprint 2 — Cadastro de Alunos ✅
- [x] Tipo e interface `Student` no Firestore
- [x] CRUD de alunos (admin)
- [x] Associação aluno ↔ escola
- [x] Associação aluno ↔ responsável(is)
- [x] Listagem, busca, filtros, detalhe
- [x] Validação de formulários
- [x] Security Rules para `students`

## Sprint 3 — Cadastro público pelo Responsável + QR Code ✅
- [x] Cadastro de alunos na área autenticada do responsável (1 ou mais filhos)
- [x] Página pública de cadastro por escola (fluxo via link/QR Code)
- [x] Geração de QR Code por escola (admin)
- [x] Captura de imagem/selfie real (browser `getUserMedia`)
- [x] Upload da imagem para Firebase Storage (**quando** `VITE_STORAGE_ENABLED=true`)
- [x] Autocadastro do responsável + aluno no Firestore (sem aprovação)
- [x] Compartilhamento do link (WhatsApp, etc.)
- [x] Remover selo “prévia” quando o fluxo estiver funcional
- [x] **Sem Storage:** foto opcional / não bloqueante + aviso “foto pendente” (Sprint V)
- [ ] **Operação futura:** ativar Firebase Storage + `VITE_STORAGE_ENABLED=true` + publicar `storage.rules`

## Sprint — Validação UI/UX do Responsável ✅
- [x] Home da família com jornada clara
- [x] Hub: dependentes + avisos
- [x] Área dedicada `/app/responsavel/notificacoes` (filtro por filho + simular entrada/saída)
- [x] Controle por dependente: Ver / Editar / Avisos
- [x] Formulário simplificado (nome primeiro; extras opcionais)
- [x] Foto opcional + captura visual sem depender de Storage
- [x] Página “Como funciona”
- [x] Redirect pós-login para `/app/responsavel`
- [x] Doc `docs-ia/sprint_validacao_responsavel.md`


## Sprint M — Entrada e Saída (mock facial) ✅
- [x] Página `/app/movimentacoes` + nav habilitada
- [x] Registro manual + anti-duplicidade
- [x] `MockFaceRecognitionProvider` + simulação de evento
- [x] Histórico do dia

## Sprint P — Presença ✅
- [x] Página `/app/presenca` com `deriveDayPresence`
- [x] Indicadores presentes / sem registro / entradas / saídas
- [x] Filtros por status

## Sprint N — Alertas + Notificações (UI mock) ✅
- [x] Página `/app/alertas` (criar/listar)
- [x] Página `/app/notificacoes` + cards Olhar+IA
- [x] `MockNotificationProvider` + histórico de tentativas
- [x] Copy: canal real aguarda cliente

## Sprint S — Storage real (preparado)
- [x] Documentação `docs-ia/storage_ativacao.md`
- [x] Flag pronta para `VITE_STORAGE_ENABLED=true`
- [ ] Ativar Storage no console (depende do cliente)
- [ ] Publicar `storage.rules`
- [ ] Deploy com flag true + teste de upload

## Sprint 4 — Reconhecimento Facial (integração)
- [x] Camada de abstração `FaceRecognitionProvider` + contrato de eventos
- [x] Pipeline privacy-first: foto → embedding → descarte (`docs-ia/facial_vetorizacao.md`)
- [x] Coleção `faceTemplates` + flags `faceEnrolled` / `faceTemplateCount`
- [x] `FaceEmbeddingProvider` mock + matcher por cosseno + limiares
- [x] Enroll no cadastro (responsável / admin / QR) sem persistir foto
- [x] Identify → movimento+notify **ou** alerta `nao_reconhecido` / `revisao_facial` + fallback manual
- [x] Testes leves: `npm run test:face`
- [ ] Pesquisa e definição da tecnologia/câmera (pendência do cliente)
- [ ] API de integração com câmera → backend
- [ ] Provedor real ArcFace/InsightFace ou Face cloud (troca plugável)
- [ ] Match no backend (Callable) — galeria fora do browser
- [ ] Testes de confiabilidade com modelo real (iluminação, distância)
- [ ] PoC com provedor real (após escolha do cliente)

> ⚠️ **Bloqueio externo:** câmera, fabricante e API facial real ainda não definidos. OpenAI **não** é o caminho biométrico.

## Sprint 5 — Registro de Entrada e Saída
- [x] Coleção `movements` no Firestore (tipos + serviço + rules)
- [x] Proteção contra duplicidade (janela configurável)
- [x] Critério default entrada/saída por ponto de câmera (`cameraPointKind`)
- [x] Registro automático após match de embedding (mock pipeline)
- [x] Histórico consultável na UI admin dedicada
- [ ] Confirmação do critério com o cliente

## Sprint 6 — Notificação aos Responsáveis
- [x] UI de cards de notificação alinhada ao guia Olhar+IA (entrada verde / saída azul claro)
- [x] Camada `NotificationChannelProvider` + enqueue sem bloquear movimentação
- [x] Enqueue automático após match facial (pipeline)
- [ ] Definição do canal (WhatsApp / SMS — pendência do cliente)
- [ ] Integração com provedor de mensageria
- [ ] Histórico persistido de tentativas de envio (UI)
- [ ] Tratamento de falhas em produção

> ⚠️ **Bloqueio externo:** canal e provedor de notificação ainda não definidos.

## Sprint 7 — Presença e Painel Administrativo
- [x] Derivar presença diária a partir das movimentações (`deriveDayPresence`)
- [x] Dashboard com indicadores reais quando houver movimentações
- [x] Prévia de notificações e status dos bloqueios externos
- [ ] Consulta dedicada: presentes / sem registro / entrada-saída
- [ ] Atividades recentes em tempo real

## Sprint 8 — Alertas e Ocorrências
- [x] Tipos + serviço + rules para `alerts`
- [x] Alertas operacionais `nao_reconhecido` e `revisao_facial` no pipeline facial
- [ ] Atraso, ausência, ocorrência administrativa (regras por horário)
- [ ] Regras configuráveis (horários por escola)
- [ ] Histórico de alertas na UI
- [ ] Consulta pelo admin

## Sprint 9 — Segurança, Privacidade e Refinamento
- [x] Base documentada em `docs-ia/seguranca_privacidade.md`
- [x] Rules com menor privilégio nas coleções principais
- [x] Política: template biométrico sem retenção de imagem facial (fluxo atual)
- [ ] Revisão completa periódica de Security Rules
- [ ] Auditoria de acesso a templates biométricos
- [ ] Política de retenção de templates (quando definida pelo cliente)
- [ ] Testes de segurança
- [ ] Refinamentos de UX do piloto

## Sprint 10 — Piloto em campo
- [ ] Deploy para ambiente de produção (hosting já disponível)
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
| Nome/logo/identidade visual | Cliente | ✅ Resolvido — Olhar+IA |
| Câmera / fabricante / API facial | Cliente + equipe técnica | Pendente |
| Canal de notificação (WhatsApp/SMS) | Cliente | Pendente |
| Política de retenção de imagens | Cliente | Pendente |
| Critério entrada vs saída | Cliente | Pendente (default: ponto de câmera) |
| Infraestrutura de internet nas escolas | Cliente | Pendente |
