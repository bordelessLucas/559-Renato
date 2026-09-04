import { useEffect, useState } from 'react'
import { EmptyState } from '../components/feedback/EmptyState'
import { PageHeader } from '../components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { MovementNotificationCard } from '../components/notifications/MovementNotificationCard'
import { useAuth } from '../contexts/AuthContext'
import { listStudentsForProfile } from '../services/students'
import { listMovementsForProfile } from '../services/movements'
import { deriveDayPresence } from '../services/presence'
import { getFaceRecognitionProvider } from '../services/face-recognition'
import { getNotificationProvider } from '../services/notifications'
import type { Movement } from '../types/movement'

export function DashboardPage() {
  const { isGeneralAdmin, profile, schoolName } = useAuth()
  const role = profile?.role
  const faceProvider = getFaceRecognitionProvider()
  const notificationProvider = getNotificationProvider()

  const [counts, setCounts] = useState({
    presentes: 0,
    semRegistro: 0,
    entradas: 0,
    saidas: 0,
  })
  const [recent, setRecent] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!profile) return
      setLoading(true)
      try {
        const [students, movements] = await Promise.all([
          listStudentsForProfile(profile),
          listMovementsForProfile(profile, 40),
        ])
        if (cancelled) return
        const presence = deriveDayPresence({
          students: students.map((s) => ({ id: s.id, name: s.name })),
          movements,
        })
        setCounts(presence.counts)
        setRecent(movements.slice(0, 8))
      } catch {
        if (!cancelled) {
          setCounts({ presentes: 0, semRegistro: 0, entradas: 0, saidas: 0 })
          setRecent([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [profile])

  const copy =
    role === 'operador'
      ? {
          title: 'Painel do operador',
          description: 'Consulte presença e movimentações do dia na sua escola.',
          emptyTitle: 'Nenhuma movimentação no momento',
          emptyDescription:
            'Quando as câmeras registrarem entradas e saídas, o resumo do dia aparece aqui.',
        }
      : role === 'administrador_escola'
        ? {
            title: 'Painel da escola',
            description: 'Acompanhe cadastros, presença e comunicados da sua instituição.',
            emptyTitle: 'Nenhuma atividade recente',
            emptyDescription: 'Cadastros e movimentações da sua escola aparecem aqui.',
          }
        : isGeneralAdmin
          ? {
              title: 'Painel geral',
              description: 'Visão da operação em todas as escolas do Olhar+IA.',
              emptyTitle: 'Nenhuma atividade recente',
              emptyDescription: 'Quando houver cadastros e movimentações, o resumo aparece aqui.',
            }
          : {
              title: 'Painel',
              description: 'Acompanhe a operação da escola.',
              emptyTitle: 'Nenhuma atividade recente',
              emptyDescription: 'O resumo operacional aparece aqui.',
            }

  const metrics = [
    { label: 'Entradas hoje', value: counts.entradas },
    { label: 'Saídas hoje', value: counts.saidas },
    { label: 'Presentes', value: counts.presentes },
    {
      label: role === 'operador' ? 'Sem registro' : 'Alertas',
      value: role === 'operador' ? counts.semRegistro : '—',
    },
  ]

  return (
    <div>
      <PageHeader title={copy.title} description={copy.description} />

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-muted">
          Facial: <strong className="text-ink">{faceProvider.label}</strong>
          {faceProvider.ready ? '' : ' (bloqueado — aguardando câmera/API)'}
        </p>
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-muted">
          Notificações:{' '}
          <strong className="text-ink">
            {notificationProvider.ready ? notificationProvider.channel : 'canal pendente'}
          </strong>
          {notificationProvider.ready ? '' : ' (WhatsApp/SMS a definir)'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((item) => (
          <Card key={item.label}>
            <CardBody>
              <p className="text-sm font-medium text-ink-muted">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-ink">{loading ? '…' : item.value}</p>
              <p className="mt-1 text-xs text-ink-subtle">
                {item.label === 'Alertas' ? 'Sprint 8' : 'Derivado das movimentações do dia'}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Prévia das notificações</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Layout do guia Olhar+IA — envio real após definição do canal.
            </p>
          </CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <MovementNotificationCard
              studentName="Ana Silva"
              schoolName={schoolName}
              type="entrada"
              timeLabel="07:42"
            />
            <MovementNotificationCard
              studentName="Ana Silva"
              schoolName={schoolName}
              type="saida"
              timeLabel="12:15"
            />
          </CardBody>
        </Card>

        <div>
          {recent.length === 0 ? (
            <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
          ) : (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink">Movimentações recentes</h2>
              </CardHeader>
              <CardBody className="space-y-2">
                {recent.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-ink">{m.studentName}</p>
                      <p className="text-xs text-ink-muted">
                        {m.type === 'entrada' ? 'Entrada' : 'Saída'}
                        {m.occurredAt
                          ? ` · ${m.occurredAt.toDate().toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`
                          : ''}
                      </p>
                    </div>
                    <span
                      className={
                        m.type === 'entrada'
                          ? 'text-xs font-semibold text-success-700'
                          : 'text-xs font-semibold text-accent-600'
                      }
                    >
                      {m.type === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
