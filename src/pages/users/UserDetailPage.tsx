import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { ErrorState } from '../../components/feedback/ErrorState'
import { Badge, Button, Card, CardBody, ConfirmDialog, PageSkeleton, useToast } from '../../components/ui'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { getUserProfile, setUserStatus } from '../../services/users'
import { getSchoolById } from '../../services/schools'
import type { AppUser } from '../../types/user'
import { USER_ROLE_LABELS, type EntityStatus } from '../../types/common'
import { canAccessSchoolScoped } from '../../lib/permissions'

export function UserDetailPage() {
  const { id } = useParams()
  const { profile, canManageUsers } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [user, setUser] = useState<AppUser | null>(null)
  const [schoolName, setSchoolName] = useState('—')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const data = await getUserProfile(id)
      if (!data) {
        setError('Usuário não encontrado.')
        return
      }
      if (!canAccessSchoolScoped(profile, data.schoolId)) {
        setError('Você não tem permissão para visualizar este usuário.')
        return
      }
      setUser(data)
      const school = await getSchoolById(data.schoolId)
      setSchoolName(school?.tradeName || school?.name || '—')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar usuário.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id, profile])

  const toggleStatus = async () => {
    if (!user || !canManageUsers) return
    setSaving(true)
    try {
      const nextStatus: EntityStatus = user.status === 'ativo' ? 'inativo' : 'ativo'
      await setUserStatus(user.id, nextStatus)
      toast({ variant: 'success', title: `Usuário ${nextStatus === 'ativo' ? 'ativado' : 'inativado'}` })
      setConfirmOpen(false)
      await load()
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Não foi possível alterar o status',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (error || !user) {
    return <ErrorState description={error || 'Usuário não encontrado.'} onRetry={() => navigate('/app/usuarios')} />
  }

  return (
    <div>
      <PageHeader
        title={user.name}
        description="Detalhes do usuário administrativo."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/app/usuarios">
              <Button variant="outline">Voltar</Button>
            </Link>
            {canManageUsers && (
              <>
                <Link to={`/app/usuarios/${user.id}/editar`}>
                  <Button variant="secondary">Editar</Button>
                </Link>
                <Button
                  variant={user.status === 'ativo' ? 'danger' : 'primary'}
                  onClick={() => setConfirmOpen(true)}
                >
                  {user.status === 'ativo' ? 'Inativar' : 'Ativar'}
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card>
        <CardBody>
          <div className="mb-4 flex flex-wrap gap-2">
            <StatusBadge status={user.status} />
            <Badge variant={user.role === 'operador' || user.role === 'responsavel' ? 'neutral' : 'brand'}>
              {USER_ROLE_LABELS[user.role]}
            </Badge>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">E-mail</dt>
              <dd className="mt-1 text-sm text-ink">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Telefone</dt>
              <dd className="mt-1 text-sm text-ink">{user.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Escola</dt>
              <dd className="mt-1 text-sm text-ink">{schoolName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">UID</dt>
              <dd className="mt-1 break-all text-sm text-ink">{user.id}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title={user.status === 'ativo' ? 'Inativar usuário?' : 'Ativar usuário?'}
        description="Confirme a alteração de status deste usuário."
        confirmLabel="Confirmar"
        variant={user.status === 'ativo' ? 'danger' : 'primary'}
        loading={saving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={toggleStatus}
      />
    </div>
  )
}
