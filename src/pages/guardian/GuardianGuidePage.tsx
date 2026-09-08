import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button, Card, CardBody } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { RequirePermission } from '../../routes/RequirePermission'
import { isGuardianUser } from '../../lib/permissions'

const STEPS = [
  {
    title: 'Cadastre seus dependentes',
    body: 'Informe o nome da criança (e a foto quando o armazenamento estiver ativo). Não precisa de aprovação da escola.',
  },
  {
    title: 'A escola registra a entrada e a saída',
    body: 'Com as câmeras instaladas, o Olhar+IA reconhece o dependente na portaria.',
  },
  {
    title: 'Você recebe o aviso',
    body: 'A família é notificada no telefone — entrada (verde) e saída (azul claro).',
  },
  {
    title: 'Acompanhe nesta área',
    body: 'Em Meus dependentes você gerencia os cadastros; em Avisos você vê o histórico.',
  },
]

export function GuardianGuidePage() {
  const { profile, schoolName } = useAuth()

  return (
    <RequirePermission allowed={isGuardianUser(profile)}>
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader
          title="Como funciona"
          description={`O papel da família no Olhar+IA · ${schoolName}`}
        />

        <ol className="space-y-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink">{step.title}</h2>
                <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <Card>
          <CardBody className="flex flex-col gap-3 sm:flex-row">
            <Link to="/app/responsavel" className="flex-1">
              <Button fullWidth variant="outline">
                Ver meus dependentes
              </Button>
            </Link>
            <Link to="/app/responsavel/notificacoes" className="flex-1">
              <Button fullWidth>Ver avisos</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    </RequirePermission>
  )
}
