import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

async function getCollegamenti(tipo, id) {
  const { data: links } = await supabase
    .from('collegamenti')
    .select('*')
    .or(`and(from_tipo.eq.${tipo},from_id.eq.${id}),and(to_tipo.eq.${tipo},to_id.eq.${id})`)

  if (!links?.length) return []

  const result = []
  for (const link of links) {
    const isFrom = link.from_tipo === tipo && link.from_id === id
    const otherTipo = isFrom ? link.to_tipo : link.from_tipo
    const otherId   = isFrom ? link.to_id   : link.from_id

    let entity = null
    if (otherTipo === 'struttura') {
      const { data } = await supabase.from('properties')
        .select('id, name, slug, logo_url, cover_url, description')
        .eq('id', otherId).eq('active', true).single()
      entity = data
    } else if (otherTipo === 'ristorante') {
      const { data } = await supabase.from('ristoranti')
        .select('id, name, slug, logo_url, cover_url, description, schedule')
        .eq('id', otherId).eq('active', true).single()
      entity = data
    }
    if (entity) result.push({ tipo: otherTipo, ...entity })
  }
  return result
}

// GET /api/guest/r/:slug — ristorante (public)
router.get('/r/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('ristoranti')
    .select('id, azienda_id, name, description, address, phone, email, schedule, logo_url, cover_url, theme, gallery, menu, modules, minisito')
    .eq('slug', req.params.slug)
    .eq('active', true)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Ristorante non trovato' })

  const collegamenti = await getCollegamenti('ristorante', data.id)
  res.json({ ...data, collegamenti })
})

// GET /api/guest/eventi/:id — singolo evento pubblico
router.get('/eventi/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('eventi')
    .select('id, slug, title, description, cover_url, date_start, date_end, location, price, seats_total, seats_booked, packages')
    .eq('id', req.params.id)
    .eq('published', true)
    .eq('active', true)
    .single()
  if (error || !data) return res.status(404).json({ error: 'Evento non trovato' })
  res.json(data)
})

// GET /api/guest/eventi?entity_tipo=struttura&entity_id=xxx — eventi pubblici
router.get('/eventi', async (req, res) => {
  const { entity_tipo, entity_id } = req.query
  let query = supabase
    .from('eventi')
    .select('id, slug, title, description, cover_url, date_start, date_end, location, price, seats_total, seats_booked, packages')
    .eq('published', true)
    .eq('active', true)
    .gte('date_start', new Date().toISOString())
    .order('date_start')

  if (entity_tipo && entity_id) {
    query = query.eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// POST /api/guest/eventi/:id/book — crea prenotazione (pubblico)
router.post('/eventi/:id/book', async (req, res) => {
  const { guest_name, guest_email, guest_phone, package_id, seats, notes } = req.body
  if (!guest_name?.trim()) return res.status(400).json({ error: 'Nome obbligatorio' })
  if (!guest_email?.trim()) return res.status(400).json({ error: 'Email obbligatoria' })

  const { data: evento, error: evErr } = await supabase
    .from('eventi').select('id, seats_total, seats_booked, packages, price').eq('id', req.params.id).single()
  if (evErr || !evento) return res.status(404).json({ error: 'Evento non trovato' })

  const reqSeats = parseInt(seats) || 1
  if (evento.seats_total && (evento.seats_booked + reqSeats) > evento.seats_total)
    return res.status(400).json({ error: 'Posti non disponibili' })

  // Calcola importo totale
  let price = evento.price || 0
  if (package_id) {
    const pkg = (evento.packages || []).find(p => p.id === package_id)
    if (pkg) price = pkg.price || 0
  }
  const total_amount = price * reqSeats

  const { data, error } = await supabase.from('event_bookings').insert({
    event_id: req.params.id, guest_name, guest_email,
    guest_phone: guest_phone || null, package_id: package_id || null,
    seats: reqSeats, total_amount, notes: notes || null, status: 'pending',
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// GET /api/guest/:slug — struttura (public) — DEVE stare per ultima (catch-all)
router.get('/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('properties')
    .select('id, azienda_id, name, description, address, phone, whatsapp, wifi_name, wifi_password, checkin_time, checkout_time, rules, amenities, logo_url, cover_url, plan, modules, theme, services, gallery, restaurant, activities, excursions, minisito')
    .eq('slug', req.params.slug)
    .eq('active', true)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Struttura non trovata' })

  const collegamenti = await getCollegamenti('struttura', data.id)
  res.json({ ...data, collegamenti })
})

// POST /api/guest/contact — form contatto minisito (pubblico)
router.post('/contact', async (req, res) => {
  const { entity_tipo, entity_id, name, email, message } = req.body
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Nome, email e messaggio sono obbligatori' })
  }

  let entityEmail = null
  let entityName  = null
  if (entity_tipo === 'struttura' && entity_id) {
    const { data } = await supabase.from('properties').select('name, email').eq('id', entity_id).single()
    entityEmail = data?.email; entityName = data?.name
  } else if (entity_tipo === 'ristorante' && entity_id) {
    const { data } = await supabase.from('ristoranti').select('name, email').eq('id', entity_id).single()
    entityEmail = data?.email; entityName = data?.name
  }

  if (entityEmail && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'StayApp <noreply@stayapp.it>',
        to: entityEmail,
        replyTo: email,
        subject: `[${entityName}] Nuovo messaggio dal sito`,
        html: emailTemplate({
          title: 'Nuovo messaggio dal sito',
          entityName,
          rows: [
            { label: 'Nome', value: name },
            { label: 'Email', value: `<a href="mailto:${email}" style="color:#00b5b5">${email}</a>` },
            { label: 'Messaggio', value: message.replace(/\n/g, '<br>') },
          ],
          appUrl: process.env.APP_URL || 'https://stayapp.it',
        }),
      })
    } catch (err) { console.error('[contact]', err.message) }
  }

  res.json({ ok: true })
})

function emailTemplate({ title, entityName, rows, appUrl }) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:40px 20px">
  <table width="600" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <tr><td style="background:#1a1a2e;padding:28px 36px">
      <div style="font-size:22px;font-weight:700;color:#fff">${entityName}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:4px">Notifica StayApp</div>
    </td></tr>
    <tr><td style="padding:32px 36px">
      <h2 style="margin:0 0 24px;font-size:18px;color:#1a1a2e">${title}</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${rows.map(r => `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;width:130px;font-size:13px;font-weight:600;color:#888;vertical-align:top">${r.label}</td>
          <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a1a2e;line-height:1.6">${r.value}</td>
        </tr>`).join('')}
      </table>
    </td></tr>
    <tr><td style="padding:20px 36px;background:#f9f9fb;border-top:1px solid #f0f0f0">
      <a href="${appUrl}/admin/requests" style="color:#00b5b5;font-size:13px;text-decoration:none;font-weight:600">Apri il pannello admin →</a>
      <span style="color:#bbb;font-size:12px;margin-left:16px">Powered by StayApp</span>
    </td></tr>
  </table>
  </td></tr></table></body></html>`
}

export { emailTemplate }
export default router
