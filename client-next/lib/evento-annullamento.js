import { supabaseAdmin } from './supabase-server'
import { recomputeEventSeats } from './event-seats'
import { eventoConcluso } from './evento-concluso'
import { entroIlTermine, termineAnnullamento } from './annullamento-regole'
import { incassatoOnline } from './gruppi-prenotazioni-evento'
import { ritiraLink } from './link-pagamento'
import { muoviListaAttesa } from './lista-attesa-automatica'
import { sendEmail } from './send-email'
import { guestEmailTemplate, emailTemplate, html } from './email-template'
import { getAziendaLegale } from './guest-data'
import { oraLocale } from './fuso'
import { chiOrganizza } from './evento-titolare'

// «Non posso più venire»: l'ospite annulla da solo, dal link nella conferma.
//
// Regole (Francesco, 26/10/2026): come la cancellazione gratuita di Booking.
//   · fino al termine dell'evento (24 ore prima, se il titolare non dice altro)
//     si annulla con un clic; oltre, il link dice di contattare il locale;
//   · chi ha pagato online e annulla in tempo va rimborsato, e il rimborso lo
//     fa il TITOLARE a mano da Stripe: noi non tocchiamo i soldi dei clienti.
//     L'avviso al titolare lo dice in chiaro, e all'ospite diciamo chi lo farà.
//   · chi è in lista d'attesa può togliersi quando vuole: non tiene un posto.
//
// Il posto liberato va subito al primo in lista, se l'evento lo vuole.

const EVENTO = 'id, title, date_start, date_end, location, annullabile, annullabile_ore, acconto_percentuale, azienda_id, entity_id, notify_owner_on_booking, aziende(fuso_orario)'
const RIGA = 'id, event_id, status, seats, guest_name, guest_email, guest_phone, total_amount, importo_online, pagamento_stato, pagamento_id, pagamento_richiesto_il, offerta_scade_il'

const quandoEvento = (iso, fuso) => oraLocale(iso, fuso, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

async function carica(token) {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (typeof token !== 'string' || !UUID.test(token)) return {}
  const { data: b } = await supabaseAdmin.from('event_bookings').select(RIGA).eq('annulla_token', token).maybeSingle()
  if (!b) return {}
  const { data: evento } = await supabaseAdmin.from('eventi').select(EVENTO).eq('id', b.event_id).maybeSingle()
  return evento ? { b, evento } : {}
}

// Che cosa può fare chi ha questo link, adesso.
function stato(b, evento) {
  if (b.status === 'cancelled') return 'gia_annullata'
  if (eventoConcluso(evento)) return 'concluso'
  if (b.status === 'waitlist') return 'lista'
  // ⚠️ Alla cassa del sito in questo momento: annullare mentre paga lascerebbe
  // una persona che ha pagato senza prenotazione. Fra mezz'ora si risolve da sé.
  if (b.status === 'pending' && b.pagamento_stato === 'non_pagato' && b.pagamento_id && !b.pagamento_richiesto_il) return 'in_pagamento'
  if (!termineAnnullamento(evento)) return 'non_annullabile'
  if (!entroIlTermine(evento)) return 'oltre_termine'
  return 'annullabile'
}

// Cosa si legge aprendo il link. Nessun dato personale oltre il nome di chi ha
// prenotato: chi apre il link è lui, ma un link inoltrato non deve dire di più.
export async function leggiAnnullamento(token) {
  const { b, evento } = await carica(token)
  if (!b) return { stato: 'non_valido' }
  const fuso = evento.aziende?.fuso_orario
  const org = await chiOrganizza(evento)
  const s = stato(b, evento)
  const termine = termineAnnullamento(evento)
  return {
    stato: s,
    evento: { titolo: evento.title, luogo: evento.location || null, quando: quandoEvento(evento.date_start, fuso) },
    intestata_a: b.guest_name || null,
    posti: b.seats || 1,
    pagato_online: incassatoOnline(evento, b),
    termine: termine ? quandoEvento(termine.toISOString(), fuso) : null,
    // Oltre il termine si contatta il locale: gli si danno i recapiti per farlo.
    contatto: ['oltre_termine', 'non_annullabile', 'in_pagamento'].includes(s)
      ? { nome: org.nome, telefono: org.telefono, email: org.email } : { nome: org.nome },
  }
}

export async function annullaDaOspite(token) {
  const { b, evento } = await carica(token)
  if (!b) return { errore: 'Questo link non è valido.', status: 404 }
  const s = stato(b, evento)
  if (s === 'gia_annullata') return { errore: 'Questa prenotazione è già annullata.', status: 409 }
  if (!['annullabile', 'lista'].includes(s)) return { errore: 'Questa prenotazione non si può più annullare dal link: contatta chi organizza.', status: 409 }

  // Un link di pagamento ancora aperto si chiude, o si potrebbe pagare un posto
  // che non c'è più.
  const link = await ritiraLink('evento', b, evento.azienda_id) || {}
  const ora = new Date().toISOString()
  // Solo se lo stato è ancora quello letto: se nel frattempo il titolare l'ha
  // cambiato, vince lui.
  const { data: fatto } = await supabaseAdmin.from('event_bookings')
    .update({ status: 'cancelled', offerta_scade_il: null, annullata_dall_ospite_il: ora, updated_at: ora, ...link })
    .eq('id', b.id).eq('status', b.status).select('id')
  if (!fatto?.length) return { errore: 'La prenotazione è appena cambiata: ricarica la pagina.', status: 409 }

  await recomputeEventSeats(b.event_id)
  await muoviListaAttesa(b.event_id)

  const pagato = incassatoOnline(evento, b)
  if (b.status !== 'waitlist') await avvisa(b, evento, pagato)
  return { ok: true, pagato_online: pagato, era_in_lista: b.status === 'waitlist' }
}

async function avvisa(b, evento, pagato) {
  if (!(process.env.RESEND_API_KEY ?? '').trim()) return
  const fuso = evento.aziende?.fuso_orario
  const org = await chiOrganizza(evento)
  const quando = quandoEvento(evento.date_start, fuso)
  const euro = n => `€${Number(n).toFixed(2)}`
  const righe = [
    quando ? { label: 'Quando', value: quando } : null,
    { label: 'Posti', value: String(b.seats || 1) },
  ].filter(Boolean)

  try {
    if (b.guest_email) {
      const legale = evento.azienda_id ? await getAziendaLegale(evento.azienda_id) : null
      await sendEmail({
        _ctx: 'evento-annullata-ospite', fromName: org.nome, to: b.guest_email,
        subject: `Prenotazione annullata — ${evento.title}`,
        html: guestEmailTemplate({
          entityName: org.nome, title: 'Prenotazione annullata', legale,
          intro: pagato > 0
            ? html`Ciao ${b.guest_name || ''}, la tua prenotazione per <strong>${evento.title}</strong> è annullata.<br><br>Avevi pagato online ${euro(pagato)}: il rimborso lo fa ${org.nome}, e arriva sulla carta con cui hai pagato. Se hai domande scrivi a ${org.email || org.nome}.`
            : html`Ciao ${b.guest_name || ''}, la tua prenotazione per <strong>${evento.title}</strong> è annullata. Grazie di averci avvisato: il posto passa a qualcun altro.`,
          rows: righe,
        }),
      })
    }
  } catch (e) { console.error('[evento-annullamento] email ospite:', e.message) }

  // Al titolare: sempre se c'è un rimborso da fare (è un compito suo, non un
  // avviso); altrimenti solo se vuole le notifiche delle prenotazioni.
  if (!org.email || (pagato <= 0 && !evento.notify_owner_on_booking)) return
  try {
    await sendEmail({
      _ctx: 'evento-annullata-titolare', fromName: org.nome, to: org.email, replyTo: b.guest_email || undefined,
      subject: pagato > 0
        ? `[${org.nome}] Annullata e da rimborsare: ${evento.title}`
        : `[${org.nome}] Prenotazione annullata: ${evento.title}`,
      html: emailTemplate({
        title: `${b.guest_name || 'Un ospite'} ha annullato — ${evento.title}`, entityName: org.nome,
        rows: [
          { label: 'Nome', value: b.guest_name || '—' },
          b.guest_email ? { label: 'Email', value: b.guest_email } : null,
          b.guest_phone ? { label: 'Telefono', value: b.guest_phone } : null,
          ...righe,
          pagato > 0 ? { label: 'Pagato online', value: euro(pagato) } : null,
        ].filter(Boolean),
        bodyHtml: pagato > 0
          ? html`<p style="margin:20px 0 0;font-size:14px;color:#444;line-height:1.7"><strong>Il rimborso va fatto da te</strong>: ha annullato entro il termine che hai scelto, e OltreNova non muove i soldi del tuo conto. Lo trovi nella dashboard di Stripe, fra i pagamenti, con la sua email. Il posto è già tornato libero.</p>`
          : html`<p style="margin:20px 0 0;font-size:14px;color:#444;line-height:1.7">Ha annullato dal link nella conferma, entro il termine che hai scelto. Il posto è già tornato libero.</p>`,
        appUrl: (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com',
      }),
    })
  } catch (e) { console.error('[evento-annullamento] email titolare:', e.message) }
}
