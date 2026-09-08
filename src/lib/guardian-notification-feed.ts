import type { MovementType } from '../types/movement'

export type GuardianFeedItem = {
  id: string
  studentId: string
  studentName: string
  type: MovementType
  timeLabel: string
  createdAt: string
  source: 'exemplo' | 'demo'
}

const STORAGE_KEY = 'olhar-guardian-notification-feed'

function readFeed(): GuardianFeedItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GuardianFeedItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeFeed(items: GuardianFeedItem[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 40)))
}

export function listGuardianFeed(): GuardianFeedItem[] {
  return readFeed().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function addGuardianFeedItem(input: {
  studentId: string
  studentName: string
  type: MovementType
}): GuardianFeedItem {
  const now = new Date()
  const item: GuardianFeedItem = {
    id: `local-${now.getTime()}`,
    studentId: input.studentId,
    studentName: input.studentName,
    type: input.type,
    timeLabel: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    createdAt: now.toISOString(),
    source: 'demo',
  }
  writeFeed([item, ...readFeed()])
  return item
}

export function seedExampleFeed(students: Array<{ id: string; name: string }>): GuardianFeedItem[] {
  if (students.length === 0) return []
  const existing = readFeed()
  if (existing.length > 0) return existing

  const first = students[0]
  const second = students[1] ?? students[0]
  const samples: GuardianFeedItem[] = [
    {
      id: 'example-entrada',
      studentId: first.id,
      studentName: first.name,
      type: 'entrada',
      timeLabel: '07:42',
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      source: 'exemplo',
    },
    {
      id: 'example-saida',
      studentId: second.id,
      studentName: second.name,
      type: 'saida',
      timeLabel: '12:15',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      source: 'exemplo',
    },
  ]
  writeFeed(samples)
  return samples
}

export function clearGuardianFeed() {
  sessionStorage.removeItem(STORAGE_KEY)
}
