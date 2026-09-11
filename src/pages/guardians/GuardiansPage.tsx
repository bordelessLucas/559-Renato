import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ErrorState } from '../../components/feedback/ErrorState'
import { ListToolbar, useClientPagination, useFilteredSearch } from '../../components/forms/ListToolbar'
import {
  Button,
  Modal,
  PageSkeleton,
  Table,
  TableActionButton,
  TableActionLink,
  TableActions,
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
import { canAccessSchoolScoped, canViewGuardians } from '../../lib/permissions'
import { RequirePermission } from '../../routes/RequirePermission'

export function GuardiansPage() {
  const { profile, canManageGuardians } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<EntityStatus | 'todos'>('todos')
  const [pending, setPending] = useState<Guardian | null>(null)
  const [preview, setPreview] = useState<Guardian | null>(null)
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
      if (!debouncedSearch) return true
      const haystack = `${guardian.name} ${guardian.email} ${guardian.phonePrimary}`.toLowerCase()
      return haystack.includes(debouncedSearch)
    })
  }, [guardians, status, debouncedSearch, profile])

  const { pageItems, PaginationBar } = useClientPagination(filtered)

  const openDetail = (id: string) => {
    setPreview(null)
    navigate(`/app/responsaveis/${id}`)
  }

  const toggleStatus = async () => {
    if (!pending || !canManageGuardians) return
    setSaving(true)
    try {
      const nextStatus: EntityStatus = pending.status === 'ativo' ? 'inativo' : 'ativo'
      await setGuardianStatus(pending.id, nextStatus)
      toast({
        variant: 'success',
        title: `Responsável ${nextStatus === 'ativo' ? 'ativado' : 'inativado'}`,
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
    <RequirePermission allowed={canViewGuardians(profile)}>
      <div>
        <PageHeader
          title="Responsáveis"
          description="Famílias vinculadas à sua escola. Clique na linha para ver o resumo."
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
          showSchoolFilter={false}
        />

        {filtered.length === 0 ? (
          <EmptyState
            title="Nenhum responsável encontrado"
            description={
              guardians.length === 0
                ? 'Cadastre o primeiro responsável para começar.'
                : 'Ajuste os filtros ou a busca para ver resultados.'
            }
            actionLabel={
              canManageGuardians && guardians.length === 0 ? 'Cadastrar responsável' : undefined
            }
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
                  <TableRow
                    key={guardian.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    role="button"
                    aria-label={`Abrir resumo de ${guardian.name}`}
                    onClick={() => setPreview(guardian)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setPreview(guardian)
                      }
                    }}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{guardian.name}</p>
                        <p className="text-xs text-ink-muted">
                          {guardian.phonePrimary || guardian.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{GUARDIAN_LINK_LABELS[guardian.linkType]}</TableCell>
                    <TableCell>{schoolMap[guardian.schoolId] || '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={guardian.status} />
                    </TableCell>
                    <TableCell>
                      {canManageGuardians ? (
                        <TableActions>
                          <TableActionLink to={`/app/responsaveis/${guardian.id}/editar`}>
                            Editar
                          </TableActionLink>
                          <TableActionButton onClick={() => setPending(guardian)}>
                            {guardian.status === 'ativo' ? 'Inativar' : 'Ativar'}
                          </TableActionButton>
                        </TableActions>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {PaginationBar}
          </>
        )}

        <Modal
          open={Boolean(preview)}
          onClose={() => setPreview(null)}
          title={preview?.name || 'Responsável'}
          description="Resumo do responsável. Use Ver para abrir a página completa."
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Fechar
              </Button>
              {canManageGuardians && preview && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const id = preview.id
                    setPreview(null)
                    navigate(`/app/responsaveis/${id}/editar`)
                  }}
                >
                  Editar
                </Button>
              )}
              {preview && <Button onClick={() => openDetail(preview.id)}>Ver</Button>}
            </>
          }
        >
          {preview && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={preview.status} />
                <span className="text-sm text-ink-muted">
                  {GUARDIAN_LINK_LABELS[preview.linkType]}
                </span>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Telefone', value: preview.phonePrimary || '—' },
                  { label: 'Telefone 2', value: preview.phoneSecondary || '—' },
                  { label: 'E-mail', value: preview.email || '—' },
                  { label: 'CPF', value: preview.cpf || '—' },
                  {
                    label: 'Escola',
                    value: schoolMap[preview.schoolId] || '—',
                    wide: true,
                  },
                ].map((field) => (
                  <div
                    key={field.label}
                    className={field.wide ? 'sm:col-span-2' : undefined}
                  >
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      {field.label}
                    </dt>
                    <dd className="mt-1 text-sm text-ink">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Modal>

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
    </RequirePermission>
  )
}
