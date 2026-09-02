import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { ErrorState } from '../../components/feedback/ErrorState'
import { Button, Card, CardBody, ConfirmDialog, PageSkeleton, useToast } from '../../components/ui'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { getGuardianById, setGuardianStatus } from '../../services/guardians'
import { getSchoolById } from '../../services/schools'
import type { Guardian } from '../../types/guardian'
import { GUARDIAN_LINK_LABELS, type EntityStatus } from '../../types/common'
import { canAccessSchoolScoped } from '../../lib/permissions'

export function GuardianDetailPage() {
  const { id } = useParams()
  const { profile, canManageGuardians } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [guardian, setGuardian] = useState<Guardian | null>(null)
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
      const data = await getGuardianById(id)
      if (!data) {
        setError('Responsável não encontrado.')
        return
      }
      if (!canAccessSchoolScoped(profile, data.schoolId)) {
        setError('Você não tem permissão para visualizar este responsável.')
        return
      }
      setGuardian(data)
      const school = await getSchoolById(data.schoolId)
      setSchoolName(school?.tradeName || school?.name || '—')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar responsável.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id, profile])

  const toggleStatus = async () => {
    if (!guardian || !canManageGuardians) return
    setSaving(true)
    try {
      const nextStatus: EntityStatus = guardian.status === 'ativo' ? 'inativo' : 'ativo'
      await setGuardianStatus(guardian.id, nextStatus)
      toast({ variant: 'success', title: `Responsável ${nextStatus === 'ativo' ? 'ativado' : 'inativado'}` })
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
  if (error || !guardian) {
    return (
      <ErrorState
        description={error || 'Responsável não encontrado.'}
        onRetry={() => navigate('/app/responsaveis')}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title={guardian.name}
        description="Detalhes do responsável cadastrado."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/app/responsaveis">
              <Button variant="outline">Voltar</Button>
            </Link>
            {canManageGuardians && (
              <>
                <Link to={`/app/responsaveis/${guardian.id}/editar`}>
                  <Button variant="secondary">Editar</Button>
                </Link>
                <Button
                  variant={guardian.status === 'ativo' ? 'danger' : 'primary'}
                  onClick={() => setConfirmOpen(true)}
                >
                  {guardian.status === 'ativo' ? 'Inativar' : 'Ativar'}
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card>
        <CardBody>
          <div className="mb-4">
            <StatusBadge status={guardian.status} />
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">CPF</dt>
              <dd className="mt-1 text-sm text-ink">{guardian.cpf || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Vínculo</dt>
              <dd className="mt-1 text-sm text-ink">{GUARDIAN_LINK_LABELS[guardian.linkType]}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Telefone principal</dt>
              <dd className="mt-1 text-sm text-ink">{guardian.phonePrimary || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Telefone secundário</dt>
              <dd className="mt-1 text-sm text-ink">{guardian.phoneSecondary || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">E-mail</dt>
              <dd className="mt-1 text-sm text-ink">{guardian.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Escola</dt>
              <dd className="mt-1 text-sm text-ink">{schoolName}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title={guardian.status === 'ativo' ? 'Inativar responsável?' : 'Ativar responsável?'}
        description="Confirme a alteração de status deste responsável."
        confirmLabel="Confirmar"
        variant={guardian.status === 'ativo' ? 'danger' : 'primary'}
        loading={saving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={toggleStatus}
      />
    </div>
  )
}
