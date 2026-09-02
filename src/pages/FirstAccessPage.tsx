import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../layouts/AuthLayout'
import { useAuth } from '../contexts/AuthContext'
import { bootstrapSystem } from '../services/bootstrap'
import { Button, Card, CardBody, CardFooter, CardHeader, Input, Select, Spinner, useToast } from '../components/ui'
import { BRAZILIAN_STATES } from '../types/common'
import { isValidEmail, maskPhone } from '../lib/masks'

export function FirstAccessPage() {
  const { user, profile, loading, systemInitialized, register, refreshProfile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [schoolPhone, setSchoolPhone] = useState('')
  const [schoolEmail, setSchoolEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('SP')

  useEffect(() => {
    if (user?.email) setEmail(user.email)
  }, [user])

  if (loading || systemInitialized === null) {
    return (
      <AuthLayout>
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      </AuthLayout>
    )
  }

  if (systemInitialized) {
    return <Navigate to="/login" replace />
  }

  if (profile) {
    return <Navigate to="/app/dashboard" replace />
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Informe seu nome.'
    if (!email.trim()) next.email = 'Informe o e-mail.'
    else if (!isValidEmail(email)) next.email = 'E-mail inválido.'
    if (!user) {
      if (!password) next.password = 'Informe uma senha.'
      else if (password.length < 6) next.password = 'A senha deve ter ao menos 6 caracteres.'
    }
    if (!schoolName.trim()) next.schoolName = 'Informe o nome da escola.'
    if (!city.trim()) next.city = 'Informe a cidade.'
    if (!state) next.state = 'Informe o estado.'
    if (schoolEmail && !isValidEmail(schoolEmail)) next.schoolEmail = 'E-mail inválido.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      let uid = user?.uid
      let accountEmail = user?.email ?? email

      if (!uid) {
        const created = await register(email, password)
        uid = created.uid
        accountEmail = created.email ?? email
      }

      await bootstrapSystem({
        uid,
        email: accountEmail,
        name,
        phone,
        school: {
          name: schoolName.trim(),
          tradeName: tradeName.trim() || schoolName.trim(),
          cnpj: '',
          phone: schoolPhone,
          email: schoolEmail.trim().toLowerCase(),
          address: address.trim(),
          city: city.trim(),
          state,
          status: 'ativo',
        },
      })

      await refreshProfile()
      toast({
        variant: 'success',
        title: 'Sistema inicializado',
        description: 'Escola e administrador criados com sucesso.',
      })
      navigate('/app/dashboard', { replace: true })
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Falha na inicialização',
        description: error instanceof Error ? error.message : 'Tente novamente.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <h1 className="text-xl font-bold text-ink">Primeiro acesso</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Crie a conta do administrador e a primeira escola do sistema.
          </p>
        </CardHeader>
        <CardBody>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Input
              label="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              disabled={submitting}
            />
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              disabled={submitting || Boolean(user)}
            />
            {!user && (
              <Input
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                disabled={submitting}
                hint="Mínimo de 6 caracteres"
              />
            )}
            <Input
              label="Telefone"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              disabled={submitting}
            />
            <Input
              label="Nome da escola"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              error={errors.schoolName}
              disabled={submitting}
            />
            <Input
              label="Nome fantasia"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              disabled={submitting}
              hint="Opcional"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Telefone da escola"
                value={schoolPhone}
                onChange={(e) => setSchoolPhone(maskPhone(e.target.value))}
                disabled={submitting}
              />
              <Input
                label="E-mail da escola"
                type="email"
                value={schoolEmail}
                onChange={(e) => setSchoolEmail(e.target.value)}
                error={errors.schoolEmail}
                disabled={submitting}
              />
            </div>
            <Input
              label="Endereço"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={submitting}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                error={errors.city}
                disabled={submitting}
              />
              <Select
                label="Estado"
                value={state}
                onChange={(e) => setState(e.target.value)}
                error={errors.state}
                disabled={submitting}
                options={BRAZILIAN_STATES.map((item) => ({ value: item, label: item }))}
              />
            </div>
            <Button type="submit" fullWidth loading={submitting}>
              Criar escola e administrador
            </Button>
          </form>
        </CardBody>
        <CardFooter>
          <Link to="/login" className="text-sm font-medium text-brand-700 hover:text-brand-800">
            Já tenho conta — entrar
          </Link>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
