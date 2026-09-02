import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

export interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Não foi possível carregar os dados',
  description = 'Ocorreu um erro ao buscar as informações. Tente novamente.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-danger-600/20 bg-danger-50 px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <h3 className="text-base font-semibold text-danger-700">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-danger-700/80">{description}</p>
      {onRetry && (
        <Button className="mt-5" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
