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
import { listSchoolsForProfile, setSchoolStatus } from '../../services/schools'
import type { School } from '../../types/school'
import type { EntityStatus } from '../../types/common'
import { canAccessSchoolScoped } from '../../lib/permissions'
import { cn } from '../../lib/cn'

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
  const [previewSchool, setPreviewSchool] = useState<School | null>(null)
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

  const openQrPage = (schoolId: string) => {
    setPreviewSchool(null)
    navigate(`/app/escolas/${schoolId}#qrcode`)
  }

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
        description={
          canManageSchools
            ? 'Cadastre e gerencie as instituições do sistema. Clique na linha para ver o resumo.'
            : 'Consulte os dados da sua escola. Clique na linha para ver o resumo.'
        }
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
                <TableRow
                  key={school.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir resumo de ${school.tradeName || school.name}`}
                  onClick={() => setPreviewSchool(school)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setPreviewSchool(school)
                    }
                  }}
                >
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
                    {canManageSchools ? (
                      <TableActions>
                        <TableActionLink to={`/app/escolas/${school.id}/editar`}>
                          Editar
                        </TableActionLink>
                        <TableActionButton onClick={() => setPendingStatus(school)}>
                          {school.status === 'ativo' ? 'Inativar' : 'Ativar'}
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
        open={Boolean(previewSchool)}
        onClose={() => setPreviewSchool(null)}
        title={previewSchool?.tradeName || previewSchool?.name || 'Escola'}
        description="Resumo da escola. Use Ver QR para abrir a página com o código de cadastro."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setPreviewSchool(null)}>
              Fechar
            </Button>
            {canManageSchools && previewSchool && (
              <Button
                variant="secondary"
                onClick={() => {
                  const id = previewSchool.id
                  setPreviewSchool(null)
                  navigate(`/app/escolas/${id}/editar`)
                }}
              >
                Editar
              </Button>
            )}
            {previewSchool && (
              <Button onClick={() => openQrPage(previewSchool.id)}>Ver QR</Button>
            )}
          </>
        }
      >
        {previewSchool && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={previewSchool.status} />
              <span className="text-sm text-ink-muted">
                {previewSchool.city}/{previewSchool.state}
              </span>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Nome', value: previewSchool.name },
                { label: 'Nome fantasia', value: previewSchool.tradeName || '—' },
                { label: 'CNPJ', value: previewSchool.cnpj || '—' },
                { label: 'Telefone', value: previewSchool.phone || '—' },
                { label: 'E-mail', value: previewSchool.email || '—' },
                {
                  label: 'Endereço',
                  value: previewSchool.address || '—',
                  wide: true,
                },
              ].map((field) => (
                <div key={field.label} className={cn(field.wide && 'sm:col-span-2')}>
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
