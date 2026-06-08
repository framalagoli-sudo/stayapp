const RAILWAY = (process.env.NEXT_INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').trim()

export async function GET(request, { params }) {
  const { tipo, slug } = await params
  const res = await fetch(`${RAILWAY}/api/guest/llms/${tipo}/${slug}`, { cache: 'no-store' })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'text/plain; charset=utf-8' },
  })
}
