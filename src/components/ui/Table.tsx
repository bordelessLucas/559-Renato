import type { ReactNode, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-line bg-surface">
      <table className={cn('min-w-full divide-y divide-line text-left text-sm', className)} {...props} />
    </div>
  )
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-surface-muted">{children}</thead>
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line bg-surface">{children}</tbody>
}

export function TableRow({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn('hover:bg-surface-muted/70', className)}>{children}</tr>
}

export function TableHeaderCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted', className)}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 text-ink', className)} {...props} />
}
