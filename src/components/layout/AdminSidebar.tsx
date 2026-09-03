import { NavLink } from 'react-router-dom'
import { adminNavItems, type NavItem } from '../../config/navigation'
import { BrandMark } from './BrandMark'
import { cn } from '../../lib/cn'
import { useAuth } from '../../contexts/AuthContext'
import { isGuardianUser, isGeneralAdmin, isOperator, isSchoolAdmin } from '../../lib/permissions'

interface AdminSidebarProps {
  open: boolean
  onClose: () => void
}

function canSeeNavItem(itemId: string, profile: ReturnType<typeof useAuth>['profile']) {
  if (!profile) return false

  if (isGuardianUser(profile)) {
    return itemId === 'guardian-home' || itemId === 'guardian-student-new'
  }

  if (isOperator(profile)) {
    return ['dashboard', 'students', 'movements', 'attendance'].includes(itemId)
  }

  if (isSchoolAdmin(profile)) {
    return [
      'dashboard',
      'schools',
      'students',
      'guardians',
      'users',
      'movements',
      'attendance',
      'alerts',
      'notifications',
    ].includes(itemId)
  }

  if (isGeneralAdmin(profile)) {
    return true
  }

  return itemId === 'dashboard'
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const { profile } = useAuth()

  const guardianItems: NavItem[] = [
    { id: 'guardian-home', label: 'Meus dependentes', path: '/app/responsavel', enabled: true, end: true },
    { id: 'guardian-student-new', label: 'Cadastrar dependente', path: '/app/responsavel/alunos/novo', enabled: true },
  ]

  const items = isGuardianUser(profile)
    ? guardianItems
    : adminNavItems.filter((item) => canSeeNavItem(item.id, profile))

  return (
    <>
      <button
        type="button"
        aria-label="Fechar menu"
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/40 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-surface transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center border-b border-line px-5">
          <BrandMark />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu principal">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id}>
                {item.enabled ? (
                  <NavLink
                    to={item.path}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-800'
                          : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ) : (
                  <span
                    className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink-subtle"
                    title="Módulo disponível em sprint futura"
                  >
                    {item.label}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Em breve
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}
