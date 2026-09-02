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
import { listSchoolsForProfile, setSchoolStatus } from '../../services/schools'
import type { School } from '../../types/school'
import type { EntityStatus } from '../../types/common'
import { canAccessSchoolScoped } from '../../lib/permissions'

export function SchoolsPage() {
  const { profile, canManageSchools } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<EntityStatus | 'todos'>('todos')
  const [pendingStatus, setPendingStatus] = useState<School | null>(null)
  const [saving, setSaving] = useState(false)

  const debouncedSearch = useFilteredSearch(search)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listSchoolsForProfile(profile!)
      setSchools(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar escolas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!profile) return
    void load()
  }, [profile])

  const filtered = useMemo(() => {
    return schools.filter((school) => {
      if (!canAccessSchoolScoped(profile, school.id)) return false
      if (status !== 'todos' && school.status !== status) return false
      if (!debouncedSearch) return true
      const haystack = `${school.name} ${school.tradeName} ${school.city}`.toLowerCase()
      return haystack.includes(debouncedSearch)
    })
  }, [schools, status, debouncedSearch, profile])

  const { pageItems, PaginationBar } = useClientPagination(filtered)

  const toggleStatus = async () => {
    if (!pendingStatus || !canManageSchools) return
    setSaving(true)
    try {
      const nextStatus: EntityStatus = pendingStatus.status === 'ativo' ? 'inativo' : 'ativo'
      await setSchoolStatus(pendingStatus.id, nextStatus)
      toast({ variant: 'success', title: `Escola ${nextStatus === 'ativo' ? 'ativada' : 'inativada'}` })
      setPendingStatus(null)
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
        title="Escolas"
        description="Gerencie as instituições cadastradas no sistema."
        action={
          canManageSchools ? (
            <Button onClick={() => navigate('/app/escolas/nova')}>+ Nova escola</Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome..."
        status={status}
        onStatusChange={setStatus}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhuma escola encontrada"
          description={
            schools.length === 0
              ? 'Cadastre a primeira escola para começar.'
              : 'Ajuste os filtros ou a busca para ver resultados.'
          }
          actionLabel={canManageSchools && schools.length === 0 ? 'Cadastrar escola' : undefined}
          onAction={canManageSchools && schools.length === 0 ? () => navigate('/app/escolas/nova') : undefined}
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Nome</TableHeaderCell>
                <TableHeaderCell>Cidade</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Ações</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageItems.map((school) => (
                <TableRow key={school.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{school.tradeName || school.name}</p>
                      <p className="text-xs text-ink-muted">{school.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {school.city}/{school.state}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={school.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/app/escolas/${school.id}`} className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                        Ver
                      </Link>
                      {canManageSchools && (
                        <>
                          <Link to={`/app/escolas/${school.id}/editar`} className="text-sm font-semibold text-ink-muted hover:text-ink">
                            Editar
                          </Link>
                          <button
                            type="button"
                            className="text-sm font-semibold text-ink-muted hover:text-ink"
                            onClick={() => setPendingStatus(school)}
                          >
                            {school.status === 'ativo' ? 'Inativar' : 'Ativar'}
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
        open={Boolean(pendingStatus)}
        title={pendingStatus?.status === 'ativo' ? 'Inativar escola?' : 'Ativar escola?'}
        description="Essa alteração afeta a disponibilidade da escola no sistema."
        confirmLabel="Confirmar"
        variant={pendingStatus?.status === 'ativo' ? 'danger' : 'primary'}
        loading={saving}
        onCancel={() => setPendingStatus(null)}
        onConfirm={toggleStatus}
      />
    </div>
  )
}
