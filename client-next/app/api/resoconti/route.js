import { supabaseAdmin } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/server-auth'
import { sceltaAmmessa } from '@/lib/resoconti-regole'

// Ogni quanto un'azienda riceve il resoconto per email (lib/resoconti.js):
// lo decide OltreNova dal cruscotto dell'azienda, non il titolare. Per questo
// solo il super_admin: agli altri 404, come ogni pagina che non li riguarda.
// `attivi` = l'interruttore generale in Impostazioni.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    const id = new URL(request.url).searchParams.get('azienda_id')
    if (!UUID.test(String(id || ''))) return Response.json({ error: 'Azienda non valida' }, { status: 400 })
    const [{ data: az, error }, { data: cfg }] = await Promise.all([
      supabaseAdmin.from('aziende').select('resoconti').eq('id', id).maybeSingle(),
      supabaseAdmin.from('platform_config').select('resoconti_attivi').eq('id', 1).maybeSingle(),
    ])
    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (!az) return Response.json({ error: 'Azienda non trovata' }, { status: 404 })
    return Response.json({ attivi: !!cfg?.resoconti_attivi, scelta: az.resoconti })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function PATCH(request) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response
    const body = await request.json().catch(() => ({}))
    if (!UUID.test(String(body?.azienda_id || ''))) return Response.json({ error: 'Azienda non valida' }, { status: 400 })
    const scelta = sceltaAmmessa(body?.scelta)
    if (!scelta) return Response.json({ error: 'Scelta non valida' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('aziende').update({ resoconti: scelta })
      .eq('id', body.azienda_id).select('id')
    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (!data?.length) return Response.json({ error: 'Azienda non trovata' }, { status: 404 })
    return Response.json({ scelta })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
