export interface NavItem {
  id: string
  label: string
  path: string
  enabled: boolean
}

export const adminNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/app/dashboard', enabled: true },
  { id: 'schools', label: 'Escolas', path: '/app/escolas', enabled: true },
  { id: 'students', label: 'Alunos', path: '/app/alunos', enabled: false },
  { id: 'guardians', label: 'Responsáveis', path: '/app/responsaveis', enabled: true },
  { id: 'movements', label: 'Entrada e Saída', path: '/app/movimentacoes', enabled: false },
  { id: 'attendance', label: 'Presença', path: '/app/presenca', enabled: false },
  { id: 'alerts', label: 'Alertas e Ocorrências', path: '/app/alertas', enabled: false },
  { id: 'notifications', label: 'Notificações', path: '/app/notificacoes', enabled: false },
  { id: 'users', label: 'Usuários', path: '/app/usuarios', enabled: true },
  { id: 'settings', label: 'Configurações', path: '/app/configuracoes', enabled: false },
]
