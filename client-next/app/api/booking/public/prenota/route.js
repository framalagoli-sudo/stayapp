import { supabaseAdmin } from '@/lib/supabase-server'
import { sendWebhooks } from '@/lib/send-webhooks'
import { triggerAutomazione } from '@/lib/guest-utils'
import { syncBookingCreate } from '@/lib/google-calendar-stub'
import { Resend } from 'resend'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

function parseTime(str) {
  const [h, m] = str.split(':').map(Number)
  return h * 60 + (m || 0)
}
function formatTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function buildWaUrl(raw) {
  if (!raw) return null
  if (raw.startsWith('http')) return raw
  const clean = raw.replace(/[\s\-\(\)\+]/g, '').replace(/^00/, '').replace(/^0/, '39')
  return `https://wa.me/${clean}`
}

async function getEntityWhatsapp(entityTipo, entityId) {
  try {
    if (entityTipo === 'struttura') {
      const { data } = await supabaseAdmin.from('properties').select('whatsapp').eq('id', entityId).single()
      return data?.whatsapp || null
    }
    if (entityTipo === 'ristorante') {
      const { data } = await supabaseAdmin.from('ristoranti').select('minisito').eq('id', entityId).single()
      return data?.minisito?.social?.whatsapp || null
    }
    if (entityTipo === 'attivita') {
      const { data } = await supabaseAdmin.from('attivita').select('minisito').eq('id', entityId).single()
      return data?.minisito?.social?.whatsapp || null
    }
  } catch { /* non bloccante */ }
  return null
}

async function inviaEmailConferma(prenotazione, risorsa, whatsapp = null) {
  if (!process.env.RESEND_API_KEY) return
  const resend = new Resend(process.env.RESEND_API_KEY)
  const cancelUrl = `${process.env.CLIENT_URL || 'https://oltrenova.com'}/cancella-prenotazione?token=${prenotazione.cancellation_token}`
  const waUrl = buildWaUrl(whatsapp)

  const quando = risorsa.modalita === 'coperti'
    ? `${prenotazione.data} — ${prenotazione.servizio} ore ${prenotazione.ora_inizio}`
    : `${prenotazione.data} ore ${prenotazione.ora_inizio?.slice(0, 5)}–${prenotazione.ora_fine?.slice(0, 5)}`

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'OltreNova <noreply@oltrenova.com>',
      to: prenotazione.cliente_email,
      subject: `Prenotazione confermata — ${risorsa.nome}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#1a1a2e">Prenotazione confermata ✓</h2>
          <p>Ciao <strong>${prenotazione.cliente_nome}</strong>,</p>
          <p>La tua prenotazione è confermata.</p>
          <table style="border-collapse:collapse;width:100%;margin:16px 0">
            <tr><td style="padding:8px;color:#666">Servizio</td><td style="padding:8px;font-weight:600">${risorsa.nome}</td></tr>
            <tr style="background:#f5f5f5"><td style="padding:8px;color:#666">Quando</td><td style="padding:8px;font-weight:600">${quando}</td></tr>
            <tr><td style="padding:8px;color:#666">Persone</td><td style="padding:8px;font-weight:600">${prenotazione.n_persone}</td></tr>
            ${prenotazione.importo_totale > 0 ? `<tr style="background:#f5f5f5"><td style="padding:8px;color:#666">Importo</td><td style="padding:8px;font-weight:600">€${prenotazione.importo_totale}</td></tr>` : ''}
          </table>
          ${prenotazione.note_cliente ? `<p style="color:#666;font-size:14px">Note: ${prenotazione.note_cliente}</p>` : ''}
          ${waUrl ? `
          <div style="margin:20px 0;padding:14px 18px;background:#f0fdf4;border-radius:10px;text-align:center">
            <p style="margin:0;font-size:14px;color:#166534">
              Hai domande?
              <a href="${waUrl}" style="color:#25D366;font-weight:700;text-decoration:none">Scrivici su WhatsApp →</a>
            </p>
          </div>` : ''}
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
          <p style="font-size:13px;color:#999">
            Hai bisogno di cancellare?
            <a href="${cancelUrl}" style="color:#00b5b5">Clicca qui</a>
            (entro ${risorsa.cancellazione_ore || 24} ore prima).
          </p>
        </div>
      `,
    })
  } catch (e) {
    console.error('[booking] email conferma fallita:', e.message)
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { risorsa_id, data, ora_inizio, servizio,
      cliente_nome, cliente_email, cliente_telefono,
      n_persone, note_cliente, promozione_id } = body

    if (!isUUID(risorsa_id)) return Response.json({ error: 'risorsa_id non valido' }, { status: 400 })
    if (!data) return Response.json({ error: 'data obbligatoria' }, { status: 400 })
    if (!cliente_nome?.trim()) return Response.json({ error: 'Nome obbligatorio' }, { status: 400 })
    if (!cliente_email?.trim()) return Response.json({ error: 'Email obbligatoria' }, { status: 400 })

    const { data: risorsa, error: re } = await supabaseAdmin.from('risorse')
      .select('*').eq('id', risorsa_id).eq('attiva', true).single()
    if (re || !risorsa) return Response.json({ error: 'Risorsa non trovata o non attiva' }, { status: 404 })

    let ora_fine = null
    if (risorsa.modalita === 'slot' && ora_inizio) {
      ora_fine = formatTime(parseTime(ora_inizio) + risorsa.durata_minuti)
    }

    let prezzo_unitario = risorsa.prezzo
    if (isUUID(promozione_id)) {
      const { data: promo } = await supabaseAdmin.from('risorse_promozioni')
        .select('prezzo_speciale').eq('id', promozione_id).eq('attiva', true).single()
      if (promo) prezzo_unitario = promo.prezzo_speciale
    }
    const persone = Math.max(1, parseInt(n_persone) || 1)
    const importo_totale = prezzo_unitario * persone

    const payload = {
      risorsa_id,
      azienda_id: risorsa.azienda_id,
      entity_tipo: risorsa.entity_tipo,
      entity_id: risorsa.entity_id,
      data,
      ora_inizio: ora_inizio || null,
      ora_fine,
      servizio: servizio || null,
      cliente_nome: cliente_nome.trim(),
      cliente_email: cliente_email.trim().toLowerCase(),
      cliente_telefono: cliente_telefono?.trim() || null,
      n_persone: persone,
      note_cliente: note_cliente?.trim() || null,
      stato: risorsa.conferma_auto ? 'confermata' : 'in_attesa',
      prezzo_unitario,
      importo_totale,
      promozione_id: isUUID(promozione_id) ? promozione_id : null,
    }

    const { data: prenotazione, error: pe } = await supabaseAdmin.from('prenotazioni').insert(payload).select().single()
    if (pe) return Response.json({ error: pe.message }, { status: 500 })

    // Fire-and-forget: email + webhook + Google Calendar
    getEntityWhatsapp(risorsa.entity_tipo, risorsa.entity_id)
      .then(wa => inviaEmailConferma(prenotazione, risorsa, wa))
    syncBookingCreate(prenotazione, risorsa)
    sendWebhooks(prenotazione.azienda_id, 'nuova_prenotazione', {
      prenotazione_id: prenotazione.id,
      risorsa_id: prenotazione.risorsa_id,
      cliente_nome: prenotazione.cliente_nome,
      cliente_email: prenotazione.cliente_email,
      data: prenotazione.data,
      ora_inizio: prenotazione.ora_inizio,
      importo_totale: prenotazione.importo_totale,
    })

    const visitDatetime = prenotazione.data && prenotazione.ora_inizio
      ? new Date(`${prenotazione.data}T${prenotazione.ora_inizio}`).toISOString()
      : prenotazione.data ? new Date(`${prenotazione.data}T09:00:00`).toISOString() : null

    // Genera token recensione per automazione post_visita
    let reviewLink = ''
    if (visitDatetime) {
      try {
        const { data: recData } = await supabaseAdmin.from('recensioni').insert({
          azienda_id: prenotazione.azienda_id,
          entity_tipo: risorsa.entity_tipo,
          entity_id: risorsa.entity_id,
          autore: prenotazione.cliente_nome,
          stelle: 5, testo: '', fonte: 'form',
          verificata: false, pubblica: false,
        }).select('token').single()
        if (recData?.token) {
          reviewLink = `${process.env.CLIENT_URL || 'https://oltrenova.com'}/recensione?token=${recData.token}`
        }
      } catch (e) { console.error('[booking] genera token recensione:', e.message) }
    }

    const autoVars = {
      nome: prenotazione.cliente_nome,
      email: prenotazione.cliente_email,
      data: new Date(prenotazione.data).toLocaleDateString('it-IT'),
      ora: prenotazione.ora_inizio || '',
      servizio: prenotazione.servizio || risorsa.nome || '',
      n_persone: String(prenotazione.n_persone || '1'),
      note: prenotazione.note_cliente || '',
      link_recensione: reviewLink,
      visit_datetime: visitDatetime,
      source_tipo: 'prenotazione',
      source_id: prenotazione.id,
    }
    const ctx = { azienda_id: prenotazione.azienda_id, entity_tipo: risorsa.entity_tipo, entity_id: risorsa.entity_id }
    triggerAutomazione('nuova_prenotazione', ctx, autoVars).catch(e => console.error('[auto] nuova_prenotazione:', e.message))
    if (visitDatetime) {
      triggerAutomazione('pre_visita', ctx, autoVars).catch(e => console.error('[auto] pre_visita:', e.message))
      triggerAutomazione('post_visita', ctx, autoVars).catch(e => console.error('[auto] post_visita:', e.message))
    }

    return Response.json(prenotazione, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
