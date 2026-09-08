import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import {
  Badge,
  Card,
  CardBody,
  PageSkeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { listStudentsForProfile } from '../../services/students'
import { listMovementsForProfile } from '../../services/movements'
import { deriveDayPresence, formatMovementTime } from '../../services/presence'
import type { DayPresenceRow } from '../../services/presence'

export function AttendancePage() {
  const { profile, schoolName } = useAuth()
  const [rows, setRows] = useState<DayPresenceRow[]>([])
  const [counts, setCounts] = useState({
    presentes: 0,
    semRegistro: 0,
    saidas: 0,
    entradas: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'todos' | 'presente' | 'sem_registro' | 'saiu'>('todos')

  const load = async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const [students, movements] = await Promise.all([
        listStudentsForProfile(profile),
        listMovementsForProfile(profile, 200),
      ])
      const presence = deriveDayPresence({
        students: students
          .filter((s) => s.status === 'ativo')
          .map((s) => ({ id: s.id, name: s.name })),
        movements,
      })
      setRows(presence.rows)
      setCounts(presence.counts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar presença.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [profile])

  const visible = useMemo(
    () => (filter === 'todos' ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  )

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState title="Erro" description={error} onRetry={() => void load()} />

  const statusLabel = {
    presente: 'Presente',
    sem_registro: 'Sem registro',
    saiu: 'Saiu',
  } as const

  return (
    <div>
      <PageHeader
        title="Presença do dia"
        description={`Situação em ${schoolName || 'todas as escolas'}, derivada das movimentações de hoje.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Presentes', value: counts.presentes },
          { label: 'Sem registro', value: counts.semRegistro },
          { label: 'Entradas', value: counts.entradas },
          { label: 'Saídas', value: counts.saidas },
        ].map((item) => (
          <Card key={item.label}>
            <CardBody>
              <p className="text-sm text-ink-muted">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-ink">{item.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ['todos', 'Todos'],
            ['presente', 'Presentes'],
            ['sem_registro', 'Sem registro'],
            ['saiu', 'Saíram'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={
              filter === value
                ? 'rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white'
                : 'rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nenhum aluno neste filtro"
          description="Cadastre alunos ativos ou registre movimentações do dia."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Aluno</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Última entrada</TableHeaderCell>
              <TableHeaderCell>Última saída</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.studentId}>
                <TableCell className="font-medium text-ink">{row.studentName}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      row.status === 'presente'
                        ? 'success'
                        : row.status === 'saiu'
                          ? 'info'
                          : 'warning'
                    }
                  >
                    {statusLabel[row.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-ink-muted">
                  {formatMovementTime(row.lastEntryAt)}
                </TableCell>
                <TableCell className="text-ink-muted">
                  {formatMovementTime(row.lastExitAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
