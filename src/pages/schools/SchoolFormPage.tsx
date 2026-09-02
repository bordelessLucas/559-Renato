import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { ErrorState } from '../../components/feedback/ErrorState'
import {
  Button,
  Card,
  CardBody,
  Input,
  PageSkeleton,
  Select,
  useToast,
} from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { createSchool, getSchoolById, updateSchool } from '../../services/schools'
import { BRAZILIAN_STATES } from '../../types/common'
import { isValidEmail, maskCnpj, maskPhone } from '../../lib/masks'
import { RequirePermission } from '../../routes/RequirePermission'

export function SchoolFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { canManageSchools } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [name, setName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('SP')

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const school = await getSchoolById(id)
        if (!school) {
          setError('Escola não encontrada.')
          return
        }
        setName(school.name)
        setTradeName(school.tradeName)
        setCnpj(school.cnpj)
        setPhone(school.phone)
        setEmail(school.email)
        setAddress(school.address)
        setCity(school.city)
        setState(school.state || 'SP')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar escola.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  const validate = () => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Informe o nome da escola.'
    if (!city.trim()) next.city = 'Informe a cidade.'
    if (!state) next.state = 'Informe o estado.'
    if (email && !isValidEmail(email)) next.email = 'E-mail inválido.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        tradeName: tradeName.trim() || name.trim(),
        cnpj,
        phone,
        email: email.trim().toLowerCase(),
        address: address.trim(),
        city: city.trim(),
        state,
        status: 'ativo' as const,
      }

      if (isEdit && id) {
        await updateSchool(id, {
          name: payload.name,
          tradeName: payload.tradeName,
          cnpj: payload.cnpj,
          phone: payload.phone,
          email: payload.email,
          address: payload.address,
          city: payload.city,
          state: payload.state,
        })
        toast({ variant: 'success', title: 'Escola atualizada' })
        navigate(`/app/escolas/${id}`)
      } else {
        const newId = await createSchool(payload)
        toast({ variant: 'success', title: 'Escola cadastrada' })
        navigate(`/app/escolas/${newId}`)
      }
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Não foi possível salvar',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RequirePermission allowed={canManageSchools}>
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState description={error} onRetry={() => navigate('/app/escolas')} />
      ) : (
        <div>
          <PageHeader
            title={isEdit ? 'Editar escola' : 'Nova escola'}
            description="Preencha as informações da instituição."
            action={
              <Link to={isEdit && id ? `/app/escolas/${id}` : '/app/escolas'}>
                <Button variant="outline">Cancelar</Button>
              </Link>
            }
          />

          <Card>
            <CardBody>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
                <Input
                  label="Nome da escola"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={errors.name}
                  disabled={submitting}
                />
                <Input
                  label="Nome fantasia"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  disabled={submitting}
                />
                <Input
                  label="CNPJ"
                  value={cnpj}
                  onChange={(e) => setCnpj(maskCnpj(e.target.value))}
                  disabled={submitting}
                  hint="Opcional"
                />
                <Input
                  label="Telefone"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  disabled={submitting}
                />
                <Input
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  disabled={submitting}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Endereço"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={submitting}
                  />
                </div>
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
                <div className="sm:col-span-2">
                  <Button type="submit" loading={submitting}>
                    {isEdit ? 'Salvar alterações' : 'Cadastrar escola'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </RequirePermission>
  )
}
