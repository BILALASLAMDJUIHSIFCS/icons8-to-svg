import { strToU8, zipSync } from 'fflate'

export type NamedSvg = { name: string; svg: string }

export function uniqueNames(items: NamedSvg[]): NamedSvg[] {
  const counts = new Map<string, number>()
  return items.map((item) => {
    const base = item.name || 'icon'
    const count = (counts.get(base) ?? 0) + 1
    counts.set(base, count)
    return { ...item, name: count === 1 ? base : `${base}-${count}` }
  })
}

const escapeAttr = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/**
 * Lays several traced SVGs out in a grid inside one SVG document. Figma turns pasted SVG
 * markup into layers, and each icon lands as its own group named after the icon.
 */
export function combineSvgsForFigma(items: NamedSvg[], { columns = 6, gap = 48 } = {}) {
  const parser = new DOMParser()
  const parts: string[] = []
  let maxCell = 0
  const parsed = uniqueNames(items).flatMap(({ name, svg }) => {
    const root = parser.parseFromString(svg, 'image/svg+xml').documentElement
    if (root.nodeName !== 'svg') return []
    const [minX, minY, vbWidth, vbHeight] = (root.getAttribute('viewBox') ?? '')
      .split(/[\s,]+/)
      .map(Number)
    const width = Number.parseFloat(root.getAttribute('width') ?? '') || vbWidth || 512
    const height = Number.parseFloat(root.getAttribute('height') ?? '') || vbHeight || 512
    maxCell = Math.max(maxCell, width, height)
    return [{ name, inner: root.innerHTML, width, height, minX: minX || 0, minY: minY || 0, vbWidth: vbWidth || width, vbHeight: vbHeight || height }]
  })

  const cols = Math.min(columns, parsed.length)
  const rows = Math.ceil(parsed.length / cols)
  parsed.forEach((icon, index) => {
    const x = (index % cols) * (maxCell + gap)
    const y = Math.floor(index / cols) * (maxCell + gap)
    const sx = icon.width / icon.vbWidth
    const sy = icon.height / icon.vbHeight
    parts.push(
      `<g id="${escapeAttr(icon.name)}" transform="translate(${x} ${y}) scale(${sx} ${sy}) translate(${-icon.minX} ${-icon.minY})">${icon.inner}</g>`,
    )
  })

  const totalWidth = cols * maxCell + (cols - 1) * gap
  const totalHeight = rows * maxCell + (rows - 1) * gap
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">${parts.join('')}</svg>`
}

export function downloadSvgZip(items: NamedSvg[], zipName = 'icons8-svgs') {
  const files = Object.fromEntries(uniqueNames(items).map(({ name, svg }) => [`${name}.svg`, strToU8(svg)]))
  const zipped = zipSync(files, { level: 6 })
  const url = URL.createObjectURL(new Blob([zipped as BlobPart], { type: 'application/zip' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${zipName}.zip`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
