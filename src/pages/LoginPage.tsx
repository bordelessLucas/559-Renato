import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../layouts/AuthLayout'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardFooter, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'

export function LoginPage() {
  const { user, loading: authLoading, login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  if (authLoading) {
    return (
      <AuthLayout>
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      </AuthLayout>
    )
  }

  if (user) {
    return <Navigate to="/app/dashboard" replace />
  }

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {}
    if (!email.trim()) nextErrors.email = 'Informe o e-mail.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Informe um e-mail válido.'
    }
    if (!password) nextErrors.password = 'Informe a senha.'
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/app/dashboard', { replace: true })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Falha ao entrar.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <h1 className="text-xl font-bold text-ink">Entrar no sistema</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Acesse a área administrativa com seu e-mail e senha.
          </p>
        </CardHeader>
        <CardBody>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Input
              label="E-mail"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fieldErrors.email}
              disabled={submitting}
              placeholder="seu@email.com"
            />

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-ink">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                  placeholder="••••••••"
                  aria-invalid={Boolean(fieldErrors.password)}
                  className="h-11 w-full rounded-lg border border-line bg-surface px-3.5 pr-20 text-sm text-ink shadow-xs placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-surface-muted"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-xs font-semibold text-ink-muted hover:text-ink"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-sm text-danger-600" role="alert">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {formError && (
              <div
                className="rounded-lg border border-danger-600/20 bg-danger-50 px-3 py-2.5 text-sm text-danger-700"
                role="alert"
              >
                {formError}
              </div>
            )}

            <Button type="submit" fullWidth loading={submitting}>
              Entrar
            </Button>
          </form>
        </CardBody>
        <CardFooter className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Link to="/recuperar-senha" className="font-medium text-brand-700 hover:text-brand-800">
            Esqueci minha senha
          </Link>
          <Link to="/" className="text-ink-muted hover:text-ink">
            Voltar para a home
          </Link>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
