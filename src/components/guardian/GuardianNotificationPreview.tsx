import { Link } from 'react-router-dom'
import { MovementNotificationCard } from '../notifications/MovementNotificationCard'

/** Prévia visual do que o responsável receberá — sem envio real (canal/câmera pendentes). */
export function GuardianNotificationPreview({
  studentName = 'Seu dependente',
  schoolName = 'escola',
  gender,
}: {
  studentName?: string
  schoolName?: string
  gender?: 'masculino' | 'feminino' | ''
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">Como serão os avisos</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Prévia visual. O envio real (WhatsApp/SMS) e o reconhecimento pela câmera ainda aguardam
          definição do cliente — esta tela serve para validar o fluxo com a família.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <MovementNotificationCard
          studentName={studentName}
          schoolName={schoolName}
          type="entrada"
          timeLabel="07:42"
          gender={gender}
        />
        <MovementNotificationCard
          studentName={studentName}
          schoolName={schoolName}
          type="saida"
          timeLabel="12:15"
          gender={gender}
        />
      </div>
      <p className="text-xs text-ink-subtle">
        Em breve estes cards chegarão no celular do responsável a cada entrada e saída.{' '}
        <Link to="/app/responsavel/como-funciona" className="font-semibold text-brand-700 hover:text-brand-800">
          Entenda o passo a passo
        </Link>
      </p>
    </section>
  )
}
