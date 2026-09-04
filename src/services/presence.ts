import type { Movement } from '../types/movement'

export type PresenceStatus = 'presente' | 'sem_registro' | 'saiu'

export interface DayPresenceRow {
  studentId: string
  studentName: string
  status: PresenceStatus
  lastEntryAt: Date | null
  lastExitAt: Date | null
}

function startOfLocalDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function movementDate(m: Movement): Date | null {
  if (!m.occurredAt) return null
  return m.occurredAt.toDate()
}

/**
 * Deriva presença do dia a partir das movimentações (Sprint 7).
 * Sem movimentações, todos ficam como "sem_registro" quando a lista de alunos é fornecida.
 */
export function deriveDayPresence(params: {
  students: Array<{ id: string; name: string }>
  movements: Movement[]
  day?: Date
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

  const byStudent = new Map<string, { entries: Date[]; exits: Date[]; name: string }>()

  for (const student of params.students) {
    byStudent.set(student.id, { entries: [], exits: [], name: student.name })
  }

  for (const m of dayMovements) {
    const at = movementDate(m)
    if (!at) continue
    const bucket = byStudent.get(m.studentId) ?? {
      entries: [],
      exits: [],
      name: m.studentName,
    }
    if (m.type === 'entrada') bucket.entries.push(at)
    else bucket.exits.push(at)
    byStudent.set(m.studentId, bucket)
  }

  const rows: DayPresenceRow[] = [...byStudent.entries()].map(([studentId, data]) => {
    const lastEntryAt = data.entries.sort((a, b) => b.getTime() - a.getTime())[0] ?? null
    const lastExitAt = data.exits.sort((a, b) => b.getTime() - a.getTime())[0] ?? null
    let status: PresenceStatus = 'sem_registro'
    if (lastEntryAt && (!lastExitAt || lastEntryAt > lastExitAt)) status = 'presente'
    else if (lastExitAt) status = 'saiu'

    return {
      studentId,
      studentName: data.name,
      status,
      lastEntryAt,
      lastExitAt,
    }
  })

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

export function formatMovementTime(at: Date | null) {
  if (!at) return '—'
  return at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
