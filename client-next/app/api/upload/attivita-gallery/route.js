import { requireEntityAccess } from '@/lib/server-auth'
import { parseUpload, uploadToStorage } from '@/lib/upload-helper'

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url)
    const attivita_id = searchParams.get('attivita_id')
    if (!attivita_id) return Response.json({ error: 'attivita_id obbligatorio' }, { status: 400 })
    // Il file finisce nella cartella dell'attività: dev'essere la propria.
    const { response } = await requireEntityAccess(request, 'attivita', attivita_id)
    if (response) return response

    const parsed = await parseUpload(request)
    if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 })
    const result = await uploadToStorage(`attivita/${attivita_id}/gallery-${Date.now()}.${parsed.ext}`, parsed.buffer, parsed.contentType)
    if (result.error) return Response.json({ error: result.error }, { status: 500 })
    return Response.json({ url: result.url })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
