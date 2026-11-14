'use client'

import { useEffect, useRef, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { copySvgForFigma, downloadSvg } from '@/lib/clipboard'
import { traceImage } from '@/lib/trace/trace-image'
import { LinkInput } from './link-input'
import { PreviewStage, type Stage } from './preview-stage'
import { ResultActions } from './result-actions'

type Result = { svg: string; svgUrl: string; colors: number }

function formatBytes(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

export function IconConverter() {
  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [name, setName] = useState('icon')
  const [pngUrl, setPngUrl] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => (pngUrl ? URL.revokeObjectURL(pngUrl) : undefined), [pngUrl])
  useEffect(() => () => (result ? URL.revokeObjectURL(result.svgUrl) : undefined), [result])

  const convert = async (link: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setMessage(null)
    setCopied(false)
    setResult(null)
    setProgress(0)
    setStage('fetching')

    try {
      const res = await fetch(`/api/icon?url=${encodeURIComponent(link)}`, { signal: controller.signal })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Could not download that icon.')
      }
      const png = await res.blob()
      const iconName = res.headers.get('X-Icon-Name') ?? 'icon'
      setName(iconName)
      setPngUrl(URL.createObjectURL(png))
      setStage('tracing')

      const { svg, colors } = await traceImage(png, setProgress, controller.signal)
      if (colors === 0) throw new Error('No visible shapes found in that icon.')
      setResult({ svg, colors, svgUrl: URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })) })
      setStage('ready')
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      setStage('error')
      setMessage((error as Error).message)
    }
  }

  const copy = async () => {
    if (!result) return
    try {
      await copySvgForFigma(result.svg)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (error) {
      setMessage((error as Error).message)
    }
  }

  const busy = stage === 'fetching' || stage === 'tracing'
  const ready = stage === 'ready' && !!result

  return (
    <section aria-label="Icons8 to SVG converter" className="flex flex-col gap-6">
      {/* ── Top bar: input + Figma copy button ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <LinkInput busy={busy} onSubmit={convert} onError={setMessage} />
        </div>
        <button
          type="button"
          disabled={!ready}
          onClick={copy}
          className="inline-flex h-[52px] items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-5 font-medium text-primary transition-all hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-40 md:h-[52px] md:shrink-0"
        >
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? 'Copied — Ctrl+V in Figma' : 'Copy for Figma'}
        </button>
      </div>

      {/* ── Desktop: side-by-side preview + actions | Mobile: stacked ── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px]">
        <PreviewStage
          stage={stage}
          progress={progress}
          pngUrl={pngUrl}
          svgUrl={result?.svgUrl ?? null}
          name={name}
        />

        <div className="flex flex-col gap-4">
          <ResultActions
            ready={ready}
            copied={copied}
            onDownload={() => result && downloadSvg(result.svg, name)}
            onCopy={copy}
          />

          {/* ── Info / error strip ── */}
          <p
            aria-live="polite"
            className={message ? 'text-sm text-destructive' : 'font-mono text-xs text-muted-foreground'}
          >
            {message ??
              (result
                ? `${result.colors} color ${result.colors === 1 ? 'layer' : 'layers'} · ${formatBytes(new Blob([result.svg]).size)} · traced from 1100px PNG`
                : '\u00a0')}
          </p>
        </div>
      </div>
    </section>
  )
}
