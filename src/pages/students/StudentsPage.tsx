import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { ListToolbar, useClientPagination, useFilteredSearch } from '../../components/forms/ListToolbar'
import {
  Button,
  PageSkeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  ConfirmDialog,
  Select,
  useToast,
} from '../../components/ui'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { listStudentsForProfile, setStudentStatus } from '../../services/students'
import { listSchoolsForProfile } from '../../services/schools'
import { listGuardiansForProfile } from '../../services/guardians'
import type { Student } from '../../types/student'
import type { School } from '../../types/school'
import type { Guardian } from '../../types/guardian'
import { STUDENT_SHIFT_LABELS, type EntityStatus, type StudentShift } from '../../types/common'
import { canAccessSchoolScoped } from '../../lib/permissions'

export function StudentsPage() {
  const { profile, canManageStudents, isGeneralAdmin } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [students, setStudents] = useState<Student[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<EntityStatus | 'todos'>('todos')
  const [schoolId, setSchoolId] = useState<string | 'todos'>('todos')
  const [shift, setShift] = useState<StudentShift | 'todos'>('todos')
  const [pending, setPending] = useState<Student | null>(null)
  const [saving, setSaving] = useState(false)

  const debouncedSearch = useFilteredSearch(search)
  const schoolMap = useMemo(
    () => Object.fromEntries(schools.map((school) => [school.id, school.tradeName || school.name])),
    [schools],
  )
  const guardianMap = useMemo(
    () => Object.fromEntries(guardians.map((guardian) => [guardian.id, guardian.name])),
    [guardians],
  )

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [studentsData, schoolsData, guardiansData] = await Promise.all([
        listStudentsForProfile(profile!),
        listSchoolsForProfile(profile!),
        listGuardiansForProfile(profile!),
      ])
      setStudents(studentsData)
      setSchools(schoolsData)
      setGuardians(guardiansData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar alunos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!profile) return
    void load()
  }, [profile])

  const filtered = useMemo(() => {
    return students.filter((student) => {
      if (!canAccessSchoolScoped(profile, student.schoolId)) return false
      if (status !== 'todos' && student.status !== status) return false
      if (schoolId !== 'todos' && student.schoolId !== schoolId) return false
      if (shift !== 'todos' && student.shift !== shift) return false
      if (!debouncedSearch) return true
      const guardianNames = student.guardianIds
        .map((id) => guardianMap[id] || '')
        .join(' ')
      const haystack = `${student.name} ${student.enrollmentCode} ${student.className} ${guardianNames}`.toLowerCase()
      return haystack.includes(debouncedSearch)
    })
  }, [students, status, schoolId, shift, debouncedSearch, profile, guardianMap])

  const { pageItems, PaginationBar } = useClientPagination(filtered)

  const toggleStatus = async () => {
    if (!pending || !canManageStudents) return
    setSaving(true)
    try {
      const nextStatus: EntityStatus = pending.status === 'ativo' ? 'inativo' : 'ativo'
      await setStudentStatus(pending.id, nextStatus)
      toast({ variant: 'success', title: `Aluno ${nextStatus === 'ativo' ? 'ativado' : 'inativado'}` })
      setPending(null)
      await load()
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Não foi possível alterar o status',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (error) return <ErrorState description={error} onRetry={load} />

  return (
    <div>
      <PageHeader
        title="Alunos"
        description={
          canManageStudents
            ? 'Cadastre, consulte e atualize alunos por escola, turma e responsáveis.'
            : 'Consulte os alunos da sua escola para identificar quem está na entrada e na saída.'
        }
        action={
          canManageStudents ? (
            <Button onClick={() => navigate('/app/alunos/novo')}>+ Novo aluno</Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, matrícula, turma ou responsável..."
        status={status}
        onStatusChange={setStatus}
        showSchoolFilter={isGeneralAdmin}
        schoolId={schoolId}
        onSchoolChange={setSchoolId}
        schoolOptions={schools.map((school) => ({
          value: school.id,
          label: school.tradeName || school.name,
        }))}
        extra={
          <div className="w-full sm:w-44">
            <Select
              label="Turno"
              value={shift}
              onChange={(event) => setShift(event.target.value as StudentShift | 'todos')}
              options={[
                { value: 'todos', label: 'Todos' },
                ...Object.entries(STUDENT_SHIFT_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
          </div>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum aluno encontrado"
          description={
            students.length === 0
              ? canManageStudents
                ? 'Cadastre o primeiro aluno para começar.'
                : 'Ainda não há alunos cadastrados nesta escola.'
              : 'Ajuste os filtros ou a busca para ver resultados.'
          }
          actionLabel={canManageStudents && students.length === 0 ? 'Cadastrar aluno' : undefined}
          onAction={
            canManageStudents && students.length === 0
              ? () => navigate('/app/alunos/novo')
              : undefined
          }
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Aluno</TableHeaderCell>
                <TableHeaderCell>Matrícula</TableHeaderCell>
                <TableHeaderCell>Turma</TableHeaderCell>
                <TableHeaderCell>Turno</TableHeaderCell>
                <TableHeaderCell>Escola</TableHeaderCell>
                <TableHeaderCell>Responsáveis</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Ações</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageItems.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] font-semibold text-ink-subtle">
                            {student.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <p className="font-medium">{student.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>{student.enrollmentCode || '—'}</TableCell>
                  <TableCell>{student.className || '—'}</TableCell>
                  <TableCell>{student.shift ? STUDENT_SHIFT_LABELS[student.shift] : '—'}</TableCell>
                  <TableCell>{schoolMap[student.schoolId] || '—'}</TableCell>
                  <TableCell>
                    {student.guardianIds.length === 0
                      ? '—'
                      : student.guardianIds
                          .map((id) => guardianMap[id] || 'Responsável')
                          .join(', ')}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={student.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/app/alunos/${student.id}`}
                        className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                      >
                        Ver
                      </Link>
                      {canManageStudents && (
                        <>
                          <Link
                            to={`/app/alunos/${student.id}/editar`}
                            className="text-sm font-semibold text-ink-muted hover:text-ink"
                          >
                            Editar
                          </Link>
                          <button
                            type="button"
                            className="text-sm font-semibold text-ink-muted hover:text-ink"
                            onClick={() => setPending(student)}
                          >
                            {student.status === 'ativo' ? 'Inativar' : 'Ativar'}
                          </button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {PaginationBar}
        </>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.status === 'ativo' ? 'Inativar aluno?' : 'Ativar aluno?'}
        description="Confirme a alteração de status deste aluno."
        confirmLabel="Confirmar"
        variant={pending?.status === 'ativo' ? 'danger' : 'primary'}
        loading={saving}
        onCancel={() => setPending(null)}
        onConfirm={toggleStatus}
      />
    </div>
  )
}
