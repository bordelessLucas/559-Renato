import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { ErrorState } from '../../components/feedback/ErrorState'
import { Button, Card, CardBody, CardHeader, PageSkeleton } from '../../components/ui'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { getStudentById } from '../../services/students'
import type { Student } from '../../types/student'
import { STUDENT_SHIFT_LABELS } from '../../types/common'

function formatBirthDate(value: string) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

export function GuardianStudentDetailPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!id || !profile) return
      setLoading(true)
      setError('')
      try {
        const data = await getStudentById(id)
        if (!data || !data.guardianUserIds.includes(profile.id)) {
          setError('Dependente não encontrado ou sem vínculo com a sua conta.')
          return
        }
        setStudent(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar o dependente.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id, profile])

  if (loading) return <PageSkeleton />
  if (error || !student) {
    return <ErrorState description={error || 'Dependente não encontrado.'} onRetry={() => navigate('/app/responsavel')} />
  }

  return (
    <div>
      <PageHeader
        title={student.name}
        description="Dados do dependente vinculado à sua conta."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/app/responsavel">
              <Button variant="outline">Voltar</Button>
            </Link>
            <Link to={`/app/responsavel/alunos/${student.id}/editar`}>
              <Button variant="secondary">Editar</Button>
            </Link>
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
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Matrícula</dt>
                <dd className="mt-1 text-sm text-ink">{student.enrollmentCode || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Turma</dt>
                <dd className="mt-1 text-sm text-ink">{student.className || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Turno</dt>
                <dd className="mt-1 text-sm text-ink">
                  {student.shift ? STUDENT_SHIFT_LABELS[student.shift] : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Nascimento</dt>
                <dd className="mt-1 text-sm text-ink">{formatBirthDate(student.birthDate)}</dd>
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
    </div>
  )
}
