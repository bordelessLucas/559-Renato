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
import { createAdminUserAccount, getUserProfile, updateUser } from '../../services/users'
import { listSchools } from '../../services/schools'
import type { School } from '../../types/school'
import type { UserRole } from '../../types/common'
import { USER_ROLE_LABELS } from '../../types/common'
import { isValidEmail, maskPhone } from '../../lib/masks'

export function UserFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { canManageUsers, profile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [schools, setSchools] = useState<School[]>([])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [role, setRole] = useState<UserRole>('operador')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const schoolList = await listSchools()
        const activeSchools = schoolList.filter((school) => school.status === 'ativo')
        setSchools(activeSchools)
        if (!isEdit && profile?.schoolId) {
          setSchoolId(profile.schoolId)
        }

        if (id) {
          const user = await getUserProfile(id)
          if (!user) {
            setError('Usuário não encontrado.')
            return
          }
          setName(user.name)
          setEmail(user.email)
          setPhone(user.phone)
          setSchoolId(user.schoolId)
          setRole(user.role)
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
    if (!email.trim()) next.email = 'Informe o e-mail.'
    else if (!isValidEmail(email)) next.email = 'E-mail inválido.'
    if (!schoolId) next.schoolId = 'Selecione a escola.'
    if (!role) next.role = 'Selecione o perfil.'
    if (!isEdit) {
      if (!password) next.password = 'Informe uma senha inicial.'
      else if (password.length < 6) next.password = 'A senha deve ter ao menos 6 caracteres.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateUser(id, {
          name: name.trim(),
          phone,
          schoolId,
          role,
        })
        toast({ variant: 'success', title: 'Usuário atualizado' })
        navigate(`/app/usuarios/${id}`)
      } else {
        const uid = await createAdminUserAccount({
          email,
          password,
          profile: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone,
            schoolId,
            role,
            status: 'ativo',
          },
        })
        toast({
          variant: 'success',
          title: 'Usuário criado',
          description: 'Conta criada no Firebase Authentication e vinculada ao Firestore.',
        })
        navigate(`/app/usuarios/${uid}`)
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
    <RequirePermission allowed={canManageUsers}>
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState description={error} onRetry={() => navigate('/app/usuarios')} />
      ) : (
        <div>
          <PageHeader
            title={isEdit ? 'Editar usuário' : 'Novo usuário'}
            description="Cadastre usuários administrativos vinculados a uma escola."
            action={
              <Link to={isEdit && id ? `/app/usuarios/${id}` : '/app/usuarios'}>
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
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  disabled={submitting || isEdit}
                  hint={isEdit ? 'O e-mail de autenticação não é alterado por aqui.' : undefined}
                />
                <Input
                  label="Telefone"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  disabled={submitting}
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
                <Select
                  label="Perfil"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  error={errors.role}
                  disabled={submitting}
                  options={[
                    { value: 'administrador', label: USER_ROLE_LABELS.administrador },
                    { value: 'operador', label: USER_ROLE_LABELS.operador },
                  ]}
                />
                {!isEdit && (
                  <div className="space-y-1.5">
                    <label htmlFor="initial-password" className="text-sm font-medium text-ink">
                      Senha inicial
                    </label>
                    <div className="relative">
                      <input
                        id="initial-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={submitting}
                        className="h-11 w-full rounded-lg border border-line bg-surface px-3.5 pr-20 text-sm text-ink shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-xs font-semibold text-ink-muted hover:text-ink"
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    {errors.password ? (
                      <p className="text-sm text-danger-600">{errors.password}</p>
                    ) : (
                      <p className="text-sm text-ink-muted">
                        A senha não é armazenada no Firestore. Use apenas para criar a conta no Auth.
                      </p>
                    )}
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Button type="submit" loading={submitting}>
                    {isEdit ? 'Salvar alterações' : 'Cadastrar usuário'}
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
