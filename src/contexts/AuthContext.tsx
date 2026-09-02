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
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { getAuthErrorMessage } from '../lib/auth-errors'
import { getSystemInitialized } from '../lib/firestore'
import {
  canManageGuardians,
  canManageSchools,
  canManageUsers,
  isActiveProfile,
  isAdmin,
  roleLabel,
} from '../lib/permissions'
import { getUserProfile } from '../services/users'
import { getSchoolById } from '../services/schools'
import type { AppUser } from '../types/user'

interface AuthContextValue {
  user: User | null
  profile: AppUser | null
  schoolName: string | null
  loading: boolean
  needsSetup: boolean
  isAdmin: boolean
  canManageSchools: boolean
  canManageUsers: boolean
  canManageGuardians: boolean
  roleLabel: string
  refreshProfile: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [schoolName, setSchoolName] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null)
      setSchoolName(null)
      setNeedsSetup(false)
      return
    }

    const userProfile = await getUserProfile(nextUser.uid)

    if (!userProfile) {
      const initialized = await getSystemInitialized()
      setProfile(null)
      setSchoolName(null)
      setNeedsSetup(!initialized)
      return
    }

    setProfile(userProfile)
    setNeedsSetup(false)

    if (userProfile.schoolId) {
      const school = await getSchoolById(userProfile.schoolId)
      setSchoolName(school?.tradeName || school?.name || null)
    } else {
      setSchoolName(null)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setLoading(true)
      setUser(nextUser)
      try {
        await loadProfile(nextUser)
      } finally {
        setLoading(false)
      }
    })
    return unsubscribe
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    await loadProfile(user)
  }, [loadProfile, user])

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
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
      needsSetup,
      isAdmin: isAdmin(profile),
      canManageSchools: canManageSchools(profile),
      canManageUsers: canManageUsers(profile),
      canManageGuardians: canManageGuardians(profile),
      roleLabel: profile ? roleLabel(profile.role) : 'Sem perfil',
      refreshProfile,
      login,
      logout,
      resetPassword,
    }),
    [
      user,
      profile,
      schoolName,
      loading,
      needsSetup,
      refreshProfile,
      login,
      logout,
      resetPassword,
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

export function useRequireActiveProfile() {
  const auth = useAuth()
  return {
    ...auth,
    isActive: isActiveProfile(auth.profile),
  }
}
