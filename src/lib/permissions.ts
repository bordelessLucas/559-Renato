import type { AppUser } from '../types/user'
import type { UserRole } from '../types/common'

export function isAdmin(profile: AppUser | null | undefined): boolean {
  return Boolean(profile && profile.role === 'administrador' && profile.status === 'ativo')
}

export function isOperator(profile: AppUser | null | undefined): boolean {
  return Boolean(profile && profile.role === 'operador' && profile.status === 'ativo')
}

export function isActiveProfile(profile: AppUser | null | undefined): boolean {
  return Boolean(profile && profile.status === 'ativo')
}

export function canManageSchools(profile: AppUser | null | undefined): boolean {
  return isAdmin(profile)
}

export function canManageUsers(profile: AppUser | null | undefined): boolean {
  return isAdmin(profile)
}

export function canManageGuardians(profile: AppUser | null | undefined): boolean {
  return isAdmin(profile)
}

export function canViewSchool(
  profile: AppUser | null | undefined,
  schoolId: string,
): boolean {
  if (!isActiveProfile(profile) || !profile) return false
  if (isAdmin(profile)) return true
  return profile.schoolId === schoolId
}

export function canAccessSchoolScoped(
  profile: AppUser | null | undefined,
  schoolId: string,
): boolean {
  return canViewSchool(profile, schoolId)
}

export function roleLabel(role: UserRole) {
  return role === 'administrador' ? 'Administrador' : 'Operador'
}
