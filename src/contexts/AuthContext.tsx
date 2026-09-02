import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { getAuthErrorMessage } from '../lib/auth-errors'
import { getSystemInitialized } from '../lib/firestore'
import { getUserProfile } from '../services/users'
import { getSchoolById } from '../services/schools'
import {
  canManageGuardians as canManageGuardiansFn,
  canManageSchools as canManageSchoolsFn,
  canManageUsers as canManageUsersFn,
  canAccessAdminPanel as canAccessAdminPanelFn,
  isGeneralAdmin as isGeneralAdminFn,
  isGuardianUser as isGuardianUserFn,
  isAdmin as isAdminFn,
  isActiveProfile,
  roleLabel,
} from '../lib/permissions'
import type { AppUser } from '../types/user'

interface AuthContextValue {
  user: User | null
  profile: AppUser | null
  schoolName: string
  loading: boolean
  systemInitialized: boolean | null
  isAdmin: boolean
  isGeneralAdmin: boolean
  isGuardianUser: boolean
  canAccessAdminPanel: boolean
  canManageSchools: boolean
  canManageUsers: boolean
  canManageGuardians: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [schoolName, setSchoolName] = useState('Escola não definida')
  const [loading, setLoading] = useState(true)
  const [systemInitialized, setSystemInitialized] = useState<boolean | null>(null)

  const loadProfile = useCallback(async (uid: string) => {
    const nextProfile = await getUserProfile(uid)
    setProfile(nextProfile)

    if (nextProfile?.schoolId) {
      const school = await getSchoolById(nextProfile.schoolId)
      setSchoolName(school?.tradeName || school?.name || 'Escola não definida')
    } else {
      setSchoolName('Escola não definida')
    }

    return nextProfile
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setProfile(null)
      setSchoolName('Escola não definida')
      return
    }
    await loadProfile(auth.currentUser.uid)
    setSystemInitialized(await getSystemInitialized())
  }, [loadProfile])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      void (async () => {
        setLoading(true)
        setUser(nextUser)

        try {
          const initialized = await getSystemInitialized()
          setSystemInitialized(initialized)

          if (nextUser) {
            await loadProfile(nextUser.uid)
          } else {
            setProfile(null)
            setSchoolName('Escola não definida')
          }
        } catch {
          setProfile(null)
          setSchoolName('Escola não definida')
          setSystemInitialized(null)
        } finally {
          setLoading(false)
        }
      })()
    })

    return unsubscribe
  }, [loadProfile])

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (error) {
      throw new Error(getAuthErrorMessage(error))
    }
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
      return credential.user
    } catch (error) {
      throw new Error(getAuthErrorMessage(error))
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await signOut(auth)
    } catch (error) {
      throw new Error(getAuthErrorMessage(error))
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim())
    } catch (error) {
      throw new Error(getAuthErrorMessage(error))
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      schoolName,
      loading,
      systemInitialized,
      isAdmin: isAdminFn(profile),
      isGeneralAdmin: isGeneralAdminFn(profile),
      isGuardianUser: isGuardianUserFn(profile),
      canAccessAdminPanel: canAccessAdminPanelFn(profile),
      canManageSchools: canManageSchoolsFn(profile),
      canManageUsers: canManageUsersFn(profile),
      canManageGuardians: canManageGuardiansFn(profile),
      login,
      register,
      logout,
      resetPassword,
      refreshProfile,
    }),
    [
      user,
      profile,
      schoolName,
      loading,
      systemInitialized,
      login,
      register,
      logout,
      resetPassword,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}

export function useAccessLabel() {
  const { profile } = useAuth()
  if (!profile) return 'Sem perfil'
  if (!isActiveProfile(profile)) return 'Inativo'
  return roleLabel(profile.role)
}
