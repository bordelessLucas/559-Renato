# Controle Escolar

Sistema de gestão e controle de entrada e saída de alunos.

## Stack

- React 19 + TypeScript
- Tailwind CSS 4
- Vite 8
- Firebase (Auth, Firestore, Storage, Analytics)
- React Router

## Sprints

- **Sprint 0** — Layout, Home, Login e Design System
- **Sprint 1** — Escolas, usuários administrativos e responsáveis

## Desenvolvimento

```bash
npm install
npm run dev
```

Configure as variáveis em `.env` a partir de `.env.example`.

### Firebase Security Rules

Publique as regras em `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

### Primeiro acesso

1. Habilite Email/Password no Firebase Authentication
2. Acesse `/primeiro-acesso`
3. Crie a primeira escola e o administrador

## Estrutura

```
src/
├── components/ui|layout|forms|feedback
├── pages/schools|users|guardians
├── services/
├── types/
├── contexts/
├── layouts/
└── routes/
```

## Coleções Firestore

- `schools`
- `users` (doc id = Firebase Auth uid)
- `guardians`
- `settings/system` (flag de bootstrap)
