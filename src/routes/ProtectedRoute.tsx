import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PageSkeleton } from '../components/ui/Skeleton'
import { canAccessAdminPanel, isActiveProfile, isGuardianUser } from '../lib/permissions'

export function ProtectedRoute() {
  const { user, profile, loading, systemInitialized } = useAuth()
  const location = useLocation()

  if (loading || systemInitialized === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <PageSkeleton />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!systemInitialized) {
    if (location.pathname !== '/setup') {
      return <Navigate to="/setup" replace />
    }
    return <Outlet />
  }

  if (!profile || !isActiveProfile(profile)) {
    if (location.pathname !== '/sem-acesso') {
      return <Navigate to="/sem-acesso" replace />
    }
    return <Outlet />
  }

  if (location.pathname === '/setup' || location.pathname === '/sem-acesso') {
    return <Navigate to="/app/dashboard" replace />
  }

  if (isGuardianUser(profile)) {
    const allowed =
      location.pathname === '/app/responsavel' || location.pathname === '/app/responsavel/'
    if (!allowed) {
      return <Navigate to="/app/responsavel" replace />
    }
    return <Outlet />
  }

  if (!canAccessAdminPanel(profile) && location.pathname.startsWith('/app')) {
    return <Navigate to="/sem-acesso" replace />
  }

  if (location.pathname === '/app/responsavel') {
    return <Navigate to="/app/dashboard" replace />
  }

  return <Outlet />
}
