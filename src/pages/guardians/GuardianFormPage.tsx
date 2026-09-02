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
import { RequirePermission } from '../../routes/RequirePermission'
import { createGuardian, getGuardianById, updateGuardian } from '../../services/guardians'
import { listSchools } from '../../services/schools'
import type { School } from '../../types/school'
import type { GuardianLinkType } from '../../types/common'
import { GUARDIAN_LINK_LABELS } from '../../types/common'
import { isValidEmail, maskCpf, maskPhone } from '../../lib/masks'

export function GuardianFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { canManageGuardians, profile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [schools, setSchools] = useState<School[]>([])

  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [phonePrimary, setPhonePrimary] = useState('')
  const [phoneSecondary, setPhoneSecondary] = useState('')
  const [email, setEmail] = useState('')
  const [linkType, setLinkType] = useState<GuardianLinkType>('pai')
  const [schoolId, setSchoolId] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const schoolList = await listSchools()
        setSchools(schoolList.filter((school) => school.status === 'ativo'))
        if (!isEdit && profile?.schoolId) setSchoolId(profile.schoolId)

        if (id) {
          const guardian = await getGuardianById(id)
          if (!guardian) {
            setError('Responsável não encontrado.')
            return
          }
          setName(guardian.name)
          setCpf(guardian.cpf)
          setPhonePrimary(guardian.phonePrimary)
          setPhoneSecondary(guardian.phoneSecondary)
          setEmail(guardian.email)
          setLinkType(guardian.linkType)
          setSchoolId(guardian.schoolId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar formulário.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id, isEdit, profile?.schoolId])

  const validate = () => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Informe o nome completo.'
    if (!phonePrimary.trim()) next.phonePrimary = 'Informe o telefone principal.'
    if (!schoolId) next.schoolId = 'Selecione a escola.'
    if (!linkType) next.linkType = 'Selecione o vínculo.'
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
        cpf,
        phonePrimary,
        phoneSecondary,
        email: email.trim().toLowerCase(),
        linkType,
        schoolId,
        status: 'ativo' as const,
      }

      if (isEdit && id) {
        await updateGuardian(id, {
          name: payload.name,
          cpf: payload.cpf,
          phonePrimary: payload.phonePrimary,
          phoneSecondary: payload.phoneSecondary,
          email: payload.email,
          linkType: payload.linkType,
          schoolId: payload.schoolId,
        })
        toast({ variant: 'success', title: 'Responsável atualizado' })
        navigate(`/app/responsaveis/${id}`)
      } else {
        const newId = await createGuardian(payload)
        toast({ variant: 'success', title: 'Responsável cadastrado' })
        navigate(`/app/responsaveis/${newId}`)
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
    <RequirePermission allowed={canManageGuardians}>
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState description={error} onRetry={() => navigate('/app/responsaveis')} />
      ) : (
        <div>
          <PageHeader
            title={isEdit ? 'Editar responsável' : 'Novo responsável'}
            description="Cadastre responsáveis vinculados a uma escola. A associação com alunos será feita na próxima sprint."
            action={
              <Link to={isEdit && id ? `/app/responsaveis/${id}` : '/app/responsaveis'}>
                <Button variant="outline">Cancelar</Button>
              </Link>
            }
          />

          <Card>
            <CardBody>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
                <Input
                  label="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={errors.name}
                  disabled={submitting}
                />
                <Input
                  label="CPF"
                  value={cpf}
                  onChange={(e) => setCpf(maskCpf(e.target.value))}
                  disabled={submitting}
                  hint="Opcional"
                />
                <Input
                  label="Telefone principal"
                  value={phonePrimary}
                  onChange={(e) => setPhonePrimary(maskPhone(e.target.value))}
                  error={errors.phonePrimary}
                  disabled={submitting}
                />
                <Input
                  label="Telefone secundário"
                  value={phoneSecondary}
                  onChange={(e) => setPhoneSecondary(maskPhone(e.target.value))}
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
                <Select
                  label="Tipo de vínculo"
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value as GuardianLinkType)}
                  error={errors.linkType}
                  disabled={submitting}
                  options={(Object.keys(GUARDIAN_LINK_LABELS) as GuardianLinkType[]).map((key) => ({
                    value: key,
                    label: GUARDIAN_LINK_LABELS[key],
                  }))}
                />
                <Select
                  label="Escola"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  error={errors.schoolId}
                  disabled={submitting}
                  placeholder="Selecione"
                  options={schools.map((school) => ({
                    value: school.id,
                    label: school.tradeName || school.name,
                  }))}
                />
                <div className="sm:col-span-2">
                  <Button type="submit" loading={submitting}>
                    {isEdit ? 'Salvar alterações' : 'Cadastrar responsável'}
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
