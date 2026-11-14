import { fetchIconPng, Icons8Error, resolveIcons8Link } from '@/lib/icons8'

export async function GET(request: Request) {
  const link = new URL(request.url).searchParams.get('url')
  if (!link || link.length > 2048) {
    return Response.json({ error: 'Missing Icons8 link.' }, { status: 400 })
  }

  try {
    const { pngUrl, name } = await resolveIcons8Link(link)
    const png = await fetchIconPng(pngUrl)
    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'X-Icon-Name': name,
        'X-Icon-Source': pngUrl,
      },
    })
  } catch (error) {
    const message = error instanceof Icons8Error ? error.message : 'Failed to download the icon.'
    return Response.json({ error: message }, { status: error instanceof Icons8Error ? 422 : 502 })
  }
}
