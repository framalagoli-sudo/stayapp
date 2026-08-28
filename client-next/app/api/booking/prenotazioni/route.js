import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { verificaPeriodo, totaleGiornaliero } from '@/lib/booking-giornaliero'
import { confermaPostiPrenotazione } from '@/lib/capienza'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    let query = supabaseAdmin.from('prenotazioni')
      .select('*, risorse(nome, modalita, colore, entity_tipo, entity_id), offerte(titolo, categoria)')
      .order('data', { ascending: false })
      .order('ora_inizio', { ascending: true })

    if (profile.role !== 'super_admin') {
      if (!isUUID(profile.azienda_id)) return Response.json([])
      query = query.eq('azienda_id', profile.azienda_id)
    } else if (isUUID(searchParams.get('azienda_id'))) {
      query = query.eq('azienda_id', searchParams.get('azienda_id'))
    }
    if (isUUID(searchParams.get('risorsa_id'))) query = query.eq('risorsa_id', searchParams.get('risorsa_id'))
    // ⚠️ Una prenotazione a giornate copre un intervallo: chiedere il giorno 12
    // di un affitto dal 10 al 14 con `data = 12` non trova niente. Il calendario
    // colorerebbe il giorno come occupato e poi mostrerebbe un pannello vuoto.
    // L'ultimo giorno è quello dell'uscita e non conta come occupato.
    const giorno = searchParams.get('data')
    if (giorno) query = query.or(`data.eq.${giorno},and(data.lte.${giorno},data_fine.gt.${giorno})`)
    if (searchParams.get('stato'))   query = query.eq('stato', searchParams.get('stato'))
    if (searchParams.get('data_da')) query = query.gte('data', searchParams.get('data_da'))
    if (searchParams.get('data_a'))  query = query.lte('data', searchParams.get('data_a'))

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

// Il titolare inserisce a mano una prenotazione presa al telefono.
//
// Fino al 28/08 non si poteva: la route aveva solo la lettura, e chi riceveva
// una chiamata doveva dire «vada sul sito». Il calendario ha reso evidente la
// mancanza — cliccare un giorno libero non portava da nessuna parte.
//
// ⚠️ Non è la stessa cosa di `/api/booking/public/prenota`: lì scrive un
// visitatore e ogni dato va sospettato, qui scrive chi possiede la risorsa.
// Restano comunque due controlli che non si saltano: la risorsa dev'essere
// **sua**, e il posto dev'essere davvero libero — un titolare distratto può
// prendere due volte lo stesso giorno tanto quanto un ospite.
export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const body = await request.json()
    const { risorsa_id, data, data_fine, ora_inizio, servizio, cliente_nome, cliente_email,
      cliente_telefono, n_persone, note_cliente } = body

    if (!isUUID(risorsa_id)) return Response.json({ error: 'Scegli la risorsa' }, { status: 400 })
    if (!data) return Response.json({ error: 'Scegli la data' }, { status: 400 })
    if (!cliente_nome?.trim()) return Response.json({ error: 'Serve il nome di chi prenota' }, { status: 400 })

    const { data: risorsa } = await supabaseAdmin.from('risorse')
      .select('*').eq('id', risorsa_id).maybeSingle()
    if (!risorsa) return Response.json({ error: 'Risorsa non trovata' }, { status: 404 })
    // La risorsa dev'essere della propria azienda: senza, si scriverebbero
    // prenotazioni sul calendario di un altro cliente.
    if (profile.role !== 'super_admin' && risorsa.azienda_id !== profile.azienda_id)
      return Response.json({ error: 'Risorsa non trovata' }, { status: 404 })

    let fine = null
    let ora_fine = null
    let importo = Number(risorsa.prezzo) || 0
    const persone = Math.max(1, parseInt(n_persone) || 1)

    if (risorsa.modalita === 'giornaliero') {
      if (!data_fine) return Response.json({ error: 'Serve anche la data di fine' }, { status: 400 })
      const { data: occupate } = await supabaseAdmin.from('prenotazioni')
        .select('data, data_fine').eq('risorsa_id', risorsa_id)
        .in('stato', ['confermata', 'in_attesa']).gte('data_fine', data)
      const esito = verificaPeriodo(risorsa, data, data_fine, occupate || [])
      if (!esito.ok) return Response.json({ error: esito.motivo }, { status: 409 })
      fine = data_fine
      importo = totaleGiornaliero(risorsa, data, data_fine)
    } else {
      if (risorsa.modalita === 'slot' && ora_inizio) {
        const [h, m] = ora_inizio.split(':').map(Number)
        const minuti = h * 60 + (m || 0) + (risorsa.durata_minuti || 60)
        ora_fine = `${String(Math.floor(minuti / 60)).padStart(2, '0')}:${String(minuti % 60).padStart(2, '0')}`
      }
      importo = importo * persone
    }

    const { data: creata, error } = await supabaseAdmin.from('prenotazioni').insert({
      risorsa_id, azienda_id: risorsa.azienda_id,
      entity_tipo: risorsa.entity_tipo, entity_id: risorsa.entity_id,
      data, data_fine: fine, ora_inizio: ora_inizio || null, ora_fine,
      servizio: servizio || null,
      cliente_nome: cliente_nome.trim(),
      // L'email non è obbligatoria: al telefono capita di avere solo un numero.
      cliente_email: (cliente_email || '').trim().toLowerCase(),
      cliente_telefono: cliente_telefono?.trim() || null,
      n_persone: persone,
      note_cliente: note_cliente?.trim() || null,
      // Inserita dal titolare: è già confermata, non deve confermarla a se stesso.
      stato: 'confermata',
      prezzo_unitario: risorsa.prezzo, importo_totale: importo,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Lo stesso controllo che regge le richieste simultanee dal sito: se il
    // posto era già stato preso, questa si ritira.
    if (!(await confermaPostiPrenotazione(risorsa, creata.id)))
      return Response.json({ error: 'Quel posto è appena stato occupato' }, { status: 409 })

    return Response.json(creata, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
