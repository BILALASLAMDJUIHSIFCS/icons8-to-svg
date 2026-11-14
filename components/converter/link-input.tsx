'use client'

import { ArrowRight, ClipboardPaste } from 'lucide-react'
import { useState } from 'react'
import { readClipboardText } from '@/lib/clipboard'

type LinkInputProps = {
  busy: boolean
  onSubmit: (link: string) => void
  onError: (message: string) => void
}

const looksLikeLink = (value: string) => /^https?:\/\/\S+$/i.test(value.trim())

export function LinkInput({ busy, onSubmit, onError }: LinkInputProps) {
  const [value, setValue] = useState('')

  const submit = (link: string) => {
    if (!link.trim()) return
    onSubmit(link.trim())
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await readClipboardText()
      if (!text) return onError('Your clipboard is empty.')
      setValue(text)
      if (looksLikeLink(text)) submit(text)
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
      <label htmlFor="icon-link" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Icons8 link
      </label>
      <div className="flex items-center gap-1 rounded-xl border border-input bg-card p-1.5 shadow-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
        <input
          id="icon-link"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          required
          placeholder="https://icons8.com/icon/12599/github"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onPaste={(event) => {
            const text = event.clipboardData.getData('text').trim()
            if (looksLikeLink(text)) {
              event.preventDefault()
              setValue(text)
              submit(text)
            }
          }}
          className="h-10 min-w-0 flex-1 bg-transparent px-2.5 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <button
          type="button"
          onClick={pasteFromClipboard}
          disabled={busy}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <ClipboardPaste className="size-4" aria-hidden="true" />
          <span>Paste</span>
        </button>
        <button
          type="submit"
          disabled={busy || !value.trim()}
          aria-label="Convert to SVG"
          className="inline-flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  )
}
