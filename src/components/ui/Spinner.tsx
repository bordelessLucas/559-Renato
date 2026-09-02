import { cn } from '../../lib/cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-r-transparent',
        className,
      )}
      role="status"
      aria-label="Carregando"
    />
  )
}
