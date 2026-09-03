import { EmptyState } from '../components/feedback/EmptyState'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody } from '../components/ui/Card'
import { useAuth } from '../contexts/AuthContext'

export function DashboardPage() {
  const { isGeneralAdmin, profile } = useAuth()
  const role = profile?.role

  const copy =
    role === 'operador'
      ? {
          title: 'Painel do operador',
          description: 'Consulte os alunos da sua escola. Entrada, saída e presença entram nas próximas etapas.',
          emptyTitle: 'Nenhuma movimentação no momento',
          emptyDescription: 'Quando a portaria registrar entradas e saídas, o resumo do dia aparece aqui.',
        }
      : role === 'administrador_escola'
        ? {
            title: 'Painel da escola',
            description: 'Acompanhe a operação da sua instituição: cadastros, presença e comunicados.',
            emptyTitle: 'Nenhuma atividade recente',
            emptyDescription: 'Cadastros e movimentações da sua escola aparecem aqui.',
          }
        : isGeneralAdmin
          ? {
              title: 'Painel geral',
              description: 'Visão da operação em todas as escolas cadastradas no sistema.',
              emptyTitle: 'Nenhuma atividade recente',
              emptyDescription: 'Quando houver cadastros e movimentações nas escolas, o resumo aparece aqui.',
            }
          : {
              title: 'Painel',
              description: 'Acompanhe a operação da escola.',
              emptyTitle: 'Nenhuma atividade recente',
              emptyDescription: 'O resumo operacional aparece aqui.',
            }

  const metrics =
    role === 'operador'
      ? ['Entradas', 'Saídas', 'Presença', 'Alunos']
      : ['Entradas', 'Saídas', 'Presença', 'Alertas']

  return (
    <div>
      <PageHeader title={copy.title} description={copy.description} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((label) => (
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
        <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
      </div>
    </div>
  )
}
