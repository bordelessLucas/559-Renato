import type { StudentGender } from '../types/common'

const FEMALE_NAME_EXCEPTIONS = new Set([
  'ana',
  'maria',
  'sofia',
  'sophia',
  'isabela',
  'isabella',
  'laura',
  'julia',
  'júlia',
  'beatriz',
  'helena',
  'valentina',
  'alice',
  'manuela',
  'giovanna',
  'lara',
  'livia',
  'lívia',
  'yasmin',
  'emanuelly',
  'eloa',
  'eloá',
])

const MALE_NAME_EXCEPTIONS = new Set([
  'joshua',
  'noah',
  'lucca',
  'luca',
  'nikolas',
  'nicolas',
  'nicolás',
  'thomas',
  'mathias',
  'matias',
  'elias',
  'jonas',
  'lucas',
  'gabriel',
  'miguel',
  'arthur',
  'heitor',
  'benicio',
  'benício',
  'davi',
  'theo',
  'théo',
  'enzo',
  'pedro',
  'guilherme',
  'rafael',
  'bernardo',
])

/**
 * Resolve gênero para avatar de demo.
 * Preferência: campo salvo → heurística leve pelo primeiro nome.
 */
export function resolveStudentGender(
  gender: StudentGender | '' | undefined,
  name: string,
): StudentGender {
  if (gender === 'masculino' || gender === 'feminino') return gender

  const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
  if (!first) return 'masculino'
  if (FEMALE_NAME_EXCEPTIONS.has(first)) return 'feminino'
  if (MALE_NAME_EXCEPTIONS.has(first)) return 'masculino'
  if (first.endsWith('a') && !first.endsWith('ia')) return 'feminino'
  return 'masculino'
}
