import { supabaseAdmin } from '@/lib/supabase-server'
import { recomputeEventSeats } from '@/lib/event-seats'
import { confermaPostiEvento } from '@/lib/capienza'
import { creaCheckout, accontoDovuto } from '@/lib/checkout'
import { sendEmail } from '@/lib/send-email'
import { emailTemplate } from '@/lib/email-template'
import { getAziendaLegale } from '@/lib/guest-data'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'
import { mandaConfermaEvento } from '@/lib/evento-conferma'

const ENTITY_TBL = { struttura: 'entita', ristorante: 'entita', attivita: 'entita' }

// La formula che chi prenota accetta. La decide il server, non il componente:
// è il server a scriverla nella prova del consenso, e se le due copie
// divergessero resterebbe salvata una formula che nessuno ha mai letto.
// Cambiandola, le prenotazioni già raccolte conservano quella vecchia — che è
// esattamente il motivo per cui si salva il testo e non solo la spunta.
export const TESTO_CONSENSO =
  "Ho letto e accetto l'informativa sulla privacy. I miei dati saranno usati per gestire questa prenotazione."

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export async function POST(request, props) {
  const params = await props.params;
  try {
    // Anti-abuso: l'endpoint è pubblico e ora invia email → limita gli invii per IP.
    const ip = getClientIp(request)
    const rl = await rateLimit(request, { name: 'evento-book', limit: 10, windowSec: 3600, ip })
    if (!rl.allowed) return tooManyRequests()

    const body = await request.json()
    const { guest_name, guest_email, guest_phone, package_id, seats, notes, privacy_accettata } = body
    if (!guest_name?.trim()) return Response.json({ error: 'Nome obbligatorio' }, { status: 400 })
    if (!guest_email?.trim()) return Response.json({ error: 'Email obbligatoria' }, { status: 400 })
    // Qui si raccolgono nome, email e telefono: senza consenso non si raccolgono
    // affatto. La spunta nel browser non basta — si toglie con due clic — quindi
    // la condizione sta qui, dove nessuno la può aggirare.
    if (privacy_accettata !== true)
      return Response.json({ error: 'Per prenotare serve il consenso al trattamento dei dati.' }, { status: 400 })

    // select('*') → indipendente dall'ordine della migration 067 (colonne notify_*
    // assenti = undefined = nessuna mail, niente 500).
    // regola-ok: l'evento serve solo a validare la prenotazione e a decidere le
    // notifiche, non viene mai restituito al client — nessuna colonna esce di qui.
    const { data: evento, error: evErr } = await supabaseAdmin.from('eventi')
      .select('*').eq('id', params.id).single()
    if (evErr || !evento) return Response.json({ error: 'Evento non trovato' }, { status: 404 })

    const reqSeats = parseInt(seats) || 1
    if (evento.seats_total && (evento.seats_booked + reqSeats) > evento.seats_total)
      return Response.json({ error: 'Posti non disponibili' }, { status: 400 })

    let price = evento.price || 0
    let pkgName = ''
    if (package_id) {
      const pkg = (evento.packages || []).find(p => p.id === package_id)
      if (pkg) { price = pkg.price || 0; pkgName = pkg.name || '' }
    }
    const { data, error } = await supabaseAdmin.from('event_bookings').insert({
      event_id: params.id, guest_name, guest_email,
      guest_phone: guest_phone || null, package_id: package_id || null,
      seats: reqSeats, total_amount: price * reqSeats, notes: notes || null,
      // ⚠️ Nasce CONFERMATA. Nasceva «in attesa» e nessuno l'ha mai confermata
      // — tredici su tredici, da aprile a settembre — mentre all'ospite arrivava
      // già un'email intitolata «Prenotazione confermata»: le due parti
      // leggevano due verità diverse con la stessa parola.
      //
      // «In attesa» torna a valere il giorno che i pagamenti saranno accesi:
      // allora sarà un'attesa vera, di un pagamento che non è arrivato.
      status: 'confirmed',
      // La prova del consenso, non la sua dichiarazione: quando è stato dato e
      // quale formula la persona ha letto. Se domani il testo cambia, questo
      // resta ricostruibile — è il punto dell'articolo 7 del GDPR.
      privacy_accettata: true,
      privacy_accettata_il: new Date().toISOString(),
      privacy_testo: TESTO_CONSENSO,
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Il controllo qui sopra legge i posti prima di inserire: due richieste
    // simultanee lo superano entrambe. Qui si verifica l'ordine di arrivo e chi
    // è in eccesso si ritira — prima di scrivere email a chiunque.
    if (!(await confermaPostiEvento(params.id, data.id))) {
      await recomputeEventSeats(params.id)
      return Response.json({ error: 'Posti non disponibili' }, { status: 400 })
    }

    // Le prenotazioni in attesa riservano subito i posti (anti-overbooking).
    await recomputeEventSeats(params.id)

    // ── Se questo evento vuole un pagamento, si crea la cassa ────────────────
    //
    // Stessa regola del booking: **dopo** aver tenuto il posto, mai prima. Far
    // pagare un posto che nel frattempo è finito è il modo peggiore di
    // sbagliare. E l'importo si calcola dal prezzo dell'evento riletto dal
    // database, mai da quello che è arrivato nella richiesta.
    let pagamento = null
    const conto = accontoDovuto(evento.acconto_percentuale, price * reqSeats)
    if (conto.dovuto > 0) {
      try {
        const base = (process.env.CLIENT_URL ?? '').trim() || new URL(request.url).origin
        const esito = await creaCheckout({
          aziendaId: evento.azienda_id,
          righe: [{
            nome: conto.tutto ? evento.title : `${evento.title} — acconto ${conto.perc}%`,
            importo: conto.dovuto, quantita: 1, immagine: evento.cover_url || undefined,
          }],
          email: guest_email.trim(),
          successUrl: `${base}/checkout/successo?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${base}/checkout/annullato`,
        })
        await supabaseAdmin.from('event_bookings')
          .update({ pagamento_id: esito.sessionId, pagamento_stato: 'non_pagato' })
          .eq('id', data.id)
        pagamento = { url: esito.url, importo: conto.dovuto, saldo: conto.saldo, tutto: conto.tutto }
      } catch (e) {
        // La prenotazione resta valida: il posto è già suo. Se la cassa non è
        // disponibile si paga sul posto, com'era prima — ma il motivo si scrive.
        console.error('[eventi] pagamento non richiesto:', e.message)
      }
    }

    // ── Notifiche email (per-evento, configurabili) ──────────────────────────────
    const resendKey = (process.env.RESEND_API_KEY ?? '').trim()
    const from = (process.env.RESEND_FROM ?? '').trim() || 'OltreNova <noreply@oltrenova.com>'
    const total = (price * reqSeats).toFixed(2)
    const dateStr = fmtDate(evento.date_start)

    // Nome/e-mail del titolare: dall'entità associata o, se aziendale, dall'azienda.
    let ownerEmail = null, ownerName = null, entSlug = null
    if (evento.entity_tipo && evento.entity_id && ENTITY_TBL[evento.entity_tipo]) {
      const { data: ent } = await supabaseAdmin.from(ENTITY_TBL[evento.entity_tipo]).select('name, email, slug').eq('id', evento.entity_id).single()
      if (ent) { ownerEmail = ent.email; ownerName = ent.name; entSlug = ent.slug }
    }
    if (!ownerEmail && evento.azienda_id) {
      const { data: az } = await supabaseAdmin.from('aziende').select('ragione_sociale, email').eq('id', evento.azienda_id).single()
      if (az) { ownerEmail = ownerEmail || az.email; ownerName = ownerName || az.ragione_sociale }
    }
    const bizName = ownerName || evento.title

    // Footer conforme per la mail all'ospite: identificazione legale + link privacy.
    const legale = evento.azienda_id ? await getAziendaLegale(evento.azienda_id) : null
    const PREFIX = { struttura: 's', ristorante: 'r', attivita: 'a' }
    const appUrl = (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'
    const privacyUrl = (entSlug && PREFIX[evento.entity_tipo]) ? `${appUrl}/${PREFIX[evento.entity_tipo]}/${entSlug}/privacy` : null

    // 1) Notifica al titolare (brand OltreNova, è piattaforma → titolare).
    if (evento.notify_owner_on_booking && ownerEmail && resendKey) {
      sendEmail({
        _ctx: 'evento-owner', fromName: bizName,
        from, to: ownerEmail, replyTo: guest_email,
        subject: `[${bizName}] Nuova prenotazione: ${evento.title}`,
        html: emailTemplate({
          title: `Nuova prenotazione — ${evento.title}`, entityName: bizName,
          rows: [
            { label: 'Nome', value: guest_name },
            { label: 'Email', value: `<a href="mailto:${guest_email}" style="color:#00b5b5">${guest_email}</a>` },
            guest_phone ? { label: 'Telefono', value: guest_phone } : null,
            { label: 'Posti', value: String(reqSeats) },
            pkgName ? { label: 'Pacchetto', value: pkgName } : null,
            { label: 'Totale', value: `€${total}` },
            dateStr ? { label: 'Data evento', value: dateStr } : null,
          ].filter(Boolean),
          appUrl: (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com',
        }),
      }).catch(() => {})
    }

    // 2) La conferma all'ospite parte SOLO se non c'è nulla da pagare.
    //
    // ⛔ Se c'è un pagamento in corso, in questo istante la persona è già sulla
    // pagina di Stripe: un'email che le chiede di pagare la raggiunge mentre sta
    // pagando, ed è rumore. La conferma la manda il webhook quando i soldi sono
    // arrivati — è l'unico momento in cui «confermata» è vero.
    //
    // Testo ed effetti stanno in `mandaConfermaEvento`, un posto solo: due copie
    // divergono, e diverge proprio quella che si legge di rado.
    let guest_confirmation_sent = false
    if (!pagamento) {
      const esito = await mandaConfermaEvento(data.id)
      guest_confirmation_sent = esito.ok
    }

    // Il link della cassa torna insieme alla prenotazione: chi ha appena
    // prenotato va portato a pagare adesso, non con un'email di domani.
    return Response.json({ ...data, guest_confirmation_sent, pagamento }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
