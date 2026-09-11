import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { useFilteredSearch } from '../../components/forms/ListToolbar'
import {
  Badge,
  Card,
  CardBody,
  Input,
  PageSkeleton,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { listStudentsForProfile } from '../../services/students'
import { listMovementsForProfileInRange } from '../../services/movements'
import {
  deriveDayPresence,
  derivePresenceRange,
  formatMovementTime,
  formatPresenceDay,
  parseDateInputValue,
  startOfLocalDay,
  toDateInputValue,
  type DayPresenceRow,
} from '../../services/presence'

type ViewMode = 'dia' | 'periodo'
type StatusFilter = 'todos' | 'presente' | 'saiu'

function defaultFromDate() {
  const d = startOfLocalDay()
  d.setDate(d.getDate() - 6)
  return d
}

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
  const [mode, setMode] = useState<ViewMode>('dia')
  const [filter, setFilter] = useState<StatusFilter>('todos')
  const [search, setSearch] = useState('')
  const [dayValue, setDayValue] = useState(() => toDateInputValue(new Date()))
  const [fromValue, setFromValue] = useState(() => toDateInputValue(defaultFromDate()))
  const [toValue, setToValue] = useState(() => toDateInputValue(new Date()))

  const debouncedSearch = useFilteredSearch(search)

  const load = async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const students = (await listStudentsForProfile(profile))
        .filter((s) => s.status === 'ativo')
        .map((s) => ({
          id: s.id,
          name: s.name,
          enrollmentCode: s.enrollmentCode || '',
        }))

      if (mode === 'dia') {
        const day = parseDateInputValue(dayValue)
        const movements = await listMovementsForProfileInRange(profile, day, day)
        const presence = deriveDayPresence({
          students,
          movements,
          day,
          onlyWithEntry: true,
        })
        setRows(presence.rows)
        setCounts(presence.counts)
      } else {
        let from = parseDateInputValue(fromValue)
        let to = parseDateInputValue(toValue)
        if (from > to) {
          const swap = from
          from = to
          to = swap
        }
        const movements = await listMovementsForProfileInRange(profile, from, to)
        const presence = derivePresenceRange({ students, movements, from, to })
        setRows(presence.rows)
        setCounts(presence.counts)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar presença.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [profile, mode, dayValue, fromValue, toValue])

  const visible = useMemo(() => {
    return rows.filter((row) => {
      if (filter !== 'todos' && row.status !== filter) return false
      if (!debouncedSearch) return true
      const haystack = `${row.studentName} ${row.enrollmentCode}`.toLowerCase()
      return haystack.includes(debouncedSearch)
    })
  }, [rows, filter, debouncedSearch])

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState title="Erro" description={error} onRetry={() => void load()} />

  const statusLabel = {
    presente: 'Presente',
    saiu: 'Saiu',
  } as const

  const isToday = dayValue === toDateInputValue(new Date())
  const description =
    mode === 'dia'
      ? isToday
        ? `Quem já entrou hoje em ${schoolName || 'todas as escolas'}.`
        : `Quem entrou em ${formatPresenceDay(parseDateInputValue(dayValue))} — ${schoolName || 'todas as escolas'}.`
      : `Presenças de ${formatPresenceDay(parseDateInputValue(fromValue))} a ${formatPresenceDay(parseDateInputValue(toValue))} — ${schoolName || 'todas as escolas'}.`

  return (
    <div>
      <PageHeader title="Presença" description={description} />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['dia', 'Por dia'],
            ['periodo', 'Por período'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value)
              setFilter('todos')
            }}
            className={
              mode === value
                ? 'rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white'
                : 'rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted'
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <SearchInput
            label="Buscar aluno"
            placeholder="Nome ou matrícula..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {mode === 'dia' ? (
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
            <div className="w-full sm:w-44">
              <Input
                type="date"
                label="Dia"
                value={dayValue}
                max={toDateInputValue(new Date())}
                onChange={(event) => setDayValue(event.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setDayValue(toDateInputValue(new Date()))}
              className="h-11 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink-muted hover:bg-surface-muted"
            >
              Hoje
            </button>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
            <div className="w-full sm:w-44">
              <Input
                type="date"
                label="De"
                value={fromValue}
                max={toValue}
                onChange={(event) => setFromValue(event.target.value)}
              />
            </div>
            <div className="w-full sm:w-44">
              <Input
                type="date"
                label="Até"
                value={toValue}
                min={fromValue}
                max={toDateInputValue(new Date())}
                onChange={(event) => setToValue(event.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Presentes', value: counts.presentes },
          { label: 'Saíram', value: rows.filter((r) => r.status === 'saiu').length },
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
          title="Nenhuma presença encontrada"
          description={
            debouncedSearch
              ? 'Nenhum aluno com esse nome ou matrícula no período.'
              : 'Só entram na lista alunos que já registraram entrada no período escolhido.'
          }
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              {mode === 'periodo' && <TableHeaderCell>Data</TableHeaderCell>}
              <TableHeaderCell>Aluno</TableHeaderCell>
              <TableHeaderCell>Matrícula</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Última entrada</TableHeaderCell>
              <TableHeaderCell>Última saída</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={`${toDateInputValue(row.day)}:${row.studentId}`}>
                {mode === 'periodo' && (
                  <TableCell className="text-ink-muted">{formatPresenceDay(row.day)}</TableCell>
                )}
                <TableCell className="font-medium text-ink">{row.studentName}</TableCell>
                <TableCell className="text-ink-muted">{row.enrollmentCode || '—'}</TableCell>
                <TableCell>
                  <Badge variant={row.status === 'presente' ? 'success' : 'info'}>
                    {statusLabel[row.status === 'saiu' ? 'saiu' : 'presente']}
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
