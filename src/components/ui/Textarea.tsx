import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({
  label,
  error,
  hint,
  id,
  className,
  disabled,
  rows = 4,
  ...props
}: TextareaProps) {
  const textareaId = id ?? props.name

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        disabled={disabled}
        className={cn(
          'w-full resize-y rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-xs',
          'placeholder:text-ink-subtle',
          'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-subtle',
          error ? 'border-danger-600' : 'border-line',
          className,
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? (
        <p className="text-sm text-danger-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-muted">{hint}</p>
      ) : null}
    </div>
  )
}
