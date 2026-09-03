import { Link } from 'react-router-dom'
import { PublicLayout } from '../layouts/PublicLayout'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'

const benefits = [
  {
    title: 'Controle de entrada e saída',
    description: 'A escola acompanha quando cada aluno entra e sai, com histórico claro.',
  },
  {
    title: 'Cadastro por QR Code',
    description: 'O responsável escaneia o código da escola e cadastra seus dependentes.',
  },
  {
    title: 'Aviso à família',
    description: 'Os responsáveis recebem notificação na entrada e na saída.',
  },
  {
    title: 'Acompanhamento da escola',
    description: 'A administração consulta alunos, presença e a operação do dia.',
  },
]

export function HomePage() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgb(15_23_42_/_0.03),transparent_40%),radial-gradient(circle_at_80%_20%,rgb(20_184_166_/_0.18),transparent_40%)]"
          aria-hidden
        />
        <div className="page-container relative py-16 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              Controle Escolar
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Segurança e acompanhamento da entrada e saída dos alunos
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-ink-muted sm:text-lg">
              Uma plataforma para a escola acompanhar a entrada e a saída, e para a família receber
              aviso quando o dependente chegar ou sair.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/login">
                <Button size="lg">Entrar no sistema</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface py-14 sm:py-16">
        <div className="page-container">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-ink">Principais benefícios</h2>
            <p className="mt-2 text-sm text-ink-muted sm:text-base">
              O essencial para organizar o controle de acesso escolar.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <Card key={benefit.title}>
                <CardBody>
                  <h3 className="text-base font-semibold text-ink">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{benefit.description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
