'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { combineSvgsForFigma, downloadSvgZip } from '@/lib/batch-export'
import { copySvgForFigma, downloadSvg } from '@/lib/clipboard'
import { linkKey, MAX_LINKS } from '@/lib/links'
import { traceImage } from '@/lib/trace/trace-image'
import { BatchToolbar } from './batch-toolbar'
import { LinkInput } from './link-input'
import { ResultCard, type ConvertItem } from './result-card'

// Tracing is CPU-heavy (one worker per icon), so a small pool keeps the tab responsive.
const CONCURRENCY = 3

function nameFromLink(link: string) {
  const parts = new URL(link).pathname.split('/').filter(Boolean)
  return parts.at(-1)?.replace(/\.[a-z]+$/i, '') || 'icon'
}

export function IconConverter({ initialLinks = [] }: { initialLinks?: string[] }) {
  const [items, setItems] = useState<ConvertItem[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const pendingRef = useRef<ConvertItem[]>([])
  const activeRef = useRef(0)
  const controllersRef = useRef(new Map<string, AbortController>())
  const objectUrlsRef = useRef(new Map<string, string[]>())

  const patch = (key: string, update: Partial<ConvertItem>) =>
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...update } : item)))

  const trackUrl = (key: string, url: string) => {
    objectUrlsRef.current.set(key, [...(objectUrlsRef.current.get(key) ?? []), url])
    return url
  }

  const releaseUrls = (key: string) => {
    objectUrlsRef.current.get(key)?.forEach((url) => URL.revokeObjectURL(url))
    objectUrlsRef.current.delete(key)
  }

  const convertOne = async (item: ConvertItem) => {
    const controller = new AbortController()
    controllersRef.current.set(item.key, controller)
    patch(item.key, { status: 'fetching', progress: 0, error: undefined })

    try {
      const res = await fetch(`/api/icon?url=${encodeURIComponent(item.link)}`, { signal: controller.signal })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Could not download that icon.')
      }
      const png = await res.blob()
      const name = res.headers.get('X-Icon-Name') ?? item.name
      patch(item.key, { status: 'tracing', name, pngUrl: trackUrl(item.key, URL.createObjectURL(png)) })

      const { svg, colors } = await traceImage(png, (progress) => patch(item.key, { progress }), controller.signal)
      if (colors === 0) throw new Error('No visible shapes found in that icon.')
      const svgUrl = trackUrl(item.key, URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })))
      patch(item.key, { status: 'ready', svg, colors, svgUrl, progress: 1 })
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      patch(item.key, { status: 'error', error: (error as Error).message })
    } finally {
      controllersRef.current.delete(item.key)
    }
  }

  const pump = () => {
    while (activeRef.current < CONCURRENCY && pendingRef.current.length) {
      const next = pendingRef.current.shift()!
      activeRef.current += 1
      convertOne(next).finally(() => {
        activeRef.current -= 1
        pump()
      })
    }
  }

  const enqueue = (links: string[]) => {
    setMessage(null)
    const existing = new Set(items.map((item) => item.key))
    const fresh: ConvertItem[] = []
    for (const link of links) {
      const key = linkKey(link)
      if (existing.has(key)) continue
      existing.add(key)
      fresh.push({ key, link, status: 'queued', progress: 0, name: nameFromLink(link) })
    }

    const room = Math.max(0, MAX_LINKS - items.length)
    const accepted = fresh.slice(0, room)
    if (fresh.length > accepted.length) setMessage(`Only ${MAX_LINKS} icons at a time — extra links were skipped.`)
    else if (!fresh.length) setMessage('Those icons are already in the list.')
    if (!accepted.length) return

    setItems((prev) => [...prev, ...accepted])
    pendingRef.current.push(...accepted)
    pump()
  }

  const remove = (key: string) => {
    controllersRef.current.get(key)?.abort()
    pendingRef.current = pendingRef.current.filter((item) => item.key !== key)
    releaseUrls(key)
    setItems((prev) => prev.filter((item) => item.key !== key))
  }

  const clearAll = () => {
    controllersRef.current.forEach((controller) => controller.abort())
    pendingRef.current = []
    objectUrlsRef.current.forEach((_, key) => releaseUrls(key))
    setItems([])
    setMessage(null)
  }

  const retry = (item: ConvertItem) => {
    releaseUrls(item.key)
    patch(item.key, { status: 'queued', progress: 0, error: undefined, pngUrl: undefined, svgUrl: undefined, svg: undefined })
    pendingRef.current.push(item)
    pump()
  }

  const flashCopied = (key: string) => {
    setCopiedKey(key)
    setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2500)
  }

  const readyItems = items.filter((item): item is ConvertItem & { svg: string } => item.status === 'ready' && !!item.svg)

  const copyOne = async (item: ConvertItem) => {
    if (!item.svg) return
    try {
      await copySvgForFigma(item.svg)
      flashCopied(item.key)
    } catch (error) {
      setMessage((error as Error).message)
    }
  }

  const copyAll = async () => {
    if (!readyItems.length) return
    try {
      const svg = readyItems.length === 1 ? readyItems[0].svg : combineSvgsForFigma(readyItems)
      await copySvgForFigma(svg)
      flashCopied('all')
    } catch (error) {
      setMessage((error as Error).message)
    }
  }

  useEffect(() => {
    if (!initialLinks.length) return
    // Deferred so React's dev double-mount doesn't start (and then abort) the batch twice.
    const timer = setTimeout(() => {
      enqueue(initialLinks)
      window.history.replaceState(null, '', window.location.pathname)
    }, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const controllers = controllersRef.current
    const urls = objectUrlsRef.current
    return () => {
      controllers.forEach((controller) => controller.abort())
      urls.forEach((list) => list.forEach((url) => URL.revokeObjectURL(url)))
    }
  }, [])

  const working = items.filter((item) => item.status === 'queued' || item.status === 'fetching' || item.status === 'tracing').length
  const failed = items.filter((item) => item.status === 'error').length
  const copiedAll = copiedKey === 'all'

  return (
    <section aria-label="Icons8 to SVG converter" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <LinkInput onSubmit={enqueue} onError={setMessage} />
        </div>
        <button
          type="button"
          disabled={!readyItems.length}
          onClick={copyAll}
          className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-5 font-medium text-primary transition-all hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-40 md:shrink-0"
        >
          {copiedAll ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copiedAll
            ? 'Copied — Ctrl+V in Figma'
            : readyItems.length > 1
              ? `Copy all ${readyItems.length} for Figma`
              : 'Copy for Figma'}
        </button>
      </div>

      <p aria-live="polite" className={message ? 'text-sm text-destructive' : 'sr-only'}>
        {message}
      </p>

      {items.length ? (
        <div className="flex flex-col gap-4">
          <BatchToolbar
            total={items.length}
            ready={readyItems.length}
            working={working}
            failed={failed}
            onDownloadAll={() =>
              readyItems.length === 1
                ? downloadSvg(readyItems[0].svg, readyItems[0].name)
                : downloadSvgZip(readyItems)
            }
            onClear={clearAll}
          />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ResultCard
                key={item.key}
                item={item}
                copied={copiedKey === item.key}
                onCopy={() => copyOne(item)}
                onDownload={() => item.svg && downloadSvg(item.svg, item.name)}
                onRetry={() => retry(item)}
                onRemove={() => remove(item.key)}
              />
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
          <p className="font-medium text-foreground">Your vectors show up here.</p>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
            Paste one link or a whole list. Using the Bilal extension? Select icons on Icons8, press{' '}
            <span className="font-medium text-foreground">Copy links</span>, then paste here — every icon converts at
            once.
          </p>
        </div>
      )}
    </section>
  )
}
