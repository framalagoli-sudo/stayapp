import { supabaseAdmin } from './supabase-server'
import { stripeConnect, stripeConfigurato } from './stripe-connect'
import { contoDi } from './checkout'
import { recomputeEventSeats } from './event-seats'
import { sendEmail } from './send-email'
import { guestEmailTemplate } from './email-template'
import { getAziendaLegale } from './guest-data'

// Il posto tenuto e mai pagato torna libero.
//
// Chi prenota prende il posto **subito** e poi va alla cassa — ed è giusto:
// far pagare qualcuno per un posto che nel frattempo è finito sarebbe peggio.
// Ma senza una scadenza chi apre la pagina di Stripe e chiude il browser tiene
// quel posto per sempre, e su un evento da sessanta posti con una campagna
// attiva è un posto tolto a qualcuno che avrebbe pagato.

export const MINUTI_PER_PAGARE = 30

// ⛔ La protezione che conta: **non ci si fida del proprio database**.
//
// Il webhook di Stripe può arrivare in ritardo, o non arrivare affatto (è già
// successo con Resend, muto per 45 giorni). Se annullassimo basandoci solo su
// `pagamento_stato`, il primo webhook lento cancellerebbe la prenotazione di
// qualcuno **che ha pagato davvero** — e quella persona si presenta all'evento
// con la ricevuta in mano. È il danno peggiore possibile, molto più di un posto
// tenuto occupato.
//
// Quindi prima di annullare si chiede a Stripe. E se risulta pagata, invece di
// annullarla la si segna pagata: il cron ripara il webhook perso.
async function statoDelPagamento(aziendaId, sessionId) {
  if (!stripeConfigurato() || !sessionId) return 'ignoto'
  try {
    const conto = await contoDi(aziendaId)
    if (!conto) return 'ignoto'
    const s = await stripeConnect().checkout.sessions.retrieve(sessionId, { stripeAccount: conto })
    if (s.payment_status === 'paid') return 'pagato'
    if (s.status === 'expired') return 'scaduto'
    return 'in_attesa'
  } catch {
    // Se non riusciamo a chiedere, non si annulla: nel dubbio il posto resta suo.
    return 'ignoto'
  }
}

async function avvisa(booking, evento) {
  if (!booking.guest_email || !(process.env.RESEND_API_KEY ?? '').trim()) return
  try {
    const legale = evento.azienda_id ? await getAziendaLegale(evento.azienda_id) : null
    const { data: ent } = evento.entity_id
      ? await supabaseAdmin.from('entita').select('name').eq('id', evento.entity_id).maybeSingle()
      : { data: null }
    const nome = ent?.name || 'OltreNova'
    await sendEmail({
      _ctx: 'evento-scaduta', fromName: nome, to: booking.guest_email,
      subject: `Prenotazione non confermata — ${evento.title}`,
      html: guestEmailTemplate({
        entityName: nome, title: 'Il posto è tornato disponibile', legale,
        // ⚠️ Va detto, e va detto con parole chiare: questa persona ha in casella
        // un'email che parlava della sua prenotazione. Se non la avvisiamo si
        // presenta all'evento convinta di avere il posto.
        intro: `Ciao ${booking.guest_name || ''}, il pagamento per <strong>${evento.title}</strong> non è arrivato entro ${MINUTI_PER_PAGARE} minuti, quindi il posto è tornato disponibile per altri.<br><br>Se lo vuoi ancora puoi prenotare di nuovo — se nel frattempo è rimasto posto.`,
        rows: [{ label: 'Posti che avevi richiesto', value: String(booking.seats || 1) }],
      }),
    })
  } catch (e) { console.error('[scadute] avviso non inviato:', e.message) }
}

// Restituisce cosa è successo, per il cron e per chi legge i log.
export async function liberaPostiNonPagati() {
  const limite = new Date(Date.now() - MINUTI_PER_PAGARE * 60_000).toISOString()

  // Solo chi doveva pagare e non risulta pagato. Chi non doveva pagare niente
  // ha `non_richiesto` e non entra qui dentro.
  const { data: candidate } = await supabaseAdmin.from('event_bookings')
    .select('id, event_id, seats, guest_name, guest_email, pagamento_id, pagamento_stato, created_at')
    .eq('pagamento_stato', 'non_pagato')
    .neq('status', 'cancelled')
    .lt('created_at', limite)
    .limit(50)

  if (!candidate?.length) return { esaminate: 0, liberate: 0, recuperate: 0, incerte: 0 }

  const eventiVisti = new Set()
  let liberate = 0, recuperate = 0, incerte = 0

  for (const b of candidate) {
    const { data: evento } = await supabaseAdmin.from('eventi')
      .select('id, title, azienda_id, entity_id, date_start').eq('id', b.event_id).maybeSingle()
    if (!evento) continue

    const stato = await statoDelPagamento(evento.azienda_id, b.pagamento_id)

    if (stato === 'pagato') {
      // Il webhook non è arrivato: si ripara qui invece di punire il cliente.
      await supabaseAdmin.from('event_bookings')
        .update({ pagamento_stato: 'pagato', updated_at: new Date().toISOString() }).eq('id', b.id)
      recuperate++
      continue
    }
    if (stato === 'ignoto') { incerte++; continue }

    await supabaseAdmin.from('event_bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', b.id)
    eventiVisti.add(b.event_id)
    await avvisa(b, evento)
    liberate++
  }

  // I posti si ricalcolano una volta per evento, non una per prenotazione.
  for (const id of eventiVisti) await recomputeEventSeats(id)

  return { esaminate: candidate.length, liberate, recuperate, incerte }
}
