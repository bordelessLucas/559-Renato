import type { MovementType } from '../../types/movement'
import { cn } from '../../lib/cn'

type MovementNotificationCardProps = {
  studentName: string
  schoolName: string
  type: MovementType
  timeLabel: string
  className?: string
}

/**
 * Card visual alinhado ao guia Olhar+IA:
 * entrada → acento verde; saída → azul claro.
 */
export function MovementNotificationCard({
  studentName,
  schoolName,
  type,
  timeLabel,
  className,
}: MovementNotificationCardProps) {
  const isEntry = type === 'entrada'
  const waveClass = isEntry ? 'from-success-600/90 to-success-600/40' : 'from-accent-500/90 to-accent-500/40'
  const iconBg = isEntry ? 'bg-success-50 text-success-700' : 'bg-accent-50 text-accent-600'
  const verb = isEntry ? 'entrou' : 'saiu'

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border border-line bg-surface shadow-md',
        className,
      )}
    >
      <div className="flex flex-col items-center px-6 pb-4 pt-8 text-center">
        <div className={cn('mb-4 flex h-14 w-14 items-center justify-center rounded-full', iconBg)}>
          <span className="text-2xl font-bold" aria-hidden>
            {isEntry ? '✓' : '→'}
          </span>
        </div>
        <img
          src="/brand/logo-olhar-mais-ia.png?v=2"
          alt="Olhar+IA"
          className="mb-4 h-10 w-auto bg-transparent object-contain"
        />
        <h3 className="text-lg font-bold text-ink">{studentName}</h3>
        <p className="mt-2 text-sm text-ink-muted">
          {verb} da {schoolName} às <strong className="text-ink">{timeLabel}</strong>
        </p>
      </div>
      <div className={cn('h-3 w-full bg-gradient-to-r', waveClass)} aria-hidden />
    </article>
  )
}
