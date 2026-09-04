import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

type BrandMarkProps = {
  className?: string
  /** Menor, para espaços apertados (ex.: cards) */
  compact?: boolean
  /** Destaque hero / login */
  prominent?: boolean
}

export function BrandMark({ className, compact = false, prominent = false }: BrandMarkProps) {
  return (
    <Link to="/" className={cn('inline-flex items-center', className)} aria-label="Olhar+IA">
      <img
        src="/brand/logo-olhar-mais-ia.png?v=2"
        alt="Olhar+IA — Inteligência Artificial para Escolas"
        className={cn(
          'w-auto bg-transparent object-contain object-left',
          compact && 'h-9 max-w-[10rem] sm:h-10 sm:max-w-[12rem]',
          !compact &&
            !prominent &&
            'h-12 max-w-[14rem] sm:h-14 sm:max-w-[17rem]',
          prominent && 'h-16 max-w-[18rem] sm:h-20 sm:max-w-[22rem] lg:h-24 lg:max-w-[26rem]',
        )}
      />
    </Link>
  )
}
