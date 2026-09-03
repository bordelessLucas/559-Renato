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
  useToast,
} from '../../components/ui'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { listGuardiansForProfile, setGuardianStatus } from '../../services/guardians'
import { listSchoolsForProfile } from '../../services/schools'
import type { Guardian } from '../../types/guardian'
import type { School } from '../../types/school'
import { GUARDIAN_LINK_LABELS, type EntityStatus } from '../../types/common'
import { canAccessSchoolScoped } from '../../lib/permissions'

export function GuardiansPage() {
  const { profile, canManageGuardians, isGeneralAdmin } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<EntityStatus | 'todos'>('todos')
  const [schoolId, setSchoolId] = useState<string | 'todos'>('todos')
  const [pending, setPending] = useState<Guardian | null>(null)
  const [saving, setSaving] = useState(false)

  const debouncedSearch = useFilteredSearch(search)
  const schoolMap = useMemo(
    () => Object.fromEntries(schools.map((school) => [school.id, school.tradeName || school.name])),
    [schools],
  )

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [guardiansData, schoolsData] = await Promise.all([
        listGuardiansForProfile(profile!),
        listSchoolsForProfile(profile!),
      ])
      setGuardians(guardiansData)
      setSchools(schoolsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar responsáveis.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!profile) return
    void load()
  }, [profile])

  const filtered = useMemo(() => {
    return guardians.filter((guardian) => {
      if (!canAccessSchoolScoped(profile, guardian.schoolId)) return false
      if (status !== 'todos' && guardian.status !== status) return false
      if (schoolId !== 'todos' && guardian.schoolId !== schoolId) return false
      if (!debouncedSearch) return true
      const haystack = `${guardian.name} ${guardian.email} ${guardian.phonePrimary}`.toLowerCase()
      return haystack.includes(debouncedSearch)
    })
  }, [guardians, status, schoolId, debouncedSearch, profile])

  const { pageItems, PaginationBar } = useClientPagination(filtered)

  const toggleStatus = async () => {
    if (!pending || !canManageGuardians) return
    setSaving(true)
    try {
      const nextStatus: EntityStatus = pending.status === 'ativo' ? 'inativo' : 'ativo'
      await setGuardianStatus(pending.id, nextStatus)
      toast({ variant: 'success', title: `Responsável ${nextStatus === 'ativo' ? 'ativado' : 'inativado'}` })
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
        title="Responsáveis"
        description={
          isGeneralAdmin
            ? 'Gerencie os responsáveis cadastrados nas escolas.'
            : 'Gerencie os responsáveis da sua escola.'
        }
        action={
          canManageGuardians ? (
            <Button onClick={() => navigate('/app/responsaveis/novo')}>+ Novo responsável</Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, e-mail ou telefone..."
        status={status}
        onStatusChange={setStatus}
        showSchoolFilter={isGeneralAdmin}
        schoolId={schoolId}
        onSchoolChange={setSchoolId}
        schoolOptions={schools.map((school) => ({
          value: school.id,
          label: school.tradeName || school.name,
        }))}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum responsável encontrado"
          description={
            guardians.length === 0
              ? 'Cadastre o primeiro responsável para começar.'
              : 'Ajuste os filtros ou a busca para ver resultados.'
          }
          actionLabel={canManageGuardians && guardians.length === 0 ? 'Cadastrar responsável' : undefined}
          onAction={
            canManageGuardians && guardians.length === 0
              ? () => navigate('/app/responsaveis/novo')
              : undefined
          }
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Nome</TableHeaderCell>
                <TableHeaderCell>Vínculo</TableHeaderCell>
                <TableHeaderCell>Escola</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Ações</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageItems.map((guardian) => (
                <TableRow key={guardian.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{guardian.name}</p>
                      <p className="text-xs text-ink-muted">{guardian.phonePrimary || guardian.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{GUARDIAN_LINK_LABELS[guardian.linkType]}</TableCell>
                  <TableCell>{schoolMap[guardian.schoolId] || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={guardian.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/app/responsaveis/${guardian.id}`}
                        className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                      >
                        Ver
                      </Link>
                      {canManageGuardians && (
                        <>
                          <Link
                            to={`/app/responsaveis/${guardian.id}/editar`}
                            className="text-sm font-semibold text-ink-muted hover:text-ink"
                          >
                            Editar
                          </Link>
                          <button
                            type="button"
                            className="text-sm font-semibold text-ink-muted hover:text-ink"
                            onClick={() => setPending(guardian)}
                          >
                            {guardian.status === 'ativo' ? 'Inativar' : 'Ativar'}
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
        title={pending?.status === 'ativo' ? 'Inativar responsável?' : 'Ativar responsável?'}
        description="Confirme a alteração de status deste responsável."
        confirmLabel="Confirmar"
        variant={pending?.status === 'ativo' ? 'danger' : 'primary'}
        loading={saving}
        onCancel={() => setPending(null)}
        onConfirm={toggleStatus}
      />
    </div>
  )
}
