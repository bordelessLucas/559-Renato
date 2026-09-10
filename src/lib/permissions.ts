import type { AppUser } from '../types/user'
import type { UserRole } from '../types/common'
import { USER_ROLE_LABELS } from '../types/common'

export function normalizeRole(role: string | undefined | null): UserRole {
  if (role === 'administrador') return 'administrador_geral'
  if (
    role === 'administrador_geral' ||
    role === 'administrador_escola' ||
    role === 'operador' ||
    role === 'responsavel'
  ) {
    return role
  }
  return 'operador'
}

export function isActiveProfile(profile: AppUser | null | undefined): boolean {
  return Boolean(profile && profile.status === 'ativo')
}

export function isGeneralAdmin(profile: AppUser | null | undefined): boolean {
  return Boolean(
    profile &&
      isActiveProfile(profile) &&
      normalizeRole(profile.role) === 'administrador_geral',
  )
}

export function isSchoolAdmin(profile: AppUser | null | undefined): boolean {
  return Boolean(
    profile &&
      isActiveProfile(profile) &&
      normalizeRole(profile.role) === 'administrador_escola',
  )
}

/** @deprecated Prefer isGeneralAdmin / isSchoolAdmin */
export function isAdmin(profile: AppUser | null | undefined): boolean {
  return isGeneralAdmin(profile) || isSchoolAdmin(profile)
}

export function isOperator(profile: AppUser | null | undefined): boolean {
  return Boolean(
    profile && isActiveProfile(profile) && normalizeRole(profile.role) === 'operador',
  )
}

export function isGuardianUser(profile: AppUser | null | undefined): boolean {
  return Boolean(
    profile && isActiveProfile(profile) && normalizeRole(profile.role) === 'responsavel',
  )
}

/** Destino pós-login por perfil */
export function homePathForProfile(profile: AppUser | null | undefined): string {
  if (isGuardianUser(profile)) return '/app/responsavel'
  return '/app/dashboard'
}

export function canAccessAdminPanel(profile: AppUser | null | undefined): boolean {
  if (!isActiveProfile(profile) || !profile) return false
  const role = normalizeRole(profile.role)
  return role === 'administrador_geral' || role === 'administrador_escola' || role === 'operador'
}

export function canManageSchools(profile: AppUser | null | undefined): boolean {
  return isGeneralAdmin(profile)
}

export function canEditOwnSchool(profile: AppUser | null | undefined): boolean {
  return isGeneralAdmin(profile) || isSchoolAdmin(profile)
}

export function canManageUsers(profile: AppUser | null | undefined): boolean {
  return isGeneralAdmin(profile) || isSchoolAdmin(profile)
}

/** Dados de crianças/famílias: só equipe da própria escola (LGPD). */
export function canViewStudents(profile: AppUser | null | undefined): boolean {
  return isSchoolAdmin(profile) || isOperator(profile)
}

export function canViewGuardians(profile: AppUser | null | undefined): boolean {
  return isSchoolAdmin(profile) || isOperator(profile)
}

export function canManageGuardians(profile: AppUser | null | undefined): boolean {
  return isSchoolAdmin(profile)
}

export function canManageStudents(profile: AppUser | null | undefined): boolean {
  return isSchoolAdmin(profile)
}

/** Perfis operacionais do sistema — sem responsável (dado familiar). */
export function isSystemStaffRole(role: UserRole | string): boolean {
  const normalized = normalizeRole(role)
  return (
    normalized === 'administrador_geral' ||
    normalized === 'administrador_escola' ||
    normalized === 'operador'
  )
}

export function canCreateRole(
  actor: AppUser | null | undefined,
  targetRole: UserRole,
): boolean {
  if (!actor || !isActiveProfile(actor)) return false
  const role = normalizeRole(actor.role)

  if (role === 'administrador_geral') {
    // LGPD: admin geral não cria contas de responsável (pai/mãe)
    return (
      targetRole === 'administrador_geral' ||
      targetRole === 'administrador_escola' ||
      targetRole === 'operador'
    )
  }

  if (role === 'administrador_escola') {
    return targetRole === 'operador' || targetRole === 'responsavel'
  }

  return false
}

export function creatableRolesFor(actor: AppUser | null | undefined): UserRole[] {
  if (!actor) return []
  const role = normalizeRole(actor.role)
  if (role === 'administrador_geral') {
    return ['administrador_geral', 'administrador_escola', 'operador']
  }
  if (role === 'administrador_escola') {
    return ['operador', 'responsavel']
  }
  return []
}

/** Admin geral não visualiza contas de responsável (LGPD). */
export function canViewUserRecord(
  viewer: AppUser | null | undefined,
  target: AppUser,
): boolean {
  if (!viewer || !isActiveProfile(viewer)) return false
  if (isGeneralAdmin(viewer)) {
    return isSystemStaffRole(target.role)
  }
  if (isSchoolAdmin(viewer) || isOperator(viewer)) {
    if (normalizeRole(target.role) === 'administrador_geral') return false
    return Boolean(viewer.schoolId) && target.schoolId === viewer.schoolId
  }
  return false
}

export function canViewSchool(
  profile: AppUser | null | undefined,
  schoolId: string,
): boolean {
  if (!isActiveProfile(profile) || !profile) return false
  if (isGeneralAdmin(profile)) return true
  return profile.schoolId === schoolId
}

export function canAccessSchoolScoped(
  profile: AppUser | null | undefined,
  schoolId: string,
): boolean {
  return canViewSchool(profile, schoolId)
}

export function canListAllSchools(profile: AppUser | null | undefined): boolean {
  return isGeneralAdmin(profile)
}

export function roleLabel(role: UserRole | string) {
  const normalized = normalizeRole(role)
  return USER_ROLE_LABELS[normalized]
}
