import { useAuth } from '../contexts/AuthContext'
import { AuthLayout } from '../layouts/AuthLayout'
import { Button, Card, CardBody } from '../components/ui'
import { Link } from 'react-router-dom'

export function NoAccessPage() {
  const { logout, user, profile } = useAuth()

  return (
    <AuthLayout>
      <Card>
        <CardBody className="space-y-4 text-center">
          <h1 className="text-xl font-bold text-ink">Acesso indisponível</h1>
          <p className="text-sm text-ink-muted">
            {profile?.status === 'inativo'
              ? 'Seu usuário está inativo. Contate um administrador.'
              : 'Sua conta autenticada não possui perfil administrativo no sistema.'}
          </p>
          <p className="text-xs text-ink-subtle">{user?.email}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => logout()}>
              Sair
            </Button>
            <Link to="/">
              <Button variant="ghost">Ir para a home</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </AuthLayout>
  )
}
