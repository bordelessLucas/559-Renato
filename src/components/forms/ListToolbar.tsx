import { useMemo, useState, type ReactNode } from 'react'
import { Pagination } from '../ui/Pagination'
import { SearchInput } from '../ui/SearchInput'
import { Select } from '../ui/Select'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { STATUS_LABELS, type EntityStatus } from '../../types/common'

interface ListToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  status: EntityStatus | 'todos'
  onStatusChange: (value: EntityStatus | 'todos') => void
  schoolId?: string | 'todos'
  onSchoolChange?: (value: string | 'todos') => void
  schoolOptions?: Array<{ value: string; label: string }>
  showSchoolFilter?: boolean
  extra?: ReactNode
}

export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  status,
  onStatusChange,
  schoolId = 'todos',
  onSchoolChange,
  schoolOptions = [],
  showSchoolFilter = false,
  extra,
}: ListToolbarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <SearchInput
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            label="Status"
            value={status}
            onChange={(event) => onStatusChange(event.target.value as EntityStatus | 'todos')}
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'ativo', label: STATUS_LABELS.ativo },
              { value: 'inativo', label: STATUS_LABELS.inativo },
            ]}
          />
        </div>
        {showSchoolFilter && onSchoolChange && (
          <div className="w-full sm:w-56">
            <Select
              label="Escola"
              value={schoolId}
              onChange={(event) => onSchoolChange(event.target.value)}
              options={[
                { value: 'todos', label: 'Todas' },
                ...schoolOptions,
              ]}
            />
          </div>
        )}
      </div>
      {extra}
    </div>
  )
}

export function useClientPagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  return {
    page: safePage,
    setPage,
    totalPages,
    pageItems,
    PaginationBar:
      items.length > pageSize ? (
        <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} className="mt-4" />
      ) : null,
  }
}

export function useFilteredSearch(value: string) {
  return useDebouncedValue(value.trim().toLowerCase(), 250)
}
