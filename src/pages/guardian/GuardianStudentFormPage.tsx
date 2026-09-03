import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { ErrorState } from '../../components/feedback/ErrorState'
import {
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
import type { Student } from '../../types/student'
import { STUDENT_SHIFT_LABELS, type StudentShift } from '../../types/common'

const SHIFT_OPTIONS = [
  { value: '', label: 'Não informado' },
  ...(Object.keys(STUDENT_SHIFT_LABELS) as StudentShift[]).map((key) => ({
    value: key,
    label: STUDENT_SHIFT_LABELS[key],
  })),
]

export function GuardianStudentFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [guardianId, setGuardianId] = useState('')
  const [existing, setExisting] = useState<Student | null>(null)

  const [name, setName] = useState('')
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
          setBirthDate(student.birthDate)
          setEnrollmentCode(student.enrollmentCode)
          setClassName(student.className)
          setShift(student.shift)
          setNotes(student.notes)
          setPhotoPreview(student.photoUrl)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar formulário.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id, profile])

  const handlePhotoChange = (file: File | null) => {
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
      if (existing?.photoPath) await deleteStudentPhoto(existing.photoPath)
      return { photoUrl: '', photoPath: '' }
    }
    if (photoFile) {
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
        notes: notes.trim(),
        schoolId,
        guardianIds: [guardianId],
        guardianUserIds: [profile.id],
        isDemo: existing?.isDemo ?? false,
      }

      if (isEdit && id && existing) {
        const photo = await persistPhoto(id, schoolId)
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
        } catch (photoError) {
          toast({
            variant: 'warning',
            title: 'Dependente cadastrado sem a foto',
            description: photoError instanceof Error ? photoError.message : undefined,
          })
          navigate(`/app/responsavel/alunos/${newId}`)
          return
        }
        toast({ variant: 'success', title: 'Dependente cadastrado' })
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
            description="Você pode cadastrar mais de um dependente. Cada criança fica vinculada à sua conta e à sua escola."
            action={
              <Link to={isEdit && id ? `/app/responsavel/alunos/${id}` : '/app/responsavel'}>
                <Button variant="outline">Cancelar</Button>
              </Link>
            }
          />

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink">Dados da criança</h2>
              </CardHeader>
              <CardBody>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Nome da criança"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={errors.name}
                    disabled={submitting}
                  />
                  <Input
                    label="Data de nascimento"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    error={errors.birthDate}
                    disabled={submitting}
                    hint="Opcional"
                  />
                  <Input
                    label="Matrícula"
                    value={enrollmentCode}
                    onChange={(e) => setEnrollmentCode(e.target.value)}
                    disabled={submitting}
                    hint="Opcional"
                  />
                  <Input
                    label="Turma"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    disabled={submitting}
                    hint="Opcional"
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
                      hint="Opcional"
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink">Foto de identificação</h2>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="h-28 w-28 overflow-hidden rounded-xl border border-line bg-surface-muted">
                    {photoPreview && !removePhoto ? (
                      <img src={photoPreview} alt="Foto do dependente" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-ink-subtle">Sem foto</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <Input
                      label="Enviar imagem"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      error={errors.photo}
                      disabled={submitting}
                      className="h-auto py-2"
                      onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
                      hint="JPG, PNG ou WEBP até 5 MB."
                    />
                    {photoPreview && !removePhoto && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPhotoFile(null)
                          setRemovePhoto(true)
                          setPhotoPreview('')
                        }}
                      >
                        Remover foto
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Button type="submit" loading={submitting}>
              {isEdit ? 'Salvar alterações' : 'Cadastrar dependente'}
            </Button>
          </form>
        </div>
      )}
    </RequirePermission>
  )
}
