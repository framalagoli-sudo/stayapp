import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile, resolveAziendaId } from '@/lib/server-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { trovaTemplate } from '@/lib/whatsapp-catalogo'
import { anteprimaCampagna, eseguiCampagna } from '@/lib/whatsapp-send'

// Campagne WhatsApp: creazione, anteprima con stima costi, invio o programmazione.
export const maxDuration = 60

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    const { searchParams } = new URL(request.url)
    const azienda_id = resolveAziendaId(profile, searchParams.get('azienda_id'))
    if (!azienda_id) return Response.json({ error: 'Azienda non valida' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('whatsapp_campagna').select('*')
      .eq('azienda_id', azienda_id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    const body = await request.json()
    const azienda_id = resolveAziendaId(profile, body.azienda_id)
    if (!azienda_id) return Response.json({ error: 'Azienda non valida' }, { status: 400 })

    const template = trovaTemplate(body.catalogo_key)
    if (!template) return Response.json({ error: 'Messaggio non valido' }, { status: 400 })

    const bozza = {
      azienda_id,
      entity_tipo: body.entity_tipo || null,
      entity_id: body.entity_id || null,
      nome: String(body.nome || template.titolo).trim().slice(0, 120),
      catalogo_key: body.catalogo_key,
      variabili: body.variabili || {},
      tag_filter: Array.isArray(body.tag_filter) && body.tag_filter.length ? body.tag_filter : null,
    }

    // Anteprima: dice quanti riceveranno, quanti restano fuori e quanto costa.
    // Nessuna scrittura: il cliente deve poter guardare senza impegnarsi.
    if (body.solo_anteprima) {
      const stima = await anteprimaCampagna(bozza)
      return Response.json({ anteprima: true, ...stima })
    }

    // Le variabili obbligatorie vanno riempite: un messaggio con i buchi arriva
    // al cliente finale così com'è, e si paga comunque.
    const mancanti = template.variabili
      .filter(v => v.chiave !== 'nome' && !String(bozza.variabili?.[v.chiave] || '').trim())
      .map(v => v.etichetta)
    if (mancanti.length) {
      return Response.json({ error: `Compila prima: ${mancanti.join(', ')}` }, { status: 400 })
    }

    const { allowed } = await rateLimit(request, { name: 'whatsapp-campagna', limit: 20, windowSec: 3600 })
    if (!allowed) return tooManyRequests()

    const programmata = body.programmata_per ? new Date(body.programmata_per) : null
    const { data: campagna, error } = await supabaseAdmin.from('whatsapp_campagna').insert({
      ...bozza,
      stato: programmata ? 'programmata' : 'bozza',
      programmata_per: programmata ? programmata.toISOString() : null,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Invio immediato: si aspetta l'esito, così la pagina può dirlo subito.
    if (!programmata && body.invia_ora) {
      const esito = await eseguiCampagna(campagna.id)
      const { data: aggiornata } = await supabaseAdmin.from('whatsapp_campagna').select('*').eq('id', campagna.id).single()
      return Response.json({ ...aggiornata, esito }, { status: 201 })
    }

    return Response.json(campagna, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
