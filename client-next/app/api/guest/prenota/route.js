import { supabaseAdmin } from '@/lib/supabase-server'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'
import { postiRimasti } from '@/lib/offerte-catalogo'
import { sendWebhooks } from '@/lib/send-webhooks'
import { sendEmail } from '@/lib/send-email'
import { guestEmailTemplate } from '@/lib/email-template'

// Chi prenota un'offerta dal sito.
//
// Prima queste prenotazioni finivano in `requests` come **testo**: il titolare
// le distingueva dalle richieste di servizio perché il messaggio cominciava con
// «[Prenotazione». Un meccanismo che si è rotto due volte in silenzio — i
// componenti scrivevano «Prenotazione escursione:» senza la quadra, e metà delle
// prenotazioni non compariva nella pagina che avrebbe dovuto mostrarle.
//
// Ora vanno in `prenotazioni`, la stessa tabella delle risorse, con il
// riferimento all'offerta. Niente più stringhe da interpretare.
//
// ⚠️ Gli eventi restano fuori: hanno la loro strada, per scelta.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

// La formula che chi prenota accetta. La decide il server: se la copia nel
// componente e questa divergessero, resterebbe salvata una frase mai letta.
export const TESTO_CONSENSO =
  "Ho letto e accetto l'informativa sulla privacy. I miei dati saranno usati per gestire questa richiesta."

// Il contatore dei posti non si incrementa: si **ricalcola** contando le
// prenotazioni vive. Un contatore che si somma può divergere dalla realtà — per
// una cancellazione andata storta, per una riga tolta a mano — e allora dice
// «esaurito» a chi avrebbe potuto prenotare. Contare è sempre vero.
async function ricalcolaPosti(offertaId) {
  const { data: righe } = await supabaseAdmin.from('prenotazioni')
    .select('n_persone').eq('offerta_id', offertaId).in('stato', ['confermata', 'in_attesa'])
  const occupati = (righe || []).reduce((s, r) => s + (r.n_persone || 1), 0)
  await supabaseAdmin.from('offerte').update({ posti_occupati: occupati }).eq('id', offertaId)
  return occupati
}

export async function POST(request) {
  try {
    const ip = getClientIp(request)
    const rl = await rateLimit(request, { name: 'guest-prenota', limit: 12, windowSec: 3600, ip })
    if (!rl.allowed) return tooManyRequests()

    const body = await request.json()
    const { offerta_id, nome, contatto, n_persone, messaggio, privacy_accettata, canale } = body

    if (!isUUID(offerta_id)) return Response.json({ error: 'Offerta non valida' }, { status: 400 })
    if (!nome?.trim()) return Response.json({ error: 'Serve il tuo nome per poterti rispondere.' }, { status: 400 })
    if (!contatto?.trim()) return Response.json({ error: 'Serve un recapito: email o telefono.' }, { status: 400 })
    // La spunta nel modulo si toglie con due clic: la condizione sta qui, dove
    // nessuno la può aggirare.
    if (privacy_accettata !== true)
      return Response.json({ error: 'Per prenotare serve il consenso al trattamento dei dati.' }, { status: 400 })

    const { data: offerta } = await supabaseAdmin.from('offerte')
      .select('id, azienda_id, entity_id, titolo, prezzo, posti_totali, posti_occupati, impegno, attiva, pubblicata, conferma_auto, avvisa_titolare, conferma_ospite')
      .eq('id', offerta_id).maybeSingle()
    if (!offerta || !offerta.attiva || !offerta.pubblicata)
      return Response.json({ error: 'Offerta non disponibile' }, { status: 404 })

    const persone = Math.max(1, parseInt(n_persone) || 1)

    // I posti si controllano **prima**, ma il controllo vero è dopo: due
    // richieste simultanee leggono lo stesso numero e passerebbero entrambe.
    const rimasti = postiRimasti(offerta)
    if (rimasti !== null && rimasti < persone)
      return Response.json({ error: rimasti > 0 ? `Restano solo ${rimasti} posti.` : 'Posti esauriti.' }, { status: 409 })

    const { data: creata, error } = await supabaseAdmin.from('prenotazioni').insert({
      offerta_id: offerta.id,
      azienda_id: offerta.azienda_id,
      entity_id: offerta.entity_id,
      // La data di oggi: un'offerta senza calendario si prenota «adesso».
      // Quelle con una data la portano già dentro di sé.
      data: new Date().toISOString().slice(0, 10),
      cliente_nome: nome.trim(),
      // Email o telefono: al telefono non si ha per forza un indirizzo.
      cliente_email: contatto.includes('@') ? contatto.trim().toLowerCase() : '',
      cliente_telefono: contatto.includes('@') ? null : contatto.trim(),
      n_persone: persone,
      messaggio: messaggio?.trim() || null,
      note_cliente: canale === 'whatsapp' ? 'Ha scelto di scriverti su WhatsApp.' : null,
      stato: offerta.conferma_auto === false ? 'in_attesa' : 'confermata',
      prezzo_unitario: offerta.prezzo || 0,
      importo_totale: (Number(offerta.prezzo) || 0) * persone,
      privacy_accettata: true,
      privacy_accettata_il: new Date().toISOString(),
      privacy_testo: TESTO_CONSENSO,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Il controllo che regge le richieste simultanee: si conta **dopo**
    // l'inserimento e chi eccede si ritira, prima di ogni notifica.
    if (offerta.posti_totali != null) {
      const occupati = await ricalcolaPosti(offerta.id)
      if (occupati > offerta.posti_totali) {
        await supabaseAdmin.from('prenotazioni').delete().eq('id', creata.id)
        await ricalcolaPosti(offerta.id)
        return Response.json({ error: 'I posti sono appena finiti.' }, { status: 409 })
      }
    }

    // Avvisi: non bloccano la risposta a chi ha prenotato.
    supabaseAdmin.from('entita').select('name, email').eq('id', offerta.entity_id).maybeSingle()
      .then(({ data: ent }) => {
        if (offerta.azienda_id) sendWebhooks(offerta.azienda_id, 'nuova_prenotazione', {
          prenotazione_id: creata.id, offerta_id: offerta.id, cliente_nome: creata.cliente_nome,
        })
        if (offerta.avvisa_titolare === false || !ent?.email || !process.env.RESEND_API_KEY) return
        sendEmail({
          _ctx: 'offerta-prenotazione', fromName: ent.name,
          to: ent.email,
          subject: `[${ent.name}] Nuova prenotazione: ${offerta.titolo}`,
          html: guestEmailTemplate({
            entityName: ent.name, title: 'Nuova prenotazione',
            intro: `<strong>${creata.cliente_nome}</strong> ha prenotato <strong>${offerta.titolo}</strong>.`,
            rows: [
              { label: 'Recapito', value: contatto.trim() },
              { label: 'Persone', value: String(persone) },
              ...(messaggio?.trim() ? [{ label: 'Messaggio', value: messaggio.trim() }] : []),
              ...(canale === 'whatsapp' ? [{ label: 'Attenzione', value: 'Ha scelto di scriverti su <strong>WhatsApp</strong>. Se il messaggio non arriva, il suo recapito è qui sopra.' }] : []),
            ],
          }),
        }).catch(() => {})
      })

    return Response.json({ id: creata.id, stato: creata.stato }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
