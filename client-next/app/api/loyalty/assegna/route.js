import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { getSaldo } from '@/lib/loyalty-helpers'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    const azienda_id = profile?.azienda_id
    const { contatto_id, punti, note } = await request.json()
    if (!contatto_id || punti == null) return Response.json({ error: 'contatto_id e punti obbligatori' }, { status: 400 })

    // Il contatto dev'essere della propria azienda: senza questo controllo si
    // possono attaccare movimenti a rubrica altrui.
    const { data: contatto } = await supabaseAdmin.from('contatti')
      .select('id').eq('id', contatto_id).eq('azienda_id', azienda_id).maybeSingle()
    if (!contatto) return Response.json({ error: 'Contatto non trovato' }, { status: 404 })

    // I punti valgono denaro: un valore fuori scala (o non numerico) va fermato qui.
    const puntiNum = parseInt(punti)
    if (!Number.isFinite(puntiNum) || Math.abs(puntiNum) > 1_000_000) {
      return Response.json({ error: 'Valore punti non valido' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.from('loyalty_points').insert({
      azienda_id, contatto_id, punti: puntiNum, tipo: 'manuale', note: note || '',
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    const saldo = await getSaldo(azienda_id, contatto_id)
    return Response.json({ movimento: data, saldo })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
