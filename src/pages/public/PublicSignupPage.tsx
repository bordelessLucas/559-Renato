import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PublicLayout } from '../../layouts/PublicLayout'
import { Badge, Button, Card, CardBody, CardHeader, Input } from '../../components/ui'
import { maskPhone } from '../../lib/masks'

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
  if (current === 'pronto') {
    return null
  }

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
  const schoolName = searchParams.get('escola')?.trim() || 'esta escola'

  const [step, setStep] = useState<Step>('inicio')
  const [motherName, setMotherName] = useState('')
  const [motherPhone, setMotherPhone] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [fatherPhone, setFatherPhone] = useState('')
  const [childName, setChildName] = useState('')
  const [photoLabel, setPhotoLabel] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [registeredCount, setRegisteredCount] = useState(0)

  const signupHint = useMemo(
    () => (schoolId ? `Cadastro vinculado à escola (${schoolId.slice(0, 6)}…)` : 'Cadastro da escola'),
    [schoolId],
  )

  const resetChild = () => {
    setChildName('')
    setPhotoLabel('')
    setPhotoPreview('')
    setErrors({})
  }

  const validateGuardian = () => {
    const next: Record<string, string> = {}
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

  const handlePhotoFile = (file: File | null) => {
    if (!file) return
    setPhotoLabel(file.name)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const simulateCamera = () => {
    setPhotoLabel('Foto capturada pela câmera (simulação)')
    setPhotoPreview('')
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

  const finishPreview = () => {
    setRegisteredCount((count) => count + 1)
    setStep('pronto')
  }

  return (
    <PublicLayout>
      <div className="page-container py-8 sm:py-12">
        <div className="mx-auto max-w-xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="warning">Prévia do fluxo</Badge>
            <Badge variant="brand">{schoolName}</Badge>
          </div>

          <Stepper current={step} />

          {step === 'inicio' && (
            <Card>
              <CardHeader>
                <h1 className="text-xl font-bold text-ink">Cadastro do dependente</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  Você está cadastrando um dependente em {schoolName}. O cadastro já chega associado a esta escola.
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                <ol className="space-y-3 text-sm text-ink-muted">
                  <li>
                    <strong className="text-ink">1. Escola já selecionada</strong>
                    <p>Este link ou QR Code já indica a escola do cadastro.</p>
                  </li>
                  <li>
                    <strong className="text-ink">2. Seus dados</strong>
                    <p>Informe nome e telefone da mãe e do pai, usados nas notificações de entrada e saída.</p>
                  </li>
                  <li>
                    <strong className="text-ink">3. Dados da criança</strong>
                    <p>Você pode cadastrar um ou mais dependentes na mesma escola.</p>
                  </li>
                  <li>
                    <strong className="text-ink">4. Foto para reconhecimento</strong>
                    <p>Na versão final, a imagem entra na base usada pelas câmeras da escola.</p>
                  </li>
                </ol>
                <p className="text-xs text-ink-subtle">{signupHint}. Nenhum dado desta prévia é salvo.</p>
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
                  Informações usadas para avisar a família na entrada e na saída.
                </p>
              </CardHeader>
              <CardBody>
                <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleGuardianSubmit} noValidate>
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
                  Na versão final a câmera do celular captura a face. Nesta prévia você só vê o passo.
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-surface-muted">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Prévia da foto" className="h-full w-full object-cover" />
                  ) : (
                    <p className="px-6 text-center text-sm text-ink-muted">
                      {photoLabel || 'A captura da face aparecerá aqui.'}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="secondary" onClick={simulateCamera}>
                    Simular captura pela câmera
                  </Button>
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
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('aluno')}>
                    Voltar
                  </Button>
                  <Button type="button" onClick={() => setStep('resumo')}>
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
                  Na versão final este envio deixa o dependente disponível para o reconhecimento facial, sem
                  aprovação da escola.
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
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Mãe</dt>
                    <dd className="mt-1 text-ink">{motherName || '—'} {motherPhone && `· ${motherPhone}`}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Pai</dt>
                    <dd className="mt-1 text-ink">{fatherName || '—'} {fatherPhone && `· ${fatherPhone}`}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Foto</dt>
                    <dd className="mt-1 text-ink">{photoLabel || 'Não enviada nesta prévia'}</dd>
                  </div>
                </dl>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('foto')}>
                    Voltar
                  </Button>
                  <Button type="button" onClick={finishPreview}>
                    Enviar cadastro
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {step === 'pronto' && (
            <Card>
              <CardHeader>
                <h1 className="text-xl font-bold text-ink">Cadastro enviado</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  Fluxo concluído. Na versão final, {childName || 'o dependente'} ficaria disponível para as
                  câmeras da {schoolName}.
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                <p className="rounded-lg border border-warning-600/20 bg-warning-50 px-3 py-2 text-sm text-warning-700">
                  Prévia: nenhum registro foi gravado no sistema. {registeredCount} envio(s) simulado(s)
                  nesta sessão.
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetChild()
                      setStep('inicio')
                    }}
                  >
                    Recomeçar fluxo
                  </Button>
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
