import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'

type CameraCaptureProps = {
  onCapture: (file: File, previewUrl: string) => void
  onClear?: () => void
  previewUrl?: string
}

export function CameraCapture({ onCapture, onClear, previewUrl }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
  }

  useEffect(() => () => stopCamera(), [])

  const startCamera = async () => {
    setError('')
    setStarting(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Este navegador não permite captura pela câmera. Envie um arquivo.')
      }
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setActive(true)
    } catch (err) {
      stopCamera()
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Não foi possível acessar a câmera. Verifique a permissão ou envie um arquivo.'
      setError(message)
    } finally {
      setStarting(false)
    }
  }

  const capture = async () => {
    const video = videoRef.current
    if (!video || !active) return

    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Não foi possível capturar a imagem.')
      return
    }
    ctx.drawImage(video, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    )
    if (!blob) {
      setError('Não foi possível gerar a foto.')
      return
    }

    const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' })
    const url = URL.createObjectURL(blob)
    onCapture(file, url)
    stopCamera()
  }

  return (
    <div className="space-y-3">
      <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-surface-muted">
        {previewUrl ? (
          <img src={previewUrl} alt="Prévia da foto" className="h-full max-h-72 w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className={active ? 'h-full max-h-72 w-full object-cover' : 'hidden'}
          />
        )}
        {!previewUrl && !active && (
          <p className="px-6 text-center text-sm text-ink-muted">
            Use a câmera do celular ou envie uma foto nítida do rosto.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-danger-600">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!previewUrl && !active && (
          <Button type="button" variant="secondary" loading={starting} onClick={startCamera}>
            Abrir câmera
          </Button>
        )}
        {active && (
          <>
            <Button type="button" onClick={capture}>
              Capturar foto
            </Button>
            <Button type="button" variant="outline" onClick={stopCamera}>
              Fechar câmera
            </Button>
          </>
        )}
        {previewUrl && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClear?.()
              setError('')
            }}
          >
            Tirar outra foto
          </Button>
        )}
      </div>
    </div>
  )
}
