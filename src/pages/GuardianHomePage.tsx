import { Card, CardBody } from '../components/ui'
import { PageHeader } from '../components/layout/PageHeader'
import { useAuth } from '../contexts/AuthContext'

export function GuardianHomePage() {
  const { profile, schoolName } = useAuth()

  return (
    <div>
      <PageHeader
        title="Área do responsável"
        description="Acompanhe as notificações de entrada e saída dos alunos vinculados a você."
      />
      <Card>
        <CardBody className="space-y-2">
          <p className="text-sm text-ink">
            Olá, <strong>{profile?.name}</strong>.
          </p>
          <p className="text-sm text-ink-muted">
            Escola: <strong>{schoolName}</strong>
          </p>
          <p className="text-sm text-ink-muted">
            As notificações de movimentação serão habilitadas nas próximas sprints. Por enquanto, sua
            conta de responsável já está cadastrada e vinculada ao sistema.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
