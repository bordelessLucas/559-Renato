import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { getAuthErrorMessage } from '../lib/auth-errors'
import { createGuardian, getGuardianByUserId } from './guardians'
import { createStudent, updateStudent, uploadStudentPhoto } from './students'
import { createUserProfile, getUserProfile } from './users'
import { getSchoolById } from './schools'
import type { School } from '../types/school'

export type PublicSignupPayload = {
  schoolId: string
  email: string
  password: string
  motherName: string
  motherPhone: string
  fatherName: string
  fatherPhone: string
  childName: string
  photoFile: File
}

export async function loadActiveSchoolForSignup(schoolId: string): Promise<School> {
  const school = await getSchoolById(schoolId)
  if (!school) {
    throw new Error('Escola não encontrada. Confira o link ou o QR Code.')
  }
  if (school.status !== 'ativo') {
    throw new Error('Esta escola não está aceitando novos cadastros no momento.')
  }
  return school
}

async function ensureGuardianSession(payload: PublicSignupPayload) {
  const email = payload.email.trim().toLowerCase()
  let uid = auth.currentUser?.uid ?? null

  if (uid) {
    const existing = await getUserProfile(uid)
    if (existing?.email.toLowerCase() === email && existing.role === 'responsavel') {
      if (existing.schoolId !== payload.schoolId) {
        throw new Error('Esta conta já está vinculada a outra escola. Use outro e-mail ou peça apoio à escola.')
      }
      if (existing.status !== 'ativo') {
        throw new Error('Esta conta está inativa. Contate a escola.')
      }
    } else if (existing && existing.email.toLowerCase() !== email) {
      // sessão de outro usuário — tenta autenticar com o e-mail informado
      uid = null
    }
  }

  if (!uid) {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, payload.password)
      uid = credential.user.uid
    } catch (error) {
      const message = getAuthErrorMessage(error)
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'auth/email-already-in-use'
      ) {
        try {
          const credential = await signInWithEmailAndPassword(auth, email, payload.password)
          uid = credential.user.uid
        } catch (signInError) {
          throw new Error(getAuthErrorMessage(signInError))
        }
      } else {
        throw new Error(message)
      }
    }
  }

  let profile = await getUserProfile(uid)
  if (!profile) {
    const displayName =
      payload.motherName.trim() || payload.fatherName.trim() || email.split('@')[0]
    const phone = payload.motherPhone.trim() || payload.fatherPhone.trim()
    await createUserProfile(uid, {
      name: displayName,
      email,
      phone,
      schoolId: payload.schoolId,
      role: 'responsavel',
      status: 'ativo',
    })
    profile = await getUserProfile(uid)
  }

  if (!profile || profile.role !== 'responsavel') {
    throw new Error('Este e-mail não pode ser usado para cadastro de responsável.')
  }
  if (profile.schoolId !== payload.schoolId) {
    throw new Error('Esta conta já está vinculada a outra escola.')
  }
  if (profile.status !== 'ativo') {
    throw new Error('Esta conta está inativa. Contate a escola.')
  }

  let guardian = await getGuardianByUserId(uid)
  if (!guardian) {
    const name =
      payload.motherName.trim() || payload.fatherName.trim() || profile.name
    const guardianId = await createGuardian({
      name,
      cpf: '',
      phonePrimary: payload.motherPhone.trim() || payload.fatherPhone.trim(),
      phoneSecondary:
        payload.motherPhone.trim() && payload.fatherPhone.trim()
          ? payload.fatherPhone.trim()
          : '',
      email,
      linkType: payload.motherName.trim() ? 'mae' : payload.fatherName.trim() ? 'pai' : 'outro',
      schoolId: payload.schoolId,
      userId: uid,
      isDemo: false,
      status: 'ativo',
    })
    guardian = await getGuardianByUserId(uid)
    if (!guardian) {
      // fallback se a query atrasar
      guardian = {
        id: guardianId,
        name,
        cpf: '',
        phonePrimary: payload.motherPhone.trim() || payload.fatherPhone.trim(),
        phoneSecondary: '',
        email,
        linkType: 'outro',
        schoolId: payload.schoolId,
        userId: uid,
        isDemo: false,
        status: 'ativo',
        createdAt: null,
        updatedAt: null,
      }
    }
  }

  return { uid, profile, guardian }
}

export async function submitPublicSignup(payload: PublicSignupPayload) {
  await loadActiveSchoolForSignup(payload.schoolId)
  const { uid, guardian } = await ensureGuardianSession(payload)

  const studentId = await createStudent({
    name: payload.childName.trim(),
    birthDate: '',
    enrollmentCode: '',
    className: '',
    shift: '',
    notes: [
      payload.motherName.trim() && `Mãe: ${payload.motherName.trim()} (${payload.motherPhone.trim() || '—'})`,
      payload.fatherName.trim() && `Pai: ${payload.fatherName.trim()} (${payload.fatherPhone.trim() || '—'})`,
    ]
      .filter(Boolean)
      .join(' · '),
    photoUrl: '',
    photoPath: '',
    schoolId: payload.schoolId,
    guardianIds: [guardian.id],
    guardianUserIds: [uid],
    isDemo: false,
    status: 'ativo',
  })

  const uploaded = await uploadStudentPhoto(studentId, payload.schoolId, payload.photoFile)
  await updateStudent(studentId, {
    photoUrl: uploaded.photoUrl,
    photoPath: uploaded.photoPath,
  })

  return { studentId, guardianId: guardian.id, uid }
}
