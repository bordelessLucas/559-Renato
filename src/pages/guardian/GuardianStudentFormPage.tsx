import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { ErrorState } from '../../components/feedback/ErrorState'
import { CameraCapture } from '../../components/public/CameraCapture'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  PageSkeleton,
  Select,
  Textarea,
  useToast,
} from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { RequirePermission } from '../../routes/RequirePermission'
import { getGuardianByUserId } from '../../services/guardians'
import {
  createStudent,
  deleteStudentPhoto,
  getStudentById,
  updateStudent,
  uploadStudentPhoto,
  validateStudentPhoto,
} from '../../services/students'
import { isGuardianUser } from '../../lib/permissions'
import { isStorageEnabled, STORAGE_PENDING_MESSAGE } from '../../lib/storage-config'
import type { Student } from '../../types/student'
import { STUDENT_GENDER_LABELS, STUDENT_SHIFT_LABELS, type StudentGender, type StudentShift } from '../../types/common'

const SHIFT_OPTIONS = [
  { value: '', label: 'Não informado' },
  ...(Object.keys(STUDENT_SHIFT_LABELS) as StudentShift[]).map((key) => ({
    value: key,
    label: STUDENT_SHIFT_LABELS[key],
  })),
]

const GENDER_OPTIONS = (Object.keys(STUDENT_GENDER_LABELS) as StudentGender[]).map((key) => ({
  value: key,
  label: STUDENT_GENDER_LABELS[key],
}))

export function GuardianStudentFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { profile, schoolName } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const storageEnabled = isStorageEnabled()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [guardianId, setGuardianId] = useState('')
  const [existing, setExisting] = useState<Student | null>(null)
  const [showExtras, setShowExtras] = useState(false)

  const [name, setName] = useState('')
  const [gender, setGender] = useState<StudentGender>('masculino')
  const [birthDate, setBirthDate] = useState('')
  const [enrollmentCode, setEnrollmentCode] = useState('')
  const [className, setClassName] = useState('')
  const [shift, setShift] = useState<StudentShift | ''>('')
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [removePhoto, setRemovePhoto] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      setLoading(true)
      setError('')
      try {
        const guardian = await getGuardianByUserId(profile.id)
        if (!guardian || guardian.status !== 'ativo') {
          setError('Não encontramos seu cadastro de responsável ativo nesta escola.')
          return
        }
        setGuardianId(guardian.id)

        if (id) {
          const student = await getStudentById(id)
          if (!student || !student.guardianUserIds.includes(profile.id)) {
            setError('Dependente não encontrado ou sem vínculo com a sua conta.')
            return
          }
          setExisting(student)
          setName(student.name)
          setGender(student.gender === 'feminino' ? 'feminino' : 'masculino')
          setBirthDate(student.birthDate)
          setEnrollmentCode(student.enrollmentCode)
          setClassName(student.className)
          setShift(student.shift)
          setNotes(student.notes)
          setPhotoPreview(student.photoUrl)
          if (student.birthDate || student.enrollmentCode || student.className || student.shift || student.notes) {
            setShowExtras(true)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar formulário.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id, profile])

  const applyPhotoFile = (file: File | null) => {
    if (!file) {
      setPhotoFile(null)
      return
    }
    try {
      validateStudentPhoto(file)
      setPhotoFile(file)
      setRemovePhoto(false)
      setPhotoPreview(URL.createObjectURL(file))
      setErrors((current) => ({ ...current, photo: '' }))
    } catch (err) {
      setPhotoFile(null)
      setErrors((current) => ({
        ...current,
        photo: err instanceof Error ? err.message : 'Imagem inválida.',
      }))
    }
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Informe o nome da criança.'
    if (birthDate) {
      const parsed = new Date(`${birthDate}T00:00:00`)
      if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
        next.birthDate = 'Informe uma data de nascimento válida.'
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const persistPhoto = async (studentId: string, schoolId: string) => {
    if (removePhoto) {
      if (existing?.photoPath && storageEnabled) await deleteStudentPhoto(existing.photoPath)
      return { photoUrl: '', photoPath: '' }
    }
    if (photoFile) {
      if (!storageEnabled) {
        throw new Error(STORAGE_PENDING_MESSAGE)
      }
      if (existing?.photoPath) {
        try {
          await deleteStudentPhoto(existing.photoPath)
        } catch {
          // ignore
        }
      }
      return uploadStudentPhoto(studentId, schoolId, photoFile)
    }
    return {
      photoUrl: existing?.photoUrl || '',
      photoPath: existing?.photoPath || '',
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate() || !profile || !guardianId) return

    setSubmitting(true)
    try {
      const schoolId = profile.schoolId
      const base = {
        name: name.trim(),
        birthDate,
        enrollmentCode: enrollmentCode.trim(),
        className: className.trim(),
        shift,
        gender,
        notes: notes.trim(),
        schoolId,
        guardianIds: [guardianId],
        guardianUserIds: [profile.id],
        isDemo: existing?.isDemo ?? false,
      }

      if (isEdit && id && existing) {
        let photo = {
          photoUrl: existing.photoUrl || '',
          photoPath: existing.photoPath || '',
        }
        try {
          photo = await persistPhoto(id, schoolId)
        } catch (photoError) {
          toast({
            variant: 'warning',
            title: 'Dados salvos; foto não enviada',
            description: photoError instanceof Error ? photoError.message : undefined,
          })
          await updateStudent(id, {
            ...base,
            status: existing.status,
            guardianIds: existing.guardianIds.includes(guardianId)
              ? existing.guardianIds
              : [...existing.guardianIds, guardianId],
            guardianUserIds: existing.guardianUserIds.includes(profile.id)
              ? existing.guardianUserIds
              : [...existing.guardianUserIds, profile.id],
          })
          navigate(`/app/responsavel/alunos/${id}`)
          return
        }
        await updateStudent(id, {
          ...base,
          ...photo,
          status: existing.status,
          guardianIds: existing.guardianIds.includes(guardianId)
            ? existing.guardianIds
            : [...existing.guardianIds, guardianId],
          guardianUserIds: existing.guardianUserIds.includes(profile.id)
            ? existing.guardianUserIds
            : [...existing.guardianUserIds, profile.id],
        })
        toast({ variant: 'success', title: 'Dependente atualizado' })
        navigate(`/app/responsavel/alunos/${id}`)
      } else {
        const newId = await createStudent({
          ...base,
          photoUrl: '',
          photoPath: '',
          isDemo: false,
          status: 'ativo',
        })
        try {
          const photo = await persistPhoto(newId, schoolId)
          if (photo.photoUrl) await updateStudent(newId, photo)
          toast({ variant: 'success', title: 'Dependente cadastrado' })
        } catch (photoError) {
          toast({
            variant: 'warning',
            title: 'Dependente cadastrado',
            description:
              photoError instanceof Error
                ? photoError.message
                : 'Cadastro ok. A foto pode ficar pendente nesta fase.',
          })
        }
        navigate(`/app/responsavel/alunos/${newId}`)
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
    <RequirePermission allowed={isGuardianUser(profile)}>
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState description={error} onRetry={() => navigate('/app/responsavel')} />
      ) : (
        <div>
          <PageHeader
            title={isEdit ? 'Editar dependente' : 'Cadastrar dependente'}
            description={`Escola: ${schoolName}. Informe o nome da criança — demais dados são opcionais.`}
            action={
              <Link to={isEdit && id ? `/app/responsavel/alunos/${id}` : '/app/responsavel'}>
                <Button variant="outline">Cancelar</Button>
              </Link>
            }
          />

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink">Quem é a criança?</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Esse nome aparece nas futuras notificações de entrada e saída.
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                <Input
                  label="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={errors.name}
                  disabled={submitting}
                  autoFocus
                  placeholder="Ex.: Ana Silva"
                />
                <Select
                  label="Menino ou menina"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as StudentGender)}
                  disabled={submitting}
                  options={GENDER_OPTIONS}
                />
                <p className="text-xs text-ink-muted">
                  Sem foto, usamos um ícone de perfil (boneco) correspondente nos avisos.
                </p>
                <button
                  type="button"
                  className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                  onClick={() => setShowExtras((value) => !value)}
                >
                  {showExtras ? 'Ocultar dados opcionais' : 'Incluir turma, turno e outros dados (opcional)'}
                </button>
                {showExtras && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Data de nascimento"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      error={errors.birthDate}
                      disabled={submitting}
                    />
                    <Input
                      label="Matrícula"
                      value={enrollmentCode}
                      onChange={(e) => setEnrollmentCode(e.target.value)}
                      disabled={submitting}
                    />
                    <Input
                      label="Turma"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      disabled={submitting}
                    />
                    <Select
                      label="Turno"
                      value={shift}
                      onChange={(e) => setShift(e.target.value as StudentShift | '')}
                      disabled={submitting}
                      options={SHIFT_OPTIONS}
                    />
                    <div className="sm:col-span-2">
                      <Textarea
                        label="Observações"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-ink">Foto do rosto</h2>
                <Badge variant={storageEnabled ? 'brand' : 'warning'}>
                  {storageEnabled ? 'Recomendada' : 'Opcional agora'}
                </Badge>
              </CardHeader>
              <CardBody className="space-y-4">
                <p className="text-sm text-ink-muted">
                  {storageEnabled
                    ? 'Use uma foto nítida, de frente, para o reconhecimento nas câmeras da escola.'
                    : 'Nesta fase a foto não é obrigatória. Você pode capturar para validar o fluxo visual; o envio permanente depende do Storage.'}
                </p>
                {!storageEnabled && (
                  <p className="rounded-lg border border-warning-600/20 bg-warning-50 px-3 py-2 text-xs text-warning-700">
                    {STORAGE_PENDING_MESSAGE}
                  </p>
                )}
                <CameraCapture
                  previewUrl={photoPreview && !removePhoto ? photoPreview : ''}
                  onCapture={(file, url) => {
                    if (photoPreview) URL.revokeObjectURL(photoPreview)
                    setPhotoFile(file)
                    setPhotoPreview(url)
                    setRemovePhoto(false)
                    setErrors((current) => ({ ...current, photo: '' }))
                  }}
                  onClear={() => {
                    if (photoPreview) URL.revokeObjectURL(photoPreview)
                    setPhotoFile(null)
                    setPhotoPreview('')
                    setRemovePhoto(true)
                  }}
                />
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={submitting}
                    onChange={(e) => applyPhotoFile(e.target.files?.[0] ?? null)}
                  />
                  <span className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted">
                    Escolher arquivo
                  </span>
                </label>
                {errors.photo && <p className="text-sm text-danger-600">{errors.photo}</p>}
              </CardBody>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={submitting} size="lg">
                {isEdit ? 'Salvar alterações' : 'Salvar dependente'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={submitting}
                onClick={() => navigate('/app/responsavel')}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}
    </RequirePermission>
  )
}
