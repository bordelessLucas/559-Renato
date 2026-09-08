import { cn } from '../../lib/cn'
import { resolveStudentGender } from '../../lib/student-avatar'
import type { StudentGender } from '../../types/common'

type StudentAvatarProps = {
  name: string
  gender?: StudentGender | ''
  photoUrl?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  alt?: string
}

const SIZE_CLASS = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
} as const

/** Boneco estilo perfil (ícone), masculino ou feminino — sem foto real. */
function GenderIcon({ gender }: { gender: StudentGender }) {
  if (gender === 'feminino') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
        <circle cx="32" cy="32" r="32" fill="#F3C98B" />
        <ellipse cx="32" cy="22" rx="14" ry="15" fill="#5C3D2E" />
        <path
          d="M14 28c2-10 10-16 18-16s16 6 18 16c-3 2-8 3-18 3s-15-1-18-3z"
          fill="#4A2F24"
        />
        <circle cx="32" cy="28" r="11" fill="#F2C4A0" />
        <path
          d="M18 58c2-12 8-18 14-18s12 6 14 18"
          fill="#3BA7F5"
        />
        <path d="M26 30.5c.4 1.2 1.4 2 2.6 2s2.2-.8 2.6-2" stroke="#8B5E4B" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M35 30.5c.4 1.2 1.4 2 2.6 2s2.2-.8 2.6-2" stroke="#8B5E4B" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <circle cx="28" cy="27" r="1.2" fill="#5C3D2E" />
        <circle cx="38" cy="27" r="1.2" fill="#5C3D2E" />
        <path d="M30 35c1.2 1.4 2.8 1.4 4 0" stroke="#C47A6A" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <circle cx="32" cy="32" r="32" fill="#9EC9E8" />
      <path d="M20 24c2-8 8-12 12-12s10 4 12 12c-2 1-7 2-12 2s-10-1-12-2z" fill="#2F4A5C" />
      <circle cx="32" cy="28" r="11" fill="#E8B892" />
      <path d="M18 58c2-12 8-18 14-18s12 6 14 18" fill="#0D3B4E" />
      <circle cx="28" cy="27" r="1.2" fill="#3A2A22" />
      <circle cx="38" cy="27" r="1.2" fill="#3A2A22" />
      <path d="M30 35c1.2 1.2 2.8 1.2 4 0" stroke="#A86B55" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function StudentAvatar({
  name,
  gender,
  photoUrl,
  size = 'md',
  className,
  alt,
}: StudentAvatarProps) {
  const resolved = resolveStudentGender(gender, name)
  const label = alt ?? `Avatar de ${name || (resolved === 'feminino' ? 'menina' : 'menino')}`

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={label}
        className={cn(
          'shrink-0 rounded-full border border-line object-cover',
          SIZE_CLASS[size],
          className,
        )}
      />
    )
  }

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 overflow-hidden rounded-full border border-line shadow-sm',
        SIZE_CLASS[size],
        className,
      )}
    >
      <GenderIcon gender={resolved} />
    </span>
  )
}
