import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { ErrorState } from '../../components/feedback/ErrorState'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Input,
  PageSkeleton,
  Select,
  Textarea,
  useToast,
} from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { RequirePermission } from '../../routes/RequirePermission'
import {
  createStudent,
  deleteStudentPhoto,
  getStudentById,
  relocateStudentPhoto,
  updateStudent,
  uploadStudentPhoto,
  userIdsFromGuardians,
  validateStudentPhoto,
} from '../../services/students'
import { listSchoolsForProfile } from '../../services/schools'
import { listGuardiansForProfile } from '../../services/guardians'
import type { School } from '../../types/school'
import type { Guardian } from '../../types/guardian'
import type { Student } from '../../types/student'
import { STUDENT_SHIFT_LABELS, type StudentShift } from '../../types/common'

const SHIFT_OPTIONS = [
  { value: '', label: 'Não informado' },
  ...(Object.keys(STUDENT_SHIFT_LABELS) as StudentShift[]).map((key) => ({
    value: key,
    label: STUDENT_SHIFT_LABELS[key],
  })),
]

export function StudentFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { canManageStudents, isGeneralAdmin, profile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [schools, setSchools] = useState<School[]>([])
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [existing, setExisting] = useState<Student | null>(null)

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [enrollmentCode, setEnrollmentCode] = useState('')
  const [className, setClassName] = useState('')
  const [shift, setShift] = useState<StudentShift | ''>('')
  const [notes, setNotes] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [guardianIds, setGuardianIds] = useState<string[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [removePhoto, setRemovePhoto] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [schoolList, guardianList] = await Promise.all([
          listSchoolsForProfile(profile!),
          listGuardiansForProfile(profile!),
        ])
        setSchools(schoolList.filter((school) => school.status === 'ativo'))
        setGuardians(guardianList)

        if (!isEdit && profile?.schoolId) setSchoolId(profile.schoolId)

        if (id) {
          const student = await getStudentById(id)
          if (!student) {
            setError('Aluno não encontrado.')
            return
          }
          setExisting(student)
          setName(student.name)
          setBirthDate(student.birthDate)
          setEnrollmentCode(student.enrollmentCode)
          setClassName(student.className)
          setShift(student.shift)
          setNotes(student.notes)
          setSchoolId(student.schoolId)
          setGuardianIds(student.guardianIds)
          setPhotoPreview(student.photoUrl)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar formulário.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id, isEdit, profile?.schoolId])

  const schoolGuardians = useMemo(() => {
    return guardians.filter((guardian) => {
      if (guardian.schoolId !== schoolId) return false
      return guardian.status === 'ativo' || guardianIds.includes(guardian.id)
    })
  }, [guardians, schoolId, guardianIds])

  useEffect(() => {
    if (guardians.length === 0) return
    setGuardianIds((current) =>
      current.filter((guardianId) =>
        guardians.some((guardian) => guardian.id === guardianId && guardian.schoolId === schoolId),
      ),
    )
  }, [schoolId, guardians])

  const toggleGuardian = (guardianId: string) => {
    setGuardianIds((current) =>
      current.includes(guardianId)
        ? current.filter((item) => item !== guardianId)
        : [...current, guardianId],
    )
  }

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
    if (!schoolId) next.schoolId = 'Selecione a escola.'
    if (guardianIds.length === 0) next.guardianIds = 'Vincule pelo menos um responsável da mesma escola.'
    if (birthDate) {
      const parsed = new Date(`${birthDate}T00:00:00`)
      if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
        next.birthDate = 'Informe uma data de nascimento válida.'
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const persistPhoto = async (studentId: string, nextSchoolId: string) => {
    if (removePhoto) {
      if (existing?.photoPath) await deleteStudentPhoto(existing.photoPath)
      return { photoUrl: '', photoPath: '' }
    }

    if (photoFile) {
      if (existing?.photoPath) {
        try {
          await deleteStudentPhoto(existing.photoPath)
        } catch {
          // a foto anterior pode já ter sido removida
        }
      }
      return uploadStudentPhoto(studentId, nextSchoolId, photoFile)
    }

    if (existing?.photoPath && existing.schoolId !== nextSchoolId) {
      return relocateStudentPhoto(existing, nextSchoolId)
    }

    return {
      photoUrl: existing?.photoUrl || '',
      photoPath: existing?.photoPath || '',
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const base = {
        name: name.trim(),
        birthDate,
        enrollmentCode: enrollmentCode.trim(),
        className: className.trim(),
        shift,
        notes: notes.trim(),
        schoolId,
        guardianIds,
        guardianUserIds: userIdsFromGuardians(guardians, guardianIds),
        isDemo: existing?.isDemo ?? false,
      }

      if (isEdit && id && existing) {
        const photo = await persistPhoto(id, schoolId)
        await updateStudent(id, { ...base, ...photo })
        toast({ variant: 'success', title: 'Aluno atualizado' })
        navigate(`/app/alunos/${id}`)
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
            title: 'Aluno cadastrado sem a foto',
            description: photoError instanceof Error ? photoError.message : undefined,
          })
          navigate(`/app/alunos/${newId}`)
          return
        }
        toast({ variant: 'success', title: 'Aluno cadastrado' })
        navigate(`/app/alunos/${newId}`)
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
    <RequirePermission allowed={canManageStudents}>
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState description={error} onRetry={() => navigate('/app/alunos')} />
      ) : (
        <div>
          <PageHeader
            title={isEdit ? 'Editar aluno' : 'Novo aluno'}
            description="Informe nome, escola e responsáveis. A foto de identificação pode ser enviada agora; a captura por câmera entra depois."
            action={
              <Link to={isEdit && id ? `/app/alunos/${id}` : '/app/alunos'}>
                <Button variant="outline">Cancelar</Button>
              </Link>
            }
          />

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink">Dados do aluno</h2>
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
                      hint="Opcional. Evite dados desnecessários."
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
                      <img src={photoPreview} alt="Foto do aluno" className="h-full w-full object-cover" />
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
                      hint="JPG, PNG ou WEBP até 5 MB. Sem uso de câmera nesta etapa."
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

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink">Escola e responsáveis</h2>
              </CardHeader>
              <CardBody>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Escola"
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    error={errors.schoolId}
                    disabled={submitting || (isEdit && !isGeneralAdmin)}
                    placeholder="Selecione"
                    options={schools.map((school) => ({
                      value: school.id,
                      label: school.tradeName || school.name,
                    }))}
                  />
                  <p className="self-end text-sm text-ink-muted">
                    {isEdit && !isGeneralAdmin
                      ? 'Somente o administrador geral pode transferir o aluno de escola.'
                      : 'Ao trocar a escola, os responsáveis de outra instituição são desvinculados.'}
                  </p>

                  <div className="sm:col-span-2">
                    <p className="mb-2 text-sm font-medium text-ink">Responsáveis</p>
                    {!schoolId ? (
                      <p className="text-sm text-ink-muted">Selecione a escola para listar os responsáveis.</p>
                    ) : schoolGuardians.length === 0 ? (
                      <p className="text-sm text-ink-muted">
                        Nenhum responsável ativo nesta escola.{' '}
                        <Link to="/app/responsaveis/novo" className="font-semibold text-brand-700 hover:text-brand-800">
                          Cadastrar responsável
                        </Link>
                      </p>
                    ) : (
                      <div className="grid gap-3 rounded-lg border border-line bg-surface-muted p-4 sm:grid-cols-2">
                        {schoolGuardians.map((guardian) => (
                          <Checkbox
                            key={guardian.id}
                            id={`guardian-${guardian.id}`}
                            label={guardian.name}
                            description={
                              guardian.status === 'inativo'
                                ? 'Inativo'
                                : guardian.phonePrimary || guardian.email || undefined
                            }
                            checked={guardianIds.includes(guardian.id)}
                            onChange={() => toggleGuardian(guardian.id)}
                            disabled={submitting}
                          />
                        ))}
                      </div>
                    )}
                    {errors.guardianIds && (
                      <p className="mt-2 text-sm text-danger-600">{errors.guardianIds}</p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Button type="submit" loading={submitting}>
              {isEdit ? 'Salvar alterações' : 'Cadastrar aluno'}
            </Button>
          </form>
        </div>
      )}
    </RequirePermission>
  )
}
