'use client'

import { Check, Copy, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ResultActionsProps = {
  ready: boolean
  copied: boolean
  onDownload: () => void
  onCopy: () => void
}

export function ResultActions({ ready, copied, onDownload, onCopy }: ResultActionsProps) {
  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" disabled={!ready} onClick={onDownload} className="h-12 rounded-xl text-sm w-full">
        <Download aria-hidden="true" />
        Download SVG
      </Button>
      <Button
        size="lg"
        variant="outline"
        disabled={!ready}
        onClick={onCopy}
        className="h-12 rounded-xl bg-card text-sm w-full"
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? 'Copied — Ctrl+V in Figma' : 'Copy SVG for Figma'}
      </Button>
    </div>
  )
}
