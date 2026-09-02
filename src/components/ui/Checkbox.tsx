import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  description?: string
}

export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const checkboxId = id ?? props.name

  return (
    <label
      htmlFor={checkboxId}
      className={cn('flex cursor-pointer items-start gap-3', props.disabled && 'cursor-not-allowed opacity-60')}
    >
      <input
        id={checkboxId}
        type="checkbox"
        className={cn(
          'mt-0.5 h-4 w-4 rounded border-line text-brand-600',
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
