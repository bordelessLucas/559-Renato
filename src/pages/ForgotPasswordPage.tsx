import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../layouts/AuthLayout'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardFooter, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const validate = () => {
    if (!email.trim()) {
      setFieldError('Informe o e-mail.')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Informe um e-mail válido.')
      return false
    }
    setFieldError('')
    return true
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a recuperação.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <h1 className="text-xl font-bold text-ink">Recuperar senha</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Informe o e-mail da conta para receber o link de redefinição.
          </p>
        </CardHeader>
        <CardBody>
          {sent ? (
            <div className="rounded-xl border border-success-600/20 bg-success-50 px-4 py-5 text-center">
              <h2 className="text-base font-semibold text-success-700">E-mail enviado</h2>
              <p className="mt-2 text-sm text-success-700/90">
                Se existir uma conta para <strong>{email.trim()}</strong>, você receberá as
                instruções de recuperação em breve.
              </p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <Input
                label="E-mail"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={fieldError}
                disabled={submitting}
                placeholder="seu@email.com"
              />

              {error && (
                <div
                  className="rounded-lg border border-danger-600/20 bg-danger-50 px-3 py-2.5 text-sm text-danger-700"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth loading={submitting}>
                Enviar recuperação
              </Button>
            </form>
          )}
        </CardBody>
        <CardFooter className="flex justify-between text-sm">
          <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
            Voltar ao login
          </Link>
          {sent && (
            <button
              type="button"
              className="font-medium text-ink-muted hover:text-ink"
              onClick={() => {
                setSent(false)
                setError('')
              }}
            >
              Enviar novamente
            </button>
          )}
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
