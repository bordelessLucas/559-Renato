import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PublicLayout } from '../../layouts/PublicLayout'
import { Badge, Button, Card, CardBody, CardHeader, Input } from '../../components/ui'
import { CameraCapture } from '../../components/public/CameraCapture'
import { maskPhone } from '../../lib/masks'
import { schoolDisplayName } from '../../lib/signup-link'
import {
  loadActiveSchoolForSignup,
  submitPublicSignup,
} from '../../services/public-signup'
import type { School } from '../../types/school'

type Step = 'inicio' | 'responsavel' | 'aluno' | 'foto' | 'resumo' | 'pronto'

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'inicio', label: 'Acesso' },
  { id: 'responsavel', label: 'Responsável' },
  { id: 'aluno', label: 'Dependente' },
  { id: 'foto', label: 'Foto' },
  { id: 'resumo', label: 'Confirmação' },
]

function Stepper({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current)
  if (current === 'pronto') return null

  return (
    <ol className="mb-6 grid grid-cols-5 gap-1">
      {STEPS.map((step, index) => {
        const done = index < currentIndex
        const active = index === currentIndex
        return (
          <li key={step.id} className="flex flex-col items-center gap-1.5 text-center">
            <span
              className={
                active
                  ? 'flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white'
                  : done
                    ? 'flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800'
                    : 'flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-ink-subtle'
              }
            >
              {index + 1}
            </span>
            <span className={`text-[11px] font-medium ${active ? 'text-brand-800' : 'text-ink-muted'}`}>
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function PublicSignupPage() {
  const { schoolId } = useParams()
  const [searchParams] = useSearchParams()
  const schoolNameHint = searchParams.get('escola')?.trim() || ''

  const [school, setSchool] = useState<School | null>(null)
  const [schoolLoading, setSchoolLoading] = useState(true)
  const [schoolError, setSchoolError] = useState('')

  const [step, setStep] = useState<Step>('inicio')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [motherName, setMotherName] = useState('')
  const [motherPhone, setMotherPhone] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [fatherPhone, setFatherPhone] = useState('')
  const [childName, setChildName] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [registeredCount, setRegisteredCount] = useState(0)
  const [lastChildName, setLastChildName] = useState('')

  const schoolName = useMemo(
    () => (school ? schoolDisplayName(school) : schoolNameHint || 'esta escola'),
    [school, schoolNameHint],
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!schoolId) {
        setSchoolError('Link inválido: escola não informada.')
        setSchoolLoading(false)
        return
      }
      try {
        const data = await loadActiveSchoolForSignup(schoolId)
        if (!cancelled) {
          setSchool(data)
          setSchoolError('')
        }
      } catch (error) {
        if (!cancelled) {
          setSchool(null)
          setSchoolError(error instanceof Error ? error.message : 'Não foi possível carregar a escola.')
        }
      } finally {
        if (!cancelled) setSchoolLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [schoolId])

  const resetChild = () => {
    setChildName('')
    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview('')
    setErrors({})
    setSubmitError('')
  }

  const validateGuardian = () => {
    const next: Record<string, string> = {}
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Informe um e-mail válido para acessar o Olhar+IA.'
    }
    if (!password || password.length < 6) {
      next.password = 'A senha deve ter ao menos 6 caracteres.'
    }
    if (!motherName.trim() && !fatherName.trim()) {
      next.motherName = 'Informe o nome da mãe ou do pai.'
    }
    if (!motherPhone.trim() && !fatherPhone.trim()) {
      next.motherPhone = 'Informe pelo menos um telefone para notificação.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const validateChild = () => {
    const next: Record<string, string> = {}
    if (!childName.trim()) next.childName = 'Informe o nome da criança.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const validatePhoto = () => {
    const next: Record<string, string> = {}
    if (!photoFile) next.photo = 'Capture ou envie a foto do dependente.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handlePhotoFile = (file: File | null) => {
    if (!file) return
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setErrors((prev) => ({ ...prev, photo: '' }))
  }

  const handleGuardianSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!validateGuardian()) return
    setStep('aluno')
  }

  const handleChildSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!validateChild()) return
    setStep('foto')
  }

  const handleFinish = async () => {
    if (!schoolId || !photoFile) return
    if (!validateGuardian() || !validateChild() || !validatePhoto()) {
      setStep(!email || !password ? 'responsavel' : !childName ? 'aluno' : 'foto')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      await submitPublicSignup({
        schoolId,
        email,
        password,
        motherName,
        motherPhone,
        fatherName,
        fatherPhone,
        childName,
        photoFile,
      })
      setLastChildName(childName.trim())
      setRegisteredCount((count) => count + 1)
      setStep('pronto')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível concluir o cadastro.')
    } finally {
      setSubmitting(false)
    }
  }

  if (schoolLoading) {
    return (
      <PublicLayout>
        <div className="page-container py-16 text-center text-sm text-ink-muted">
          Carregando dados da escola…
        </div>
      </PublicLayout>
    )
  }

  if (schoolError || !school) {
    return (
      <PublicLayout>
        <div className="page-container py-12">
          <Card className="mx-auto max-w-lg">
            <CardHeader>
              <h1 className="text-xl font-bold text-ink">Cadastro indisponível</h1>
              <p className="mt-1 text-sm text-ink-muted">{schoolError || 'Escola não encontrada.'}</p>
            </CardHeader>
            <CardBody>
              <Link to="/" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                Voltar à página inicial
              </Link>
            </CardBody>
          </Card>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className="page-container py-8 sm:py-12">
        <div className="mx-auto max-w-xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="brand">{schoolName}</Badge>
            <Badge variant="success">Cadastro ativo</Badge>
          </div>

          <Stepper current={step} />

          {step === 'inicio' && (
            <Card>
              <CardHeader>
                <h1 className="text-xl font-bold text-ink">Cadastro do dependente</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  Você está cadastrando um dependente em {schoolName}. O cadastro já chega associado a
                  esta escola, sem aprovação manual.
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                <ol className="space-y-3 text-sm text-ink-muted">
                  <li>
                    <strong className="text-ink">1. Escola já selecionada</strong>
                    <p>Este link ou QR Code já indica a escola do cadastro.</p>
                  </li>
                  <li>
                    <strong className="text-ink">2. Conta e contatos</strong>
                    <p>Crie o acesso com e-mail e informe os telefones para notificação.</p>
                  </li>
                  <li>
                    <strong className="text-ink">3. Dados da criança</strong>
                    <p>Você pode cadastrar um ou mais dependentes na mesma escola.</p>
                  </li>
                  <li>
                    <strong className="text-ink">4. Foto para reconhecimento</strong>
                    <p>Capture a face pela câmera ou envie uma imagem nítida.</p>
                  </li>
                </ol>
                <Button fullWidth onClick={() => setStep('responsavel')}>
                  Começar cadastro
                </Button>
              </CardBody>
            </Card>
          )}

          {step === 'responsavel' && (
            <Card>
              <CardHeader>
                <h1 className="text-xl font-bold text-ink">Seus dados</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  Use o e-mail para entrar depois no Olhar+IA e receber avisos de entrada e saída.
                </p>
              </CardHeader>
              <CardBody>
                <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleGuardianSubmit} noValidate>
                  <div className="sm:col-span-2">
                    <Input
                      label="E-mail"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={errors.email}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Senha"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={errors.password}
                      hint="Mínimo de 6 caracteres. Se já tiver conta, use a senha atual."
                    />
                  </div>
                  <Input
                    label="Nome da mãe"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    error={errors.motherName}
                  />
                  <Input
                    label="Telefone da mãe"
                    value={motherPhone}
                    onChange={(e) => setMotherPhone(maskPhone(e.target.value))}
                    error={errors.motherPhone}
                  />
                  <Input
                    label="Nome do pai"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                  />
                  <Input
                    label="Telefone do pai"
                    value={fatherPhone}
                    onChange={(e) => setFatherPhone(maskPhone(e.target.value))}
                  />
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="button" variant="outline" onClick={() => setStep('inicio')}>
                      Voltar
                    </Button>
                    <Button type="submit">Continuar</Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          )}

          {step === 'aluno' && (
            <Card>
              <CardHeader>
                <h1 className="text-xl font-bold text-ink">Dados da criança</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  A escola já vem preenchida. Informe o nome do dependente para continuar.
                </p>
              </CardHeader>
              <CardBody>
                <form className="grid gap-4" onSubmit={handleChildSubmit} noValidate>
                  <Input label="Escola" value={schoolName} disabled />
                  <Input
                    label="Nome da criança"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    error={errors.childName}
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep('responsavel')}>
                      Voltar
                    </Button>
                    <Button type="submit">Continuar</Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          )}

          {step === 'foto' && (
            <Card>
              <CardHeader>
                <h1 className="text-xl font-bold text-ink">Foto para reconhecimento</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  Posicione o rosto bem iluminado e capture pela câmera, ou envie um arquivo.
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                <CameraCapture
                  previewUrl={photoPreview}
                  onCapture={(file, url) => {
                    if (photoPreview) URL.revokeObjectURL(photoPreview)
                    setPhotoFile(file)
                    setPhotoPreview(url)
                    setErrors((prev) => ({ ...prev, photo: '' }))
                  }}
                  onClear={() => {
                    if (photoPreview) URL.revokeObjectURL(photoPreview)
                    setPhotoFile(null)
                    setPhotoPreview('')
                  }}
                />
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => handlePhotoFile(e.target.files?.[0] ?? null)}
                  />
                  <span className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted">
                    Enviar arquivo
                  </span>
                </label>
                {errors.photo && <p className="text-sm text-danger-600">{errors.photo}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('aluno')}>
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!validatePhoto()) return
                      setStep('resumo')
                    }}
                  >
                    Continuar
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {step === 'resumo' && (
            <Card>
              <CardHeader>
                <h1 className="text-xl font-bold text-ink">Confirmar cadastro</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  Ao enviar, o dependente fica disponível para o reconhecimento facial, sem aprovação da
                  escola.
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Escola</dt>
                    <dd className="mt-1 text-ink">{schoolName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Dependente</dt>
                    <dd className="mt-1 text-ink">{childName || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">E-mail</dt>
                    <dd className="mt-1 text-ink">{email || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Mãe</dt>
                    <dd className="mt-1 text-ink">
                      {motherName || '—'} {motherPhone && `· ${motherPhone}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Pai</dt>
                    <dd className="mt-1 text-ink">
                      {fatherName || '—'} {fatherPhone && `· ${fatherPhone}`}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Foto</dt>
                    <dd className="mt-2">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Prévia"
                          className="h-28 w-28 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="text-ink">Não enviada</span>
                      )}
                    </dd>
                  </div>
                </dl>
                {submitError && (
                  <p className="rounded-lg border border-danger-600/20 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                    {submitError}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('foto')} disabled={submitting}>
                    Voltar
                  </Button>
                  <Button type="button" onClick={handleFinish} loading={submitting}>
                    Enviar cadastro
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {step === 'pronto' && (
            <Card>
              <CardHeader>
                <h1 className="text-xl font-bold text-ink">Cadastro concluído</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  {lastChildName || 'O dependente'} foi registrado em {schoolName} e a foto foi salva.
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                <p className="rounded-lg border border-success-600/20 bg-success-50 px-3 py-2 text-sm text-success-700">
                  {registeredCount} dependente(s) cadastrado(s) nesta sessão. Você já pode entrar com o
                  e-mail informado.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => {
                      resetChild()
                      setStep('aluno')
                    }}
                  >
                    Cadastrar outro dependente
                  </Button>
                  <Link to="/login">
                    <Button type="button" variant="outline">
                      Entrar no Olhar+IA
                    </Button>
                  </Link>
                </div>
                <Link to="/" className="inline-block text-sm font-semibold text-brand-700 hover:text-brand-800">
                  Voltar à página inicial
                </Link>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </PublicLayout>
  )
}
