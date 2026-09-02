import { createSchool } from './schools'
import { createUserProfile } from './users'
import { markSystemInitialized } from '../lib/firestore'
import type { SchoolInput } from '../types/school'

export async function bootstrapSystem(params: {
  uid: string
  email: string
  name: string
  phone: string
  school: SchoolInput
}) {
  const schoolId = await createSchool(params.school)

  await createUserProfile(params.uid, {
    name: params.name.trim(),
    email: params.email.trim().toLowerCase(),
    phone: params.phone,
    schoolId,
    role: 'administrador',
    status: 'ativo',
  })

  await markSystemInitialized(schoolId, params.uid)

  return schoolId
}
