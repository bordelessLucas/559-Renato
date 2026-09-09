import { useEffect, useState, type FormEvent } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
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
import { ALERT_KIND_LABELS, createAlert, listAlertsForProfile } from '../../services/alerts'
import type { SchoolAlert, AlertKind } from '../../types/alert'
import type { Student } from '../../types/student'
import { Timestamp } from 'firebase/firestore'

export function AlertsPage() {
  const { profile, schoolName } = useAuth()
  const { toast } = useToast()
  const [alerts, setAlerts] = useState<SchoolAlert[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [kind, setKind] = useState<AlertKind>('atraso')
  const [message, setMessage] = useState('')

  const load = async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const [alertsData, studentsData] = await Promise.all([
        listAlertsForProfile(profile),
        listStudentsForProfile(profile),
      ])
      setAlerts(alertsData)
      setStudents(studentsData.filter((s) => s.status === 'ativo'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar alertas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [profile])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    const student = students.find((s) => s.id === studentId)
    if (!profile || !student) {
      toast({ variant: 'error', title: 'Selecione um aluno' })
      return
    }
    setSaving(true)
    try {
      await createAlert({
        schoolId: student.schoolId,
        studentId: student.id,
        studentName: student.name,
        kind,
        message: message.trim() || `${ALERT_KIND_LABELS[kind]} registrada em ${schoolName}`,
        status: 'aberto',
        occurredAt: Timestamp.now(),
      })
      toast({ variant: 'success', title: 'Alerta criado' })
      setMessage('')
      await load()
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Não foi possível criar o alerta',
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
        title="Alertas e ocorrências"
        description="Registro manual de atraso, ausência e ocorrência. Regras automáticas por horário entram depois."
      />

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-sm font-semibold text-ink">Novo alerta</h2>
        </CardHeader>
        <CardBody>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleCreate}>
            <Select
              label="Aluno"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              options={[
                { value: '', label: 'Selecione…' },
                ...students.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            <Select
              label="Tipo"
              value={kind}
              onChange={(e) => setKind(e.target.value as AlertKind)}
              options={[
                { value: 'atraso', label: 'Atraso' },
                { value: 'ausencia', label: 'Ausência' },
                { value: 'ocorrencia', label: 'Ocorrência' },
                { value: 'nao_reconhecido', label: 'Não reconhecido' },
                { value: 'revisao_facial', label: 'Revisão facial' },
              ]}
            />
            <div className="sm:col-span-2">
              <Input
                label="Mensagem"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={saving} disabled={!studentId}>
                Registrar alerta
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {alerts.length === 0 ? (
        <EmptyState title="Nenhum alerta" description="Crie um alerta para validar o fluxo." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Aluno</TableHeaderCell>
              <TableHeaderCell>Tipo</TableHeaderCell>
              <TableHeaderCell>Mensagem</TableHeaderCell>
              <TableHeaderCell>Quando</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell className="font-medium text-ink">{alert.studentName}</TableCell>
                <TableCell>
                  <Badge variant="warning">{ALERT_KIND_LABELS[alert.kind]}</Badge>
                </TableCell>
                <TableCell className="text-ink-muted">{alert.message}</TableCell>
                <TableCell className="text-ink-muted">
                  {alert.occurredAt
                    ? alert.occurredAt.toDate().toLocaleString('pt-BR', {
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
  )
}
