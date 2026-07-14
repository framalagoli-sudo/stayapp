import { supabaseAdmin } from '@/lib/supabase-server'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'

// Tracking visite: pubblico. Validato + rate-limited per evitare che un anonimo
// gonfi le analytics di un'entità arbitraria o faccia table-bloat con insert infinite.
const TIPI = new Set(['struttura', 'ristorante', 'attivita'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request) {
  try {
    const ip = getClientIp(request)
    const rl = await rateLimit(request, { name: 'pageview', limit: 60, windowSec: 3600, ip })
    if (!rl.allowed) return tooManyRequests()

    const { entity_tipo, entity_id } = await request.json()
    if (!TIPI.has(entity_tipo) || !UUID_RE.test(String(entity_id || ''))) {
      return Response.json({ error: 'Parametri non validi' }, { status: 400 })
    }
    await supabaseAdmin.from('page_views').insert({ entity_tipo, entity_id })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
