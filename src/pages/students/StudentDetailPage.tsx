import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { ErrorState } from '../../components/feedback/ErrorState'
import { Button, Card, CardBody, CardHeader, ConfirmDialog, PageSkeleton, useToast } from '../../components/ui'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { getStudentById, setStudentStatus } from '../../services/students'
import { getSchoolById } from '../../services/schools'
import { getGuardianById } from '../../services/guardians'
import type { Student } from '../../types/student'
import { STUDENT_SHIFT_LABELS, type EntityStatus } from '../../types/common'
import { canAccessSchoolScoped } from '../../lib/permissions'

function formatDate(value: Student['createdAt']) {
  if (!value) return '—'
  try {
    return value.toDate().toLocaleString('pt-BR')
  } catch {
    return '—'
  }
}

function formatBirthDate(value: string) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

export function StudentDetailPage() {
  const { id } = useParams()
  const { profile, canManageStudents } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [student, setStudent] = useState<Student | null>(null)
  const [schoolName, setSchoolName] = useState('—')
  const [guardianNames, setGuardianNames] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const data = await getStudentById(id)
      if (!data) {
        setError('Aluno não encontrado.')
        return
      }
      if (!canAccessSchoolScoped(profile, data.schoolId)) {
        setError('Você não tem permissão para visualizar este aluno.')
        return
      }
      setStudent(data)
      const school = await getSchoolById(data.schoolId)
      setSchoolName(school?.tradeName || school?.name || '—')

      const linked = await Promise.all(data.guardianIds.map((guardianId) => getGuardianById(guardianId)))
      setGuardianNames(
        linked
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .map((item) => ({ id: item.id, name: item.name })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar aluno.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id, profile])

  const toggleStatus = async () => {
    if (!student || !canManageStudents) return
    setSaving(true)
    try {
      const nextStatus: EntityStatus = student.status === 'ativo' ? 'inativo' : 'ativo'
      await setStudentStatus(student.id, nextStatus)
      toast({ variant: 'success', title: `Aluno ${nextStatus === 'ativo' ? 'ativado' : 'inativado'}` })
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
  if (error || !student) {
    return (
      <ErrorState
        description={error || 'Aluno não encontrado.'}
        onRetry={() => navigate('/app/alunos')}
      />
    )
  }

  const fields = [
    { label: 'Escola', value: schoolName },
    { label: 'Matrícula', value: student.enrollmentCode || '—' },
    { label: 'Turma', value: student.className || '—' },
    { label: 'Turno', value: student.shift ? STUDENT_SHIFT_LABELS[student.shift] : '—' },
    { label: 'Nascimento', value: formatBirthDate(student.birthDate) },
    { label: 'Cadastrado em', value: formatDate(student.createdAt) },
  ]

  return (
    <div>
      <PageHeader
        title={student.name}
        description="Detalhes do aluno cadastrado."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/app/alunos">
              <Button variant="outline">Voltar</Button>
            </Link>
            {canManageStudents && (
              <>
                <Link to={`/app/alunos/${student.id}/editar`}>
                  <Button variant="secondary">Editar</Button>
                </Link>
                <Button
                  variant={student.status === 'ativo' ? 'danger' : 'primary'}
                  onClick={() => setConfirmOpen(true)}
                >
                  {student.status === 'ativo' ? 'Inativar' : 'Ativar'}
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <Card>
          <CardBody>
            <div className="overflow-hidden rounded-xl border border-line bg-surface-muted">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={`Foto de ${student.name}`} className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center text-sm text-ink-subtle">
                  Sem foto
                </div>
              )}
            </div>
            <div className="mt-4">
              <StatusBadge status={student.status} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Cadastro</h2>
          </CardHeader>
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{field.label}</dt>
                  <dd className="mt-1 text-sm text-ink">{field.value}</dd>
                </div>
              ))}
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Responsáveis</dt>
                <dd className="mt-1 text-sm text-ink">
                  {guardianNames.length === 0 ? (
                    '—'
                  ) : (
                    <ul className="space-y-1">
                      {guardianNames.map((guardian) => (
                        <li key={guardian.id}>
                          <Link
                            to={`/app/responsaveis/${guardian.id}`}
                            className="font-semibold text-brand-700 hover:text-brand-800"
                          >
                            {guardian.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
              {student.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Observações</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-ink">{student.notes}</dd>
                </div>
              ) : null}
            </dl>
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={student.status === 'ativo' ? 'Inativar aluno?' : 'Ativar aluno?'}
        description="Confirme a alteração de status deste aluno."
        confirmLabel="Confirmar"
        variant={student.status === 'ativo' ? 'danger' : 'primary'}
        loading={saving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={toggleStatus}
      />
    </div>
  )
}
