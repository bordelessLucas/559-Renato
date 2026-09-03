import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp, deleteApp } from 'firebase/app'
import {
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
  if (!existsSync(envPath)) throw new Error('Arquivo .env não encontrado.')
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

const ADMIN_CANDIDATES = [
  { email: 'admin@admin.com', password: 'borderless' },
  { email: 'admin.geral@renato.app', password: 'Renato@Geral2026!' },
]

const DEMO_GUARDIANS = [
  {
    key: 'ana',
    name: 'Ana Souza (Demo)',
    email: 'ana.demo@escolademo.app',
    phonePrimary: '(11) 98888-1001',
    linkType: 'mae',
  },
  {
    key: 'bruno',
    name: 'Bruno Lima (Demo)',
    email: 'bruno.demo@escolademo.app',
    phonePrimary: '(11) 98888-1002',
    linkType: 'pai',
  },
  {
    key: 'carla',
    name: 'Carla Mendes (Demo)',
    email: 'carla.demo@escolademo.app',
    phonePrimary: '(11) 98888-1003',
    linkType: 'responsavel_legal',
  },
]

async function signInAsGeneralAdmin(auth, db) {
  for (const candidate of ADMIN_CANDIDATES) {
    try {
      const credential = await signInWithEmailAndPassword(auth, candidate.email, candidate.password)
      const profileSnap = await getDoc(doc(db, 'users', credential.user.uid))
      const role = profileSnap.exists() ? String(profileSnap.data()?.role || '') : ''
      if (role === 'administrador_geral' || role === 'administrador') {
        console.log(`Entrando como ${candidate.email}`)
        return
      }
      await signOut(auth)
    } catch {
      // tenta próximo
    }
  }
  throw new Error('Nenhum administrador geral disponível para o seed demo.')
}

async function main() {
  const app = initializeApp(firebaseConfig, 'seed-demo')
  const auth = getAuth(app)
  const db = getFirestore(app)

  await signInAsGeneralAdmin(auth, db)

  const systemSnap = await getDoc(doc(db, 'settings', 'system'))
  const schoolId = systemSnap.exists() ? String(systemSnap.data()?.firstSchoolId || '') : ''
  if (!schoolId) throw new Error('Sistema sem escola inicial. Rode seed:profiles antes.')

  console.log(`Escola demo: ${schoolId}`)

  const responsavelSnap = await getDocs(
    query(collection(db, 'users'), where('email', '==', 'responsavel@responsavel.com'), limit(1)),
  )
  if (responsavelSnap.empty) {
    throw new Error('Usuário responsavel@responsavel.com não encontrado. Rode seed:profiles.')
  }
  const responsavelUser = responsavelSnap.docs[0]
  const responsavelUid = responsavelUser.id

  let guardianId = ''
  const guardianQuery = await getDocs(
    query(collection(db, 'guardians'), where('userId', '==', responsavelUid), limit(1)),
  )
  if (guardianQuery.empty) {
    const ref = doc(collection(db, 'guardians'))
    guardianId = ref.id
    await setDoc(ref, {
      name: 'Responsável Demo',
      cpf: '',
      phonePrimary: '(11) 90000-0004',
      phoneSecondary: '',
      email: 'responsavel@responsavel.com',
      linkType: 'responsavel_legal',
      schoolId,
      userId: responsavelUid,
      isDemo: false,
      status: 'ativo',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } else {
    guardianId = guardianQuery.docs[0].id
    await updateDoc(guardianQuery.docs[0].ref, {
      schoolId,
      status: 'ativo',
      updatedAt: serverTimestamp(),
    })
  }
  console.log(`Responsável logável vinculado: ${guardianId}`)

  const childrenOfResponsavel = [
    {
      key: 'lucas',
      name: 'Lucas Demo',
      birthDate: '2015-03-12',
      enrollmentCode: 'DEMO-001',
      className: '5º A',
      shift: 'manha',
      notes: 'Filho 1 do responsável de teste. Registro isDemo.',
    },
    {
      key: 'sofia',
      name: 'Sofia Demo',
      birthDate: '2018-07-22',
      enrollmentCode: 'DEMO-002',
      className: '2º B',
      shift: 'tarde',
      notes: 'Filha 2 do responsável de teste. Registro isDemo.',
    },
    {
      key: 'miguel',
      name: 'Miguel Demo',
      birthDate: '2020-11-05',
      enrollmentCode: 'DEMO-003',
      className: 'Infantil II',
      shift: 'integral',
      notes: 'Filho 3 do responsável de teste. Registro isDemo.',
    },
  ]

  for (const child of childrenOfResponsavel) {
    const existing = await getDocs(
      query(collection(db, 'students'), where('enrollmentCode', '==', child.enrollmentCode), limit(1)),
    )
    const payload = {
      name: child.name,
      birthDate: child.birthDate,
      enrollmentCode: child.enrollmentCode,
      className: child.className,
      shift: child.shift,
      notes: child.notes,
      photoUrl: '',
      photoPath: '',
      schoolId,
      guardianIds: [guardianId],
      guardianUserIds: [responsavelUid],
      isDemo: true,
      status: 'ativo',
      updatedAt: serverTimestamp(),
    }
    if (existing.empty) {
      const ref = doc(collection(db, 'students'))
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() })
      console.log(`✓ Aluno ${child.name} (${ref.id})`)
    } else {
      await updateDoc(existing.docs[0].ref, payload)
      console.log(`✓ Aluno ${child.name} atualizado (${existing.docs[0].id})`)
    }
  }

  const demoGuardianIds = {}
  for (const item of DEMO_GUARDIANS) {
    const existing = await getDocs(
      query(collection(db, 'guardians'), where('email', '==', item.email), limit(1)),
    )
    const payload = {
      name: item.name,
      cpf: '',
      phonePrimary: item.phonePrimary,
      phoneSecondary: '',
      email: item.email,
      linkType: item.linkType,
      schoolId,
      userId: '',
      isDemo: true,
      status: 'ativo',
      updatedAt: serverTimestamp(),
    }
    if (existing.empty) {
      const ref = doc(collection(db, 'guardians'))
      demoGuardianIds[item.key] = ref.id
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() })
      console.log(`✓ Responsável ${item.name}`)
    } else {
      demoGuardianIds[item.key] = existing.docs[0].id
      await updateDoc(existing.docs[0].ref, payload)
      console.log(`✓ Responsável ${item.name} atualizado`)
    }
  }

  const extraStudents = [
    {
      enrollmentCode: 'DEMO-101',
      name: 'Helena Souza Demo',
      guardianKey: 'ana',
      className: '4º A',
      shift: 'manha',
      birthDate: '2016-01-18',
    },
    {
      enrollmentCode: 'DEMO-102',
      name: 'Pedro Souza Demo',
      guardianKey: 'ana',
      className: '1º A',
      shift: 'tarde',
      birthDate: '2019-09-03',
    },
    {
      enrollmentCode: 'DEMO-201',
      name: 'Rafael Lima Demo',
      guardianKey: 'bruno',
      className: '6º B',
      shift: 'manha',
      birthDate: '2014-05-30',
    },
    {
      enrollmentCode: 'DEMO-301',
      name: 'Beatriz Mendes Demo',
      guardianKey: 'carla',
      className: '3º C',
      shift: 'integral',
      birthDate: '2017-12-11',
    },
    {
      enrollmentCode: 'DEMO-302',
      name: 'Theo Mendes Demo',
      guardianKey: 'carla',
      className: 'Infantil I',
      shift: 'manha',
      birthDate: '2021-04-02',
    },
  ]

  for (const child of extraStudents) {
    const existing = await getDocs(
      query(collection(db, 'students'), where('enrollmentCode', '==', child.enrollmentCode), limit(1)),
    )
    const payload = {
      name: child.name,
      birthDate: child.birthDate,
      enrollmentCode: child.enrollmentCode,
      className: child.className,
      shift: child.shift,
      notes: 'Registro de demonstração (isDemo). Remover antes da produção.',
      photoUrl: '',
      photoPath: '',
      schoolId,
      guardianIds: [demoGuardianIds[child.guardianKey]],
      guardianUserIds: [],
      isDemo: true,
      status: 'ativo',
      updatedAt: serverTimestamp(),
    }
    if (existing.empty) {
      const ref = doc(collection(db, 'students'))
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() })
      console.log(`✓ Aluno ${child.name}`)
    } else {
      await updateDoc(existing.docs[0].ref, payload)
      console.log(`✓ Aluno ${child.name} atualizado`)
    }
  }

  // Marca aluno legado "Aluno Demo" se existir
  const legacy = await getDocs(
    query(collection(db, 'students'), where('name', '==', 'Aluno Demo'), limit(5)),
  )
  for (const item of legacy.docs) {
    await updateDoc(item.ref, {
      isDemo: true,
      guardianIds: [guardianId],
      guardianUserIds: [responsavelUid],
      enrollmentCode: item.data().enrollmentCode || 'DEMO-000',
      updatedAt: serverTimestamp(),
    })
    console.log(`✓ Aluno legado marcado como demo (${item.id})`)
  }

  await signOut(auth)
  await deleteApp(app)

  console.log('\nSeed demo concluído.')
  console.log('Login do responsável com vários filhos: responsavel@responsavel.com / borderless')
  console.log('Para remover depois: npm run seed:demo:clear')
}

main().catch((error) => {
  console.error('Falha no seed demo:', error?.code || '', error?.message || error)
  process.exit(1)
})
