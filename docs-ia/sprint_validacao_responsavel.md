# Sprint — Validação do fluxo do Responsável (UI/UX)

Foco: **experiência da família**, sem câmera facial nem Storage.

Login de teste: `responsavel@responsavel.com` / `borderless`

## Papel no escopo

O responsável **cadastra dependentes** e **recebe avisos** de entrada/saída. Não opera câmera, portaria nem painel administrativo.

## IA do menu (área da família)

1. **Meus dependentes** — lista + cadastro/edição  
2. **Avisos** — histórico/prévia de entrada e saída  
3. **Como funciona** — ajuda  

Cadastro é ação na home (CTA único), não item de menu concorrente.

## O que foi entregue

| Área | Decisão de UX |
|------|---------------|
| Topbar | “Área da família” |
| Home | Lista-first; 1 CTA “Cadastrar dependente”; linha abre o cadastro |
| Detalhe | 1 primário “Editar cadastro” + secundário “Abrir avisos” |
| Formulário | Nome obrigatório; extras opcionais; Cancelar/Salvar claros |
| Avisos | Receber/histórico; exemplos em “modelo dos cards” (sem simular operação) |
| Como funciona | 4 passos + 2 CTAs (dependentes / avisos) |

Detalhes da revisão: `docs-ia/ux_responsavel.md`

## Fora do escopo (proposital)

- Upload real de foto (Storage)
- Reconhecimento facial / câmeras
- Envio real WhatsApp/SMS
- Backend de movimentações na visão do responsável

## Roteiro de validação

1. Entrar com `responsavel@responsavel.com` → landing em **Meus dependentes**
2. Menu só com 3 itens (sem “Cadastrar” duplicado)
3. **Como funciona** → passos + CTAs claros
4. **Cadastrar dependente** só com nome → detalhe
5. Detalhe → Editar / Abrir avisos (sem Ver/Editar/Avisos na lista)
6. **Avisos** → filtro por filho; prévia marcada como formato
7. Cadastrar segundo dependente pelo CTA do header

## Próxima sprint por perfil

**Operador** — validar entrada/saída e presença no dia a dia
