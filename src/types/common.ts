export type EntityStatus = 'ativo' | 'inativo'

export type UserRole =
  | 'administrador_geral'
  | 'administrador_escola'
  | 'operador'
  | 'responsavel'

export type GuardianLinkType = 'pai' | 'mae' | 'responsavel_legal' | 'outro'

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  administrador_geral: 'Dono do sistema',
  administrador_escola: 'Admin',
  operador: 'Operador',
  responsavel: 'Responsável',
}

export const GUARDIAN_LINK_LABELS: Record<GuardianLinkType, string> = {
  pai: 'Pai',
  mae: 'Mãe',
  responsavel_legal: 'Responsável legal',
  outro: 'Outro',
}

export const STATUS_LABELS: Record<EntityStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
}

export type StudentShift = 'manha' | 'tarde' | 'noite' | 'integral'

export const STUDENT_SHIFT_LABELS: Record<StudentShift, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  integral: 'Integral',
}

/** Sexo aparente para avatar de demonstração (sem foto real). */
export type StudentGender = 'masculino' | 'feminino'

export const STUDENT_GENDER_LABELS: Record<StudentGender, string> = {
  masculino: 'Menino',
  feminino: 'Menina',
}
