import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { ListToolbar, useClientPagination, useFilteredSearch } from '../../components/forms/ListToolbar'
import {
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  PageSkeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  useToast,
} from '../../components/ui'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { cn } from '../../lib/cn'
import { useAuth } from '../../contexts/AuthContext'
import { listUsersForProfile, setUserStatus } from '../../services/users'
import { listSchoolsForProfile } from '../../services/schools'
import type { AppUser } from '../../types/user'
import type { School } from '../../types/school'
import type { EntityStatus } from '../../types/common'
import { USER_ROLE_LABELS } from '../../types/common'
import {
  canViewUserRecord,
  isSystemStaffRole,
} from '../../lib/permissions'

type SchoolBucket = {
  id: string
  label: string
  users: AppUser[]
}

function UsersTable({
  users,
  schoolMap,
  canManageUsers,
  showSchoolColumn,
  onToggle,
}: {
  users: AppUser[]
  schoolMap: Record<string, string>
  canManageUsers: boolean
  showSchoolColumn: boolean
  onToggle: (user: AppUser) => void
}) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Nome</TableHeaderCell>
          {showSchoolColumn && <TableHeaderCell>Escola</TableHeaderCell>}
          <TableHeaderCell>Perfil</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Ações</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-ink-muted">{user.email}</p>
              </div>
            </TableCell>
            {showSchoolColumn && (
              <TableCell>{schoolMap[user.schoolId] || '—'}</TableCell>
            )}
            <TableCell>
              <Badge
                variant={
                  user.role === 'operador' || user.role === 'responsavel' ? 'neutral' : 'brand'
                }
              >
                {USER_ROLE_LABELS[user.role]}
              </Badge>
            </TableCell>
            <TableCell>
              <StatusBadge status={user.status} />
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/app/usuarios/${user.id}`}
                  className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  Ver
                </Link>
                {canManageUsers && (
                  <>
                    <Link
                      to={`/app/usuarios/${user.id}/editar`}
                      className="text-sm font-semibold text-ink-muted hover:text-ink"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      className="text-sm font-semibold text-ink-muted hover:text-ink"
                      onClick={() => onToggle(user)}
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
  )
}

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
  const [pending, setPending] = useState<AppUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [openBuckets, setOpenBuckets] = useState<Record<string, boolean>>({})

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
      setSchools(schoolsData.filter((school) => school.status === 'ativo'))
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

  const visibleUsers = useMemo(() => {
    return users.filter((user) => {
      if (!canViewUserRecord(profile, user)) return false
      if (status !== 'todos' && user.status !== status) return false
      if (!debouncedSearch) return true
      const haystack = `${user.name} ${user.email} ${USER_ROLE_LABELS[user.role]}`.toLowerCase()
      return haystack.includes(debouncedSearch)
    })
  }, [users, status, debouncedSearch, profile])

  const buckets = useMemo((): SchoolBucket[] => {
    if (!isGeneralAdmin) {
      return [
        {
          id: profile?.schoolId || 'escola',
          label: schoolMap[profile?.schoolId || ''] || 'Sua escola',
          users: visibleUsers,
        },
      ]
    }

    const bySchool = new Map<string, AppUser[]>()
    const platform: AppUser[] = []

    for (const user of visibleUsers) {
      if (user.role === 'administrador_geral' && !user.schoolId) {
        platform.push(user)
        continue
      }
      const key = user.schoolId || 'sem-escola'
      const list = bySchool.get(key) || []
      list.push(user)
      bySchool.set(key, list)
    }

    const schoolBuckets: SchoolBucket[] = [...bySchool.entries()]
      .map(([id, schoolUsers]) => ({
        id,
        label:
          id === 'sem-escola'
            ? 'Sem escola vinculada'
            : schoolMap[id] || 'Escola',
        users: schoolUsers.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

    if (platform.length > 0) {
      return [
        {
          id: 'plataforma',
          label: 'Administração geral',
          users: platform.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        },
        ...schoolBuckets,
      ]
    }
    return schoolBuckets
  }, [visibleUsers, isGeneralAdmin, profile?.schoolId, schoolMap])

  useEffect(() => {
    if (!isGeneralAdmin || buckets.length === 0) return
    setOpenBuckets((current) => {
      if (Object.keys(current).length > 0) return current
      return { [buckets[0].id]: true }
    })
  }, [buckets, isGeneralAdmin])

  const { pageItems, PaginationBar } = useClientPagination(
    isGeneralAdmin ? [] : visibleUsers,
  )

  const toggleStatus = async () => {
    if (!pending || !canManageUsers) return
    setSaving(true)
    try {
      const nextStatus: EntityStatus = pending.status === 'ativo' ? 'inativo' : 'ativo'
      await setUserStatus(pending.id, nextStatus)
      toast({
        variant: 'success',
        title: `Usuário ${nextStatus === 'ativo' ? 'ativado' : 'inativado'}`,
      })
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
        description={
          isGeneralAdmin
            ? 'Equipe do sistema por escola. Contas de responsáveis e dados de crianças não aparecem aqui (LGPD).'
            : 'Operadores, admins e responsáveis da sua escola. Alunos ficam na área Alunos.'
        }
        action={
          canManageUsers ? (
            <Button onClick={() => navigate('/app/usuarios/novo')}>+ Novo usuário</Button>
          ) : undefined
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, e-mail ou perfil…"
        status={status}
        onStatusChange={setStatus}
        showSchoolFilter={false}
      />

      {visibleUsers.length === 0 ? (
        <EmptyState
          title="Nenhum usuário encontrado"
          description={
            users.length === 0
              ? isGeneralAdmin
                ? 'Cadastre administradores de escola ou operadores.'
                : 'Cadastre operadores ou responsáveis da sua escola.'
              : 'Ajuste os filtros ou a busca para ver resultados.'
          }
          actionLabel={canManageUsers && users.length === 0 ? 'Cadastrar usuário' : undefined}
          onAction={
            canManageUsers && users.length === 0
              ? () => navigate('/app/usuarios/novo')
              : undefined
          }
        />
      ) : isGeneralAdmin ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            {buckets.length} pacote{buckets.length === 1 ? '' : 's'} · {visibleUsers.length}{' '}
            usuário{visibleUsers.length === 1 ? '' : 's'} de equipe
            {visibleUsers.some((u) => isSystemStaffRole(u.role))
              ? ' (sem responsáveis)'
              : ''}
          </p>
          {buckets.map((bucket) => {
            const open = Boolean(openBuckets[bucket.id])
            return (
              <Card key={bucket.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                  onClick={() =>
                    setOpenBuckets((current) => ({
                      ...current,
                      [bucket.id]: !current[bucket.id],
                    }))
                  }
                  aria-expanded={open}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{bucket.label}</p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {bucket.users.length} usuário{bucket.users.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-ink-muted transition-transform',
                      open && 'rotate-180',
                    )}
                    aria-hidden
                  >
                    ▾
                  </span>
                </button>
                {open && (
                  <CardBody className="border-t border-line pt-0">
                    {bucket.users.length === 0 ? (
                      <p className="py-4 text-sm text-ink-muted">Nenhum usuário neste pacote.</p>
                    ) : (
                      <UsersTable
                        users={bucket.users}
                        schoolMap={schoolMap}
                        canManageUsers={canManageUsers}
                        showSchoolColumn={false}
                        onToggle={setPending}
                      />
                    )}
                  </CardBody>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <>
          <UsersTable
            users={pageItems}
            schoolMap={schoolMap}
            canManageUsers={canManageUsers}
            showSchoolColumn={false}
            onToggle={setPending}
          />
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
