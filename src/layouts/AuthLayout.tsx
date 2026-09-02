import type { ReactNode } from 'react'
import { BrandMark } from '../components/layout/BrandMark'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgb(20_184_166_/_0.16),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgb(15_23_42_/_0.06),_transparent_45%)]"
        aria-hidden
      />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-8">
          <BrandMark />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
