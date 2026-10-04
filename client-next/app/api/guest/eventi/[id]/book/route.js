import { supabaseAdmin } from '@/lib/supabase-server'
import { recomputeEventSeats } from '@/lib/event-seats'
import { confermaPostiEvento } from '@/lib/capienza'
import { creaCheckout } from '@/lib/checkout'
import { sendEmail } from '@/lib/send-email'
import { emailTemplate } from '@/lib/email-template'
import { getAziendaLegale } from '@/lib/guest-data'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'
import { mandaConfermaEvento } from '@/lib/evento-conferma'
import { after } from 'next/server'
import { triggerAutomazione } from '@/lib/guest-utils'
import { registraContatto, tagEvento } from '@/lib/crm'
import { postiRichiesti, rifiutoPrenotazione, contoEvento } from '@/lib/evento-prenotazione'
import { oraLocale } from '@/lib/fuso'
import { postiEvento, SOGLIA_AVVISO } from '@/lib/posti-evento'
import { annunciaPrenotazioneEvento } from '@/lib/evento-prenotato'
import { MINUTI_PER_PAGARE } from '@/lib/prenotazioni-scadute'

const ENTITY_TBL = { struttura: 'entita', ristorante: 'entita', attivita: 'entita' }

// La formula che chi prenota accetta. La decide il server, non il componente:
// è il server a scriverla nella prova del consenso, e se le due copie
// divergessero resterebbe salvata una formula che nessuno ha mai letto.
// Cambiandola, le prenotazioni già raccolte conservano quella vecchia — che è
// esattamente il motivo per cui si salva il testo e non solo la spunta.
export const TESTO_CONSENSO =
  "Ho letto e accetto l'informativa sulla privacy. I miei dati saranno usati per gestire questa prenotazione."

// ⛔ Nel fuso dell'azienda, non del server: Vercel gira in UTC, e al titolare,
// nel CRM e nei promemoria arrivava un'ora indietro di due.
function fmtDate(iso, fuso) {
  return oraLocale(iso, fuso, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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

    // Solo un evento che il pubblico può vedere si può prenotare: senza i filtri
    // su `published` e `active` una bozza o un evento spento accettavano
    // prenotazioni da chiunque ne conoscesse l'id.
    //
    // select('*') → indipendente dall'ordine della migration 067 (colonne notify_*
    // assenti = undefined = nessuna mail, niente 500).
    // regola-ok: l'evento serve solo a validare la prenotazione e a decidere le
    // notifiche, non viene mai restituito al client — nessuna colonna esce di qui.
    const { data: evento, error: evErr } = await supabaseAdmin.from('eventi')
      .select('*, aziende(fuso_orario)').eq('id', params.id).eq('published', true).eq('active', true).single()
    if (evErr || !evento) return Response.json({ error: 'Evento non trovato' }, { status: 404 })

    // Il telefono è obbligatorio solo se lo ha chiesto chi organizza. Il
    // controllo sta QUI e non solo nel modulo: una validazione nel browser si
    // toglie con due clic, e chi organizza conta di poter richiamare.
    if (evento.telefono_obbligatorio === true && !guest_phone?.trim())
      return Response.json({ error: 'Per questo evento serve un numero di telefono.' }, { status: 400 })

    // ⚠️ Il muro sta qui, non nel browser: nascondere il modulo impedisce di
    // sbagliare a chi guarda la pagina, non a chi manda una richiesta a mano.
    // Le stesse domande le fa il riepilogo che si legge prima di confermare:
    // stanno in `lib/evento-prenotazione.js`, così le risposte non divergono.
    const reqSeats = postiRichiesti(seats)
    if (!reqSeats) return Response.json({ error: 'Indica per quante persone vuoi prenotare.' }, { status: 400 })
    const rifiuto = rifiutoPrenotazione(evento, reqSeats)
    if (rifiuto) return Response.json(rifiuto, { status: 400 })
    const posti = postiEvento(evento)

    // Quanto c'è da pagare adesso: decide se la prenotazione nasce confermata o
    // in attesa del pagamento.
    const { totale, conto } = contoEvento(evento, package_id, reqSeats)
    const { data, error } = await supabaseAdmin.from('event_bookings').insert({
      event_id: params.id, guest_name, guest_email,
      guest_phone: guest_phone || null, package_id: package_id || null,
      seats: reqSeats, total_amount: totale, notes: notes || null,
      // ⚠️ Nasce CONFERMATA. Nasceva «in attesa» e nessuno l'ha mai confermata
      // — tredici su tredici, da aprile a settembre — mentre all'ospite arrivava
      // già un'email intitolata «Prenotazione confermata»: le due parti
      // leggevano due verità diverse con la stessa parola.
      //
      // «In attesa» vale quando c'è da pagare: è un'attesa vera, di un
      // pagamento che non è ancora arrivato. Il posto è tenuto (conta nei
      // posti occupati, così non si vende due volte), ma la prenotazione
      // diventa confermata solo quando Stripe dice che ha pagato — e se non
      // paga entro MINUTI_PER_PAGARE minuti (30) il posto torna libero.
      // ⛔ Fino al 01/10 nasceva confermata anche così, e chi apriva la cassa
      // senza pagare restava «prenotato» (Garage 22: 17 posti su 60).
      status: conto.dovuto > 0 ? 'pending' : 'confirmed',
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
    if (!(await confermaPostiEvento(params.id, data.id, posti.illimitato ? null : posti.limiteOnline))) {
      await recomputeEventSeats(params.id)
      // Qui ci arriva solo chi ha perso una corsa per un soffio: due richieste
      // arrivate insieme sull'ultimo posto. Va detto così, non «non disponibili».
      return Response.json({
        error: evento.lista_attesa
          ? 'Qualcuno ha preso l\'ultimo posto un istante prima. Puoi metterti in lista d\'attesa.'
          : 'Qualcuno ha preso l\'ultimo posto un istante prima.',
        posti_liberi: 0, lista_attesa: !!evento.lista_attesa,
      }, { status: 400 })
    }

    // Le prenotazioni in attesa riservano subito i posti (anti-overbooking).
    // Il totale serve anche a capire se è questa prenotazione ad aver superato
    // la soglia d'avviso: senza, bisognerebbe ricordarsi se la mail è già partita.
    const postiDopo = await recomputeEventSeats(params.id)

    // ── Se questo evento vuole un pagamento, si crea la cassa ────────────────
    //
    // Stessa regola del booking: **dopo** aver tenuto il posto, mai prima. Far
    // pagare un posto che nel frattempo è finito è il modo peggiore di
    // sbagliare. E l'importo si calcola dal prezzo dell'evento riletto dal
    // database, mai da quello che è arrivato nella richiesta.
    let pagamento = null
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
          // La cassa si chiude da sola: chi non paga non tiene il posto.
          minutiPerPagare: MINUTI_PER_PAGARE,
        })
        await supabaseAdmin.from('event_bookings')
          .update({ pagamento_id: esito.sessionId, pagamento_stato: 'non_pagato' })
          .eq('id', data.id)
        pagamento = { url: esito.url, importo: conto.dovuto, saldo: conto.saldo, tutto: conto.tutto }
      } catch (e) {
        // La prenotazione resta valida: il posto è già suo. Se la cassa non è
        // disponibile si paga sul posto, com'era prima — ma il motivo si scrive.
        // Senza cassa non c'è niente da aspettare: diventa confermata.
        console.error('[eventi] pagamento non richiesto:', e.message)
        await supabaseAdmin.from('event_bookings').update({ status: 'confirmed' }).eq('id', data.id)
      }
    }

    // ── Notifiche email (per-evento, configurabili) ──────────────────────────────
    const resendKey = (process.env.RESEND_API_KEY ?? '').trim()
    const from = (process.env.RESEND_FROM ?? '').trim() || 'OltreNova <noreply@oltrenova.com>'
    const fuso = evento.aziende?.fuso_orario
    const dateStr = fmtDate(evento.date_start, fuso)

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

    // 1) «Nuova prenotazione» al titolare: la manda `annunciaPrenotazioneEvento`
    // (più sotto), e solo quando la prenotazione è vera — subito se non c'è da
    // pagare, al pagamento se c'è. Qui resta l'avviso sui posti che finiscono:
    // quello riguarda i posti TENUTI, e chi è alla cassa ne tiene uno.
    if (evento.notify_owner_on_booking && ownerEmail && resendKey) {
      // ── «Da adesso smetti di dire sì al telefono» ────────────────────────
      //
      // La mail per ogni prenotazione, dopo la terza, si ignora. Quella che
      // serve davvero è una sola: il momento in cui i posti stanno finendo.
      // Si manda solo quando la soglia viene ATTRAVERSATA da questa
      // prenotazione — così non serve ricordare se è già partita, e non ne
      // arriva una per ogni prenotazione successiva.
      const primaDiQuesta = { ...evento, seats_booked: Math.max(0, (postiDopo ?? 0) - reqSeats) }
      const liberiPrima = postiEvento(primaDiQuesta).liberiOnline
      const liberiOra = postiEvento({ ...evento, seats_booked: postiDopo ?? 0 }).liberiOnline
      const esaurito = liberiPrima > 0 && liberiOra === 0
      const inRiserva = liberiPrima > SOGLIA_AVVISO && liberiOra <= SOGLIA_AVVISO
      if (!posti.illimitato && (esaurito || inRiserva)) {
        sendEmail({
          _ctx: 'evento-soglia', fromName: bizName, from, to: ownerEmail,
          subject: esaurito
            ? `[${bizName}] Esaurito online: ${evento.title}`
            : `[${bizName}] Restano ${liberiOra} posti: ${evento.title}`,
          html: emailTemplate({
            title: esaurito ? `${evento.title} — esaurito online` : `${evento.title} — restano ${liberiOra} posti`,
            entityName: bizName,
            // ⚠️ `emailTemplate` non ha un campo «intro»: il testo va in
            // `bodyHtml`, che il modello stampa sotto la tabella.
            bodyHtml: `<p style="margin:20px 0 0;font-size:14px;color:#444;line-height:1.7">${esaurito
              ? 'Il sito non accetta più prenotazioni per questo evento. I posti che tieni per il telefono restano tuoi: sono fuori dal conteggio online.'
              : 'Sono gli ultimi posti che il sito può vendere. Da adesso, se prendi prenotazioni al telefono, segnale nel pannello — o rischi di accettarne più di quanti ne hai.'}</p>`,
            rows: [
              { label: 'Posti del locale', value: String(posti.capienza) },
              posti.riservati ? { label: 'Tenuti per il telefono', value: String(posti.riservati) } : null,
              { label: 'Prenotati finora', value: String(postiDopo ?? 0) },
              { label: 'Ancora vendibili online', value: String(liberiOra) },
              dateStr ? { label: 'Data evento', value: dateStr } : null,
            ].filter(Boolean),
            appUrl: (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com',
          }),
        }).catch(() => {})
      }
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

    // ⛔ Le automazioni scattavano solo sulle prenotazioni di RISORSE: chi
    // prenotava un evento non entrava in nessuna coda, quindi il «Promemoria
    // dell'appuntamento» — che esiste, ed è il modo più semplice di ridurre chi
    // non si presenta — non partiva mai per gli eventi. Trovato il 07/09
    // guardando perché accendere quell'automazione non avrebbe fatto niente per
    // una cena con ventisette prenotati.
    //
    // ⚠️ `visit_datetime` è l'inizio dell'evento: da lì il promemoria si
    // programma «X ore prima», che è il senso di `pre_visita`.
    //
    // ⚠️ Un evento aziendale (senza entità) non ha automazioni: sono legate a
    // un'entità. Non è un difetto, è come sono fatte — ma va saputo.
    // ⛔ Chi prenota un evento entra fra i contatti. Misurato l'08/09: su
    // quattordici persone che avevano lasciato nome, email e telefono, una sola
    // era nel CRM. Le altre tredici erano perse — e sono esattamente quelle da
    // invitare alla serata dopo, che è tutto il valore di un evento.
    //
    // ⚠️ Dopo la risposta, ma dentro `after()`: su Vercel la funzione si congela
    // appena risponde, e il lavoro non atteso non è garantito.
    after(async () => {
      const { nuovo } = await registraContatto({
        aziendaId: evento.azienda_id,
        email: guest_email, nome: guest_name, telefono: guest_phone,
        fonte: 'evento',
        tags: tagEvento(evento.title),
        // Nel registro: quale evento, quanti posti, e la prenotazione a cui si
        // riferisce — così la stessa non si conta due volte.
        attivita: { tipo: 'evento', titolo: evento.title, origineId: evento.id, riferimento: data.id, entityId: evento.entity_id, dettaglio: { posti: reqSeats } },
      })
      // L'automazione «nuovo contatto» parte una volta sola: chi torna a una
      // seconda serata non è un contatto nuovo.
      if (nuovo && evento.entity_id) {
        triggerAutomazione('nuovo_contatto',
          { azienda_id: evento.azienda_id, entity_tipo: evento.entity_tipo, entity_id: evento.entity_id },
          { nome: guest_name, email: guest_email }).catch(() => {})
      }
    })

    // Avviso al titolare e automazioni (promemoria prima dell'evento, grazie
    // dopo): solo per una prenotazione già vera. Con un pagamento in corso li
    // manda il webhook quando i soldi sono arrivati — chi apre la cassa e non
    // paga non deve far partire niente. Dentro `after()`: su Vercel la funzione
    // si congela appena risponde.
    if (!pagamento) after(() => annunciaPrenotazioneEvento(data.id))

    // Il link della cassa torna insieme alla prenotazione: chi ha appena
    // prenotato va portato a pagare adesso, non con un'email di domani.
    return Response.json({ ...data, guest_confirmation_sent, pagamento }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
