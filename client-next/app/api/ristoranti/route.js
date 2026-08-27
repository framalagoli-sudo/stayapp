import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { assicuraSottodominio } from '@/lib/create-subdomain'
import { allaFormaStorica, MODULI_PREDEFINITI, MINISITO_INIZIALE } from '@/lib/entita'

async function getProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let query = supabaseAdmin.from('entita').select('*').eq('tipo', 'ristorante').order('name')
    if (profile.role !== 'super_admin') {
      if (!profile.azienda_id) return Response.json([])
      query = query.eq('azienda_id', profile.azienda_id)
    } else if (searchParams.get('azienda_id')) {
      query = query.eq('azienda_id', searchParams.get('azienda_id'))
    }
    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    // Il pannello conosce i nomi storici: si cambia da dove arrivano i dati, non
    // come si chiamano i campi.
    return Response.json((data || []).map(allaFormaStorica))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile || !['super_admin', 'admin_azienda'].includes(profile.role))
      return Response.json({ error: 'Permessi insufficienti' }, { status: 403 })

    const body = await request.json()
    const { name } = body
    if (!name?.trim()) return Response.json({ error: 'Il nome è obbligatorio' }, { status: 400 })
    const azienda_id = profile.role === 'super_admin' ? body.azienda_id : profile.azienda_id
    if (!azienda_id) return Response.json({ error: 'azienda_id obbligatorio' }, { status: 400 })

    const baseSlug = name.toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ristorante'
    // Lo slug ora è unico fra TUTTE le entità, non più solo fra i ristoranti:
    // il controllo va fatto sull'intera tabella.
    const { data: existing } = await supabaseAdmin.from('entita').select('id').eq('slug', baseSlug).limit(1)
    const slug = existing?.length > 0 ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug

    const allowed = ['name', 'description', 'address', 'phone', 'email', 'schedule']
    const extras = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

    const { data, error } = await supabaseAdmin.from('entita')
      .insert({ azienda_id, tipo: 'ristorante', slug, moduli: MODULI_PREDEFINITI.ristorante, minisito: MINISITO_INIZIALE, ...extras })
      .select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    // await necessario: registra il sottodominio su Vercel e in serverless una
    // chiamata lasciata in sospeso muore con la risposta.
    await assicuraSottodominio({ azienda_id, entity_tipo: 'ristorante', entity_id: data.id, entity_slug: data.slug })
    return Response.json(allaFormaStorica(data), { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
