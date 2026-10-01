import { supabaseAdmin } from './supabase-server'
import { sendEmail } from './send-email'
import { emailTemplate } from './email-template'
import { triggerAutomazione } from './guest-utils'
import { oraLocale } from './fuso'

// Quello che succede quando una prenotazione di un evento diventa VERA:
// l'avviso al titolare e le automazioni (promemoria prima dell'evento, grazie
// dopo). Il momento dipende da una cosa sola:
//   · niente da pagare → subito, quando prenota;
//   · c'è da pagare    → quando il pagamento è arrivato (webhook di Stripe).
//
// ⛔ Prima partiva tutto quando la persona apriva la cassa di Stripe, anche se
// poi non pagava: il titolare riceveva «Nuova prenotazione» per gente che non
// aveva prenotato niente, e il promemoria sarebbe arrivato a chi il posto non
// l'aveva più. Segnalato da Francesco su Garage 22 il 01/10/2026.
//
// La conferma all'ospite sta in `mandaConfermaEvento` e segue la stessa regola.
// Una sola funzione per i due chiamanti: due copie divergono, e diverge quella
// che si legge di rado.

function fmtData(iso, fuso) {
  return oraLocale(iso, fuso, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export async function annunciaPrenotazioneEvento(bookingId) {
  try {
    const { data: b } = await supabaseAdmin.from('event_bookings')
      .select('id, event_id, guest_name, guest_email, guest_phone, seats, package_id, total_amount, status')
      .eq('id', bookingId).maybeSingle()
    // Solo una prenotazione che occupa davvero il posto merita un annuncio.
    if (!b || b.status !== 'confirmed') return { ok: false, motivo: 'Prenotazione non confermata' }

    const { data: evento } = await supabaseAdmin.from('eventi')
      .select('id, title, date_start, entity_tipo, entity_id, azienda_id, packages, notify_owner_on_booking, aziende(fuso_orario)')
      .eq('id', b.event_id).maybeSingle()
    if (!evento) return { ok: false, motivo: 'Evento non trovato' }

    const fuso = evento.aziende?.fuso_orario
    const dateStr = fmtData(evento.date_start, fuso)
    const seats = b.seats || 1
    const pkgName = b.package_id ? ((evento.packages || []).find(p => p.id === b.package_id)?.name || '') : ''

    // Chi avvisare: l'entità dell'evento o, se l'evento è dell'azienda, l'azienda.
    let ownerEmail = null, ownerName = null
    if (evento.entity_id) {
      const { data: ent } = await supabaseAdmin.from('entita').select('name, email').eq('id', evento.entity_id).maybeSingle()
      if (ent) { ownerEmail = ent.email; ownerName = ent.name }
    }
    if (!ownerEmail && evento.azienda_id) {
      const { data: az } = await supabaseAdmin.from('aziende').select('ragione_sociale, email').eq('id', evento.azienda_id).maybeSingle()
      if (az) { ownerEmail = ownerEmail || az.email; ownerName = ownerName || az.ragione_sociale }
    }
    const bizName = ownerName || evento.title
    const appUrl = (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'
    const resendKey = (process.env.RESEND_API_KEY ?? '').trim()
    const from = (process.env.RESEND_FROM ?? '').trim() || 'OltreNova <noreply@oltrenova.com>'

    if (evento.notify_owner_on_booking && ownerEmail && resendKey) {
      await sendEmail({
        _ctx: 'evento-owner', fromName: bizName,
        from, to: ownerEmail, replyTo: b.guest_email,
        subject: `[${bizName}] Nuova prenotazione: ${evento.title}`,
        html: emailTemplate({
          title: `Nuova prenotazione — ${evento.title}`, entityName: bizName,
          rows: [
            { label: 'Nome', value: b.guest_name },
            { label: 'Email', value: `<a href="mailto:${b.guest_email}" style="color:#00b5b5">${b.guest_email}</a>` },
            b.guest_phone ? { label: 'Telefono', value: b.guest_phone } : null,
            { label: 'Posti', value: String(seats) },
            pkgName ? { label: 'Pacchetto', value: pkgName } : null,
            { label: 'Totale', value: `€${Number(b.total_amount || 0).toFixed(2)}` },
            dateStr ? { label: 'Data evento', value: dateStr } : null,
          ].filter(Boolean),
          appUrl,
        }),
      }).catch(() => {})
    }

    // ⚠️ `visit_datetime` è l'inizio dell'evento: da lì il promemoria si
    // programma «X ore prima». Un evento aziendale non ha automazioni: sono
    // legate a un'entità.
    if (evento.entity_id && evento.entity_tipo) {
      const varsAuto = {
        nome: b.guest_name,
        email: b.guest_email,
        telefono: b.guest_phone || '',
        data: dateStr || '',
        ora: oraLocale(evento.date_start, fuso, { day: undefined, month: undefined, hour: '2-digit', minute: '2-digit' }),
        servizio: evento.title,
        n_persone: String(seats),
        visit_datetime: evento.date_start || null,
        source_tipo: 'evento',
        source_id: b.id,
      }
      const ctxAuto = { azienda_id: evento.azienda_id, entity_tipo: evento.entity_tipo, entity_id: evento.entity_id }
      await triggerAutomazione('nuova_prenotazione', ctxAuto, varsAuto)
      if (evento.date_start) {
        await triggerAutomazione('pre_visita', ctxAuto, varsAuto)
        await triggerAutomazione('post_visita', ctxAuto, varsAuto)
      }
    }
    return { ok: true }
  } catch (e) {
    console.error('[evento-prenotato]', e.message)
    return { ok: false, motivo: e.message }
  }
}
