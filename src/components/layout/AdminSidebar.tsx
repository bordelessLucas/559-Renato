import { NavLink } from 'react-router-dom'
import { adminNavItems } from '../../config/navigation'
import { BrandMark } from './BrandMark'
import { cn } from '../../lib/cn'

interface AdminSidebarProps {
  open: boolean
  onClose: () => void
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
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
            {adminNavItems.map((item) => (
              <li key={item.id}>
                {item.enabled ? (
                  <NavLink
                    to={item.path}
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
