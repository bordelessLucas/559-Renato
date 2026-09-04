import type { ReactNode } from 'react'
import { BrandMark } from '../components/layout/BrandMark'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgb(59_167_245_/_0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgb(13_59_78_/_0.08),_transparent_45%),radial-gradient(ellipse_at_bottom_left,_rgb(255_194_71_/_0.1),_transparent_40%)]"
        aria-hidden
      />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-10">
          <BrandMark prominent />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
