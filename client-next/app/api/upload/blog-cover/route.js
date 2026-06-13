import { requireAuth } from '@/lib/server-auth'
import { parseUpload, uploadToStorage } from '@/lib/upload-helper'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const parsed = await parseUpload(request)
    if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 })
    const result = await uploadToStorage(`blog/${Date.now()}-${Math.random().toString(36).slice(2)}.${parsed.ext}`, parsed.buffer, parsed.contentType)
    if (result.error) return Response.json({ error: result.error }, { status: 500 })
    return Response.json({ url: result.url })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
