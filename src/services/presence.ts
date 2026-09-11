import type { Movement } from '../types/movement'

export type PresenceStatus = 'presente' | 'sem_registro' | 'saiu'

export interface DayPresenceRow {
  studentId: string
  studentName: string
  enrollmentCode: string
  status: PresenceStatus
  lastEntryAt: Date | null
  lastExitAt: Date | null
  /** Dia local da presença (meia-noite). */
  day: Date
}

export function startOfLocalDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function toDateInputValue(date: Date) {
  const d = startOfLocalDay(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateInputValue(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return startOfLocalDay()
  return startOfLocalDay(new Date(y, m - 1, d))
}

export function formatPresenceDay(date: Date) {
  return startOfLocalDay(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function movementDate(m: Movement): Date | null {
  if (!m.occurredAt) return null
  return m.occurredAt.toDate()
}

function dayKey(date: Date) {
  return toDateInputValue(date)
}

/**
 * Deriva presença de um dia a partir das movimentações.
 * Por padrão inclui alunos sem registro; use `onlyWithEntry` para restringir a quem já entrou.
 */
export function deriveDayPresence(params: {
  students: Array<{ id: string; name: string; enrollmentCode?: string }>
  movements: Movement[]
  day?: Date
  /** Se true, omite alunos sem entrada no dia. */
  onlyWithEntry?: boolean
}): {
  rows: DayPresenceRow[]
  counts: { presentes: number; semRegistro: number; saidas: number; entradas: number }
} {
  const dayStart = startOfLocalDay(params.day)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const dayMovements = params.movements.filter((m) => {
    const at = movementDate(m)
    return at && at >= dayStart && at < dayEnd
  })

  const byStudent = new Map<
    string,
    { entries: Date[]; exits: Date[]; name: string; enrollmentCode: string }
  >()

  for (const student of params.students) {
    byStudent.set(student.id, {
      entries: [],
      exits: [],
      name: student.name,
      enrollmentCode: student.enrollmentCode || '',
    })
  }

  for (const m of dayMovements) {
    const at = movementDate(m)
    if (!at) continue
    const bucket = byStudent.get(m.studentId) ?? {
      entries: [],
      exits: [],
      name: m.studentName,
      enrollmentCode: '',
    }
    if (m.type === 'entrada') bucket.entries.push(at)
    else bucket.exits.push(at)
    byStudent.set(m.studentId, bucket)
  }

  let rows: DayPresenceRow[] = [...byStudent.entries()].map(([studentId, data]) => {
    const lastEntryAt = data.entries.sort((a, b) => b.getTime() - a.getTime())[0] ?? null
    const lastExitAt = data.exits.sort((a, b) => b.getTime() - a.getTime())[0] ?? null
    let status: PresenceStatus = 'sem_registro'
    if (lastEntryAt && (!lastExitAt || lastEntryAt > lastExitAt)) status = 'presente'
    else if (lastExitAt) status = 'saiu'

    return {
      studentId,
      studentName: data.name,
      enrollmentCode: data.enrollmentCode,
      status,
      lastEntryAt,
      lastExitAt,
      day: dayStart,
    }
  })

  if (params.onlyWithEntry) {
    rows = rows.filter((r) => r.lastEntryAt !== null)
  }

  rows.sort((a, b) => a.studentName.localeCompare(b.studentName, 'pt-BR'))

  const entradas = dayMovements.filter((m) => m.type === 'entrada').length
  const saidas = dayMovements.filter((m) => m.type === 'saida').length

  return {
    rows,
    counts: {
      presentes: rows.filter((r) => r.status === 'presente').length,
      semRegistro: rows.filter((r) => r.status === 'sem_registro').length,
      saidas,
      entradas,
    },
  }
}

/**
 * Presenças por aluno/dia em um intervalo (apenas quem teve entrada).
 */
export function derivePresenceRange(params: {
  students: Array<{ id: string; name: string; enrollmentCode?: string }>
  movements: Movement[]
  from: Date
  to: Date
}): {
  rows: DayPresenceRow[]
  counts: { presentes: number; semRegistro: number; saidas: number; entradas: number }
} {
  const from = startOfLocalDay(params.from)
  const to = startOfLocalDay(params.to)
  const studentMap = new Map(params.students.map((s) => [s.id, s]))

  const byDayStudent = new Map<
    string,
    { day: Date; studentId: string; entries: Date[]; exits: Date[]; name: string; enrollmentCode: string }
  >()

  for (const m of params.movements) {
    const at = movementDate(m)
    if (!at) continue
    const day = startOfLocalDay(at)
    if (day < from || day > to) continue

    const key = `${dayKey(day)}:${m.studentId}`
    const student = studentMap.get(m.studentId)
    const bucket = byDayStudent.get(key) ?? {
      day,
      studentId: m.studentId,
      entries: [],
      exits: [],
      name: student?.name || m.studentName,
      enrollmentCode: student?.enrollmentCode || '',
    }
    if (m.type === 'entrada') bucket.entries.push(at)
    else bucket.exits.push(at)
    byDayStudent.set(key, bucket)
  }

  const rows: DayPresenceRow[] = [...byDayStudent.values()]
    .map((data) => {
      const lastEntryAt = data.entries.sort((a, b) => b.getTime() - a.getTime())[0] ?? null
      const lastExitAt = data.exits.sort((a, b) => b.getTime() - a.getTime())[0] ?? null
      let status: PresenceStatus = 'sem_registro'
      if (lastEntryAt && (!lastExitAt || lastEntryAt > lastExitAt)) status = 'presente'
      else if (lastExitAt) status = 'saiu'

      return {
        studentId: data.studentId,
        studentName: data.name,
        enrollmentCode: data.enrollmentCode,
        status,
        lastEntryAt,
        lastExitAt,
        day: data.day,
      }
    })
    .filter((r) => r.lastEntryAt !== null)
    .sort((a, b) => {
      const byDay = b.day.getTime() - a.day.getTime()
      if (byDay !== 0) return byDay
      return a.studentName.localeCompare(b.studentName, 'pt-BR')
    })

  const inRange = params.movements.filter((m) => {
    const at = movementDate(m)
    if (!at) return false
    const day = startOfLocalDay(at)
    return day >= from && day <= to
  })

  return {
    rows,
    counts: {
      presentes: rows.filter((r) => r.status === 'presente').length,
      semRegistro: 0,
      saidas: inRange.filter((m) => m.type === 'saida').length,
      entradas: inRange.filter((m) => m.type === 'entrada').length,
    },
  }
}

export function formatMovementTime(at: Date | null) {
  if (!at) return '—'
  return at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
