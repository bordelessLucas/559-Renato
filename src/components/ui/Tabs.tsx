import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface TabItem {
  id: string
  label: string
  content: ReactNode
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  const active = items.find((item) => item.id === value) ?? items[0]

  return (
    <div className={cn('w-full', className)}>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
        {items.map((item) => {
          const selected = item.id === active?.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={item.disabled}
              className={cn(
                'relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors',
                selected ? 'text-brand-700' : 'text-ink-muted hover:text-ink',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
              onClick={() => onChange(item.id)}
            >
              {item.label}
              {selected && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-600" />
              )}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" className="pt-4">
        {active?.content}
      </div>
    </div>
  )
}
