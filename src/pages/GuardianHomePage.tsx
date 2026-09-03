import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { EmptyState } from '../components/feedback/EmptyState'
import { ErrorState } from '../components/feedback/ErrorState'
import { Button, Card, CardBody, PageSkeleton } from '../components/ui'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { getGuardianByUserId } from '../services/guardians'
import { listStudentsForGuardianUser } from '../services/students'
import type { Student } from '../types/student'
import { STUDENT_SHIFT_LABELS } from '../types/common'

export function GuardianHomePage() {
  const { profile, schoolName } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasGuardianRecord, setHasGuardianRecord] = useState(true)

  const load = async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const guardian = await getGuardianByUserId(profile.id)
      setHasGuardianRecord(Boolean(guardian))
      const data = await listStudentsForGuardianUser(profile.id)
      setStudents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar seus dependentes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [profile])

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState description={error} onRetry={load} />

  return (
    <div>
      <PageHeader
        title="Meus dependentes"
        description={`${schoolName}. Cadastre um ou mais dependentes matriculados nesta escola.`}
        action={
          hasGuardianRecord ? (
            <Button onClick={() => navigate('/app/responsavel/alunos/novo')}>+ Cadastrar dependente</Button>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <CardBody>
          <p className="text-sm text-ink">
            Olá, <strong>{profile?.name}</strong>. Aqui você acompanha e cadastra os dependentes
            vinculados à sua conta.
          </p>
        </CardBody>
      </Card>

      {!hasGuardianRecord ? (
        <EmptyState
          title="Cadastro incompleto"
          description="Sua conta existe, mas ainda não está vinculada como responsável nesta escola. Peça ao administrador da escola para concluir esse vínculo."
        />
      ) : students.length === 0 ? (
        <EmptyState
          title="Nenhum dependente cadastrado"
          description="Cadastre o primeiro dependente para receber as futuras notificações de entrada e saída."
          actionLabel="Cadastrar dependente"
          onAction={() => navigate('/app/responsavel/alunos/novo')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {students.map((student) => (
            <Card key={student.id}>
              <CardBody>
                <div className="flex gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-muted">
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-semibold text-ink-subtle">
                        {student.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold text-ink">{student.name}</h2>
                      <StatusBadge status={student.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {student.className || 'Turma não informada'}
                      {student.shift ? ` · ${STUDENT_SHIFT_LABELS[student.shift]}` : ''}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link
                        to={`/app/responsavel/alunos/${student.id}`}
                        className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                      >
                        Ver
                      </Link>
                      <Link
                        to={`/app/responsavel/alunos/${student.id}/editar`}
                        className="text-sm font-semibold text-ink-muted hover:text-ink"
                      >
                        Editar
                      </Link>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
