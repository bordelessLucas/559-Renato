import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { EmptyState } from '../components/feedback/EmptyState'
import { ErrorState } from '../components/feedback/ErrorState'
import { Badge, Button, PageSkeleton, StudentAvatar } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { getGuardianByUserId } from '../services/guardians'
import { listStudentsForGuardianUser } from '../services/students'
import type { Student } from '../types/student'
import { STUDENT_SHIFT_LABELS } from '../types/common'

/**
 * Home do responsável — um único trabalho: ver e gerir dependentes.
 * Avisos ficam em rota própria (menu). Um só CTA de cadastro no header.
 */
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

  const firstName = profile?.name?.split(' ')[0] || 'olá'
  const pendingFace = students.filter((s) => !s.faceEnrolled).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus dependentes"
        description={`${firstName}, estes são os filhos vinculados a ${schoolName}.`}
        action={
          hasGuardianRecord ? (
            <Button onClick={() => navigate('/app/responsavel/alunos/novo')}>
              Cadastrar dependente
            </Button>
          ) : undefined
        }
      />

      <p className="text-sm text-ink-muted">
        Entrada e saída chegam em{' '}
        <Link to="/app/responsavel/notificacoes" className="font-semibold text-brand-700 hover:text-brand-800">
          Avisos
        </Link>
        . O cadastro não precisa de aprovação da escola.
      </p>

      <div className="flex flex-wrap gap-2">
        <Badge variant="brand">{schoolName}</Badge>
        {students.length > 0 && (
          <Badge variant="neutral">
            {students.length} {students.length === 1 ? 'dependente' : 'dependentes'}
          </Badge>
        )}
        {pendingFace > 0 && (
          <Badge variant="warning">
            {pendingFace === 1 ? '1 sem reconhecimento' : `${pendingFace} sem reconhecimento`}
          </Badge>
        )}
      </div>

      <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
        A foto do rosto vira um padrão numérico (embedding) e não fica armazenada. Sem esse cadastro,
        a entrada automática e o aviso aos pais podem falhar.
      </p>

      {!hasGuardianRecord ? (
        <EmptyState
          title="Vínculo com a escola incompleto"
          description="Sua conta existe, mas ainda não está associada como responsável nesta escola. Peça apoio à secretaria."
        />
      ) : students.length === 0 ? (
        <EmptyState
          title="Nenhum dependente cadastrado"
          description="Cadastre a primeira criança para começar a receber avisos de entrada e saída."
          actionLabel="Cadastrar dependente"
          onAction={() => navigate('/app/responsavel/alunos/novo')}
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {students.map((student) => (
            <li key={student.id}>
              <Link
                to={`/app/responsavel/alunos/${student.id}`}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <StudentAvatar
                    name={student.name}
                    gender={student.gender}
                    photoUrl={student.photoUrl || undefined}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold text-ink">{student.name}</h2>
                      {!student.faceEnrolled && (
                        <span className="text-xs font-medium text-warning-700">Sem reconhecimento</span>
                      )}
                      {student.faceEnrolled && (
                        <span className="text-xs font-medium text-success-700">Rosto ok</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {student.className || 'Turma não informada'}
                      {student.shift ? ` · ${STUDENT_SHIFT_LABELS[student.shift]}` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-brand-700 sm:shrink-0">
                  Abrir cadastro →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
