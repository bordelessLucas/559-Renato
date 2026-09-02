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
  Badge,
  useToast,
} from '../../components/ui'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { listUsersForProfile, setUserStatus } from '../../services/users'
import { listSchoolsForProfile } from '../../services/schools'
import type { AppUser } from '../../types/user'
import type { School } from '../../types/school'
import type { EntityStatus } from '../../types/common'
import { USER_ROLE_LABELS } from '../../types/common'
import { canAccessSchoolScoped } from '../../lib/permissions'

export function UsersPage() {
  const { profile, canManageUsers, isGeneralAdmin } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [users, setUsers] = useState<AppUser[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<EntityStatus | 'todos'>('todos')
  const [schoolId, setSchoolId] = useState<string | 'todos'>('todos')
  const [pending, setPending] = useState<AppUser | null>(null)
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
      const [usersData, schoolsData] = await Promise.all([
        listUsersForProfile(profile!),
        listSchoolsForProfile(profile!),
      ])
      setUsers(usersData)
      setSchools(schoolsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!profile) return
    void load()
  }, [profile])

  const filtered = useMemo(() => {
    return users.filter((user) => {
      if (!canAccessSchoolScoped(profile, user.schoolId)) return false
      if (status !== 'todos' && user.status !== status) return false
      if (schoolId !== 'todos' && user.schoolId !== schoolId) return false
      if (!debouncedSearch) return true
      const haystack = `${user.name} ${user.email}`.toLowerCase()
      return haystack.includes(debouncedSearch)
    })
  }, [users, status, schoolId, debouncedSearch, profile])

  const { pageItems, PaginationBar } = useClientPagination(filtered)

  const toggleStatus = async () => {
    if (!pending || !canManageUsers) return
    setSaving(true)
    try {
      const nextStatus: EntityStatus = pending.status === 'ativo' ? 'inativo' : 'ativo'
      await setUserStatus(pending.id, nextStatus)
      toast({ variant: 'success', title: `Usuário ${nextStatus === 'ativo' ? 'ativado' : 'inativado'}` })
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
        title="Usuários"
        description="Gerencie usuários administrativos do sistema."
        action={
          canManageUsers ? (
            <Button onClick={() => navigate('/app/usuarios/novo')}>+ Novo usuário</Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome ou e-mail..."
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
          title="Nenhum usuário encontrado"
          description={
            users.length === 0
              ? 'Cadastre o primeiro usuário administrativo.'
              : 'Ajuste os filtros ou a busca para ver resultados.'
          }
          actionLabel={canManageUsers && users.length === 0 ? 'Cadastrar usuário' : undefined}
          onAction={canManageUsers && users.length === 0 ? () => navigate('/app/usuarios/novo') : undefined}
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Nome</TableHeaderCell>
                <TableHeaderCell>Escola</TableHeaderCell>
                <TableHeaderCell>Perfil</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Ações</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageItems.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-ink-muted">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{schoolMap[user.schoolId] || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'operador' || user.role === 'responsavel' ? 'neutral' : 'brand'}>
                      {USER_ROLE_LABELS[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/app/usuarios/${user.id}`} className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                        Ver
                      </Link>
                      {canManageUsers && (
                        <>
                          <Link to={`/app/usuarios/${user.id}/editar`} className="text-sm font-semibold text-ink-muted hover:text-ink">
                            Editar
                          </Link>
                          <button
                            type="button"
                            className="text-sm font-semibold text-ink-muted hover:text-ink"
                            onClick={() => setPending(user)}
                          >
                            {user.status === 'ativo' ? 'Inativar' : 'Ativar'}
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
        title={pending?.status === 'ativo' ? 'Inativar usuário?' : 'Ativar usuário?'}
        description="Usuários inativos não poderão acessar a área administrativa."
        confirmLabel="Confirmar"
        variant={pending?.status === 'ativo' ? 'danger' : 'primary'}
        loading={saving}
        onCancel={() => setPending(null)}
        onConfirm={toggleStatus}
      />
    </div>
  )
}
