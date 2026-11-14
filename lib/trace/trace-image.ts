export type TraceResult = { svg: string; colors: number }

type TraceMessage =
  | { type: 'progress'; processed: number; total: number }
  | { type: 'done'; svg: string; colors: number }
  | { type: 'error'; message: string }

async function readPixels(png: Blob) {
  const bitmap = await createImageBitmap(png)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported in this browser.')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return { width, height, pixels: data }
}

export async function traceImage(
  png: Blob,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<TraceResult> {
  const request = await readPixels(png)
  const worker = new Worker('/trace-worker.js', { type: 'module' })

  return new Promise<TraceResult>((resolve, reject) => {
    const stop = () => {
      worker.terminate()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', stop, { once: true })

    worker.onmessage = ({ data }: MessageEvent<TraceMessage>) => {
      if (data.type === 'progress') {
        onProgress(data.processed / data.total)
        return
      }
      signal.removeEventListener('abort', stop)
      worker.terminate()
      if (data.type === 'done') resolve({ svg: data.svg, colors: data.colors })
      else reject(new Error(data.message))
    }
    worker.onerror = (event) => {
      signal.removeEventListener('abort', stop)
      worker.terminate()
      reject(new Error(event.message || 'Tracing worker crashed.'))
    }
    worker.postMessage(request, [request.pixels.buffer])
  })
}
