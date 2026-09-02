# Controle Escolar

Sistema de gestão e controle de entrada e saída de alunos.

## Stack

- React 19 + TypeScript
- Tailwind CSS 4
- Vite 8
- Firebase (Auth, Firestore, Storage, Analytics)
- React Router

## Sprint 0

Fundação visual e de navegação:

- Home pública
- Login com Firebase Authentication
- Recuperação de senha
- Layout administrativo (sidebar + topbar)
- Design system reutilizável

## Desenvolvimento

```bash
npm install
npm run dev
```

Configure as variáveis em `.env` a partir de `.env.example`.

## Estrutura

```
src/
├── components/
│   ├── ui/           # Design system
│   ├── layout/       # Sidebar, topbar, page header
│   └── feedback/     # Empty/Error states
├── layouts/          # Public, Auth, Admin
├── pages/            # Home, Login, ForgotPassword, Dashboard
├── contexts/         # Auth
├── routes/           # Rotas e proteção
└── lib/              # Firebase e utilitários
```
