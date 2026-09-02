import { EmptyState } from '../components/feedback/EmptyState'
import { PageHeader } from '../components/layout/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Card, CardBody } from '../components/ui/Card'

export function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral operacional da escola. Os indicadores serão preenchidos nas próximas sprints."
        action={<Badge variant="neutral">Sprint 0</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['Entradas', 'Saídas', 'Presença', 'Alertas'].map((label) => (
          <Card key={label}>
            <CardBody>
              <p className="text-sm font-medium text-ink-muted">{label}</p>
              <p className="mt-2 text-2xl font-bold text-ink">—</p>
              <p className="mt-1 text-xs text-ink-subtle">Disponível em breve</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <EmptyState
          title="Nenhuma atividade recente"
          description="Quando houver movimentações e cadastros, o resumo operacional aparecerá aqui."
        />
      </div>
    </div>
  )
}
