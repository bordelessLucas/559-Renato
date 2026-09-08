# Roteiro de validação — Olhar+IA (sem Storage)

Use este roteiro para demos e aceite de fluxos com **Auth + Firestore** apenas.
Foto facial fica **pendente** até `VITE_STORAGE_ENABLED=true` e Storage ativo no Firebase.

## Contas seed (login;senha)

| Perfil | Credencial |
|--------|------------|
| Administrador geral | `admin@admin.com;borderless` |
| Administrador da escola | `escola@escola.com;borderless` |
| Operador | `operador@operador.com;borderless` |
| Responsável | `responsavel@responsavel.com;borderless` |

Opcional: `npm run seed:demo` para popular alunos/responsáveis de demonstração.

## Fluxo 1 — Admin geral

1. Entrar com `admin@admin.com`
2. Abrir **Escolas** → abrir uma escola ativa
3. Conferir **QR Code** / copiar link de cadastro
4. Abrir **Alunos** e **Responsáveis** (listagem OK sem foto)

## Fluxo 2 — Cadastro público (QR)

1. Abrir `/cadastro/{schoolId}` (link do QR)
2. Preencher e-mail, senha, telefones e nome do dependente
3. **Pular foto** ou capturar (não bloqueia)
4. Confirmar: sucesso + aviso “foto pendente” se Storage off
5. Entrar com o e-mail criado → área do responsável mostra o dependente
6. Admin lista o novo aluno em **Alunos**

## Fluxo 3 — Responsável autenticado

1. Entrar com `responsavel@responsavel.com`
2. Ver dependentes / cadastrar novo sem foto
3. Detalhe do dependente abre normalmente

## Fluxo 4 — Operador / admin escola

1. Entrar com `operador@operador.com` ou `escola@escola.com`
2. Painel e listagens restritas à escola
3. (Após Sprint M) registrar entrada/saída e conferir no painel

## Critérios de aceite Sprint V

- [x] Cadastro público conclui sem Storage
- [x] Copy honesta de foto pendente
- [x] CRUD admin/responsável não quebra sem upload
- [ ] Smoke manual executado no ambiente (checklist acima)
