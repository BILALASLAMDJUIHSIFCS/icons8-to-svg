import { IconConverter } from '@/components/converter/icon-converter'
import { extractIconLinks, MAX_LINKS } from '@/lib/links'

export default async function Page({ searchParams }: { searchParams: Promise<{ links?: string | string[] }> }) {
  const { links } = await searchParams
  const initialLinks = extractIconLinks([links ?? []].flat().join('\n')).slice(0, MAX_LINKS)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-5 py-12 md:px-10 md:py-16">
      <header className="flex max-w-2xl flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Icons8 → SVG</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance md:text-4xl">
          Paste icon links. Get clean vectors.
        </h1>
        <p className="leading-relaxed text-muted-foreground text-pretty">
          Drop in one Icons8 link or a whole batch. Each icon is grabbed as a 1100px PNG, traced into color paths, and
          ready to download or paste straight into Figma — together or one by one.
        </p>
      </header>

      <IconConverter initialLinks={initialLinks} />

      <footer className="mt-auto font-mono text-xs leading-relaxed text-muted-foreground">
        PNG fetch adapted from Icons8-downloader. Tracing by SVGcode&apos;s potrace pipeline, in your browser.
      </footer>
    </main>
  )
}
