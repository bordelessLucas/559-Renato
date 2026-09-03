# Escopo do Projeto — Sistema Escolar com Reconhecimento Facial

## Objetivo principal

Criar uma **plataforma web responsiva** para controle de entrada e saída de alunos por **reconhecimento facial**, integrada a câmeras instaladas nas escolas, com notificação automática aos responsáveis.

### Fluxo central

```
Câmera reconhece face → Identifica aluno na base → Registra entrada/saída → Notifica responsável
```

---

## Regras de negócio

| # | Regra | Status |
|---|-------|--------|
| 1 | O cadastro de alunos é feito **pelo responsável**, não pelo aluno | Confirmado |
| 2 | Aluno não possui interface própria nem faz autocadastro | Confirmado |
| 3 | O cadastro **não requer aprovação manual** do administrador | Confirmado |
| 4 | Cada escola possui QR Code/link para acesso ao cadastro | Confirmado |
| 5 | Responsável seleciona escola previamente cadastrada pelo admin | Confirmado |
| 6 | Responsável envia/captura imagem facial da criança no cadastro | Confirmado |
| 7 | Todos os registros de alunos são vinculados a uma escola | Confirmado |
| 8 | Dados de escolas diferentes permanecem isolados | Confirmado |
| 9 | Notificação ao responsável a cada entrada e saída registrada | Confirmado |
| 10 | A confiabilidade do reconhecimento é requisito crítico | Confirmado |
| 11 | A ausência da notificação serve como alerta ao responsável | Confirmado |
| 12 | Sistema multi-escola (públicas e particulares) | Confirmado |
| 13 | Proteção especial: dados de menores, imagens faciais, telefones | Confirmado |

### Regras **não** confirmadas (possibilidades futuras)

- Atualização/confirmação semestral dos dados
- Canal definitivo de notificação (WhatsApp vs SMS)
- Política de retenção e descarte de imagens faciais
- Câmera/fabricante/API de reconhecimento facial
- Métricas administrativas específicas

---

## Perfis de usuário

### Responsável

- Realiza cadastro via QR Code ou link
- Cadastra seus dados (nome, telefone de mãe e pai)
- Cadastra a criança (nome, escola, imagem facial)
- Recebe notificações de entrada/saída

### Administrador

- Cadastra e gerencia escolas
- Consulta alunos e responsáveis
- Atualiza e exclui cadastros
- Gerencia mudanças de escola
- Acompanha operação geral

> Outros perfis (operador, admin da escola) já existem no código atual e são compatíveis. Novos perfis somente mediante confirmação do cliente.

---

## Funcionalidades core

### MVP (primeira versão / piloto)

1. **Cadastro de escolas** (admin)
2. **QR Code / link de cadastro** por escola
3. **Cadastro de responsáveis** (autocadastro via link)
4. **Cadastro de alunos** com captura de imagem facial
5. **Integração com reconhecimento facial** (câmera → identificação)
6. **Registro automático de entrada e saída**
7. **Histórico de movimentações**
8. **Notificação aos responsáveis** (canal a definir)
9. **Painel administrativo** (consulta, edição, exclusão)
10. **Autenticação e controle de acesso**
11. **Segurança e isolamento de dados por escola**

### Fora do escopo atual

- App nativo (Play Store / App Store)
- Aprovação manual de cadastro por admin
- Atualização semestral automática
- Definição de câmera/fabricante
- Projetos de construção civil e marketplace de aço/concreto (outros projetos do cliente)

---

## Pendências de definição (aguardando cliente)

- Nome oficial, logo e identidade visual definitiva
- Tecnologia / marca de câmera de reconhecimento facial
- API de integração com as câmeras
- Canal de notificação (WhatsApp / SMS) e provedor
- Política de armazenamento e descarte de imagens
- Infraestrutura de internet nas escolas
- Quantidade e posicionamento de câmeras por escola
- Critério técnico para diferenciar entrada vs saída
- Dados definitivos exigidos no cadastro
- Regras específicas do piloto

---

## Plataforma

- **Web responsivo** (computador, notebook, tablet, celular via navegador)
- Stack: React + TypeScript + Vite + Tailwind CSS + Firebase
- Sem publicação em lojas de aplicativos na primeira versão
