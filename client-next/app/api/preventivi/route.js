import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'

async function nextNumero(azienda_id) {
  const year = new Date().getFullYear()
  const { count } = await supabaseAdmin.from('preventivi').select('id', { count: 'exact', head: true })
    .eq('azienda_id', azienda_id).gte('created_at', `${year}-01-01`)
  const n = (count || 0) + 1
  return `PRE-${year}-${String(n).padStart(3, '0')}`
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id, role').eq('id', user.id).single()
    if (!profile?.azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let q = supabaseAdmin.from('preventivi')
      .select('id, numero, titolo, stato, valuta, iva_pct, voci, scadenza, created_at, updated_at, contatto_id, contatti(nome, email)')
      .eq('azienda_id', profile.azienda_id).order('created_at', { ascending: false })
    if (searchParams.get('stato')) q = q.eq('stato', searchParams.get('stato'))

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    if (!profile?.azienda_id) return Response.json({ error: 'Nessuna azienda' }, { status: 403 })

    const body = await request.json()
    const numero = await nextNumero(profile.azienda_id)
    const { data, error } = await supabaseAdmin.from('preventivi').insert({
      azienda_id: profile.azienda_id, numero,
      titolo: body.titolo || '', contatto_id: body.contatto_id || null,
      stato: 'bozza', valuta: body.valuta || 'EUR',
      iva_pct: body.iva_pct ?? 22, voci: body.voci || [],
      note: body.note || '', scadenza: body.scadenza || null,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
