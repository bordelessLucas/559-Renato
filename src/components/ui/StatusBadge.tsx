import { Badge } from './Badge'
import { STATUS_LABELS, type EntityStatus } from '../../types/common'

export function StatusBadge({ status }: { status: EntityStatus }) {
  return (
    <Badge variant={status === 'ativo' ? 'success' : 'neutral'}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
