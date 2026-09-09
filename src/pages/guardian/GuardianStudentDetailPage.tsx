import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { ErrorState } from '../../components/feedback/ErrorState'
import { Badge, Button, Card, CardBody, CardHeader, PageSkeleton, StudentAvatar } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { getStudentById } from '../../services/students'
import type { Student } from '../../types/student'
import { STUDENT_GENDER_LABELS, STUDENT_SHIFT_LABELS } from '../../types/common'

function formatBirthDate(value: string) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

export function GuardianStudentDetailPage() {
  const { id } = useParams()
  const { profile, schoolName } = useAuth()
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
    return (
      <ErrorState
        description={error || 'Dependente não encontrado.'}
        onRetry={() => navigate('/app/responsavel')}
      />
    )
  }

  const hasPhoto = Boolean(student.photoUrl)
  const faceEnrolled = student.faceEnrolled

  return (
    <div className="space-y-6">
      <PageHeader
        title={student.name}
        description={`Cadastro em ${schoolName}`}
        action={
          <Button onClick={() => navigate(`/app/responsavel/alunos/${student.id}/editar`)}>
            Editar cadastro
          </Button>
        }
      />

      <p>
        <Link
          to="/app/responsavel"
          className="text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          ← Todos os dependentes
        </Link>
      </p>

      {!faceEnrolled ? (
        <p className="rounded-xl border border-warning-600/20 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          Rosto ainda não vetorizado. Sem isso a portaria não reconhece automaticamente — edite o
          cadastro e envie uma foto (a imagem vira cálculo e não fica guardada).
        </p>
      ) : (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          Template facial ativo. Nenhuma foto da criança fica armazenada — só o padrão numérico.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[13rem_1fr]">
        <Card>
          <CardBody>
            <div className="overflow-hidden rounded-2xl border border-line bg-surface-muted">
              {hasPhoto ? (
                <img
                  src={student.photoUrl}
                  alt={`Foto de ${student.name}`}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square flex-col items-center justify-center gap-3 bg-surface px-3 text-center">
                  <StudentAvatar
                    name={student.name}
                    gender={student.gender}
                    size="xl"
                    className="h-24 w-24"
                  />
                  <span className="text-xs text-ink-muted">
                    {faceEnrolled ? 'Ícone · rosto vetorizado' : 'Ícone de perfil'}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3">
              <Badge variant={faceEnrolled ? 'success' : 'warning'}>
                {faceEnrolled ? 'Reconhecimento ok' : 'Sem template'}
              </Badge>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Dados do cadastro</h2>
          </CardHeader>
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Escola
                </dt>
                <dd className="mt-1 text-sm text-ink">{schoolName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Perfil
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {student.gender
                    ? STUDENT_GENDER_LABELS[student.gender]
                    : 'Não informado (ícone pelo nome)'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Matrícula
                </dt>
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
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Nascimento
                </dt>
                <dd className="mt-1 text-sm text-ink">{formatBirthDate(student.birthDate)}</dd>
              </div>
              {student.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Observações
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-ink">{student.notes}</dd>
                </div>
              ) : null}
            </dl>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Avisos deste dependente</p>
            <p className="mt-1 text-sm text-ink-muted">
              Veja a prévia dos avisos de entrada e saída filtrada para {student.name}.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate(`/app/responsavel/notificacoes?filho=${student.id}`)}
          >
            Abrir avisos
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
