import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { ErrorState } from '../../components/feedback/ErrorState'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Modal,
  PageSkeleton,
  SearchInput,
  Select,
  Textarea,
  useToast,
} from '../../components/ui'
import { cn } from '../../lib/cn'
import { isValidEmail, maskCpf, maskPhone } from '../../lib/masks'
import { useAuth } from '../../contexts/AuthContext'
import { RequirePermission } from '../../routes/RequirePermission'
import {
  createStudent,
  getStudentById,
  updateStudent,
  userIdsFromGuardians,
  validateStudentPhoto,
} from '../../services/students'
import { enrollFaceFromImageFile } from '../../services/face-recognition'
import { listSchoolsForProfile } from '../../services/schools'
import { createGuardian, listGuardiansForProfile } from '../../services/guardians'
import type { School } from '../../types/school'
import type { Guardian } from '../../types/guardian'
import type { Student } from '../../types/student'
import {
  GUARDIAN_LINK_LABELS,
  STUDENT_GENDER_LABELS,
  STUDENT_SHIFT_LABELS,
  type GuardianLinkType,
  type StudentGender,
  type StudentShift,
} from '../../types/common'

type FormStep = 1 | 2 | 3

const SHIFT_OPTIONS = [
  { value: '', label: 'Selecione o turno…' },
  ...(Object.keys(STUDENT_SHIFT_LABELS) as StudentShift[]).map((key) => ({
    value: key,
    label: STUDENT_SHIFT_LABELS[key],
  })),
]

const GENDER_OPTIONS = (Object.keys(STUDENT_GENDER_LABELS) as StudentGender[]).map((key) => ({
  value: key,
  label: STUDENT_GENDER_LABELS[key],
}))

const STEPS: Array<{ id: FormStep; label: string; hint: string }> = [
  { id: 1, label: 'Escola', hint: 'Onde a criança estuda' },
  { id: 2, label: 'Responsável', hint: 'Família vinculada' },
  { id: 3, label: 'Aluno', hint: 'Dados para busca' },
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
  const [step, setStep] = useState<FormStep>(1)
  const [guardianSearch, setGuardianSearch] = useState('')

  const [name, setName] = useState('')
  const [gender, setGender] = useState<StudentGender>('masculino')
  const [birthDate, setBirthDate] = useState('')
  const [enrollmentCode, setEnrollmentCode] = useState('')
  const [className, setClassName] = useState('')
  const [shift, setShift] = useState<StudentShift | ''>('')
  const [notes, setNotes] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [guardianIds, setGuardianIds] = useState<string[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')

  const [guardianModalOpen, setGuardianModalOpen] = useState(false)
  const [creatingGuardian, setCreatingGuardian] = useState(false)
  const [guardianFormErrors, setGuardianFormErrors] = useState<Record<string, string>>({})
  const [newGuardianName, setNewGuardianName] = useState('')
  const [newGuardianCpf, setNewGuardianCpf] = useState('')
  const [newGuardianPhone, setNewGuardianPhone] = useState('')
  const [newGuardianEmail, setNewGuardianEmail] = useState('')
  const [newGuardianLink, setNewGuardianLink] = useState<GuardianLinkType>('pai')

  const resetGuardianForm = () => {
    setNewGuardianName('')
    setNewGuardianCpf('')
    setNewGuardianPhone('')
    setNewGuardianEmail('')
    setNewGuardianLink('pai')
    setGuardianFormErrors({})
  }

  const openGuardianModal = () => {
    resetGuardianForm()
    setGuardianModalOpen(true)
  }

  const handleCreateGuardian = async () => {
    const next: Record<string, string> = {}
    if (!newGuardianName.trim()) next.name = 'Informe o nome completo.'
    if (!newGuardianPhone.trim()) next.phone = 'Informe o telefone principal.'
    if (!schoolId) next.schoolId = 'Selecione a escola antes.'
    if (newGuardianEmail && !isValidEmail(newGuardianEmail)) next.email = 'E-mail inválido.'
    setGuardianFormErrors(next)
    if (Object.keys(next).length > 0) return

    setCreatingGuardian(true)
    try {
      const payload = {
        name: newGuardianName.trim(),
        cpf: newGuardianCpf,
        phonePrimary: newGuardianPhone,
        phoneSecondary: '',
        email: newGuardianEmail.trim().toLowerCase(),
        linkType: newGuardianLink,
        schoolId,
        status: 'ativo' as const,
        userId: '',
        isDemo: false,
      }
      const newId = await createGuardian(payload)
      const created: Guardian = {
        id: newId,
        ...payload,
        createdAt: null,
        updatedAt: null,
      }
      setGuardians((current) => [created, ...current])
      setGuardianIds((current) => (current.includes(newId) ? current : [...current, newId]))
      setGuardianSearch('')
      setGuardianModalOpen(false)
      resetGuardianForm()
      toast({
        variant: 'success',
        title: 'Responsável cadastrado',
        description: 'Já está selecionado neste aluno.',
      })
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Não foi possível cadastrar o responsável',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setCreatingGuardian(false)
    }
  }

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

        const defaultSchool = profile?.schoolId || ''
        if (!isEdit && defaultSchool) {
          setSchoolId(defaultSchool)
          setStep(2)
        }

        if (id) {
          const student = await getStudentById(id)
          if (!student) {
            setError('Aluno não encontrado.')
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
          setSchoolId(student.schoolId)
          setGuardianIds(student.guardianIds)
          setPhotoPreview('')
          setPhotoFile(null)
          setStep(3)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar formulário.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id, isEdit, profile?.schoolId])

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === schoolId) ?? null,
    [schools, schoolId],
  )

  const schoolGuardians = useMemo(() => {
    return guardians.filter((guardian) => {
      if (guardian.schoolId !== schoolId) return false
      return guardian.status === 'ativo' || guardianIds.includes(guardian.id)
    })
  }, [guardians, schoolId, guardianIds])

  const filteredGuardians = useMemo(() => {
    const q = guardianSearch.trim().toLowerCase()
    if (!q) return schoolGuardians
    return schoolGuardians.filter((guardian) => {
      const haystack = `${guardian.name} ${guardian.phonePrimary} ${guardian.email} ${guardian.cpf}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [schoolGuardians, guardianSearch])

  const selectedGuardians = useMemo(
    () => schoolGuardians.filter((guardian) => guardianIds.includes(guardian.id)),
    [schoolGuardians, guardianIds],
  )

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
    setErrors((current) => ({ ...current, guardianIds: '' }))
  }

  const handlePhotoChange = (file: File | null) => {
    if (!file) {
      setPhotoFile(null)
      return
    }
    try {
      validateStudentPhoto(file)
      setPhotoFile(file)
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

  const validateStep1 = () => {
    if (!schoolId) {
      setErrors({ schoolId: 'Selecione a escola antes de continuar.' })
      return false
    }
    setErrors({})
    return true
  }

  const validateStep2 = () => {
    if (guardianIds.length === 0) {
      setErrors({ guardianIds: 'Selecione pelo menos um responsável da escola.' })
      return false
    }
    setErrors({})
    return true
  }

  const validateStep3 = () => {
    const next: Record<string, string> = {}
    if (!enrollmentCode.trim()) next.enrollmentCode = 'Informe a matrícula.'
    if (!name.trim()) next.name = 'Informe o nome da criança.'
    if (!birthDate) {
      next.birthDate = 'Informe a data de nascimento.'
    } else {
      const parsed = new Date(`${birthDate}T00:00:00`)
      if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
        next.birthDate = 'Informe uma data de nascimento válida.'
      }
    }
    if (!className.trim()) next.className = 'Informe a turma.'
    if (!shift) next.shift = 'Selecione o turno.'
    if (!schoolId) next.schoolId = 'Selecione a escola.'
    if (guardianIds.length === 0) next.guardianIds = 'Vincule pelo menos um responsável.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const goToStep = (next: FormStep) => {
    if (next > 1 && !schoolId) {
      setErrors({ schoolId: 'Selecione a escola antes de continuar.' })
      setStep(1)
      return
    }
    if (next > 2 && guardianIds.length === 0) {
      setErrors({ guardianIds: 'Selecione pelo menos um responsável da escola.' })
      setStep(2)
      return
    }
    setErrors({})
    setStep(next)
  }

  const persistFaceTemplate = async (studentId: string, nextSchoolId: string, isNew: boolean) => {
    if (!photoFile) {
      return {
        faceEnrolled: existing?.faceEnrolled ?? false,
        faceTemplateCount: existing?.faceTemplateCount ?? 0,
      }
    }
    await enrollFaceFromImageFile({
      studentId,
      schoolId: nextSchoolId,
      file: photoFile,
      reenrollment: !isNew && Boolean(existing?.faceEnrolled),
    })
    return { faceEnrolled: true, faceTemplateCount: 1 }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validateStep3()) {
      setStep(3)
      return
    }

    setSubmitting(true)
    try {
      const base = {
        name: name.trim(),
        birthDate,
        enrollmentCode: enrollmentCode.trim(),
        className: className.trim(),
        shift,
        gender,
        notes: notes.trim(),
        schoolId,
        guardianIds,
        guardianUserIds: userIdsFromGuardians(guardians, guardianIds),
        isDemo: existing?.isDemo ?? false,
        photoUrl: '',
        photoPath: '',
      }

      if (isEdit && id && existing) {
        const faceFlags = await persistFaceTemplate(id, schoolId, false)
        await updateStudent(id, { ...base, ...faceFlags })
        toast({
          variant: 'success',
          title: photoFile ? 'Aluno atualizado · rosto vetorizado' : 'Aluno atualizado',
        })
        navigate(`/app/alunos/${id}`)
      } else {
        const newId = await createStudent({
          ...base,
          faceEnrolled: false,
          faceTemplateCount: 0,
          isDemo: false,
          status: 'ativo',
        })
        try {
          if (photoFile) await persistFaceTemplate(newId, schoolId, true)
        } catch (faceError) {
          toast({
            variant: 'warning',
            title: 'Aluno cadastrado sem vetorização',
            description: faceError instanceof Error ? faceError.message : undefined,
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
            description="Fluxo seguro: escola → responsável → dados do aluno. Matrícula, nome, nascimento, turma e turno são obrigatórios para localizar a criança depois."
            action={
              <Link to={isEdit && id ? `/app/alunos/${id}` : '/app/alunos'}>
                <Button variant="outline">Cancelar</Button>
              </Link>
            }
          />

          <nav aria-label="Etapas do cadastro" className="mb-6">
            <ol className="grid gap-2 sm:grid-cols-3">
              {STEPS.map((item) => {
                const active = step === item.id
                const done = step > item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => goToStep(item.id)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                        active
                          ? 'border-brand-600 bg-brand-50'
                          : done
                            ? 'border-line bg-surface hover:bg-surface-muted'
                            : 'border-line bg-surface-muted/60 text-ink-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                          active
                            ? 'bg-brand-700 text-white'
                            : done
                              ? 'bg-success-600 text-white'
                              : 'bg-surface text-ink-muted border border-line',
                        )}
                      >
                        {done ? '✓' : item.id}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink">{item.label}</span>
                        <span className="mt-0.5 block text-xs text-ink-muted">{item.hint}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {step === 1 && (
              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-ink">1. Selecione a escola</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    O responsável e o aluno ficam vinculados a esta instituição.
                  </p>
                </CardHeader>
                <CardBody className="space-y-4">
                  <Select
                    label="Escola"
                    value={schoolId}
                    onChange={(e) => {
                      setSchoolId(e.target.value)
                      setGuardianSearch('')
                      setErrors((current) => ({ ...current, schoolId: '' }))
                    }}
                    error={errors.schoolId}
                    disabled={submitting || (isEdit && !isGeneralAdmin)}
                    placeholder="Selecione a escola…"
                    options={schools.map((school) => ({
                      value: school.id,
                      label: school.tradeName || school.name,
                    }))}
                  />
                  {isEdit && !isGeneralAdmin && (
                    <p className="text-sm text-ink-muted">
                      Somente o dono do sistema pode transferir o aluno de escola.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        if (validateStep1()) setStep(2)
                      }}
                    >
                      Continuar para responsável
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-ink">2. Selecione o responsável</h2>
                      <p className="mt-1 text-sm text-ink-muted">
                        Busque pelo nome, telefone ou e-mail. O aviso e a comunicação vão para a
                        família, não para o aluno.
                      </p>
                    </div>
                    {selectedSchool && (
                      <Badge variant="neutral">{selectedSchool.tradeName || selectedSchool.name}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardBody className="space-y-4">
                  {!schoolId ? (
                    <p className="text-sm text-ink-muted">Volte e selecione a escola primeiro.</p>
                  ) : (
                    <>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <SearchInput
                          label="Buscar responsável"
                          placeholder="Nome, telefone ou e-mail…"
                          value={guardianSearch}
                          onChange={(e) => setGuardianSearch(e.target.value)}
                          disabled={submitting || creatingGuardian}
                          className="max-w-none"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={submitting || creatingGuardian || !schoolId}
                          onClick={openGuardianModal}
                          className="shrink-0 sm:mt-0"
                        >
                          Cadastrar responsável
                        </Button>
                      </div>

                      {selectedGuardians.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                            Selecionados ({selectedGuardians.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedGuardians.map((guardian) => (
                              <button
                                key={guardian.id}
                                type="button"
                                onClick={() => toggleGuardian(guardian.id)}
                                className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm text-brand-800"
                                title="Remover"
                              >
                                <span className="font-medium">{guardian.name}</span>
                                <span aria-hidden className="text-brand-600">
                                  ×
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {schoolGuardians.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-line px-4 py-6 text-sm text-ink-muted">
                          Nenhum responsável ativo nesta escola.{' '}
                          <button
                            type="button"
                            className="font-semibold text-brand-700 hover:text-brand-800"
                            onClick={openGuardianModal}
                          >
                            Cadastre um agora
                          </button>{' '}
                          para continuar.
                        </div>
                      ) : filteredGuardians.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-line px-4 py-5 text-sm text-ink-muted">
                          Nenhum responsável encontrado para “{guardianSearch}”.{' '}
                          <button
                            type="button"
                            className="font-semibold text-brand-700 hover:text-brand-800"
                            onClick={openGuardianModal}
                          >
                            Cadastrar este responsável
                          </button>
                        </div>
                      ) : (
                        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                          {filteredGuardians.map((guardian) => {
                            const selected = guardianIds.includes(guardian.id)
                            return (
                              <li key={guardian.id}>
                                <button
                                  type="button"
                                  onClick={() => toggleGuardian(guardian.id)}
                                  disabled={submitting}
                                  className={cn(
                                    'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                                    selected
                                      ? 'border-brand-600 bg-brand-50'
                                      : 'border-line bg-surface hover:bg-surface-muted',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs',
                                      selected
                                        ? 'border-brand-700 bg-brand-700 text-white'
                                        : 'border-line bg-surface text-transparent',
                                    )}
                                    aria-hidden
                                  >
                                    ✓
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="flex flex-wrap items-center gap-2">
                                      <span className="font-semibold text-ink">{guardian.name}</span>
                                      <Badge variant={guardian.status === 'ativo' ? 'success' : 'neutral'}>
                                        {GUARDIAN_LINK_LABELS[guardian.linkType]}
                                      </Badge>
                                      {guardian.status === 'inativo' && (
                                        <Badge variant="warning">Inativo</Badge>
                                      )}
                                    </span>
                                    <span className="mt-1 block text-sm text-ink-muted">
                                      {guardian.phonePrimary || guardian.email || 'Sem contato'}
                                      {guardian.phonePrimary && guardian.email
                                        ? ` · ${guardian.email}`
                                        : ''}
                                    </span>
                                  </span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}

                      {errors.guardianIds && (
                        <p className="text-sm text-danger-600">{errors.guardianIds}</p>
                      )}

                      <p className="text-xs text-ink-subtle">
                        Pode vincular mais de um responsável (pai e mãe, por exemplo).
                      </p>
                    </>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={submitting}>
                      Voltar
                    </Button>
                    <Button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        if (validateStep2()) setStep(3)
                      }}
                    >
                      Continuar para dados do aluno
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}

            {step === 3 && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-ink">3. Dados do aluno</h2>
                        <p className="mt-1 text-sm text-ink-muted">
                          Campos obrigatórios permitem localizar a criança por matrícula, turma e
                          turno.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedSchool && (
                          <Badge variant="neutral">
                            {selectedSchool.tradeName || selectedSchool.name}
                          </Badge>
                        )}
                        <Badge variant="brand">
                          {selectedGuardians.length === 1
                            ? selectedGuardians[0].name
                            : `${selectedGuardians.length} responsáveis`}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Matrícula *"
                        value={enrollmentCode}
                        onChange={(e) => setEnrollmentCode(e.target.value)}
                        error={errors.enrollmentCode}
                        disabled={submitting}
                        placeholder="Ex.: 2026-0142"
                        hint="Identificador único na escola"
                      />
                      <Input
                        label="Nome da criança *"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        error={errors.name}
                        disabled={submitting}
                      />
                      <Input
                        label="Data de nascimento *"
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        error={errors.birthDate}
                        disabled={submitting}
                      />
                      <Select
                        label="Menino ou menina"
                        value={gender}
                        onChange={(e) => setGender(e.target.value as StudentGender)}
                        disabled={submitting}
                        options={GENDER_OPTIONS}
                      />
                      <Input
                        label="Turma *"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        error={errors.className}
                        disabled={submitting}
                        placeholder="Ex.: 3º Ano A"
                      />
                      <Select
                        label="Turno *"
                        value={shift}
                        onChange={(e) => setShift(e.target.value as StudentShift | '')}
                        error={errors.shift}
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
                    {(errors.schoolId || errors.guardianIds) && (
                      <p className="mt-3 text-sm text-danger-600">
                        {errors.schoolId || errors.guardianIds}{' '}
                        <button
                          type="button"
                          className="font-semibold underline"
                          onClick={() => setStep(errors.schoolId ? 1 : 2)}
                        >
                          Corrigir
                        </button>
                      </p>
                    )}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h2 className="text-sm font-semibold text-ink">Rosto para reconhecimento</h2>
                    <p className="mt-1 text-sm text-ink-muted">Opcional neste momento.</p>
                  </CardHeader>
                  <CardBody>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="h-28 w-28 overflow-hidden rounded-xl border border-line bg-surface-muted">
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="Prévia temporária"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-ink-subtle">
                            {existing?.faceEnrolled ? 'Template ok' : 'Sem vetor'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <p className="text-sm text-ink-muted">
                          A imagem só serve para gerar o embedding. Não fica armazenada após o
                          cadastro.
                        </p>
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
                        {photoPreview && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPhotoFile(null)
                              setPhotoPreview('')
                            }}
                          >
                            Remover prévia
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={submitting}>
                    Voltar
                  </Button>
                  <Button type="submit" loading={submitting}>
                    {isEdit ? 'Salvar alterações' : 'Cadastrar aluno'}
                  </Button>
                </div>
              </>
            )}
          </form>

          <Modal
            open={guardianModalOpen}
            onClose={() => {
              if (creatingGuardian) return
              setGuardianModalOpen(false)
            }}
            title="Cadastrar responsável"
            description={
              selectedSchool
                ? `Será vinculado a ${selectedSchool.tradeName || selectedSchool.name}. Depois você volta ao cadastro do aluno.`
                : 'Selecione a escola antes de cadastrar o responsável.'
            }
            size="lg"
            footer={
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={creatingGuardian}
                  onClick={() => setGuardianModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  loading={creatingGuardian}
                  disabled={!schoolId}
                  onClick={() => void handleCreateGuardian()}
                >
                  Salvar e selecionar
                </Button>
              </>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nome completo *"
                value={newGuardianName}
                onChange={(e) => setNewGuardianName(e.target.value)}
                error={guardianFormErrors.name}
                disabled={creatingGuardian}
                autoFocus
              />
              <Select
                label="Tipo de vínculo *"
                value={newGuardianLink}
                onChange={(e) => setNewGuardianLink(e.target.value as GuardianLinkType)}
                disabled={creatingGuardian}
                options={(Object.keys(GUARDIAN_LINK_LABELS) as GuardianLinkType[]).map((key) => ({
                  value: key,
                  label: GUARDIAN_LINK_LABELS[key],
                }))}
              />
              <Input
                label="Telefone principal *"
                value={newGuardianPhone}
                onChange={(e) => setNewGuardianPhone(maskPhone(e.target.value))}
                error={guardianFormErrors.phone}
                disabled={creatingGuardian}
              />
              <Input
                label="E-mail"
                type="email"
                value={newGuardianEmail}
                onChange={(e) => setNewGuardianEmail(e.target.value)}
                error={guardianFormErrors.email}
                disabled={creatingGuardian}
                hint="Opcional"
              />
              <Input
                label="CPF"
                value={newGuardianCpf}
                onChange={(e) => setNewGuardianCpf(maskCpf(e.target.value))}
                disabled={creatingGuardian}
                hint="Opcional"
              />
            </div>
          </Modal>
        </div>
      )}
    </RequirePermission>
  )
}
