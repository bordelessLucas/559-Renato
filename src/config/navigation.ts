export interface NavItem {
  id: string
  label: string
  path: string
  enabled: boolean
  end?: boolean
}

export const adminNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Painel', path: '/app/dashboard', enabled: true },
  { id: 'schools', label: 'Escolas', path: '/app/escolas', enabled: true },
  { id: 'students', label: 'Alunos', path: '/app/alunos', enabled: true },
  { id: 'guardians', label: 'Responsáveis', path: '/app/responsaveis', enabled: true },
  { id: 'movements', label: 'Entrada e Saída', path: '/app/movimentacoes', enabled: true },
  { id: 'attendance', label: 'Presença', path: '/app/presenca', enabled: true },
  { id: 'alerts', label: 'Alertas e Ocorrências', path: '/app/alertas', enabled: true },
  { id: 'notifications', label: 'Notificações', path: '/app/notificacoes', enabled: true },
  { id: 'users', label: 'Usuários', path: '/app/usuarios', enabled: true },
  { id: 'settings', label: 'Configurações', path: '/app/configuracoes', enabled: false },
]
