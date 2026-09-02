import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AuthLayout } from '../layouts/AuthLayout'
import { bootstrapSystem } from '../services/bootstrap'
import { Button, Card, CardBody, CardHeader, Input, Select, useToast } from '../components/ui'
import { BRAZILIAN_STATES } from '../types/common'
import { isValidEmail, maskPhone } from '../lib/masks'

export function SetupPage() {
  const { user, refreshProfile } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [schoolPhone, setSchoolPhone] = useState('')
  const [schoolEmail, setSchoolEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('SP')

  const validate = () => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Informe seu nome.'
    if (!schoolName.trim()) next.schoolName = 'Informe o nome da escola.'
    if (!city.trim()) next.city = 'Informe a cidade.'
    if (!state) next.state = 'Informe o estado.'
    if (schoolEmail && !isValidEmail(schoolEmail)) next.schoolEmail = 'E-mail inválido.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !validate()) return

    setSubmitting(true)
    try {
      await bootstrapSystem({
        uid: user.uid,
        email: user.email ?? '',
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
      toast({ variant: 'success', title: 'Sistema inicializado', description: 'Escola e perfil administrativo criados.' })
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
          <h1 className="text-xl font-bold text-ink">Configuração inicial</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Crie a primeira escola e o seu perfil de administrador para começar.
          </p>
        </CardHeader>
        <CardBody>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Input
              label="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              disabled={submitting}
            />
            <Input
              label="Seu telefone"
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
              hint="Opcional. Se vazio, usa o nome da escola."
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
              Inicializar sistema
            </Button>
          </form>
        </CardBody>
      </Card>
    </AuthLayout>
  )
}
