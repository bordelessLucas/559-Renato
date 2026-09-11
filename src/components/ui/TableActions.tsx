import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../../lib/cn'

/** Agrupa ações da tabela e evita abrir o modal da linha. */
export function TableActions({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const stop = (event: MouseEvent) => {
    event.stopPropagation()
  }

  return (
    <div className={cn('inline-flex flex-wrap items-center gap-1.5', className)} onClick={stop}>
      {children}
    </div>
  )
}

type ActionTone = 'primary' | 'muted' | 'danger'

const toneClass: Record<ActionTone, string> = {
  primary: 'border-brand-300 bg-brand-50 text-brand-800 hover:bg-brand-100',
  muted: 'border-line bg-surface text-ink-muted hover:text-ink hover:bg-surface-muted',
  danger: 'border-line bg-surface text-danger-700 hover:border-danger-200 hover:bg-danger-50',
}

const actionBase =
  'inline-flex h-8 items-center justify-center rounded-md border px-2.5 text-xs font-semibold transition-colors'

export function TableActionButton({
  tone = 'muted',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ActionTone }) {
  return <button type="button" className={cn(actionBase, toneClass[tone], className)} {...props} />
}

export function TableActionLink({
  tone = 'muted',
  className,
  ...props
}: LinkProps & { tone?: ActionTone }) {
  return <Link className={cn(actionBase, toneClass[tone], className)} {...props} />
}
