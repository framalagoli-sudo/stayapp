import { supabaseAdmin } from './supabase-server'
import { sendEmail } from './send-email'
import { guestEmailTemplate } from './email-template'
import { getAziendaLegale } from './guest-data'
import { inviaMessaggioWhatsapp } from './whatsapp-messaggio'

// «La tua prenotazione è confermata»: **una sola volta, nel momento giusto.**
//
// Il momento giusto dipende da una cosa sola:
//   · niente da pagare  → subito, appena prenota;
//   · c'è da pagare     → **quando il pagamento è arrivato**, non prima.
//
// ⛔ Prima era sempre «subito», e con la scadenza a 30 minuti diventava una
// trappola: la persona archiviava una conferma, non pagava, e mezz'ora dopo si
// vedeva annullare qualcosa che le era stato confermato. La correzione
// intermedia — mandare «manca solo il pagamento» — era rumore: quell'email
// arriva mentre la persona è già sulla pagina di pagamento, e paga trenta
// secondi dopo.
//
// ⛔ E soprattutto: chi pagava non riceveva NIENTE. Il webhook segnava «pagato»
// nel database e finiva lì. Uno pagava e restava senza una riga che glielo
// confermasse.
//
// Sta qui e non nelle due route perché il testo della conferma dev'essere uno
// solo: due copie divergono, e diverge proprio quella che si legge di rado.

function quando(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export async function mandaConfermaEvento(bookingId) {
  try {
    const { data: b } = await supabaseAdmin.from('event_bookings')
      .select('id, event_id, guest_name, guest_email, guest_phone, seats, total_amount, package_id, conferma_inviata_il')
      .eq('id', bookingId).maybeSingle()
    if (!b) return { ok: false, motivo: 'Prenotazione non trovata' }

    // ⚠️ Una volta sola. Stripe rispedisce lo stesso evento in caso di dubbio, e
    // due conferme identiche a mezz'ora di distanza fanno pensare a un doppio
    // addebito.
    if (b.conferma_inviata_il) return { ok: false, motivo: 'Conferma già inviata' }

    const { data: ev } = await supabaseAdmin.from('eventi')
      .select('id, title, date_start, location, azienda_id, entity_id, entity_tipo, packages, send_guest_confirmation')
      .eq('id', b.event_id).maybeSingle()
    if (!ev) return { ok: false, motivo: 'Evento non trovato' }
    // Il titolare può aver spento la conferma: è una sua scelta, si rispetta.
    if (ev.send_guest_confirmation === false) return { ok: false, motivo: 'Conferma disattivata per questo evento' }

    let nome = 'OltreNova', slug = null
    if (ev.entity_id) {
      const { data: ent } = await supabaseAdmin.from('entita').select('name, slug').eq('id', ev.entity_id).maybeSingle()
      if (ent) { nome = ent.name || nome; slug = ent.slug }
    }
    const legale = ev.azienda_id ? await getAziendaLegale(ev.azienda_id) : null
    const appUrl = (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'
    const pref = { struttura: 's', ristorante: 'r', attivita: 'a' }[ev.entity_tipo]
    const privacyUrl = slug && pref ? `${appUrl}/${pref}/${slug}/privacy` : null
    const pkg = (ev.packages || []).find(p => p.id === b.package_id)
    const dataOra = quando(ev.date_start)

    if ((process.env.RESEND_API_KEY ?? '').trim() && b.guest_email) {
      await sendEmail({
        _ctx: 'evento-conferma', fromName: nome, to: b.guest_email,
        subject: `Prenotazione confermata — ${ev.title}`,
        html: guestEmailTemplate({
          entityName: nome, title: 'Prenotazione confermata', legale, privacyUrl,
          intro: `Ciao ${b.guest_name || ''}, il tuo posto per <strong>${ev.title}</strong> è confermato. Ti aspettiamo!`,
          rows: [
            dataOra ? { label: 'Quando', value: dataOra } : null,
            ev.location ? { label: 'Dove', value: ev.location } : null,
            { label: 'Posti', value: String(b.seats || 1) },
            pkg?.name ? { label: 'Pacchetto', value: pkg.name } : null,
            b.total_amount ? { label: 'Totale', value: `€${b.total_amount}` } : null,
          ].filter(Boolean),
        }),
      })
    }

    // La stessa cosa sul telefono, se le condizioni ci sono. Non blocca l'email.
    if (b.guest_phone) {
      inviaMessaggioWhatsapp({
        aziendaId: ev.azienda_id, telefono: b.guest_phone, email: b.guest_email,
        templateKey: 'conferma_prenotazione',
        vars: {
          nome: b.guest_name, titolo: ev.title,
          quando: dataOra || 'come da programma',
          persone: (b.seats || 1) === 1 ? '1 persona' : `${b.seats} persone`,
        },
        nomeEntita: nome,
      }).then(e => { if (!e.ok) console.log(`[whatsapp:evento-conferma] non inviato — ${e.motivo}`) })
        .catch(() => {})
    }

    await supabaseAdmin.from('event_bookings')
      .update({ conferma_inviata_il: new Date().toISOString() }).eq('id', b.id)
    return { ok: true }
  } catch (e) {
    console.error('[evento-conferma]', e.message)
    return { ok: false, motivo: e.message }
  }
}
