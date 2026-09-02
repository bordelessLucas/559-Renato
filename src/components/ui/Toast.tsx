import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (input: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const variantClasses: Record<ToastVariant, string> = {
  success: 'border-success-600/20 bg-success-50 text-success-700',
  error: 'border-danger-600/20 bg-danger-50 text-danger-700',
  info: 'border-info-600/20 bg-info-50 text-info-600',
  warning: 'border-warning-600/20 bg-warning-50 text-warning-700',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((input: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID()
    setItems((current) => [...current, { ...input, id }])
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id))
    }, 4200)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto rounded-xl border px-4 py-3 shadow-md',
              variantClasses[item.variant],
            )}
            role="status"
          >
            <p className="text-sm font-semibold">{item.title}</p>
            {item.description && <p className="mt-0.5 text-sm opacity-90">{item.description}</p>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast deve ser usado dentro de ToastProvider')
  }
  return context
}
