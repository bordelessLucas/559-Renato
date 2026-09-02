import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  description?: string
}

export function Radio({ label, description, className, id, ...props }: RadioProps) {
  const radioId = id ?? `${props.name}-${props.value}`

  return (
    <label
      htmlFor={radioId}
      className={cn('flex cursor-pointer items-start gap-3', props.disabled && 'cursor-not-allowed opacity-60')}
    >
      <input
        id={radioId}
        type="radio"
        className={cn(
          'mt-0.5 h-4 w-4 border-line text-brand-600',
          'focus:ring-2 focus:ring-brand-500/30',
          className,
        )}
        {...props}
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-ink">{label}</span>
        {description && <span className="text-sm text-ink-muted">{description}</span>}
      </span>
    </label>
  )
}
