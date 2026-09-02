import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export function SearchInput({ label = 'Buscar', className, ...props }: SearchInputProps) {
  return (
    <div className="relative w-full max-w-md">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-subtle">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
          />
        </svg>
      </span>
      <input
        type="search"
        aria-label={label}
        className={cn(
          'h-11 w-full rounded-lg border border-line bg-surface pl-10 pr-3.5 text-sm text-ink shadow-xs',
          'placeholder:text-ink-subtle',
          'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          'disabled:cursor-not-allowed disabled:bg-surface-muted',
          className,
        )}
        {...props}
      />
    </div>
  )
}
