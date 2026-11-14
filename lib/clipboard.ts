export async function readClipboardText() {
  if (!navigator.clipboard?.readText) {
    throw new Error('Clipboard reading is not supported here. Press Ctrl+V in the field instead.')
  }
  try {
    return (await navigator.clipboard.readText()).trim()
  } catch {
    throw new Error('Clipboard access was blocked. Allow it, or press Ctrl+V in the field.')
  }
}

// Figma turns SVG markup on the plain-text clipboard into editable vector layers on Ctrl+V.
export async function copySvgForFigma(svg: string) {
  try {
    await navigator.clipboard.writeText(svg)
    return
  } catch {
    // Embedded previews can deny the async Clipboard API; fall back to a selection copy.
  }
  const textarea = document.createElement('textarea')
  textarea.value = svg
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const ok = document.execCommand('copy')
  textarea.remove()
  if (!ok) throw new Error('Copy failed. Download the SVG and drag it into Figma instead.')
}

export function downloadSvg(svg: string, name: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${name}.svg`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
