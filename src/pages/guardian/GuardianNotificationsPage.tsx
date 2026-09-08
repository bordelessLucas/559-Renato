import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { MovementNotificationCard } from '../../components/notifications/MovementNotificationCard'
import {
  Badge,
  Card,
  CardBody,
  PageSkeleton,
  Select,
} from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { RequirePermission } from '../../routes/RequirePermission'
import { listStudentsForGuardianUser } from '../../services/students'
import { isGuardianUser } from '../../lib/permissions'
import {
  listGuardianFeed,
  seedExampleFeed,
  type GuardianFeedItem,
} from '../../lib/guardian-notification-feed'
import type { Student } from '../../types/student'

/**
 * Avisos — o responsável RECEBE notificações (escopo).
 * Exemplos visuais existem só para validar o formato; não misturar com ação operacional.
 */
export function GuardianNotificationsPage() {
  const { profile, schoolName } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterStudent = searchParams.get('filho') || 'todos'

  const [students, setStudents] = useState<Student[]>([])
  const [feed, setFeed] = useState<GuardianFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showFormatHelp, setShowFormatHelp] = useState(false)

  const load = async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const data = await listStudentsForGuardianUser(profile.id)
      setStudents(data)
      const seeded = seedExampleFeed(data.map((s) => ({ id: s.id, name: s.name })))
      setFeed(seeded.length ? seeded : listGuardianFeed())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar avisos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [profile])

  const visible = useMemo(() => {
    if (filterStudent === 'todos') return feed
    return feed.filter((item) => item.studentId === filterStudent)
  }, [feed, filterStudent])

  const selectedName =
    filterStudent === 'todos'
      ? null
      : students.find((s) => s.id === filterStudent)?.name ?? null

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState description={error} onRetry={() => void load()} />

  return (
    <RequirePermission allowed={isGuardianUser(profile)}>
      <div className="space-y-6">
        <PageHeader
          title="Avisos"
          description={`Entrada e saída dos seus dependentes em ${schoolName}. Quando as câmeras e o canal de mensagem estiverem ativos, os avisos reais aparecem aqui.`}
        />

        {students.length === 0 ? (
          <EmptyState
            title="Cadastre um dependente primeiro"
            description="Sem crianças vinculadas, ainda não há avisos para mostrar."
            actionLabel="Ir para meus dependentes"
            onAction={() => navigate('/app/responsavel')}
          />
        ) : (
          <>
            <div className="max-w-sm">
              <Select
                label="Mostrar avisos de"
                value={filterStudent}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'todos') setSearchParams({})
                  else setSearchParams({ filho: value })
                }}
                options={[
                  { value: 'todos', label: 'Todos os dependentes' },
                  ...students.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            </div>

            {visible.length === 0 ? (
              <EmptyState
                title={
                  selectedName
                    ? `Nenhum aviso de ${selectedName} ainda`
                    : 'Nenhum aviso ainda'
                }
                description="Quando houver entrada ou saída reconhecida na escola, o aviso aparece nesta lista."
              />
            ) : (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-ink">Histórico recente</h2>
                  <Badge variant="neutral">Prévia do formato</Badge>
                </div>
                <p className="text-sm text-ink-muted">
                  Itens abaixo ilustram como o aviso chegará. Ainda não são notificações enviadas
                  pelo sistema em produção.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {visible.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-2 px-1">
                        <p className="text-xs font-medium text-ink-muted">
                          {item.studentName} · {item.timeLabel}
                        </p>
                        <Badge variant={item.type === 'entrada' ? 'success' : 'info'}>
                          {item.type === 'entrada' ? 'Entrou' : 'Saiu'}
                        </Badge>
                      </div>
                      <MovementNotificationCard
                        studentName={item.studentName}
                        schoolName={schoolName}
                        type={item.type}
                        timeLabel={item.timeLabel}
                        photoUrl={students.find((s) => s.id === item.studentId)?.photoUrl || undefined}
                        gender={students.find((s) => s.id === item.studentId)?.gender}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <Card>
              <CardBody className="space-y-3">
                <button
                  type="button"
                  className="text-left text-sm font-semibold text-brand-700 hover:text-brand-800"
                  onClick={() => setShowFormatHelp((v) => !v)}
                  aria-expanded={showFormatHelp}
                >
                  {showFormatHelp ? 'Ocultar' : 'Ver'} modelo dos cards de aviso
                </button>
                {showFormatHelp && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MovementNotificationCard
                      studentName={students[0]?.name || 'Dependente'}
                      schoolName={schoolName}
                      type="entrada"
                      timeLabel="07:42"
                      photoUrl={students[0]?.photoUrl || undefined}
                      gender={students[0]?.gender || 'masculino'}
                    />
                    <MovementNotificationCard
                      studentName={students[0]?.name || 'Dependente'}
                      schoolName={schoolName}
                      type="saida"
                      timeLabel="12:15"
                      photoUrl={students[0]?.photoUrl || undefined}
                      gender={students[0]?.gender || 'masculino'}
                    />
                  </div>
                )}
                <p className="text-xs text-ink-subtle">
                  Verde = chegou à escola · Azul = saiu da escola. O envio no celular (WhatsApp ou
                  SMS) será definido com o cliente.
                </p>
              </CardBody>
            </Card>

            <p className="text-sm text-ink-muted">
              <Link to="/app/responsavel" className="font-semibold text-brand-700 hover:text-brand-800">
                ← Voltar aos dependentes
              </Link>
            </p>
          </>
        )}
      </div>
    </RequirePermission>
  )
}
