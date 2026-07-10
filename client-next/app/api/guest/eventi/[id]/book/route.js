import { supabaseAdmin } from '@/lib/supabase-server'
import { recomputeEventSeats } from '@/lib/event-seats'
import { sendEmail } from '@/lib/send-email'
import { emailTemplate, guestEmailTemplate } from '@/lib/email-template'
import { getAziendaLegale } from '@/lib/guest-data'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'

const ENTITY_TBL = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export async function POST(request, { params }) {
  try {
    // Anti-abuso: l'endpoint è pubblico e ora invia email → limita gli invii per IP.
    const ip = getClientIp(request)
    const rl = await rateLimit(request, { name: 'evento-book', limit: 10, windowSec: 3600, ip })
    if (!rl.allowed) return tooManyRequests()

    const body = await request.json()
    const { guest_name, guest_email, guest_phone, package_id, seats, notes } = body
    if (!guest_name?.trim()) return Response.json({ error: 'Nome obbligatorio' }, { status: 400 })
    if (!guest_email?.trim()) return Response.json({ error: 'Email obbligatoria' }, { status: 400 })

    // select('*') → indipendente dall'ordine della migration 067 (colonne notify_*
    // assenti = undefined = nessuna mail, niente 500).
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
      seats: reqSeats, total_amount: price * reqSeats, notes: notes || null, status: 'pending',
    }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Le prenotazioni in attesa riservano subito i posti (anti-overbooking).
    await recomputeEventSeats(params.id)

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

    // 2) Conferma all'ospite (white-label, business → cliente).
    let guest_confirmation_sent = false
    if (evento.send_guest_confirmation && resendKey && guest_email) {
      guest_confirmation_sent = true
      sendEmail({
        _ctx: 'evento-guest', fromName: bizName,
        from, to: guest_email, replyTo: ownerEmail || undefined,
        subject: `Conferma prenotazione — ${evento.title}`,
        html: guestEmailTemplate({
          entityName: bizName, title: 'Prenotazione confermata', legale, privacyUrl,
          intro: `Ciao ${guest_name}, abbiamo ricevuto la tua prenotazione per <strong>${evento.title}</strong>. Ecco il riepilogo:`,
          rows: [
            dateStr ? { label: 'Data', value: dateStr } : null,
            evento.location ? { label: 'Luogo', value: evento.location } : null,
            { label: 'Posti', value: String(reqSeats) },
            pkgName ? { label: 'Pacchetto', value: pkgName } : null,
            { label: 'Totale', value: `€${total}` },
          ].filter(Boolean),
        }),
      }).catch(() => {})
    }

    return Response.json({ ...data, guest_confirmation_sent }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
