import { supabaseAdmin } from '@/lib/supabase-server'
import { istanteDi } from '@/lib/fuso'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

// La cancellazione è una MUTAZIONE e sta sulla POST, non sulla GET.
//
// Prima bastava aprire il link per annullare la prenotazione: i client di posta e
// gli antivirus aziendali seguono i link in anteprima, quindi una prenotazione
// vera poteva sparire senza che il cliente avesse cliccato niente — e senza che
// nessuno capisse perché. La GET ora si limita a mostrare cosa si sta per
// disdire; a cancellare è il pulsante di conferma.

async function caricaPrenotazione(token) {
  if (!isUUID(token)) return { errore: 'Token non valido', status: 400 }
  const { data: pren, error } = await supabaseAdmin.from('prenotazioni')
    // `aziende(fuso_orario)` non e' un dettaglio: senza, l'orario
    // dell'appuntamento viene letto nel fuso del server e il termine per
    // disdire si sposta — si puo' non riuscire a cancellare avendone diritto.
    .select('id, data, ora_inizio, stato, cliente_nome, n_persone, azienda_id, risorse(nome, cancellazione_ore), aziende(fuso_orario)')
    .eq('cancellation_token', token).single()
  if (error || !pren) return { errore: 'Prenotazione non trovata', status: 404 }
  return { pren }
}

// Oltre il termine non si disdice più: la regola la decide il titolare.
function fuoriTermine(pren) {
  if (!pren.ora_inizio) return null
  const ore = pren.risorse?.cancellazione_ore || 24
  // ⚠️ L'ora scritta sulla prenotazione e' quella del cliente, non del server:
  // letta senza fuso, il termine si sposta di quanto il server e' distante da
  // lui (due ore per l'Italia, otto per gli Stati Uniti).
  const appuntamento = istanteDi(pren.data, pren.ora_inizio, pren.aziende?.fuso_orario)
  if (!appuntamento) return null
  if (new Date() > new Date(appuntamento.getTime() - ore * 3600000)) {
    return `Non è più possibile cancellare (limite ${ore}h prima)`
  }
  return null
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const { pren, errore, status } = await caricaPrenotazione(searchParams.get('token'))
    if (errore) return Response.json({ error: errore }, { status })

    return Response.json({
      cancellabile: pren.stato !== 'cancellata' && !fuoriTermine(pren),
      gia_cancellata: pren.stato === 'cancellata',
      motivo: pren.stato === 'cancellata' ? 'Questa prenotazione è già stata cancellata' : fuoriTermine(pren),
      prenotazione: {
        risorsa: pren.risorse?.nome || '',
        data: pren.data, ora: pren.ora_inizio,
        cliente: pren.cliente_nome, persone: pren.n_persone,
      },
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url)
    const { pren, errore, status } = await caricaPrenotazione(searchParams.get('token'))
    if (errore) return Response.json({ error: errore }, { status })
    if (pren.stato === 'cancellata') return Response.json({ error: 'Già cancellata' }, { status: 400 })

    const tardi = fuoriTermine(pren)
    if (tardi) return Response.json({ error: tardi }, { status: 400 })

    const { error } = await supabaseAdmin.from('prenotazioni')
      .update({ stato: 'cancellata', updated_at: new Date().toISOString() })
      .eq('id', pren.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ ok: true, messaggio: 'Prenotazione cancellata con successo' })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
