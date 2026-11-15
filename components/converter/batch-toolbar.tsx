'use client'

import { Archive, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type BatchToolbarProps = {
  total: number
  ready: number
  working: number
  failed: number
  onDownloadAll: () => void
  onClear: () => void
}

export function BatchToolbar({ total, ready, working, failed, onDownloadAll, onClear }: BatchToolbarProps) {
  const summary = [
    `${total} ${total === 1 ? 'icon' : 'icons'}`,
    `${ready} ready`,
    working ? `${working} converting` : null,
    failed ? `${failed} failed` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite" className="font-mono text-xs text-muted-foreground">
        {summary}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onDownloadAll} disabled={!ready} className="h-9 rounded-lg bg-card">
          <Archive aria-hidden="true" />
          {ready > 1 ? `Download all (${ready}) .zip` : 'Download .zip'}
        </Button>
        <Button variant="ghost" onClick={onClear} className="h-9 rounded-lg">
          <Trash2 aria-hidden="true" />
          Clear
        </Button>
      </div>
    </div>
  )
}
