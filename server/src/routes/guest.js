import { Router } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase.js'
import { validate } from '../middleware/validate.js'
import { triggerAutomazione } from '../lib/automazioni.js'

const bookEventSchema = z.object({
  guest_name:  z.string().trim().min(1).max(100),
  guest_email: z.string().trim().email(),
  guest_phone: z.string().trim().max(30).optional(),
  package_id:  z.string().uuid().optional(),
  seats:       z.coerce.number().int().min(1).max(100).optional(),
  notes:       z.string().trim().max(1000).optional(),
})

const bookSchema = z.object({
  entity_tipo: z.enum(['struttura', 'ristorante', 'attivita']),
  entity_id:   z.string().uuid(),
  item_type:   z.enum(['activity', 'excursion']),
  item_name:   z.string().trim().max(200).optional(),
  name:        z.string().trim().min(1).max(100),
  email:       z.string().trim().email(),
  phone:       z.string().trim().max(30).optional(),
  persons:     z.coerce.number().int().min(1).max(100).optional(),
  notes:       z.string().trim().max(1000).optional(),
})

const contactSchema = z.object({
  entity_tipo:  z.enum(['struttura', 'ristorante', 'attivita']),
  entity_id:    z.string().uuid(),
  name:         z.string().trim().min(1).max(100),
  email:        z.string().trim().email(),
  message:      z.string().trim().min(1).max(3000),
  source:       z.string().trim().max(50).optional(),
  source_name:  z.string().trim().max(200).optional(),
})

const pageviewSchema = z.object({
  entity_tipo: z.enum(['struttura', 'ristorante', 'attivita']),
  entity_id:   z.string().uuid(),
})

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

// GET /api/guest/a/:slug — attività (public)
router.get('/a/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('attivita')
    .select('id, azienda_id, slug, name, tipo, description, address, phone, email, schedule, logo_url, cover_url, theme, gallery, services, minisito, privacy_data, chatbot')
    .eq('slug', req.params.slug)
    .eq('active', true)
    .single()
  if (error || !data) return res.status(404).json({ error: 'Attività non trovata' })
  res.json(data)
})

// GET /api/guest/r/:slug — ristorante (public)
router.get('/r/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('ristoranti')
    .select('id, azienda_id, slug, name, description, address, phone, email, schedule, logo_url, cover_url, theme, gallery, menu, modules, minisito, privacy_data, chatbot')
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
router.post('/eventi/:id/book', validate(bookEventSchema), async (req, res) => {
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

// POST /api/guest/pageview — traccia visita minisito (pubblico, fire-and-forget)
router.post('/pageview', validate(pageviewSchema), async (req, res) => {
  const { entity_tipo, entity_id } = req.body
  if (!entity_tipo || !entity_id) return res.status(400).json({ error: 'entity_tipo e entity_id obbligatori' })
  await supabase.from('page_views').insert({ entity_tipo, entity_id })
  res.json({ ok: true })
})

// GET /api/guest/unsubscribe?token=xxx&nl=newsletter_id — disiscrizione newsletter (pubblico)
router.get('/unsubscribe', async (req, res) => {
  const { token, nl } = req.query
  if (!token || token === 'TEST') return res.json({ ok: true, test: true })
  const { data, error } = await supabase.from('contatti')
    .update({ iscritto_newsletter: false, updated_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)
    .select('id').single()
  if (error || !data) return res.status(404).json({ error: 'Token non valido' })
  // Increment unsubscribes_count on the specific newsletter
  if (nl) {
    const { data: nlData } = await supabase.from('newsletters').select('unsubscribes_count').eq('id', nl).single()
    if (nlData) await supabase.from('newsletters').update({ unsubscribes_count: (nlData.unsubscribes_count || 0) + 1 }).eq('id', nl)
  }
  res.json({ ok: true })
})

// GET /api/guest/confirm-subscription?token=xxx — conferma double opt-in (pubblico)
router.get('/confirm-subscription', async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Token mancante' })
  const { data, error } = await supabase.from('contatti')
    .update({ iscritto_newsletter: true, confirmation_token: null, updated_at: new Date().toISOString() })
    .eq('confirmation_token', token)
    .select('id').single()
  if (error || !data) return res.status(404).json({ error: 'Token non valido o già usato' })
  res.json({ ok: true })
})

// GET /api/guest/:slug — struttura (public) — DEVE stare per ultima (catch-all)
router.get('/:slug', async (req, res) => {
  const { data, error } = await supabase
    .from('properties')
    .select('id, azienda_id, slug, name, description, address, phone, whatsapp, wifi_name, wifi_password, checkin_time, checkout_time, rules, amenities, logo_url, cover_url, plan, modules, theme, services, gallery, restaurant, activities, excursions, minisito, privacy_data, chatbot')
    .eq('slug', req.params.slug)
    .eq('active', true)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Struttura non trovata' })

  const collegamenti = await getCollegamenti('struttura', data.id)
  res.json({ ...data, collegamenti })
})

// POST /api/guest/book — prenotazione attività/escursione (pubblico, salva su DB + email)
router.post('/book', validate(bookSchema), async (req, res) => {
  const { entity_tipo, entity_id, item_type, item_name, name, email, phone, persons, notes } = req.body
  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Nome e email obbligatori' })
  }

  let propertyId  = null
  let entityEmail = null
  let entityName  = null

  if (entity_tipo === 'struttura' && entity_id) {
    const { data } = await supabase.from('properties').select('id, name, email').eq('id', entity_id).single()
    if (data) { propertyId = data.id; entityEmail = data.email; entityName = data.name }
  } else if (entity_tipo === 'ristorante' && entity_id) {
    const { data } = await supabase.from('ristoranti').select('id, name, email').eq('id', entity_id).single()
    if (data) { entityEmail = data.email; entityName = data.name }
  }

  const typeLabel = item_type === 'excursion' ? 'escursione' : 'attività'
  const msgLines = [
    `[Prenotazione ${typeLabel}] ${item_name || ''}`,
    `Nome: ${name}`,
    `Email: ${email}`,
    phone   ? `Telefono: ${phone}`   : null,
    persons ? `Persone: ${persons}`  : null,
    notes   ? `Note: ${notes}`       : null,
  ].filter(Boolean).join('\n')

  // Salva in requests (visibile nel pannello admin)
  if (propertyId) {
    await supabase.from('requests').insert({
      property_id: propertyId,
      type: 'other',
      message: msgLines,
    })
  }

  // Notifica email
  if (entityEmail && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const rows = [
        { label: 'Nome',    value: name },
        { label: 'Email',   value: `<a href="mailto:${email}" style="color:#00b5b5">${email}</a>` },
        ...(phone   ? [{ label: 'Telefono', value: phone }] : []),
        ...(persons ? [{ label: 'Persone',  value: String(persons) }] : []),
        { label: typeLabel === 'escursione' ? 'Escursione' : 'Attività', value: item_name || '' },
        ...(notes   ? [{ label: 'Note',     value: notes.replace(/\n/g, '<br>') }] : []),
      ]
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'StayApp <noreply@stayapp.it>',
        to: entityEmail,
        replyTo: email,
        subject: `[${entityName}] Nuova prenotazione ${typeLabel}: ${item_name || ''}`,
        html: emailTemplate({
          title: `Nuova prenotazione ${typeLabel}`,
          entityName,
          rows,
          appUrl: process.env.APP_URL || 'https://stayapp.it',
        }),
      })
    } catch (err) { console.error('[book]', err.message) }
  }

  res.status(201).json({ ok: true })
})

// POST /api/guest/contact — form contatto minisito (pubblico)
router.post('/contact', validate(contactSchema), async (req, res) => {
  const { entity_tipo, entity_id, name, email, message, source, source_name } = req.body
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Nome, email e messaggio sono obbligatori' })
  }

  let entityEmail  = null
  let entityName   = null
  let azienda_id   = null

  if (entity_tipo === 'struttura' && entity_id) {
    const { data } = await supabase.from('properties').select('name, email, azienda_id').eq('id', entity_id).single()
    entityEmail = data?.email; entityName = data?.name; azienda_id = data?.azienda_id
  } else if (entity_tipo === 'ristorante' && entity_id) {
    const { data } = await supabase.from('ristoranti').select('name, email, azienda_id').eq('id', entity_id).single()
    entityEmail = data?.email; entityName = data?.name; azienda_id = data?.azienda_id
  } else if (entity_tipo === 'attivita' && entity_id) {
    const { data } = await supabase.from('attivita').select('name, email, azienda_id').eq('id', entity_id).single()
    entityEmail = data?.email; entityName = data?.name; azienda_id = data?.azienda_id
  }

  // Salva in requests quando è un interesse per un'offerta
  if (source === 'offerta' && entity_tipo === 'struttura' && entity_id) {
    const msgLines = [
      `[Interesse offerta: ${source_name || ''}]`,
      `Nome: ${name.trim()}`,
      `Email: ${email.trim()}`,
      message.trim() ? `Messaggio: ${message.trim()}` : null,
    ].filter(Boolean).join('\n')
    await supabase.from('requests').insert({ property_id: entity_id, type: 'other', message: msgLines, status: 'open' })
  }

  // Salva lead in contatti (upsert su email+azienda_id)
  let isNewContact = false
  if (azienda_id && email) {
    try {
      const { data: existing } = await supabase.from('contatti')
        .select('id, note').eq('azienda_id', azienda_id).eq('email', email.trim()).single()
      if (existing) {
        const notes = [existing.note, `[${new Date().toLocaleDateString('it-IT')}] ${message.trim()}`].filter(Boolean).join('\n\n')
        await supabase.from('contatti').update({ nome: name.trim(), note: notes, updated_at: new Date().toISOString() }).eq('id', existing.id)
      } else {
        await supabase.from('contatti').insert({
          azienda_id, nome: name.trim(), email: email.trim(),
          fonte: 'minisito', tags: ['lead', entity_tipo],
          note: message.trim(), iscritto_newsletter: false,
        })
        isNewContact = true
      }
    } catch (err) { console.error('[contact] salvataggio contatto:', err.message) }
  }

  // Trigger automazioni nuovo_contatto (solo per contatti effettivamente nuovi)
  if (isNewContact && azienda_id) {
    triggerAutomazione('nuovo_contatto',
      { azienda_id, entity_tipo, entity_id },
      { nome: name.trim(), email: email.trim(), source_tipo: 'contatto' }
    ).catch(e => console.error('[auto] nuovo_contatto:', e.message))
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

// ── GET /api/guest/pagine/:tipo/:entityId — lista pagine pubblicate (navigazione) ──
router.get('/pagine/:tipo/:entityId', async (req, res) => {
  try {
    const { tipo, entityId } = req.params
    const { data, error } = await supabase
      .from('pagine')
      .select('id, parent_id, slug, titolo, nel_menu, ordine')
      .eq('entity_tipo', tipo).eq('entity_id', entityId)
      .eq('status', 'pubblicata').eq('nel_menu', true)
      .order('ordine', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /api/guest/pagina/:tipo/:entityId/:slug — singola pagina pubblica ──
router.get('/pagina/:tipo/:entityId/:slug', async (req, res) => {
  try {
    const { tipo, entityId, slug } = req.params
    const { data, error } = await supabase
      .from('pagine').select('*')
      .eq('entity_tipo', tipo).eq('entity_id', entityId)
      .eq('slug', slug).eq('status', 'pubblicata')
      .single()
    if (error || !data) return res.status(404).json({ error: 'Pagina non trovata' })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /api/guest/recensioni/:tipo/:entityId — recensioni pubbliche ──
router.get('/recensioni/:tipo/:entityId', async (req, res) => {
  try {
    const { tipo, entityId } = req.params
    const { data, error } = await supabase
      .from('recensioni')
      .select('id, autore, stelle, testo, fonte, verificata, created_at')
      .eq('entity_tipo', tipo).eq('entity_id', entityId)
      .eq('pubblica', true)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /api/guest/recensione/:token — info per il form pubblico ──
router.get('/recensione/:token', async (req, res) => {
  try {
    const { token } = req.params
    const { data, error } = await supabase
      .from('recensioni').select('id, autore, entity_tipo, entity_id, pubblica')
      .eq('token', token).single()
    if (error || !data) return res.status(404).json({ error: 'Link non valido o già utilizzato' })
    if (data.pubblica) return res.status(410).json({ error: 'Recensione già inviata' })

    // Recupera nome entità per personalizzare il form
    const table = data.entity_tipo === 'struttura' ? 'properties' : data.entity_tipo === 'ristorante' ? 'ristoranti' : 'attivita'
    const { data: entity } = await supabase.from(table).select('name, logo_url, theme, minisito').eq('id', data.entity_id).single()

    res.json({
      autore: data.autore,
      entity_name: entity?.name || '',
      entity_logo: entity?.logo_url || null,
      primary: entity?.theme?.primaryColor || '#1a1a2e',
      redirect_url: entity?.minisito?.recensioni_redirect_url || null,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── POST /api/guest/recensione/:token — invia recensione ──
router.post('/recensione/:token', async (req, res) => {
  try {
    const { token } = req.params
    const { autore, stelle, testo } = req.body

    if (!stelle || stelle < 1 || stelle > 5) return res.status(400).json({ error: 'stelle obbligatorie (1-5)' })

    const { data: rec, error: fe } = await supabase
      .from('recensioni').select('id, pubblica, entity_tipo, entity_id, azienda_id')
      .eq('token', token).single()
    if (fe || !rec) return res.status(404).json({ error: 'Link non valido' })
    if (rec.pubblica) return res.status(410).json({ error: 'Recensione già inviata' })

    // Recupera redirect_url per smart redirect
    const table = rec.entity_tipo === 'struttura' ? 'properties' : rec.entity_tipo === 'ristorante' ? 'ristoranti' : 'attivita'
    const { data: entity } = await supabase.from(table).select('minisito').eq('id', rec.entity_id).single()
    const redirectUrl = entity?.minisito?.recensioni_redirect_url || null

    // ≥4 stelle + redirect configurato → pubblica e reindirizza
    const isPositive = Number(stelle) >= 4
    const shouldRedirect = isPositive && redirectUrl

    await supabase.from('recensioni').update({
      autore: autore?.trim() || rec.autore || 'Anonimo',
      stelle: Number(stelle),
      testo: testo?.trim() || '',
      verificata: true,
      pubblica: isPositive,   // negativa resta nascosta finché admin non decide
      updated_at: new Date().toISOString(),
    }).eq('id', rec.id)

    // Notifica admin per recensioni negative
    if (!isPositive) {
      const { data: az } = await supabase.from('aziende').select('email').eq('id', rec.azienda_id).single()
      if (az?.email && process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import('resend')
          const r = new Resend(process.env.RESEND_API_KEY)
          const stars = '★'.repeat(Number(stelle)) + '☆'.repeat(5 - Number(stelle))
          await r.emails.send({
            from: process.env.RESEND_FROM || 'StayApp <noreply@stayapp.it>',
            to: az.email,
            subject: `[StayApp] Nuova recensione ${stars} da ${autore?.trim() || 'Anonimo'}`,
            html: `<p>Hai ricevuto una recensione privata (${stelle}/5 stelle) da <strong>${autore?.trim() || 'Anonimo'}</strong>.</p><p>${testo?.trim() || ''}</p><p>Accedi al pannello admin per visualizzarla e rispondere.</p>`,
          })
        } catch {}
      }
    }

    res.json({ ok: true, redirect: shouldRedirect ? redirectUrl : null })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export { emailTemplate }
export default router
