'use client'

import { Check, Copy, Download, RotateCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ItemStatus = 'queued' | 'fetching' | 'tracing' | 'ready' | 'error'

export type ConvertItem = {
  key: string
  link: string
  status: ItemStatus
  progress: number
  name: string
  pngUrl?: string
  svg?: string
  svgUrl?: string
  colors?: number
  error?: string
}

type ResultCardProps = {
  item: ConvertItem
  copied: boolean
  onCopy: () => void
  onDownload: () => void
  onRetry: () => void
  onRemove: () => void
}

const checkerStyle = {
  backgroundImage:
    'linear-gradient(45deg, var(--checker) 25%, transparent 25%), linear-gradient(-45deg, var(--checker) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--checker) 75%), linear-gradient(-45deg, transparent 75%, var(--checker) 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
}

const STATUS_LABEL: Record<ItemStatus, string> = {
  queued: 'Queued',
  fetching: 'Downloading PNG',
  tracing: 'Tracing',
  ready: 'Ready',
  error: 'Failed',
}

const iconButton =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40'

export function ResultCard({ item, copied, onCopy, onDownload, onRetry, onRemove }: ResultCardProps) {
  const working = item.status === 'queued' || item.status === 'fetching' || item.status === 'tracing'
  const preview = item.svgUrl ?? item.pngUrl
  const ready = item.status === 'ready'
  const label =
    item.status === 'tracing' ? `Tracing ${Math.round(item.progress * 100)}%` : STATUS_LABEL[item.status]

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative flex aspect-square items-center justify-center" style={checkerStyle}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={`${item.name} icon, ${item.svgUrl ? 'traced SVG' : 'source PNG'}`}
            className={cn('max-h-[62%] max-w-[62%] object-contain transition-opacity', working && 'opacity-40')}
          />
        ) : (
          <span className="px-3 text-center font-mono text-xs leading-relaxed text-muted-foreground break-all">
            {item.status === 'error' ? item.error : new URL(item.link).pathname}
          </span>
        )}

        {item.status === 'error' && preview && (
          <p className="absolute inset-x-0 bottom-0 bg-card/95 p-2 text-xs leading-relaxed text-destructive">
            {item.error}
          </p>
        )}

        {working && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-card/90 p-2.5 backdrop-blur" role="status">
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground">{label}</span>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full bg-primary transition-all',
                  item.status === 'queued' && 'w-0',
                  item.status === 'fetching' && 'w-1/3 animate-pulse',
                )}
                style={item.status === 'tracing' ? { width: `${Math.max(4, item.progress * 100)}%` } : undefined}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 border-t border-border p-1.5">
        <span className="min-w-0 flex-1 truncate px-1.5 font-mono text-xs text-foreground" title={item.name}>
          {item.name}
        </span>
        {item.status === 'error' ? (
          <button type="button" onClick={onRetry} className={iconButton} aria-label={`Retry ${item.name}`} title="Retry">
            <RotateCw className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onCopy}
              disabled={!ready}
              className={cn(iconButton, copied && 'text-primary')}
              aria-label={copied ? `${item.name} copied for Figma` : `Copy ${item.name} SVG for Figma`}
              title="Copy SVG for Figma"
            >
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={onDownload}
              disabled={!ready}
              className={iconButton}
              aria-label={`Download ${item.name} SVG`}
              title="Download SVG"
            >
              <Download className="size-4" aria-hidden="true" />
            </button>
          </>
        )}
        <button type="button" onClick={onRemove} className={iconButton} aria-label={`Remove ${item.name}`} title="Remove">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}
