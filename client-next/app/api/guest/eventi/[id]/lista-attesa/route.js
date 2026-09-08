import { supabaseAdmin } from '@/lib/supabase-server'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/send-email'
import { guestEmailTemplate } from '@/lib/email-template'
import { getAziendaLegale } from '@/lib/guest-data'
import { registraContatto, tagEvento } from '@/lib/crm'
import { after } from 'next/server'

// «Avvisatemi se si libera un posto.»
//
// Si entra qui quando non si può più prenotare — posti finiti o titolare che ha
// chiuso — e solo se il titolare tiene una lista d'attesa. In tutti gli altri
// casi questa route rifiuta: iscriversi a una lista d'attesa mentre ci sono
// posti liberi non vuol dire niente, e lascerebbe una persona ad aspettare una
// chiamata che nessuno ha motivo di fare.
//
// ⛔ Chi è in lista NON occupa un posto. È il punto della funzione: se un posto
// si libera dev'essere libero davvero.
//
// La formula del consenso la decide il server, come per le prenotazioni: è il
// server a scriverla nella prova, e due copie divergerebbero.
export const TESTO_CONSENSO_ATTESA =
  "Ho letto e accetto l'informativa sulla privacy. I miei dati saranno usati per avvisarmi se si libera un posto."

export async function POST(request, props) {
  const params = await props.params
  try {
    const ip = getClientIp(request)
    const rl = await rateLimit(request, { name: 'evento-attesa', limit: 10, windowSec: 3600, ip })
    if (!rl.allowed) return tooManyRequests()

    const { guest_name, guest_email, guest_phone, seats, privacy_accettata } = await request.json()
    if (!guest_name?.trim()) return Response.json({ error: 'Nome obbligatorio' }, { status: 400 })
    if (!guest_email?.trim()) return Response.json({ error: 'Email obbligatoria' }, { status: 400 })
    // Qui si raccolgono nome, email e telefono: senza consenso non si
    // raccolgono affatto, e il controllo sta nella route perché una spunta nel
    // browser si toglie con due clic.
    if (privacy_accettata !== true)
      return Response.json({ error: 'Per entrare in lista serve il consenso al trattamento dei dati.' }, { status: 400 })

    const { data: evento } = await supabaseAdmin.from('eventi')
      .select('id, title, date_start, location, seats_total, seats_booked, lista_attesa, prenotazioni_chiuse, entity_id, azienda_id')
      .eq('id', params.id).eq('published', true).eq('active', true).maybeSingle()
    if (!evento) return Response.json({ error: 'Evento non trovato' }, { status: 404 })
    if (!evento.lista_attesa) return Response.json({ error: 'Per questo evento non teniamo una lista d’attesa.' }, { status: 400 })

    // ⚠️ Si entra in lista solo se davvero non si può prenotare. Altrimenti la
    // persona resterebbe ad aspettare una chiamata mentre poteva prenotare e
    // basta — ed è il genere di cosa che fa sembrare rotto un sistema che
    // funziona.
    const pieno = evento.seats_total && (evento.seats_booked || 0) >= evento.seats_total
    if (!evento.prenotazioni_chiuse && !pieno) {
      return Response.json({ error: 'Ci sono ancora posti: puoi prenotare direttamente.', posti_liberi: true }, { status: 400 })
    }

    const posti = Math.max(1, parseInt(seats) || 1)

    // Due volte la stessa persona sullo stesso evento non serve a nessuno: la
    // seconda iscrizione non è un errore, è la stessa richiesta.
    const { data: esistente } = await supabaseAdmin.from('event_bookings')
      .select('id').eq('event_id', params.id).eq('guest_email', guest_email.trim())
      .eq('status', 'waitlist').maybeSingle()
    if (esistente) {
      return Response.json({ gia_in_lista: true, messaggio: 'Sei già in lista: ti avvisiamo appena si libera un posto.' }, { status: 200 })
    }

    const { data, error } = await supabaseAdmin.from('event_bookings').insert({
      event_id: params.id,
      guest_name: guest_name.trim(),
      guest_email: guest_email.trim(),
      guest_phone: guest_phone?.trim() || null,
      seats: posti,
      total_amount: 0,
      // ⛔ Lo stato che non occupa posti. Vedi `lib/event-seats.js`.
      status: 'waitlist',
      privacy_accettata: true,
      privacy_accettata_il: new Date().toISOString(),
      privacy_testo: TESTO_CONSENSO_ATTESA,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // ⛔ Chi è in lista d'attesa è il contatto più prezioso che l'evento
    // produce: voleva venire e non è entrato. È la prima persona da chiamare
    // quando si replica la serata, e finora spariva insieme all'evento.
    after(() => registraContatto({
      aziendaId: evento.azienda_id,
      email: guest_email, nome: guest_name, telefono: guest_phone,
      fonte: 'evento',
      tags: [...tagEvento(evento.title), 'lista attesa'],
      nota: `In lista d'attesa per «${evento.title}» — ${posti} ${posti === 1 ? 'posto' : 'posti'}: voleva venire e non è entrato.`,
    }))

    // Una conferma che dice la verità: **non** è una prenotazione.
    if ((process.env.RESEND_API_KEY ?? '').trim()) {
      let nome = 'OltreNova'
      if (evento.entity_id) {
        const { data: ent } = await supabaseAdmin.from('entita').select('name').eq('id', evento.entity_id).maybeSingle()
        nome = ent?.name || nome
      }
      const legale = evento.azienda_id ? await getAziendaLegale(evento.azienda_id) : null
      const quando = evento.date_start
        ? new Date(evento.date_start).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
        : ''
      sendEmail({
        _ctx: 'evento-lista-attesa', fromName: nome, to: guest_email.trim(),
        subject: `Sei in lista d’attesa — ${evento.title}`,
        html: guestEmailTemplate({
          entityName: nome, title: 'Ti abbiamo messo in lista', legale,
          // ⚠️ «In lista» non è «prenotato», e va detto senza ambiguità: la
          // persona non deve presentarsi convinta di avere un posto.
          intro: `Ciao ${guest_name.trim()}, ti abbiamo messo in lista d’attesa per <strong>${evento.title}</strong>.<br><br><strong>Non è una prenotazione:</strong> per adesso è tutto esaurito. Se qualcuno rinuncia ti scriviamo noi — non serve che tu faccia altro.`,
          rows: [
            quando ? { label: 'Quando', value: quando } : null,
            evento.location ? { label: 'Dove', value: evento.location } : null,
            { label: 'Posti che vorresti', value: String(posti) },
          ].filter(Boolean),
        }),
      }).catch(() => {})
    }

    return Response.json({ id: data.id, in_lista: true }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
