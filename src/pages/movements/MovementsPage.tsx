import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  PageSkeleton,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  useToast,
} from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { listStudentsForProfile } from '../../services/students'
import { listMovementsForProfile, recordMovement } from '../../services/movements'
import { listAlertsForProfile, ALERT_KIND_LABELS } from '../../services/alerts'
import {
  getFaceRecognitionProvider,
  runFacialIdentifyPipeline,
} from '../../services/face-recognition'
import type { Movement, MovementType } from '../../types/movement'
import type { Student } from '../../types/student'
import type { SchoolAlert } from '../../types/alert'

export function MovementsPage() {
  const { profile, schoolName } = useAuth()
  const { toast } = useToast()
  const faceProvider = getFaceRecognitionProvider()

  const [movements, setMovements] = useState<Movement[]>([])
  const [alerts, setAlerts] = useState<SchoolAlert[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [studentId, setStudentId] = useState('')
  const [type, setType] = useState<MovementType>('entrada')
  const [cameraPointKind, setCameraPointKind] = useState<'entrada' | 'saida' | 'ambos'>('entrada')
  const [dayOnly, setDayOnly] = useState(true)

  const load = async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const [movementsData, studentsData, alertsData] = await Promise.all([
        listMovementsForProfile(profile, 120),
        listStudentsForProfile(profile),
        listAlertsForProfile(profile, 40),
      ])
      setMovements(movementsData)
      setStudents(studentsData.filter((s) => s.status === 'ativo'))
      setAlerts(
        alertsData.filter(
          (a) =>
            a.status === 'aberto' &&
            (a.kind === 'nao_reconhecido' || a.kind === 'revisao_facial'),
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar movimentações.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [profile])

  const visibleMovements = useMemo(() => {
    if (!dayOnly) return movements
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return movements.filter((m) => {
      const at = m.occurredAt?.toDate()
      return at && at >= start
    })
  }, [movements, dayOnly])

  const selectedStudent = students.find((s) => s.id === studentId)
  const withoutFace = students.filter((s) => !s.faceEnrolled).length

  const handleManual = async (event: FormEvent) => {
    event.preventDefault()
    if (!profile || !selectedStudent) {
      toast({ variant: 'error', title: 'Selecione um aluno' })
      return
    }
    setSaving(true)
    try {
      const result = await recordMovement({
        schoolId: selectedStudent.schoolId,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        type,
        source: 'manual',
        cameraPointId: `manual-${type}`,
        confidence: null,
        providerEventId: '',
      })
      toast({
        variant: result.duplicated ? 'warning' : 'success',
        title: result.duplicated ? 'Movimentação duplicada ignorada' : 'Movimentação registrada',
        description: result.duplicated
          ? 'Já existe registro recente do mesmo tipo para este aluno.'
          : 'Use o manual quando o facial falhar — assim a família ainda pode ser avisada no fluxo operacional.',
      })
      await load()
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Não foi possível registrar',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  const runIdentifyDemo = async (forceNoMatch: boolean) => {
    if (!selectedStudent) {
      toast({ variant: 'error', title: 'Selecione um aluno para simular o frame' })
      return
    }
    setSaving(true)
    try {
      const result = await runFacialIdentifyPipeline({
        schoolId: selectedStudent.schoolId,
        schoolName: schoolName || 'Escola',
        cameraPointId: `mock-${cameraPointKind}`,
        cameraPointKind,
        asStudentId: selectedStudent.id,
        forceNoMatch,
        fallbackMovementType: type,
        studentNameFallback: selectedStudent.name,
      })

      const variant = result.check.allowed
        ? result.duplicated
          ? 'warning'
          : 'success'
        : 'warning'

      toast({
        variant,
        title: result.check.allowed
          ? 'SIM — liberação autorizada'
          : result.check.outcome === 'review'
            ? 'REVISÃO — não liberar'
            : 'NÃO — negado',
        description: `${result.message} · allowed=${result.check.allowed}`,
      })
      await load()
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Falha no identify',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState title="Erro" description={error} onRetry={() => void load()} />

  return (
    <div>
      <PageHeader
        title="Entrada e saída"
        description={`Match por embedding (sem guardar foto). ${schoolName || 'Escolas'}.`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="info">{faceProvider.label}</Badge>
        <Badge variant={faceProvider.ready ? 'success' : 'warning'}>
          {faceProvider.ready ? 'Pipeline pronto (mock)' : 'Bloqueado'}
        </Badge>
        {withoutFace > 0 && (
          <Badge variant="warning">
            {withoutFace} aluno{withoutFace > 1 ? 's' : ''} sem template
          </Badge>
        )}
      </div>

      {alerts.length > 0 && (
        <Card className="mb-4 border-warning-600/30">
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Fila: não reconhecidos / revisão</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Sem match automático não enviamos aviso aos pais. Confirme manualmente abaixo para não
              deixar a família no escuro.
            </p>
          </CardHeader>
          <CardBody className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex flex-col gap-1 rounded-lg border border-line bg-surface-muted px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {ALERT_KIND_LABELS[alert.kind]} · {alert.studentName || '—'}
                  </p>
                  <p className="text-xs text-ink-muted">{alert.message}</p>
                </div>
                <Link
                  to="/app/alertas"
                  className="text-xs font-semibold text-brand-700 hover:text-brand-800"
                >
                  Ver alertas →
                </Link>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Registrar manualmente (fallback)</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Sempre disponível quando o facial falhar — evita silêncio aos responsáveis.
            </p>
          </CardHeader>
          <CardBody>
            <form className="grid gap-3" onSubmit={handleManual}>
              <Select
                label="Aluno"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                options={[
                  { value: '', label: 'Selecione…' },
                  ...students.map((s) => ({
                    value: s.id,
                    label: s.faceEnrolled ? s.name : `${s.name} (sem template)`,
                  })),
                ]}
              />
              <Select
                label="Tipo"
                value={type}
                onChange={(e) => setType(e.target.value as MovementType)}
                options={[
                  { value: 'entrada', label: 'Entrada' },
                  { value: 'saida', label: 'Saída' },
                ]}
              />
              <Button type="submit" loading={saving} disabled={!studentId}>
                Registrar
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Simular identify por vetor</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Gera sonda mock do aluno, compara com a galeria de embeddings e só notifica em match.
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            <Select
              label="Aluno (frame simulado)"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              options={[
                { value: '', label: 'Selecione…' },
                ...students.map((s) => ({
                  value: s.id,
                  label: s.faceEnrolled ? s.name : `${s.name} (sem template)`,
                })),
              ]}
            />
            {selectedStudent && !selectedStudent.faceEnrolled && (
              <p className="rounded-lg border border-warning-600/20 bg-warning-50 px-3 py-2 text-xs text-warning-700">
                Este aluno não tem template. O identify vai abrir alerta — cadastre o rosto ou use
                o registro manual.
              </p>
            )}
            <Select
              label="Ponto de câmera"
              value={cameraPointKind}
              onChange={(e) =>
                setCameraPointKind(e.target.value as 'entrada' | 'saida' | 'ambos')
              }
              options={[
                { value: 'entrada', label: 'Portão de entrada' },
                { value: 'saida', label: 'Portão de saída' },
                { value: 'ambos', label: 'Ponto misto (usa tipo manual)' },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                loading={saving}
                onClick={() => void runIdentifyDemo(false)}
              >
                Simular match
              </Button>
              <Button
                type="button"
                variant="outline"
                loading={saving}
                onClick={() => void runIdentifyDemo(true)}
              >
                Simular sem match
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Histórico</h2>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={dayOnly}
              onChange={(e) => setDayOnly(e.target.checked)}
            />
            Somente hoje
          </label>
        </div>

        {visibleMovements.length === 0 ? (
          <EmptyState
            title="Nenhuma movimentação"
            description="Registre manualmente ou simule um identify por vetor."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Aluno</TableHeaderCell>
                <TableHeaderCell>Tipo</TableHeaderCell>
                <TableHeaderCell>Origem</TableHeaderCell>
                <TableHeaderCell>Confiança</TableHeaderCell>
                <TableHeaderCell>Horário</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleMovements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium text-ink">{m.studentName}</TableCell>
                  <TableCell>
                    <Badge variant={m.type === 'entrada' ? 'success' : 'info'}>
                      {m.type === 'entrada' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-ink-muted">{m.source}</TableCell>
                  <TableCell className="text-ink-muted">
                    {m.confidence != null ? `${(m.confidence * 100).toFixed(0)}%` : '—'}
                  </TableCell>
                  <TableCell className="text-ink-muted">
                    {m.occurredAt
                      ? m.occurredAt.toDate().toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
