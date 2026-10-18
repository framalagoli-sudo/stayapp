import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { fineOccupazione } from '@/lib/booking-giornaliero'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const data_da = searchParams.get('data_da')
    const data_a = searchParams.get('data_a')
    if (!data_da || !data_a) return Response.json({ error: 'data_da e data_a obbligatori' }, { status: 400 })
    // Le date finiscono interpolate nella .or() qui sotto: devono essere date pure,
    // mai una stringa libera dal client (invariante 4 — niente valori grezzi in query).
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
    if (!ISO_DATE.test(data_da) || !ISO_DATE.test(data_a)) return Response.json({ error: 'date non valide (YYYY-MM-DD)' }, { status: 400 })

    // ⚠️ Le prenotazioni a giornate occupano un **intervallo**: chiedere solo
    // `data` fra i due estremi perde chi è entrato prima del periodo mostrato e
    // se ne va dentro. Un affitto dal 28 marzo al 3 aprile sparirebbe dal
    // calendario di aprile, e il titolare lo affitterebbe di nuovo.
    let query = supabaseAdmin.from('prenotazioni')
      // `risorse(disponibilita)` serve a `fineOccupazione`: se la risorsa «conta il
      // giorno di uscita» (un noleggio: 17→18 vuol dire fuori anche il 18), l'ultimo
      // giorno è OCCUPATO. Senza, il calendario del titolare mostrava libero un
      // giorno che sul sito è rosso — e al telefono si ri-affittava (Automax, 17/10).
      .select('risorsa_id, data, data_fine, stato, n_persone, risorse(disponibilita)')
      .lte('data', data_a)
      .or(`data_fine.gte.${data_da},and(data_fine.is.null,data.gte.${data_da})`)
      .in('stato', ['confermata', 'in_attesa'])

    if (profile.role !== 'super_admin') {
      if (!isUUID(profile.azienda_id)) return Response.json({})
      query = query.eq('azienda_id', profile.azienda_id)
    }

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Una prenotazione a giornate pesa su **ogni giorno** che occupa, non solo
    // sul primo. Dove finisce l'occupazione lo decide `fineOccupazione` (fine
    // ESCLUSA), la STESSA del sito: così «conta il giorno di uscita» vale uguale
    // nei due calendari. Prima qui c'era una copia a mano che usava sempre
    // `data_fine` come uscita libera (stile hotel) e ignorava quel flag.
    const giorniOccupati = (b) => {
      const fine = fineOccupazione(b.risorse, b.data, b.data_fine)
      if (!fine || fine <= b.data) return [b.data]
      const giorni = []
      for (let d = new Date(`${b.data}T12:00:00`); ; d.setDate(d.getDate() + 1)) {
        // regola-ok: non è un istante, è aritmetica su giorni puri. Si parte da
        // mezzogiorno apposta per stare lontani dai bordi del giorno, dove lo
        // scarto di fuso cambierebbe la data.
        const iso = d.toISOString().slice(0, 10)
        if (iso >= fine) break
        if (iso >= data_da && iso <= data_a) giorni.push(iso)
      }
      return giorni
    }

    const result = {}
    for (const b of data || []) {
      if (!result[b.risorsa_id]) result[b.risorsa_id] = {}
      for (const giorno of giorniOccupati(b)) {
        if (!result[b.risorsa_id][giorno]) result[b.risorsa_id][giorno] = { count: 0, persone: 0 }
        result[b.risorsa_id][giorno].count++
        result[b.risorsa_id][giorno].persone += b.n_persone || 1
      }
    }
    return Response.json(result)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
