import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, CardBody, CardHeader, useToast } from '../ui'
import {
  buildQrImageUrl,
  buildSchoolSignupUrl,
  buildWhatsAppShareUrl,
  schoolDisplayName,
} from '../../lib/signup-link'
import type { School } from '../../types/school'

export function SchoolQrPanel({ school }: { school: School }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const name = schoolDisplayName(school)
  const signupUrl = useMemo(() => buildSchoolSignupUrl(school.id, name), [school.id, name])
  const qrSrc = useMemo(() => buildQrImageUrl(signupUrl, 280), [signupUrl])
  const whatsappUrl = useMemo(() => buildWhatsAppShareUrl(name, signupUrl), [name, signupUrl])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(signupUrl)
      setCopied(true)
      toast({ variant: 'success', title: 'Link copiado' })
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ variant: 'error', title: 'Não foi possível copiar o link' })
    }
  }

  return (
    <Card id="qrcode" className="print:border-0 print:shadow-none">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">QR Code de cadastro</h2>
          <p className="mt-1 text-sm text-ink-muted">
            O responsável escaneia este código no banner da escola e abre o cadastro já associado a{' '}
            {name}.
          </p>
        </div>
        <Badge variant="warning">Prévia do fluxo</Badge>
      </CardHeader>
      <CardBody>
        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <div className="flex flex-col items-center rounded-xl border border-line bg-surface-muted p-4">
            <img
              src={qrSrc}
              alt={`QR Code de cadastro da ${name}`}
              className="h-52 w-52 rounded-lg bg-white p-2"
            />
            <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {name}
            </p>
          </div>

          <div className="space-y-4">
            <ol className="space-y-2 text-sm text-ink-muted">
              <li>1. A escola imprime ou compartilha o QR Code.</li>
              <li>2. O responsável escaneia e abre o cadastro desta escola.</li>
              <li>3. Informa os dados da família e cadastra um ou mais filhos.</li>
              <li>4. Envia a foto da criança para o reconhecimento.</li>
            </ol>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Link de cadastro</p>
              <p className="mt-1 break-all rounded-lg border border-line bg-surface-muted px-3 py-2 text-xs text-ink">
                {signupUrl}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              <Button type="button" onClick={copyLink}>
                {copied ? 'Link copiado' : 'Copiar link'}
              </Button>
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                <Button type="button" variant="secondary">
                  Compartilhar no WhatsApp
                </Button>
              </a>
              <Link to={`/cadastro/${school.id}?escola=${encodeURIComponent(name)}&preview=1`} target="_blank">
                <Button type="button" variant="outline">
                  Ver fluxo do responsável
                </Button>
              </Link>
              <Button type="button" variant="ghost" onClick={() => window.print()}>
                Imprimir QR
              </Button>
            </div>
            <p className="text-xs text-ink-subtle">
              Nesta prévia o QR abre o fluxo visual. O cadastro real ainda não grava dados.
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
