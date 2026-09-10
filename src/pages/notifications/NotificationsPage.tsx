import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { MovementNotificationCard } from '../../components/notifications/MovementNotificationCard'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Input,
  PageSkeleton,
  Select,
  Textarea,
  useToast,
} from '../../components/ui'
import { cn } from '../../lib/cn'
import { useAuth } from '../../contexts/AuthContext'
import { listStudentsForProfile } from '../../services/students'
import { listSchoolsForProfile } from '../../services/schools'
import {
  getNotificationProvider,
  listNotificationAttemptsForProfile,
} from '../../services/notifications'
import {
  getTemplateByKind,
  listClassNamesFromStudents,
  listSchoolNoticesForProfile,
  previewNoticeRecipients,
  resolveNoticeAudience,
  sendSchoolNotice,
  SCHOOL_NOTICE_TEMPLATES,
} from '../../services/school-notices'
import type {
  NotificationAttempt,
  NotificationKind,
  NoticeAudienceScope,
  SchoolNotice,
} from '../../types/notification'
import {
  NOTIFICATION_KIND_LABELS,
  composePersonalizedNotice,
} from '../../types/notification'
import type { Student } from '../../types/student'
import type { School } from '../../types/school'

const SCOPE_OPTIONS: Array<{
  id: NoticeAudienceScope
  label: string
  hint: string
}> = [
  { id: 'escola', label: 'Toda a escola', hint: 'Todas as famílias' },
  { id: 'turma', label: 'Uma turma', hint: 'Só aquela turma' },
  { id: 'aluno', label: 'Um aluno', hint: 'Só aquela família' },
]

const STATUS_LABELS: Record<string, string> = {
  sent: 'Enviado',
  failed: 'Falhou',
  queued: 'Na fila',
  skipped: 'Ignorado',
}

export function NotificationsPage() {
  const { profile, schoolName, isGeneralAdmin } = useAuth()
  const { toast } = useToast()
  const provider = getNotificationProvider()

  const [tab, setTab] = useState('enviar')
  const [attempts, setAttempts] = useState<NotificationAttempt[]>([])
  const [notices, setNotices] = useState<SchoolNotice[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [kind, setKind] = useState<NotificationKind>('aviso_geral')
  const [scope, setScope] = useState<NoticeAudienceScope>('escola')
  const [className, setClassName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [title, setTitle] = useState(getTemplateByKind('aviso_geral').defaultTitle)
  const [body, setBody] = useState(getTemplateByKind('aviso_geral').defaultBody)
  const [recipientPreviewCount, setRecipientPreviewCount] = useState(0)
  const [previewLoading, setPreviewLoading] = useState(false)

  const activeSchoolId = isGeneralAdmin ? selectedSchoolId : profile?.schoolId || ''

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === activeSchoolId) ?? null,
    [schools, activeSchoolId],
  )

  const activeSchoolLabel =
    selectedSchool?.tradeName ||
    selectedSchool?.name ||
    (!isGeneralAdmin ? schoolName : '') ||
    'Escola'

  const schoolStudents = useMemo(
    () => (activeSchoolId ? students.filter((s) => s.schoolId === activeSchoolId) : []),
    [students, activeSchoolId],
  )

  const schoolNotices = useMemo(
    () => (activeSchoolId ? notices.filter((n) => n.schoolId === activeSchoolId) : notices),
    [notices, activeSchoolId],
  )

  const schoolAttempts = useMemo(
    () => (activeSchoolId ? attempts.filter((a) => a.schoolId === activeSchoolId) : attempts),
    [attempts, activeSchoolId],
  )

  const schoolMap = useMemo(
    () =>
      Object.fromEntries(
        schools.map((school) => [school.id, school.tradeName || school.name]),
      ),
    [schools],
  )

  const classes = useMemo(() => listClassNamesFromStudents(schoolStudents), [schoolStudents])

  const audience = useMemo(
    () =>
      resolveNoticeAudience({
        students: schoolStudents,
        scope,
        className,
        studentId,
      }),
    [schoolStudents, scope, className, studentId],
  )

  const previewSample = useMemo(() => {
    if (audience[0]) {
      return {
        aluno: audience[0].name,
        turma: audience[0].className,
      }
    }
    return { aluno: 'Nome do aluno', turma: className || 'Turma' }
  }, [audience, className])

  const personalizedPreview = useMemo(
    () =>
      composePersonalizedNotice({
        title: title || 'Sem título',
        body: body || 'Escreva a mensagem ao lado…',
        aluno: previewSample.aluno,
        escola: activeSchoolLabel,
        turma: previewSample.turma,
      }),
    [title, body, previewSample, activeSchoolLabel],
  )

  const load = async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const [attemptsData, studentsData, noticesData, schoolsData] = await Promise.all([
        listNotificationAttemptsForProfile(profile, 100),
        listStudentsForProfile(profile),
        listSchoolNoticesForProfile(profile, 40),
        listSchoolsForProfile(profile),
      ])
      setAttempts(attemptsData)
      setStudents(studentsData.filter((s) => s.status === 'ativo'))
      setNotices(noticesData)
      const activeSchools = schoolsData.filter((school) => school.status === 'ativo')
      setSchools(activeSchools)

      setSelectedSchoolId((current) => {
        if (!isGeneralAdmin && profile.schoolId) return profile.schoolId
        if (isGeneralAdmin && !current && activeSchools.length === 1) return activeSchools[0].id
        return current
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar avisos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [profile])

  useEffect(() => {
    setClassName('')
    setStudentId('')
  }, [activeSchoolId])

  useEffect(() => {
    const template = getTemplateByKind(kind)
    if (kind !== 'custom') {
      setTitle(template.defaultTitle)
      setBody(template.defaultBody)
    }
  }, [kind])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setPreviewLoading(true)
      try {
        const rows = await previewNoticeRecipients(audience)
        if (!cancelled) {
          setRecipientPreviewCount(rows.reduce((acc, row) => acc + row.guardians.length, 0))
        }
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [audience])

  const canSubmit =
    Boolean(activeSchoolId) &&
    Boolean(title.trim() && body.trim()) &&
    audience.length > 0 &&
    (scope !== 'turma' || Boolean(className.trim())) &&
    (scope !== 'aluno' || Boolean(studentId))

  const handleSend = async () => {
    if (!profile || !canSubmit || !activeSchoolId) return
    setSaving(true)
    try {
      const result = await sendSchoolNotice({
        profile,
        schoolId: activeSchoolId,
        schoolName: activeSchoolLabel,
        kind,
        title,
        body,
        scope,
        className,
        studentId,
      })
      setConfirmOpen(false)
      toast({
        variant: 'success',
        title: 'Aviso enviado às famílias',
        description: `${result.recipientCount} responsável${result.recipientCount === 1 ? '' : 'es'} · ${result.studentCount} criança${result.studentCount === 1 ? '' : 's'}`,
      })
      setTab('historico')
      await load()
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Não foi possível enviar',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState title="Erro" description={error} onRetry={() => void load()} />

  const scopeSummary =
    scope === 'escola'
      ? `toda a escola (${activeSchoolLabel})`
      : scope === 'turma'
        ? `turma ${className || '—'} · ${activeSchoolLabel}`
        : `${schoolStudents.find((s) => s.id === studentId)?.name || 'aluno'} · ${activeSchoolLabel}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avisos às famílias"
        description={
          isGeneralAdmin
            ? 'Escolha a escola e escreva em português normal. O sistema coloca sozinho o nome do aluno e da escola em cada mensagem.'
            : 'Escreva em português normal. O sistema coloca sozinho o nome do aluno e da escola em cada mensagem.'
        }
      />

      {isGeneralAdmin && (
        <Card>
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Select
                label="Escola *"
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                placeholder="Selecione a escola…"
                options={schools.map((school) => ({
                  value: school.id,
                  label: school.tradeName || school.name,
                }))}
              />
            </div>
            <p className="pb-2 text-sm text-ink-muted sm:max-w-xs">
              O aviso e o histórico abaixo ficam limitados à escola escolhida.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 border-b border-line">
        {[
          { id: 'enviar', label: 'Novo aviso' },
          { id: 'historico', label: 'Enviados' },
          { id: 'entrada-saida', label: 'Entrada e saída' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
              tab === item.id
                ? 'border-brand-700 text-brand-800'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isGeneralAdmin && !activeSchoolId ? (
        <EmptyState
          title="Selecione a escola"
          description="Como dono do sistema, escolha primeiro para qual escola o aviso será enviado."
        />
      ) : (
        <>
          {tab === 'enviar' && (
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-5">
                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-ink">Que tipo de aviso?</h2>
                  <div className="flex flex-wrap gap-2">
                    {SCHOOL_NOTICE_TEMPLATES.map((template) => {
                      const selected = kind === template.id
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setKind(template.id)}
                          className={cn(
                            'rounded-full border px-3.5 py-2 text-sm transition-colors',
                            selected
                              ? 'border-brand-700 bg-brand-700 text-white'
                              : 'border-line bg-surface text-ink hover:bg-surface-muted',
                          )}
                        >
                          {template.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-sm text-ink-muted">
                    {SCHOOL_NOTICE_TEMPLATES.find((t) => t.id === kind)?.description}
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-ink">Para quem enviar?</h2>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {SCOPE_OPTIONS.map((option) => {
                      const selected = scope === option.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setScope(option.id)}
                          className={cn(
                            'rounded-xl border px-3 py-3 text-left transition-colors',
                            selected
                              ? 'border-brand-600 bg-brand-50'
                              : 'border-line bg-surface hover:bg-surface-muted',
                          )}
                        >
                          <p className="text-sm font-semibold text-ink">{option.label}</p>
                          <p className="mt-1 text-xs text-ink-muted">{option.hint}</p>
                        </button>
                      )
                    })}
                  </div>

                  {scope === 'turma' && (
                    <Select
                      label="Qual turma?"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      options={[
                        {
                          value: '',
                          label: classes.length ? 'Selecione…' : 'Nenhuma turma cadastrada',
                        },
                        ...classes.map((name) => ({ value: name, label: name })),
                      ]}
                    />
                  )}

                  {scope === 'aluno' && (
                    <Select
                      label="Qual aluno?"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      options={[
                        { value: '', label: 'Selecione…' },
                        ...schoolStudents.map((s) => ({
                          value: s.id,
                          label: s.className ? `${s.name} · ${s.className}` : s.name,
                        })),
                      ]}
                    />
                  )}
                </section>

                <section className="space-y-3">
                  <div>
                    <h2 className="text-base font-semibold text-ink">Escreva o aviso</h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      Texto simples. O nome de cada criança entra automaticamente no envio.
                    </p>
                  </div>
                  <Input
                    label="Assunto"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex.: Advertência escolar"
                  />
                  <Textarea
                    label="Mensagem"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={7}
                    placeholder="Ex.: Informamos que seu filho(a) recebeu uma advertência…"
                  />
                </section>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                <Card>
                  <CardHeader>
                    <h2 className="text-sm font-semibold text-ink">Como a família vê</h2>
                    <p className="mt-1 text-xs text-ink-muted">
                      Exemplo com {previewSample.aluno} em {activeSchoolLabel}. Cada responsável
                      recebe a versão do seu filho(a).
                    </p>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="rounded-2xl border border-line bg-surface-muted/70 p-4">
                      <p className="text-sm font-semibold text-ink">{personalizedPreview.title}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
                        {personalizedPreview.body}
                      </p>
                    </div>

                    <div className="space-y-1 text-sm text-ink-muted">
                      <p>
                        <span className="font-medium text-ink">Destino:</span> {scopeSummary}
                      </p>
                      <p>
                        {previewLoading
                          ? 'Contando famílias…'
                          : `${recipientPreviewCount} responsável${recipientPreviewCount === 1 ? '' : 'es'} de ${audience.length} criança${audience.length === 1 ? '' : 's'}`}
                      </p>
                      {!provider.ready && (
                        <p className="text-xs text-warning-700">
                          Envio real ainda não está ativado. Este aviso será registrado como teste.
                        </p>
                      )}
                    </div>

                    <Button
                      fullWidth
                      size="lg"
                      disabled={!canSubmit || recipientPreviewCount === 0}
                      onClick={() => setConfirmOpen(true)}
                    >
                      Revisar e enviar
                    </Button>
                    {audience.length > 0 && recipientPreviewCount === 0 && (
                      <p className="text-xs text-warning-700">
                        Há crianças selecionadas, mas nenhuma tem responsável ativo vinculado.
                      </p>
                    )}
                  </CardBody>
                </Card>
              </aside>
            </div>
          )}

          {tab === 'historico' && (
            <div className="space-y-6">
              <section className="space-y-3">
                <h2 className="text-base font-semibold text-ink">
                  Avisos enviados{activeSchoolId ? ` · ${activeSchoolLabel}` : ''}
                </h2>
                {schoolNotices.length === 0 ? (
                  <EmptyState
                    title="Nenhum aviso enviado ainda"
                    description="Use a aba Novo aviso para comunicar as famílias."
                  />
                ) : (
                  <div className="grid gap-3">
                    {schoolNotices.map((notice) => (
                      <Card key={notice.id}>
                        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="brand">
                                {NOTIFICATION_KIND_LABELS[notice.kind] || notice.kind}
                              </Badge>
                              <Badge variant="neutral">
                                {notice.scope === 'escola'
                                  ? 'Escola inteira'
                                  : notice.scope === 'turma'
                                    ? `Turma ${notice.className}`
                                    : notice.studentName || 'Aluno'}
                              </Badge>
                              {isGeneralAdmin && (
                                <Badge variant="info">
                                  {schoolMap[notice.schoolId] || 'Escola'}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-2 font-semibold text-ink">{notice.title}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{notice.body}</p>
                            <p className="mt-2 text-xs text-ink-subtle">
                              {notice.recipientCount} responsável
                              {notice.recipientCount === 1 ? '' : 'es'} de {notice.studentCount}{' '}
                              criança{notice.studentCount === 1 ? '' : 's'}
                              {notice.createdByName ? ` · ${notice.createdByName}` : ''}
                            </p>
                          </div>
                          <p className="shrink-0 text-xs text-ink-muted">
                            {notice.createdAt
                              ? notice.createdAt.toDate().toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </p>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              {schoolAttempts.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-ink">Status de entrega</h2>
                  <div className="space-y-2">
                    {schoolAttempts.slice(0, 30).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-line px-4 py-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-ink">
                            {item.studentName || 'Aluno'} → {item.recipientName || 'Responsável'}
                          </p>
                          <Badge
                            variant={
                              item.status === 'sent'
                                ? 'success'
                                : item.status === 'failed'
                                  ? 'danger'
                                  : 'warning'
                            }
                          >
                            {STATUS_LABELS[item.status] || item.status}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-ink-muted">{item.message}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === 'entrada-saida' && (
            <div className="space-y-4">
              <p className="text-sm text-ink-muted">
                Assim ficam os avisos automáticos de portaria quando o reconhecimento facial
                estiver ativo.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <MovementNotificationCard
                  studentName="Ana Silva"
                  schoolName={activeSchoolLabel || 'Escola Demo'}
                  type="entrada"
                  timeLabel="07:42"
                  gender="feminino"
                />
                <MovementNotificationCard
                  studentName="Pedro Souza"
                  schoolName={activeSchoolLabel || 'Escola Demo'}
                  type="saida"
                  timeLabel="12:15"
                  gender="masculino"
                />
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Enviar aviso às famílias?"
        description={`Vai para ${recipientPreviewCount} responsável${recipientPreviewCount === 1 ? '' : 'es'} de ${audience.length} criança${audience.length === 1 ? '' : 's'} (${scopeSummary}). Cada um recebe o aviso com o nome do próprio filho(a).`}
        confirmLabel="Enviar agora"
        loading={saving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleSend()}
      />
    </div>
  )
}
