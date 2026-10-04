import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { eventoConcluso } from '@/lib/evento-concluso'
import { GRUPPI_EVENTO, gruppoPrenotazione, occupaPosto, incassatoOnline } from '@/lib/gruppi-prenotazioni-evento'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

// Gli eventi dell'azienda con i numeri delle loro prenotazioni: quante persone
// vengono, quante aspettano, quanto è già incassato.
//
// Serve alla pagina «Prenotazioni», che mostra gli eventi accanto a risorse e
// offerte. Escono solo conteggi: i nomi di chi ha prenotato si leggono aprendo
// l'evento, dalla sua route.
//
// ⚠️ I gruppi li decide `lib/gruppi-prenotazioni-evento.js`, lo stesso file che
// usa l'elenco dentro l'evento: i totali qui e le righe là devono coincidere.
export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    // Stesso recinto dell'elenco eventi: ognuno la propria azienda; il
    // super_admin quella che indica, o tutte.
    const { searchParams } = new URL(request.url)
    let query = supabaseAdmin.from('eventi')
      .select('id, title, date_start, date_end, seats_total, posti_riservati, acconto_percentuale, published, active')
      .order('date_start')
    if (profile.role !== 'super_admin') {
      if (!isUUID(profile.azienda_id)) return Response.json([])
      query = query.eq('azienda_id', profile.azienda_id)
    } else if (isUUID(searchParams.get('azienda_id'))) {
      query = query.eq('azienda_id', searchParams.get('azienda_id'))
    }
    const { data: eventi, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (!eventi?.length) return Response.json([])

    // Le prenotazioni si leggono a pagine: PostgREST ne restituisce al massimo
    // mille per volta, e un conteggio troncato sarebbe un numero falso che
    // sembra vero. Gli id a blocchi, perché finiscono nell'indirizzo.
    const righe = []
    const ids = eventi.map(e => e.id)
    for (let i = 0; i < ids.length; i += 100) {
      const blocco = ids.slice(i, i + 100)
      for (let da = 0; ; da += 1000) {
        const { data: pagina, error: e2 } = await supabaseAdmin.from('event_bookings')
          .select('event_id, seats, total_amount, status, pagamento_stato')
          .in('event_id', blocco).order('id').range(da, da + 999)
        if (e2) return Response.json({ error: e2.message }, { status: 500 })
        righe.push(...(pagina || []))
        if (!pagina || pagina.length < 1000) break
      }
    }

    const perEvento = new Map(eventi.map(e => [e.id, {
      id: e.id, titolo: e.title, date_start: e.date_start, date_end: e.date_end,
      capienza: e.seats_total || null, riservati: e.posti_riservati || 0,
      pubblicato: !!e.published && e.active !== false, concluso: eventoConcluso(e),
      prenotazioni: 0, posti: 0, valore: 0, incassato: 0,
      gruppi: Object.fromEntries(GRUPPI_EVENTO.map(g => [g, { prenotazioni: 0, posti: 0 }])),
      _evento: e,
    }]))
    for (const b of righe) {
      const r = perEvento.get(b.event_id)
      if (!r) continue
      const posti = b.seats || 1
      const g = r.gruppi[gruppoPrenotazione(b)]
      g.prenotazioni++; g.posti += posti
      if (occupaPosto(b)) {
        r.prenotazioni++; r.posti += posti
        r.valore += Number(b.total_amount) || 0
        r.incassato += incassatoOnline(r._evento, b)
      }
    }
    return Response.json([...perEvento.values()].map(({ _evento, ...r }) => ({
      ...r, valore: +r.valore.toFixed(2), incassato: +r.incassato.toFixed(2),
    })))
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
