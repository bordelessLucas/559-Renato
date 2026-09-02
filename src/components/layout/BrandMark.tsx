import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-sm">
        CE
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-ink">Controle Escolar</span>
          <span className="text-[11px] font-medium text-ink-muted">Entrada e saída</span>
        </span>
      )}
    </Link>
  )
}
