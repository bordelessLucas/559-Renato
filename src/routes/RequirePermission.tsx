import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PageSkeleton } from '../components/ui/Skeleton'
import type { ReactNode } from 'react'

interface RequirePermissionProps {
  allowed: boolean
  children: ReactNode
}

export function RequirePermission({ allowed, children }: RequirePermissionProps) {
  const { loading } = useAuth()

  if (loading) {
    return <PageSkeleton />
  }

  if (!allowed) {
    return <Navigate to="/app/dashboard" replace />
  }

  return children
}
