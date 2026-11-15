'use client'

import { ArrowRight, ClipboardPaste } from 'lucide-react'
import { useState } from 'react'
import { readClipboardText } from '@/lib/clipboard'
import { extractIconLinks } from '@/lib/links'

type LinkInputProps = {
  onSubmit: (links: string[]) => void
  onError: (message: string) => void
}

const NO_LINKS = 'No Icons8 links found. Paste links from icons8.com or img.icons8.com.'

export function LinkInput({ onSubmit, onError }: LinkInputProps) {
  const [value, setValue] = useState('')
  const detected = extractIconLinks(value).length

  const submit = (text: string) => {
    const links = extractIconLinks(text)
    if (!links.length) return onError(NO_LINKS)
    onSubmit(links)
    setValue('')
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await readClipboardText()
      if (!text) return onError('Your clipboard is empty.')
      submit(text)
    } catch (error) {
      onError((error as Error).message)
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit(value)
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="icon-links" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Icons8 links
        </label>
        <span className="font-mono text-xs text-muted-foreground">One or many — one per line</span>
      </div>
      <div className="flex items-end gap-1 rounded-xl border border-input bg-card p-1.5 shadow-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
        <textarea
          id="icon-links"
          rows={2}
          autoComplete="off"
          spellCheck={false}
          placeholder={'https://icons8.com/icon/12599/github\nhttps://icons8.com/icon/32323/instagram'}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onPaste={(event) => {
            const text = event.clipboardData.getData('text')
            if (extractIconLinks(text).length) {
              event.preventDefault()
              submit(`${value}\n${text}`)
            }
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey) return
            if (event.nativeEvent.isComposing || event.keyCode === 229) return
            event.preventDefault()
            if (value.trim()) submit(value)
          }}
          className="max-h-48 min-h-10 min-w-0 flex-1 resize-y bg-transparent px-2.5 py-2 font-mono text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <button
          type="button"
          onClick={pasteFromClipboard}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ClipboardPaste className="size-4" aria-hidden="true" />
          <span>Paste</span>
        </button>
        <button
          type="submit"
          disabled={!detected}
          aria-label={detected ? `Convert ${detected} ${detected === 1 ? 'link' : 'links'} to SVG` : 'Convert to SVG'}
          className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {detected > 1 && <span className="font-mono text-xs">{detected}</span>}
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  )
}
