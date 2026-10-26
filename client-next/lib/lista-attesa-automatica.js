import { randomUUID } from 'crypto'
import { supabaseAdmin } from './supabase-server'
import { recomputeEventSeats } from './event-seats'
import { postiEvento } from './posti-evento'
import { eventoConcluso } from './evento-concluso'
import { minutiOfferta } from './annullamento-regole'
import { contoEvento } from './evento-prenotazione'
import { creaCheckout } from './checkout'
import { mandaConfermaEvento } from './evento-conferma'
import { annunciaPrenotazioneEvento } from './evento-prenotato'
import { MINUTI_PER_PAGARE } from './prenotazioni-scadute'
import { sendEmail } from './send-email'
import { guestEmailTemplate, html } from './email-template'
import { getAziendaLegale } from './guest-data'
import { oraLocale } from './fuso'
import { chiOrganizza, baseLink } from './evento-titolare'

// La lista d'attesa che si muove da sola (decisione di Francesco, 26/10/2026).
//
// Quando un posto si libera — l'ospite annulla, il titolare annulla, chi doveva
// pagare non paga — lo si offre al primo in lista: un'email con un link, e il
// posto TENUTO per lui un'ora (mezz'ora se l'evento è oggi). Se non lo prende
// passa al prossimo. Solo sugli eventi che hanno acceso l'interruttore.
//
// ⛔ Il posto offerto conta fra gli occupati (`occupaPosto`): se non contasse il
// sito lo venderebbe a un altro mentre la persona legge l'email, e lei
// arriverebbe su «esaurito» con in mano un invito.
//
// Le chiamate: dopo ogni gesto che libera un posto (annullamento dell'ospite o
// del titolare), e dal giro ogni cinque minuti, che chiude le offerte scadute e
// raccoglie i posti liberati in qualunque altro modo (capienza alzata, non
// pagati, una chiamata che è fallita).

const EVENTO = 'id, title, date_start, date_end, location, seats_total, seats_booked, posti_riservati, lista_attesa, lista_automatica, prenotazioni_chiuse, published, active, azienda_id, entity_id, price, packages, acconto_percentuale, cover_url, aziende(fuso_orario)'

// Sotto questo tempo non si offre più niente: un invito da prendere in cinque
// minuti è una corsa che nessuno vince, e fa solo un'email in più.
const MINUTI_MINIMI = 10

export async function muoviListaAttesa(eventId) {
  try {
    const { data: evento } = await supabaseAdmin.from('eventi').select(EVENTO).eq('id', eventId).maybeSingle()
    if (!evento?.lista_automatica || !evento.lista_attesa) return { offerte: 0 }
    if (!evento.published || evento.active === false || evento.prenotazioni_chiuse || eventoConcluso(evento)) return { offerte: 0 }
    const fuso = evento.aziende?.fuso_orario
    const minuti = minutiOfferta(evento, fuso)
    if (minuti < MINUTI_MINIMI) return { offerte: 0 }

    const occupati = await recomputeEventSeats(eventId)
    const posti = postiEvento({ ...evento, seats_booked: occupati })
    if (posti.illimitato) return { offerte: 0 }
    let liberi = posti.liberiOnline
    if (liberi <= 0) return { offerte: 0 }

    // In ordine d'arrivo. Chi ha già avuto un'offerta e non ha risposto resta
    // in lista (il titolare lo può ancora chiamare) ma non riceve un'altra email.
    const { data: inLista } = await supabaseAdmin.from('event_bookings')
      .select('id, seats, guest_name, guest_email')
      .eq('event_id', eventId).eq('status', 'waitlist')
      .is('offerta_scade_il', null).is('offerta_scaduta_il', null)
      .order('created_at', { ascending: true }).limit(100)

    const fatte = []
    for (const b of inLista || []) {
      if (liberi <= 0) break
      // Chi chiede più posti di quelli liberi lascia passare chi ne chiede
      // meno: altrimenti un posto resterebbe vuoto aspettando che se ne liberino
      // altri tre. Resta primo per quando ce ne saranno abbastanza.
      if ((b.seats || 1) > liberi || !b.guest_email) continue
      const token = randomUUID()
      const scade = new Date(Date.now() + minuti * 60_000).toISOString()
      // Solo se è ancora in lista e nessuno gliel'ha offerto nel frattempo: due
      // giri contemporanei non devono mandargli due inviti.
      const { data: presa } = await supabaseAdmin.from('event_bookings')
        .update({ offerta_token: token, offerta_scade_il: scade, updated_at: new Date().toISOString() })
        .eq('id', b.id).eq('status', 'waitlist').is('offerta_scade_il', null).select('id')
      if (!presa?.length) continue
      fatte.push({ ...b, token, scade })
      liberi -= b.seats || 1
    }
    if (!fatte.length) return { offerte: 0 }

    // ⚠️ Due giri insieme possono aver visto gli stessi posti liberi: dopo aver
    // offerto si riconta, e se si è andati oltre si ritirano le offerte appena
    // fatte, dall'ultima. Meglio un invito in meno che due persone sullo stesso
    // posto.
    let dopo = await recomputeEventSeats(eventId)
    while (fatte.length && dopo > posti.limiteOnline) {
      const ultima = fatte.pop()
      await supabaseAdmin.from('event_bookings')
        .update({ offerta_token: null, offerta_scade_il: null }).eq('id', ultima.id).eq('status', 'waitlist')
      dopo = await recomputeEventSeats(eventId)
    }

    for (const b of fatte) await mandaOfferta(evento, b)
    return { offerte: fatte.length }
  } catch (e) {
    console.error('[lista-attesa-automatica]', e.message)
    return { offerte: 0, errore: e.message }
  }
}

async function mandaOfferta(evento, b) {
  if (!(process.env.RESEND_API_KEY ?? '').trim()) return
  try {
    const fuso = evento.aziende?.fuso_orario
    const org = await chiOrganizza(evento)
    const legale = evento.azienda_id ? await getAziendaLegale(evento.azienda_id) : null
    const url = `${await baseLink(evento)}/posto-evento?t=${b.token}`
    const entro = oraLocale(b.scade, fuso, { day: undefined, month: undefined, year: undefined, hour: '2-digit', minute: '2-digit' })
    const quando = oraLocale(evento.date_start, fuso, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    await sendEmail({
      _ctx: 'evento-posto-offerto', fromName: org.nome, to: b.guest_email,
      subject: `Si è liberato un posto — ${evento.title}`,
      html: guestEmailTemplate({
        entityName: org.nome, title: 'Si è liberato un posto', legale,
        intro: html`Ciao ${b.guest_name || ''}, si è liberato un posto per <strong>${evento.title}</strong> ed è tenuto per te fino alle <strong>${entro}</strong>.<br><br>Se non lo prendi entro quell'ora passa alla persona successiva in lista.`,
        rows: [
          quando ? { label: 'Quando', value: quando } : null,
          evento.location ? { label: 'Dove', value: evento.location } : null,
          { label: 'Posti', value: String(b.seats || 1) },
        ].filter(Boolean),
        ctaText: 'Prendi il posto', ctaUrl: url,
      }),
    })
  } catch (e) { console.error('[lista-attesa-automatica] offerta non inviata:', e.message) }
}

// Le offerte scadute: il posto torna libero e la persona resta in lista, senza
// un altro invito automatico. Il token resta, così chi apre il link tardi legge
// «è scaduto» invece di «link non valido».
export async function chiudiOfferteScadute() {
  const { data: scadute } = await supabaseAdmin.from('event_bookings')
    .update({ offerta_scade_il: null, offerta_scaduta_il: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('status', 'waitlist').lt('offerta_scade_il', new Date().toISOString())
    .select('event_id')
  const eventi = [...new Set((scadute || []).map(r => r.event_id))]
  for (const id of eventi) await recomputeEventSeats(id)
  return { scadute: scadute?.length || 0, eventi }
}

// Il giro ogni cinque minuti: chiude le offerte scadute, poi guarda ogni evento
// con qualcuno in lista che aspetta.
export async function giroListeAttesa() {
  const chiuse = await chiudiOfferteScadute()
  const { data: attese } = await supabaseAdmin.from('event_bookings')
    .select('event_id').eq('status', 'waitlist')
    .is('offerta_scade_il', null).is('offerta_scaduta_il', null).limit(1000)
  const eventi = [...new Set([...(attese || []).map(r => r.event_id), ...chiuse.eventi])]
  let offerte = 0
  for (const id of eventi) offerte += (await muoviListaAttesa(id)).offerte
  return { scadute: chiuse.scadute, offerte }
}

// ── Dal link dell'email ──────────────────────────────────────────────────────

async function rigaDaToken(token) {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (typeof token !== 'string' || !UUID.test(token)) return null
  const { data } = await supabaseAdmin.from('event_bookings')
    .select('id, event_id, status, seats, package_id, guest_name, guest_email, offerta_scade_il, offerta_scaduta_il')
    .eq('offerta_token', token).maybeSingle()
  return data
}

// Cosa vede chi apre il link. Mai nome, email o altro della prenotazione:
// chi ha il link sa già chi è, e un link inoltrato non deve dire di più.
export async function leggiOfferta(token) {
  const b = await rigaDaToken(token)
  if (!b) return { stato: 'non_valido' }
  const { data: evento } = await supabaseAdmin.from('eventi').select(EVENTO).eq('id', b.event_id).maybeSingle()
  if (!evento) return { stato: 'non_valido' }
  const fuso = evento.aziende?.fuso_orario
  const { conto } = contoEvento(evento, b.package_id, b.seats || 1)
  const stato = b.status === 'confirmed' || b.status === 'pending' ? 'presa'
    : b.status === 'cancelled' ? 'rinunciato'
    : eventoConcluso(evento) ? 'concluso'
    : b.offerta_scade_il && new Date(b.offerta_scade_il) > new Date() ? 'valida'
    : 'scaduta'
  const org = await chiOrganizza(evento)
  return {
    stato,
    evento: {
      titolo: evento.title, luogo: evento.location || null,
      quando: oraLocale(evento.date_start, fuso, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
    },
    organizzatore: org.nome,
    posti: b.seats || 1,
    scade_alle: stato === 'valida' ? oraLocale(b.offerta_scade_il, fuso, { day: undefined, month: undefined, year: undefined, hour: '2-digit', minute: '2-digit' }) : null,
    da_pagare: conto.dovuto > 0 ? conto.dovuto : 0,
  }
}

// Prende il posto. Senza niente da pagare diventa confermata subito; con un
// pagamento va alla cassa, come chiunque prenoti, e il posto resta tenuto
// mentre paga (mezz'ora, contata da adesso: `cassa_aperta_il`).
export async function prendiPosto(token, origine) {
  const b = await rigaDaToken(token)
  if (!b) return { errore: 'Questo link non è valido.', status: 404 }
  const { data: evento } = await supabaseAdmin.from('eventi').select(EVENTO).eq('id', b.event_id).maybeSingle()
  if (!evento || !evento.published || evento.active === false) return { errore: 'Questo link non è valido.', status: 404 }
  if (eventoConcluso(evento)) return { errore: 'Questo evento si è già concluso.', status: 400 }
  if (b.status !== 'waitlist') return { errore: b.status === 'cancelled' ? 'Hai già rinunciato a questo posto.' : 'Il posto è già tuo.', status: 409 }

  const ora = new Date().toISOString()
  const { totale, conto } = contoEvento(evento, b.package_id, b.seats || 1)
  const daPagare = conto.dovuto > 0

  // ⚠️ Lo scambio è atomico: solo se l'offerta è ancora valida in questo
  // istante. Se è scaduta un secondo fa il posto può essere già di un altro.
  const { data: presa } = await supabaseAdmin.from('event_bookings')
    .update({
      status: daPagare ? 'pending' : 'confirmed',
      total_amount: totale, offerta_scade_il: null,
      ...(daPagare ? { cassa_aperta_il: ora } : { pagamento_stato: 'non_richiesto' }),
      updated_at: ora,
    })
    .eq('id', b.id).eq('status', 'waitlist').gt('offerta_scade_il', ora).select('id')
  if (!presa?.length) return { errore: 'Il tempo per prendere il posto è scaduto, e il posto è passato a un altro. Sei ancora in lista.', status: 410 }
  await recomputeEventSeats(evento.id)

  if (daPagare) {
    try {
      const base = (process.env.CLIENT_URL ?? '').trim() || origine
      const esito = await creaCheckout({
        aziendaId: evento.azienda_id,
        righe: [{ nome: conto.tutto ? evento.title : `${evento.title} — acconto ${conto.perc}%`, importo: conto.dovuto, quantita: 1, immagine: evento.cover_url || undefined }],
        email: b.guest_email,
        successUrl: `${base}/checkout/successo?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${base}/checkout/annullato`,
        minutiPerPagare: MINUTI_PER_PAGARE,
      })
      await supabaseAdmin.from('event_bookings')
        .update({ pagamento_id: esito.sessionId, pagamento_stato: 'non_pagato' }).eq('id', b.id)
      return { pagamento: { url: esito.url, importo: conto.dovuto } }
    } catch (e) {
      // Come per chi prenota dal sito: senza cassa il posto resta suo e si paga
      // sul posto. Il motivo si scrive.
      console.error('[lista-attesa-automatica] cassa non aperta:', e.message)
      await supabaseAdmin.from('event_bookings').update({ status: 'confirmed', pagamento_stato: 'non_richiesto' }).eq('id', b.id)
    }
  }
  await mandaConfermaEvento(b.id)
  await annunciaPrenotazioneEvento(b.id)
  return { confermata: true }
}

// «Non mi interessa più»: il posto passa subito al prossimo.
export async function rinunciaOfferta(token) {
  const b = await rigaDaToken(token)
  if (!b || b.status !== 'waitlist') return { errore: 'Questo link non è più valido.', status: 404 }
  await supabaseAdmin.from('event_bookings')
    .update({ status: 'cancelled', offerta_scade_il: null, annullata_dall_ospite_il: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', b.id).eq('status', 'waitlist')
  await recomputeEventSeats(b.event_id)
  await muoviListaAttesa(b.event_id)
  return { ok: true }
}
