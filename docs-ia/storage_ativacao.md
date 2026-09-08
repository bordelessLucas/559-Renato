# Sprint S — Ativar Storage real (quando o cliente liberar)

Checklist operacional. O código já está preparado com a flag `VITE_STORAGE_ENABLED`.

## Pré-requisitos

1. Plano Firebase com **Storage** habilitado no projeto `renato-29b68`
2. Console: https://console.firebase.google.com/project/renato-29b68/storage → **Get Started**
3. Publicar rules: `npx firebase deploy --only storage --project renato-29b68`

## App

1. No `.env` (e no Hosting / CI):
   ```
   VITE_STORAGE_ENABLED=true
   ```
2. Rebuild + deploy Hosting
3. Testar cadastro público **com** foto (upload deve preencher `photoUrl`/`photoPath`)
4. Remover expectativa de “foto pendente” nas demos

## Comportamento da flag

| `VITE_STORAGE_ENABLED` | Efeito |
|------------------------|--------|
| `false` (default) | Cadastro grava sem exigir foto; upload não é tentado |
| `true` | Upload real via Firebase Storage; falha de upload não apaga o aluno, mas avisa |

## Backfill (opcional)

Alunos criados na fase sem Storage ficam com `photoUrl` vazio. O responsável/admin pode editar e enviar a foto depois que o Storage estiver ativo.
