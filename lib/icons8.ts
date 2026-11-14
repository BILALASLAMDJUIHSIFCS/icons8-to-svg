// Port of chaoticzeros/Icons8-downloader: the script finds `https://img.icons8.com/...`
// sources and swaps the default size for a large target (1100px) before downloading the PNG.
export const TARGET_SIZE = '1100'

const CDN_HOST = 'img.icons8.com'
const SITE_HOSTS = new Set(['icons8.com', 'www.icons8.com'])
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

export type ResolvedIcon = { pngUrl: string; name: string }

export class Icons8Error extends Error {}

function cdnUrlById(id: string) {
  return `https://${CDN_HOST}/?size=${TARGET_SIZE}&id=${encodeURIComponent(id)}&format=png`
}

function upscaleCdnUrl(url: URL): string {
  if (url.searchParams.has('id')) {
    url.searchParams.set('size', TARGET_SIZE)
    url.searchParams.set('format', 'png')
    return url.toString()
  }
  // Legacy path form: /{style}/{size}/{name}.png — same replace the Python script does.
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length >= 3 && /^\d+x?$/.test(parts[1])) {
    parts[1] = parts[1].endsWith('x') ? '100x' : TARGET_SIZE
  }
  const last = parts.length - 1
  if (last >= 0 && !/\.png$/i.test(parts[last])) {
    parts[last] = `${parts[last].replace(/\.[a-z]+$/i, '')}.png`
  }
  url.pathname = `/${parts.join('/')}`
  return url.toString()
}

function nameFrom(url: URL) {
  const parts = url.pathname
    .split('/')
    .filter((p) => p && p !== 'icon' && p !== 'icons' && !/^\d+x?$/.test(p))
  const candidate = parts.at(-1)?.replace(/\.[a-z]+$/i, '').replace(/[^a-z0-9-_]+/gi, '-')
  return candidate || `icon-${url.searchParams.get('id') ?? 'icons8'}`
}

async function scrapeFirstIcon(pageUrl: string): Promise<string | null> {
  const res = await fetch(pageUrl, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } })
  if (!res.ok) return null
  const html = await res.text()
  const match = html.match(/(?:src|content)="(https:\/\/img\.icons8\.com[^"]+)"/)
  return match ? upscaleCdnUrl(new URL(match[1].replace(/&amp;/g, '&'))) : null
}

export async function resolveIcons8Link(input: string): Promise<ResolvedIcon> {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    throw new Icons8Error('That does not look like a valid link.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Icons8Error('Only http(s) links are supported.')
  }
  url.protocol = 'https:'

  if (url.hostname === CDN_HOST) {
    return { pngUrl: upscaleCdnUrl(url), name: nameFrom(url) }
  }

  if (!SITE_HOSTS.has(url.hostname)) {
    throw new Icons8Error('Paste a link from icons8.com or img.icons8.com.')
  }

  const idMatch = url.pathname.match(/\/icon\/(?:set\/[^/]+\/)?([A-Za-z0-9_-]+)\//) ?? url.pathname.match(/\/icon\/([A-Za-z0-9_-]+)$/)
  const id = url.searchParams.get('id') ?? idMatch?.[1]
  if (id) {
    return { pngUrl: cdnUrlById(id), name: nameFrom(url) }
  }

  const scraped = await scrapeFirstIcon(url.toString())
  if (scraped) return { pngUrl: scraped, name: nameFrom(url) }

  throw new Icons8Error('Could not find an icon on that page. Open a single icon and copy its link.')
}

export function isAllowedCdnUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === CDN_HOST
  } catch {
    return false
  }
}

export async function fetchIconPng(pngUrl: string) {
  if (!isAllowedCdnUrl(pngUrl)) throw new Icons8Error('Blocked non-Icons8 image host.')
  const res = await fetch(pngUrl, { headers: { 'User-Agent': USER_AGENT } })
  const type = res.headers.get('content-type') ?? ''
  if (!res.ok || !type.startsWith('image/png')) {
    throw new Icons8Error(`Icons8 did not return a PNG (status ${res.status}).`)
  }
  return new Uint8Array(await res.arrayBuffer())
}
