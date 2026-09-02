import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { ErrorState } from '../../components/feedback/ErrorState'
import { Button, Card, CardBody, PageSkeleton, ConfirmDialog, useToast } from '../../components/ui'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { getSchoolById, setSchoolStatus } from '../../services/schools'
import type { School } from '../../types/school'
import { canAccessSchoolScoped } from '../../lib/permissions'
import type { EntityStatus } from '../../types/common'

function formatDate(value: School['createdAt']) {
  if (!value) return '—'
  try {
    return value.toDate().toLocaleString('pt-BR')
  } catch {
    return '—'
  }
}

export function SchoolDetailPage() {
  const { id } = useParams()
  const { profile, canManageSchools } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const data = await getSchoolById(id)
      if (!data) {
        setError('Escola não encontrada.')
        setSchool(null)
        return
      }
      if (!canAccessSchoolScoped(profile, data.id)) {
        setError('Você não tem permissão para visualizar esta escola.')
        setSchool(null)
        return
      }
      setSchool(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar escola.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id, profile])

  const toggleStatus = async () => {
    if (!school || !canManageSchools) return
    setSaving(true)
    try {
      const nextStatus: EntityStatus = school.status === 'ativo' ? 'inativo' : 'ativo'
      await setSchoolStatus(school.id, nextStatus)
      toast({ variant: 'success', title: `Escola ${nextStatus === 'ativo' ? 'ativada' : 'inativada'}` })
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
  if (error || !school) {
    return <ErrorState description={error || 'Escola não encontrada.'} onRetry={() => navigate('/app/escolas')} />
  }

  const fields = [
    { label: 'Nome', value: school.name },
    { label: 'Nome fantasia', value: school.tradeName || '—' },
    { label: 'CNPJ', value: school.cnpj || '—' },
    { label: 'Telefone', value: school.phone || '—' },
    { label: 'E-mail', value: school.email || '—' },
    { label: 'Endereço', value: school.address || '—' },
    { label: 'Cidade', value: school.city || '—' },
    { label: 'Estado', value: school.state || '—' },
    { label: 'Criada em', value: formatDate(school.createdAt) },
  ]

  return (
    <div>
      <PageHeader
        title={school.tradeName || school.name}
        description="Detalhes da escola cadastrada."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/app/escolas">
              <Button variant="outline">Voltar</Button>
            </Link>
            {canManageSchools && (
              <>
                <Link to={`/app/escolas/${school.id}/editar`}>
                  <Button variant="secondary">Editar</Button>
                </Link>
                <Button
                  variant={school.status === 'ativo' ? 'danger' : 'primary'}
                  onClick={() => setConfirmOpen(true)}
                >
                  {school.status === 'ativo' ? 'Inativar' : 'Ativar'}
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card>
        <CardBody>
          <div className="mb-4">
            <StatusBadge status={school.status} />
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{field.label}</dt>
                <dd className="mt-1 text-sm text-ink">{field.value}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title={school.status === 'ativo' ? 'Inativar escola?' : 'Ativar escola?'}
        description="Confirme a alteração de status desta escola."
        confirmLabel="Confirmar"
        variant={school.status === 'ativo' ? 'danger' : 'primary'}
        loading={saving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={toggleStatus}
      />
    </div>
  )
}
