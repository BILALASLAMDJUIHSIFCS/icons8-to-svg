import { IconConverter } from '@/components/converter/icon-converter'

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-5 py-12 md:px-10 md:py-16">
      <header className="flex flex-col gap-3 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Icons8 → SVG</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance md:text-4xl">
          Paste an icon link. Get a clean vector.
        </h1>
        <p className="leading-relaxed text-muted-foreground text-pretty">
          We grab the icon as a 1100px PNG, trace every color into paths, and hand you an SVG you can
          download or paste straight into Figma.
        </p>
      </header>

      <IconConverter />

      <footer className="mt-auto font-mono text-xs leading-relaxed text-muted-foreground">
        PNG fetch adapted from Icons8-downloader. Tracing by SVGcode&apos;s potrace pipeline, in your browser.
      </footer>
    </main>
  )
}
