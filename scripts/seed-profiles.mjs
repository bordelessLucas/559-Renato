import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp, deleteApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) {
    throw new Error('Arquivo .env não encontrado.')
  }

  const env = {}
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim()
  }
  return env
}

const env = loadEnv()

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
}

const PROFILES = [
  {
    key: 'geral',
    email: 'admin@admin.com',
    password: 'borderless',
    name: 'Administrador Geral',
    phone: '(11) 90000-0001',
    role: 'administrador_geral',
  },
  {
    key: 'escola',
    email: 'escola@escola.com',
    password: 'borderless',
    name: 'Administrador da Escola',
    phone: '(11) 90000-0002',
    role: 'administrador_escola',
  },
  {
    key: 'operador',
    email: 'operador@operador.com',
    password: 'borderless',
    name: 'Operador da Escola',
    phone: '(11) 90000-0003',
    role: 'operador',
  },
  {
    key: 'responsavel',
    email: 'responsavel@responsavel.com',
    password: 'borderless',
    name: 'Responsável Demo',
    phone: '(11) 90000-0004',
    role: 'responsavel',
  },
]

async function ensureAuthUser(email, password) {
  const secondary = initializeApp(firebaseConfig, `seed-auth-${email}-${Date.now()}`)
  const secondaryAuth = getAuth(secondary)

  try {
    try {
      const created = await createUserWithEmailAndPassword(secondaryAuth, email, password)
      await signOut(secondaryAuth)
      return { uid: created.user.uid, created: true }
    } catch (error) {
      if (error?.code !== 'auth/email-already-in-use') throw error

      const loginApp = initializeApp(firebaseConfig, `seed-login-${email}-${Date.now()}`)
      const loginAuth = getAuth(loginApp)
      try {
        const signed = await signInWithEmailAndPassword(loginAuth, email, password)
        const uid = signed.user.uid
        await signOut(loginAuth)
        return { uid, created: false }
      } catch {
        throw new Error(
          `Conta ${email} já existe, mas a senha do seed não confere. Redefina no Console.`,
        )
      } finally {
        await deleteApp(loginApp)
      }
    }
  } finally {
    await deleteApp(secondary)
  }
}

async function signInAsGeneralAdmin(auth, db) {
  const candidates = [
    { email: 'admin.geral@renato.app', password: 'Renato@Geral2026!' },
    { email: PROFILES[0].email, password: PROFILES[0].password },
  ]

  for (const candidate of candidates) {
    try {
      const credential = await signInWithEmailAndPassword(auth, candidate.email, candidate.password)
      const profileSnap = await getDoc(doc(db, 'users', credential.user.uid))
      const role = profileSnap.exists() ? String(profileSnap.data()?.role || '') : ''
      if (role === 'administrador_geral' || role === 'administrador') {
        console.log(`   Entrou como ${candidate.email}`)
        return credential.user.uid
      }
      await signOut(auth)
    } catch {
      // tenta o próximo administrador conhecido
    }
  }

  throw new Error(
    'Não foi possível entrar com um administrador geral que já tenha perfil no Firestore.',
  )
}

async function writeUser(db, uid, profile, schoolId) {
  await setDoc(
    doc(db, 'users', uid),
    {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      schoolId,
      role: profile.role,
      status: 'ativo',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

async function main() {
  const app = initializeApp(firebaseConfig, 'seed-main')
  const auth = getAuth(app)
  const db = getFirestore(app)

  console.log('1) Criando/validando contas no Firebase Authentication...')
  const uids = {}
  for (const profile of PROFILES) {
    const result = await ensureAuthUser(profile.email, profile.password)
    uids[profile.key] = result.uid
    console.log(`   ✓ ${profile.role}: ${profile.email} (${result.created ? 'criada' : 'já existia'})`)
  }

  const alunoAuth = await ensureAuthUser('aluno@aluno.com', 'borderless')
  console.log(`   ✓ aluno (somente Auth, sem painel): aluno@aluno.com (${alunoAuth.created ? 'criada' : 'já existia'})`)

  console.log('2) Entrando como administrador geral com permissão de escrita...')
  await signInAsGeneralAdmin(auth, db)

  const systemRef = doc(db, 'settings', 'system')
  const systemSnap = await getDoc(systemRef)
  const initialized = Boolean(systemSnap.exists() && systemSnap.data()?.initialized === true)
  let schoolId = systemSnap.exists() ? String(systemSnap.data()?.firstSchoolId || '') : ''

  console.log(`   Sistema inicializado: ${initialized}`)

  console.log('3) Garantindo escola demo...')
  if (!schoolId) {
    schoolId = doc(collection(db, 'schools')).id
    await setDoc(doc(db, 'schools', schoolId), {
      name: 'Escola Demo Renato',
      tradeName: 'Escola Demo',
      cnpj: '',
      phone: '(11) 3000-0000',
      email: 'contato@escolademo.app',
      address: 'Rua da Escola, 100',
      city: 'São Paulo',
      state: 'SP',
      status: 'ativo',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log(`   ✓ Escola criada: ${schoolId}`)
  } else {
    const schoolSnap = await getDoc(doc(db, 'schools', schoolId))
    if (!schoolSnap.exists()) {
      await setDoc(doc(db, 'schools', schoolId), {
        name: 'Escola Demo Renato',
        tradeName: 'Escola Demo',
        cnpj: '',
        phone: '(11) 3000-0000',
        email: 'contato@escolademo.app',
        address: 'Rua da Escola, 100',
        city: 'São Paulo',
        state: 'SP',
        status: 'ativo',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } else {
      await updateDoc(doc(db, 'schools', schoolId), {
        name: 'Escola Demo Renato',
        tradeName: 'Escola Demo',
        status: 'ativo',
        updatedAt: serverTimestamp(),
      })
    }
    console.log(`   ✓ Escola: ${schoolId}`)
  }

  console.log('4) Gravando perfil do administrador geral primeiro...')
  await writeUser(db, uids.geral, PROFILES[0], schoolId)
  console.log('   ✓ administrador_geral')

  console.log('5) Gravando demais perfis...')
  for (const profile of PROFILES.slice(1)) {
    await writeUser(db, uids[profile.key], profile, schoolId)
    console.log(`   ✓ ${profile.role}`)
  }

  console.log('6) Vinculando responsável em guardians/...')
  const guardianUid = uids.responsavel
  const existingGuardian = await getDocs(
    query(collection(db, 'guardians'), where('userId', '==', guardianUid), limit(1)),
  )

  let guardianId = ''
  if (existingGuardian.empty) {
    const guardianRef = doc(collection(db, 'guardians'))
    guardianId = guardianRef.id
    await setDoc(guardianRef, {
      name: PROFILES[3].name,
      cpf: '',
      phonePrimary: PROFILES[3].phone,
      phoneSecondary: '',
      email: PROFILES[3].email,
      linkType: 'responsavel_legal',
      schoolId,
      userId: guardianUid,
      status: 'ativo',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log(`   ✓ Guardian criado: ${guardianId}`)
  } else {
    guardianId = existingGuardian.docs[0].id
    await updateDoc(existingGuardian.docs[0].ref, {
      name: PROFILES[3].name,
      email: PROFILES[3].email,
      phonePrimary: PROFILES[3].phone,
      status: 'ativo',
      schoolId,
      updatedAt: serverTimestamp(),
    })
    console.log(`   ✓ Guardian já existia: ${guardianId}`)
  }

  console.log('7) Garantindo aluno demo...')
  const existingStudent = await getDocs(
    query(collection(db, 'students'), where('guardianIds', 'array-contains', guardianId), limit(1)),
  )

  if (existingStudent.empty) {
    const studentRef = doc(collection(db, 'students'))
    await setDoc(studentRef, {
      name: 'Aluno Demo',
      schoolId,
      guardianIds: [guardianId],
      status: 'ativo',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log(`   ✓ Aluno criado: ${studentRef.id}`)
  } else {
    console.log(`   ✓ Aluno já existia: ${existingStudent.docs[0].id}`)
  }

  console.log('8) Marcando sistema inicializado...')
  await setDoc(
    systemRef,
    {
      initialized: true,
      firstSchoolId: schoolId,
      firstAdminUid: uids.geral,
      updatedAt: serverTimestamp(),
      ...(initialized ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  )

  await signOut(auth)
  await deleteApp(app)

  console.log('\nSeed concluído com sucesso.')
  console.log('\nACESSOS:')
  for (const profile of PROFILES) {
    console.log(`${profile.role}|${profile.email}|${profile.password}`)
  }
  console.log('aluno (sem painel no sistema)|aluno@aluno.com|borderless')
  console.log('aluno (cadastro Firestore)|Aluno Demo vinculado ao responsável')
}

main().catch((error) => {
  console.error('Falha no seed:', error?.code || '', error?.message || error)
  process.exit(1)
})
