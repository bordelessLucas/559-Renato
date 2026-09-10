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
  Tabs,
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
import {
  listGuardianNoticesForUser,
  markGuardianNoticeRead,
} from '../../services/school-notices'
import { NOTIFICATION_KIND_LABELS, type GuardianNotice } from '../../types/notification'
import type { Student } from '../../types/student'
import { cn } from '../../lib/cn'

/**
 * Avisos — o responsável RECEBE (entrada/saída + comunicados da escola).
 */
export function GuardianNotificationsPage() {
  const { profile, schoolName } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterStudent = searchParams.get('filho') || 'todos'

  const [tab, setTab] = useState('escola')
  const [students, setStudents] = useState<Student[]>([])
  const [feed, setFeed] = useState<GuardianFeedItem[]>([])
  const [schoolNotices, setSchoolNotices] = useState<GuardianNotice[]>([])
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
      const inbox = await listGuardianNoticesForUser(profile.id)
      setSchoolNotices(inbox)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar avisos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [profile])

  const visibleFeed = useMemo(() => {
    if (filterStudent === 'todos') return feed
    return feed.filter((item) => item.studentId === filterStudent)
  }, [feed, filterStudent])

  const visibleSchool = useMemo(() => {
    if (filterStudent === 'todos') return schoolNotices
    return schoolNotices.filter((item) => item.studentId === filterStudent)
  }, [schoolNotices, filterStudent])

  const selectedName =
    filterStudent === 'todos'
      ? null
      : students.find((s) => s.id === filterStudent)?.name ?? null

  const unreadCount = schoolNotices.filter((n) => !n.read).length

  const openNotice = async (notice: GuardianNotice) => {
    if (!notice.read) {
      try {
        await markGuardianNoticeRead(notice.id)
        setSchoolNotices((current) =>
          current.map((item) => (item.id === notice.id ? { ...item, read: true } : item)),
        )
      } catch {
        // leitura local mesmo se o update falhar
      }
    }
  }

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState description={error} onRetry={() => void load()} />

  return (
    <RequirePermission allowed={isGuardianUser(profile)}>
      <div className="space-y-6">
        <PageHeader
          title="Avisos"
          description={`Comunicados da ${schoolName} e prévia de entrada/saída dos seus dependentes.`}
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

            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                {
                  id: 'escola',
                  label: unreadCount ? `Da escola (${unreadCount})` : 'Da escola',
                  content: (
                    <div className="space-y-3">
                      {visibleSchool.length === 0 ? (
                        <EmptyState
                          title={
                            selectedName
                              ? `Nenhum comunicado sobre ${selectedName}`
                              : 'Nenhum comunicado da escola ainda'
                          }
                          description="Advertências, lembretes e avisos gerais enviados pela escola aparecem aqui."
                        />
                      ) : (
                        visibleSchool.map((notice) => (
                          <button
                            key={notice.id}
                            type="button"
                            onClick={() => void openNotice(notice)}
                            className={cn(
                              'w-full rounded-2xl border px-4 py-4 text-left transition-colors',
                              notice.read
                                ? 'border-line bg-surface hover:bg-surface-muted'
                                : 'border-brand-200 bg-brand-50/60 hover:bg-brand-50',
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={notice.read ? 'neutral' : 'brand'}>
                                {NOTIFICATION_KIND_LABELS[notice.kind] || notice.kind}
                              </Badge>
                              {!notice.read && <Badge variant="warning">Novo</Badge>}
                              <span className="text-xs text-ink-muted">{notice.studentName}</span>
                            </div>
                            <p className="mt-2 font-semibold text-ink">{notice.title}</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                              {notice.body}
                            </p>
                            <p className="mt-2 text-xs text-ink-subtle">
                              {notice.createdAt
                                ? notice.createdAt.toDate().toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  ),
                },
                {
                  id: 'portaria',
                  label: 'Entrada e saída',
                  content: (
                    <div className="space-y-4">
                      {visibleFeed.length === 0 ? (
                        <EmptyState
                          title={
                            selectedName
                              ? `Nenhum aviso de ${selectedName} ainda`
                              : 'Nenhum aviso ainda'
                          }
                          description="Quando houver entrada ou saída reconhecida na escola, o aviso aparece nesta lista."
                        />
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-semibold text-ink">Histórico recente</h2>
                            <Badge variant="neutral">Exemplo</Badge>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            {visibleFeed.map((item) => (
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
                                  photoUrl={
                                    students.find((s) => s.id === item.studentId)?.photoUrl ||
                                    undefined
                                  }
                                  gender={students.find((s) => s.id === item.studentId)?.gender}
                                />
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      <Card>
                        <CardBody className="space-y-3">
                          <button
                            type="button"
                            className="text-left text-sm font-semibold text-brand-700 hover:text-brand-800"
                            onClick={() => setShowFormatHelp((v) => !v)}
                            aria-expanded={showFormatHelp}
                          >
                            {showFormatHelp ? 'Ocultar' : 'Ver'} exemplo de aviso de entrada e saída
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
                        </CardBody>
                      </Card>
                    </div>
                  ),
                },
              ]}
            />

            <p className="text-sm text-ink-muted">
              <Link
                to="/app/responsavel"
                className="font-semibold text-brand-700 hover:text-brand-800"
              >
                ← Voltar aos dependentes
              </Link>
            </p>
          </>
        )}
      </div>
    </RequirePermission>
  )
}
