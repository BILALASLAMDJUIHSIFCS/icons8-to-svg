export const MAX_LINKS = 100

const ICON_HOSTS = new Set(['icons8.com', 'www.icons8.com', 'img.icons8.com'])
const URL_PATTERN = /https?:\/\/[^\s"'<>,;]+/gi

export function linkKey(link: string) {
  try {
    const url = new URL(link)
    const id =
      url.searchParams.get('id') ?? url.pathname.match(/\/icon\/(?:set\/[^/]+\/)?([A-Za-z0-9_-]+)/)?.[1]
    return id ? `id:${id}` : `${url.hostname}${url.pathname}${url.search}`
  } catch {
    return link
  }
}

/** Pulls every Icons8 link out of free-form text (newlines, spaces, commas — anything goes). */
export function extractIconLinks(text: string): string[] {
  const seen = new Set<string>()
  const links: string[] = []
  for (const match of text.matchAll(URL_PATTERN)) {
    let url: URL
    try {
      url = new URL(match[0].replace(/[).\]]+$/, ''))
    } catch {
      continue
    }
    if (!ICON_HOSTS.has(url.hostname)) continue
    const link = url.toString()
    const key = linkKey(link)
    if (seen.has(key)) continue
    seen.add(key)
    links.push(link)
  }
  return links
}
