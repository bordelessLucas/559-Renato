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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
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
      // next
    }
  }
  throw new Error('Nenhum administrador geral disponível.')
}

async function deleteDemoCollection(db, collectionName) {
  const snap = await getDocs(query(collection(db, collectionName), where('isDemo', '==', true)))
  let count = 0
  for (const item of snap.docs) {
    await deleteDoc(item.ref)
    count += 1
  }
  console.log(`✓ ${collectionName}: ${count} documento(s) removido(s)`)
}

async function main() {
  const app = initializeApp(firebaseConfig, 'clear-demo')
  const auth = getAuth(app)
  const db = getFirestore(app)

  await signInAsGeneralAdmin(auth, db)
  await deleteDemoCollection(db, 'students')
  await deleteDemoCollection(db, 'guardians')
  await deleteDemoCollection(db, 'users')

  await signOut(auth)
  await deleteApp(app)
  console.log('\nDados de demonstração (isDemo) removidos.')
}

main().catch((error) => {
  console.error('Falha ao limpar demo:', error?.code || '', error?.message || error)
  process.exit(1)
})
