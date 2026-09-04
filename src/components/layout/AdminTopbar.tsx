import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccessLabel, useAuth } from '../../contexts/AuthContext'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Dropdown } from '../ui/Dropdown'
import { useToast } from '../ui/Toast'
import { isGuardianUser, isGeneralAdmin, isOperator, isSchoolAdmin } from '../../lib/permissions'

function areaLabel(profile: ReturnType<typeof useAuth>['profile']) {
  if (isGuardianUser(profile)) return 'Área do responsável'
  if (isOperator(profile)) return 'Área operacional'
  if (isSchoolAdmin(profile)) return 'Administração da escola'
  if (isGeneralAdmin(profile)) return 'Administração geral'
  return 'Área autenticada'
}

interface AdminTopbarProps {
  onMenuClick: () => void
}

export function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const { user, profile, schoolName, logout } = useAuth()
  const accessType = useAccessLabel()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuário'

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      toast({ variant: 'success', title: 'Sessão encerrada' })
      navigate('/login')
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Falha ao sair',
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setLoggingOut(false)
      setConfirmLogout(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{schoolName}</p>
            <p className="truncate text-xs text-ink-muted">{areaLabel(profile)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Badge variant="brand" className="hidden sm:inline-flex">
            {accessType}
          </Badge>

          <Dropdown
            align="right"
            trigger={
              <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-left transition-colors hover:bg-surface-muted">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                  {displayName.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-sm font-semibold text-ink">{displayName}</span>
                  <span className="block truncate text-xs text-ink-muted">{user?.email}</span>
                </span>
              </span>
            }
            items={[
              {
                id: 'logout',
                label: 'Sair da conta',
                danger: true,
                onSelect: () => setConfirmLogout(true),
              },
            ]}
          />
        </div>
      </header>

      <ConfirmDialog
        open={confirmLogout}
        title="Encerrar sessão?"
        description="Você precisará entrar novamente para acessar o sistema."
        confirmLabel="Sair"
        variant="danger"
        loading={loggingOut}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
      />
    </>
  )
}
