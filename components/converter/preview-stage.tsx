'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export type Stage = 'idle' | 'fetching' | 'tracing' | 'ready' | 'error'

type PreviewStageProps = {
  stage: Stage
  progress: number
  pngUrl: string | null
  svgUrl: string | null
  name: string
}

const checkerStyle = {
  backgroundImage:
    'linear-gradient(45deg, var(--checker) 25%, transparent 25%), linear-gradient(-45deg, var(--checker) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--checker) 75%), linear-gradient(-45deg, transparent 75%, var(--checker) 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
}

export function PreviewStage({ stage, progress, pngUrl, svgUrl, name }: PreviewStageProps) {
  const [view, setView] = useState<'svg' | 'png'>('svg')
  const showing = view === 'png' || !svgUrl ? pngUrl : svgUrl
  const label =
    stage === 'fetching'
      ? 'Downloading 1100px PNG'
      : stage === 'tracing'
        ? `Tracing colors ${Math.round(progress * 100)}%`
        : null

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-card md:aspect-[4/3]"
        style={checkerStyle}
      >
        {showing ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={showing}
            alt={`${name} icon, ${view === 'png' || !svgUrl ? 'source PNG' : 'traced SVG'}`}
            className={cn(
              'max-h-[70%] max-w-[70%] object-contain transition-opacity duration-300',
              stage === 'tracing' && 'opacity-40',
            )}
          />
        ) : (
          <p className="max-w-56 text-center text-sm leading-relaxed text-muted-foreground text-pretty">
            Your vector shows up here. Copy any icon link on Icons8 and press Paste.
          </p>
        )}

        {label && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-card/90 p-4 backdrop-blur" role="status">
            <span className="font-mono text-xs uppercase tracking-widest text-foreground">{label}</span>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full bg-primary transition-all', stage === 'fetching' && 'w-1/3 animate-pulse')}
                style={stage === 'tracing' ? { width: `${Math.max(4, progress * 100)}%` } : undefined}
              />
            </div>
          </div>
        )}
      </div>

      {svgUrl && pngUrl && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">{name}</span>
          <div role="group" aria-label="Preview source" className="flex rounded-lg bg-muted p-0.5">
            {(['svg', 'png'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => setView(option)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-mono text-xs uppercase transition-colors',
                  view === option ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
