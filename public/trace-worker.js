// Color tracing pipeline ported from tomayac/SVGcode (posterize -> per-color potrace -> svgo).
// Served as a static module worker so the Emscripten potrace build is never run through the bundler.
// Vendor files are copied from node_modules by scripts/copy-vendor.mjs on install.
import { init, potrace } from './vendor/potrace.js'
import { optimize } from './vendor/svgo.js'

// SVGcode defaults (src/js/ui.js): 7 color steps, 1 alpha step, turdsize 2, alphamax 1, turnpolicy 4.
const POSTERIZE_STEPS = { r: 7, g: 7, b: 7, a: 1 }
const POTRACE_PARAMS = {
  turdsize: 2,
  turnpolicy: 4,
  alphamax: 1,
  opticurve: 1,
  opttolerance: 0.2,
  pathonly: false,
  extractcolors: false,
}
const OUTPUT_SIZE = 512

// Same table SVGcode feeds to <feFuncX type="discrete" tableValues="...">.
function getRange(steps) {
  return Array.from({ length: steps + 1 }, (_, i) =>
    Math.round(Number(((1 / steps) * i).toFixed(1)) * 255),
  )
}

function discrete(value, table) {
  const n = table.length
  return table[Math.min(Math.floor((value / 255) * n), n - 1)]
}

function posterize(pixels) {
  const tables = {
    r: getRange(POSTERIZE_STEPS.r),
    g: getRange(POSTERIZE_STEPS.g),
    b: getRange(POSTERIZE_STEPS.b),
    a: getRange(POSTERIZE_STEPS.a),
  }
  const buckets = new Map()
  for (let i = 0; i < pixels.length; i += 4) {
    if (discrete(pixels[i + 3], tables.a) === 0) continue
    const key =
      discrete(pixels[i], tables.r) * 65536 +
      discrete(pixels[i + 1], tables.g) * 256 +
      discrete(pixels[i + 2], tables.b)
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { indices: [], sum: [0, 0, 0] }
      buckets.set(key, bucket)
    }
    bucket.indices.push(i)
    bucket.sum[0] += pixels[i]
    bucket.sum[1] += pixels[i + 1]
    bucket.sum[2] += pixels[i + 2]
  }
  return buckets
}

// Fill each layer with the average original color of its pixels, so brand colors survive posterizing.
function toHex(sum, count) {
  return `#${sum.map((c) => Math.round(c / count).toString(16).padStart(2, '0')).join('')}`
}

const PATH_RE = /<path[^>]*\sd="([^"]+)"[^>]*\/?>/g

async function traceColors({ width, height, pixels }) {
  await init()
  // Largest color areas first so smaller details are stacked on top.
  const buckets = [...posterize(pixels).values()].sort((a, b) => b.indices.length - a.indices.length)
  const total = buckets.length
  const layers = []
  const mask = new ImageData(width, height)
  const rowStride = width * 4

  for (let n = 0; n < total; n++) {
    const bucket = buckets[n]
    mask.data.fill(255)
    // Grow each color region by 1px so neighbouring layers overlap instead of leaving hairline seams.
    for (const i of bucket.indices) {
      const x = (i % rowStride) / 4
      for (const j of [i, x > 0 ? i - 4 : i, x < width - 1 ? i + 4 : i, i - rowStride, i + rowStride]) {
        if (j < 0 || j >= mask.data.length) continue
        mask.data[j] = 0
        mask.data[j + 1] = 0
        mask.data[j + 2] = 0
      }
    }
    const svg = await potrace(mask, POTRACE_PARAMS)
    const paths = [...svg.matchAll(PATH_RE)].map((m) => m[1]).join(' ')
    if (paths.trim()) {
      // Potrace emits paths inside a flipped, scaled group; carry that transform onto the path.
      const transform = svg.match(/<g[^>]*transform="([^"]+)"/)?.[1]
      const fill = toHex(bucket.sum, bucket.indices.length)
      layers.push(`<path fill="${fill}"${transform ? ` transform="${transform}"` : ''} d="${paths}"/>`)
    }
    self.postMessage({ type: 'progress', processed: n + 1, total })
  }

  const raw = `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_SIZE}" height="${OUTPUT_SIZE}" viewBox="0 0 ${width} ${height}">${layers.join('')}</svg>`
  const { data } = optimize(raw, { multipass: true, floatPrecision: 2, plugins: ['preset-default'] })
  return { svg: data, colors: layers.length }
}

self.addEventListener('message', async (event) => {
  try {
    const result = await traceColors(event.data)
    self.postMessage({ type: 'done', ...result })
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Tracing failed.' })
  }
})
