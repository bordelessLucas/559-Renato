import type { ReactNode } from 'react'
import { BrandMark } from '../components/layout/BrandMark'

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line/80 bg-surface/80 backdrop-blur">
        <div className="page-container flex h-16 items-center justify-between">
          <BrandMark />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-surface">
        <div className="page-container flex flex-col gap-2 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Controle Escolar</p>
          <p>Segurança e acompanhamento da entrada e saída dos alunos</p>
        </div>
      </footer>
    </div>
  )
}
