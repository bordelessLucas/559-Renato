import { useEffect, useMemo, useState, type FormEvent } from 'react'
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
import {
  listMovementsForProfile,
  movementTypeFromCameraPoint,
  recordMovement,
} from '../../services/movements'
import { getFaceRecognitionProvider } from '../../services/face-recognition'
import type { Movement, MovementType } from '../../types/movement'
import type { Student } from '../../types/student'

export function MovementsPage() {
  const { profile, schoolName } = useAuth()
  const { toast } = useToast()
  const faceProvider = getFaceRecognitionProvider()

  const [movements, setMovements] = useState<Movement[]>([])
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
      const [movementsData, studentsData] = await Promise.all([
        listMovementsForProfile(profile, 120),
        listStudentsForProfile(profile),
      ])
      setMovements(movementsData)
      setStudents(studentsData.filter((s) => s.status === 'ativo'))
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
          : undefined,
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

  const handleSimulateFacial = async () => {
    if (!selectedStudent) {
      toast({ variant: 'error', title: 'Selecione um aluno para simular' })
      return
    }
    setSaving(true)
    try {
      const event = await faceProvider.normalizeEvent({
        schoolId: selectedStudent.schoolId,
        studentId: selectedStudent.id,
        cameraPointKind,
        cameraPointId: `mock-${cameraPointKind}`,
        confidence: 0.93,
      })
      if (event.status !== 'matched' || !event.studentId) {
        toast({ variant: 'warning', title: 'Simulação sem match' })
        return
      }
      const movementType = movementTypeFromCameraPoint(event.cameraPointKind, type)
      const result = await recordMovement({
        schoolId: event.schoolId,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        type: movementType,
        source: 'facial',
        cameraPointId: event.cameraPointId,
        confidence: event.confidence ?? null,
        providerEventId: event.providerEventId ?? '',
      })
      toast({
        variant: result.duplicated ? 'warning' : 'success',
        title: result.duplicated ? 'Evento facial duplicado' : 'Evento facial simulado',
        description: `${selectedStudent.name} · ${movementType} · ${faceProvider.label}`,
      })
      await load()
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Falha na simulação',
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
        description={`Registros de ${schoolName || 'escolas'}. Use registro manual ou simulação facial (sem câmera física).`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="info">{faceProvider.label}</Badge>
        <Badge variant={faceProvider.ready ? 'success' : 'warning'}>
          {faceProvider.ready ? 'Pronto para demo' : 'Bloqueado'}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Registrar manualmente</h2>
          </CardHeader>
          <CardBody>
            <form className="grid gap-3" onSubmit={handleManual}>
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
              <Button type="submit" loading={saving} disabled={!studentId}>
                Registrar
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Simular evento facial</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Usa o contrato FaceRecognitionProvider (mock). Sem hardware.
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            <Select
              label="Aluno reconhecido"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              options={[
                { value: '', label: 'Selecione…' },
                ...students.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
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
            <Button type="button" variant="secondary" loading={saving} onClick={handleSimulateFacial}>
              Simular reconhecimento
            </Button>
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
            description="Registre uma entrada/saída ou simule um evento facial para popular o histórico."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Aluno</TableHeaderCell>
                <TableHeaderCell>Tipo</TableHeaderCell>
                <TableHeaderCell>Origem</TableHeaderCell>
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
