import { useEffect, useState, type FormEvent } from 'react'
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
import {
  getNotificationProvider,
  listNotificationAttemptsForProfile,
  simulateMovementNotification,
} from '../../services/notifications'
import type { NotificationAttempt } from '../../types/notification'
import type { Student } from '../../types/student'
import type { MovementType } from '../../types/movement'

export function NotificationsPage() {
  const { profile, schoolName } = useAuth()
  const { toast } = useToast()
  const provider = getNotificationProvider()

  const [attempts, setAttempts] = useState<NotificationAttempt[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [type, setType] = useState<MovementType>('entrada')
  const [phone, setPhone] = useState('')

  const load = async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const [attemptsData, studentsData] = await Promise.all([
        listNotificationAttemptsForProfile(profile),
        listStudentsForProfile(profile),
      ])
      setAttempts(attemptsData)
      setStudents(studentsData.filter((s) => s.status === 'ativo'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar notificações.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [profile])

  const handleSimulate = async (event: FormEvent) => {
    event.preventDefault()
    const student = students.find((s) => s.id === studentId)
    if (!student) {
      toast({ variant: 'error', title: 'Selecione um aluno' })
      return
    }
    setSaving(true)
    try {
      const result = await simulateMovementNotification({
        schoolId: student.schoolId,
        studentId: student.id,
        studentName: student.name,
        schoolName: schoolName || 'escola',
        movementType: type,
        recipientPhone: phone.trim() || '11999990000',
      })
      toast({
        variant: result.status === 'sent' ? 'success' : 'warning',
        title:
          result.status === 'sent'
            ? 'Notificação mock enviada'
            : `Status: ${result.status}`,
        description: result.reason,
      })
      await load()
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Falha ao simular',
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
        title="Notificações"
        description="Canal real (WhatsApp/SMS) aguarda definição do cliente. Aqui validamos o fluxo com envio mock."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="info">Provedor: {provider.id}</Badge>
        <Badge variant={provider.ready ? 'success' : 'warning'}>
          {provider.ready ? `Canal demo: ${provider.channel}` : 'Canal pendente'}
        </Badge>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Simular envio</h2>
          </CardHeader>
          <CardBody>
            <form className="grid gap-3" onSubmit={handleSimulate}>
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
                value={type}
                onChange={(e) => setType(e.target.value as MovementType)}
                options={[
                  { value: 'entrada', label: 'Entrada' },
                  { value: 'saida', label: 'Saída' },
                ]}
              />
              <Input
                label="Telefone (mock)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="11999990000"
              />
              <Button type="submit" loading={saving} disabled={!studentId}>
                Enviar notificação mock
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <MovementNotificationCard
            studentName="Ana Silva"
            schoolName={schoolName || 'Escola Demo'}
            type="entrada"
            timeLabel="07:42"
            gender="feminino"
          />
          <MovementNotificationCard
            studentName="Pedro Souza"
            schoolName={schoolName || 'Escola Demo'}
            type="saida"
            timeLabel="12:15"
            gender="masculino"
          />
        </div>
      </div>

      {attempts.length === 0 ? (
        <EmptyState
          title="Nenhuma tentativa"
          description="Simule um envio para popular o histórico."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Mensagem</TableHeaderCell>
              <TableHeaderCell>Canal</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Quando</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attempts.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-md text-ink">{item.message}</TableCell>
                <TableCell className="text-ink-muted">{item.channel}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.status === 'sent'
                        ? 'success'
                        : item.status === 'failed'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-ink-muted">
                  {item.createdAt
                    ? item.createdAt.toDate().toLocaleString('pt-BR', {
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
