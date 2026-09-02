import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PageSkeleton } from '../components/ui/Skeleton'
import { isActiveProfile } from '../lib/permissions'

export function ProtectedRoute() {
  const { user, profile, loading, needsSetup } = useAuth()

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <PageSkeleton />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (needsSetup) {
    return <Navigate to="/app/setup" replace />
  }

  if (!profile) {
    return <Navigate to="/app/sem-acesso" replace />
  }

  if (!isActiveProfile(profile)) {
    return <Navigate to="/app/sem-acesso" replace />
  }

  return <Outlet />
}

export function SetupRoute() {
  const { user, loading, needsSetup } = useAuth()

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <PageSkeleton />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!needsSetup) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <Outlet />
}
