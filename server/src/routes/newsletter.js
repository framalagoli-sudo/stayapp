import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('role, azienda_id, property_id').eq('id', userId).single()
  return data
}

async function getEntity(entity_tipo, entity_id) {
  if (!entity_tipo || !entity_id) return null
  const table = entity_tipo === 'struttura' ? 'properties' : entity_tipo === 'ristorante' ? 'ristoranti' : 'attivita'
  const { data } = await supabase.from(table).select('id, name, logo_url, theme').eq('id', entity_id).single()
  return data
}

function personalize(obj, nome) {
  const n = (nome || '').trim() || 'amico'
  if (typeof obj === 'string') return obj.replace(/\{\{nome\}\}/g, n)
  if (Array.isArray(obj)) return obj.map(x => personalize(x, nome))
  if (obj && typeof obj === 'object') return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, personalize(v, nome)]))
  return obj
}

// ─── Email HTML builder ───────────────────────────────────────────────────────

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

function nlHeader(entityName, entityLogo) {
  return `<tr><td style="background:#1a1a2e;padding:24px 36px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      ${entityLogo ? `<td style="width:48px;padding-right:14px;vertical-align:middle"><img src="${entityLogo}" alt="" style="height:40px;width:40px;object-fit:contain;border-radius:8px;display:block"></td>` : ''}
      <td style="vertical-align:middle"><span style="font-size:20px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif">${esc(entityName)}</span></td>
    </tr></table>
  </td></tr>`
}

function nlFooter(unsubscribeUrl, entityName) {
  return `<tr><td style="padding:24px 36px;background:#f9f9fb;border-top:1px solid #f0f0f0;text-align:center">
    <p style="font-size:12px;color:#aaa;font-family:Arial,sans-serif;line-height:1.7;margin:0">
      Hai ricevuto questa email perché sei iscritto alla newsletter di <strong>${esc(entityName)}</strong>.<br>
      <a href="${unsubscribeUrl}" style="color:#aaa;text-decoration:underline">Annulla iscrizione</a>
      <span style="color:#ddd">&nbsp;·&nbsp;</span>
      <span style="color:#ccc">Powered by StayApp</span>
    </p>
  </td></tr>`
}

function ctaButton(text, url, primary) {
  if (!text || !url) return ''
  return `<table cellpadding="0" cellspacing="0" style="margin-top:24px"><tr>
    <td style="background:${primary};border-radius:8px">
      <a href="${url}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;font-family:Arial,sans-serif">${esc(text)}</a>
    </td>
  </tr></table>`
}

function bodySemplice(c, primary) {
  return `
    ${c.image_url ? `<tr><td><img src="${c.image_url}" alt="" style="width:100%;max-height:280px;object-fit:cover;display:block"></td></tr>` : ''}
    <tr><td style="padding:36px 36px 40px">
      ${c.heading ? `<h1 style="font-size:26px;font-weight:700;color:#1a1a2e;margin:0 0 16px;font-family:Georgia,serif;line-height:1.3">${esc(c.heading)}</h1>` : ''}
      ${c.text ? `<p style="font-size:16px;color:#444;line-height:1.8;margin:0;font-family:Arial,sans-serif;white-space:pre-wrap">${esc(c.text)}</p>` : ''}
      ${ctaButton(c.cta_text, c.cta_url, primary)}
    </td></tr>`
}

function bodyPromozione(c, primary) {
  const orig = parseFloat(c.price_original), disc = parseFloat(c.price_discounted)
  const pct = orig && disc && orig > disc ? Math.round((1 - disc / orig) * 100) : null
  const displayPrice = c.price_discounted || c.price_original
  return `
    ${c.image_url ? `<tr><td><img src="${c.image_url}" alt="" style="width:100%;max-height:320px;object-fit:cover;display:block"></td></tr>` : ''}
    <tr><td style="padding:36px 36px 40px">
      ${c.badge ? `<span style="display:inline-block;background:${primary}22;color:${primary};font-size:11px;font-weight:700;padding:4px 14px;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;font-family:Arial,sans-serif">${esc(c.badge)}</span><br><br>` : ''}
      ${c.heading ? `<h1 style="font-size:26px;font-weight:700;color:#1a1a2e;margin:0 0 20px;font-family:Georgia,serif;line-height:1.3">${esc(c.heading)}</h1>` : ''}
      ${displayPrice ? `<table cellpadding="0" cellspacing="0" style="margin-bottom:20px"><tr>
        <td style="font-size:44px;font-weight:800;color:${primary};font-family:Georgia,serif;padding-right:12px;line-height:1">€${esc(displayPrice)}</td>
        ${c.price_original && c.price_discounted ? `<td style="font-size:22px;color:#bbb;text-decoration:line-through;font-family:Arial,sans-serif;padding-right:10px;vertical-align:middle">€${esc(c.price_original)}</td>` : ''}
        ${pct ? `<td style="vertical-align:middle"><span style="display:inline-block;background:#22c55e;color:#fff;font-size:13px;font-weight:800;padding:5px 12px;border-radius:20px;font-family:Arial,sans-serif">-${pct}%</span></td>` : ''}
      </tr></table>` : ''}
      ${c.text ? `<p style="font-size:16px;color:#444;line-height:1.8;margin:0;font-family:Arial,sans-serif;white-space:pre-wrap">${esc(c.text)}</p>` : ''}
      ${ctaButton(c.cta_text, c.cta_url, primary)}
      ${c.conditions ? `<p style="font-size:12px;color:#aaa;margin:20px 0 0;font-family:Arial,sans-serif;line-height:1.6">${esc(c.conditions)}</p>` : ''}
    </td></tr>`
}

function bodyNotizie(c, primary) {
  const blocks = c.blocks || []
  return `
    <tr><td style="padding:36px 36px ${blocks.length ? '24px' : '40px'}">
      ${c.heading ? `<h1 style="font-size:26px;font-weight:700;color:#1a1a2e;margin:0 0 ${c.intro ? '12px' : '28px'};font-family:Georgia,serif;line-height:1.3">${esc(c.heading)}</h1>` : ''}
      ${c.intro ? `<p style="font-size:16px;color:#666;line-height:1.8;margin:0 0 28px;font-family:Arial,sans-serif">${esc(c.intro)}</p>` : ''}
    </td></tr>
    ${blocks.map((b, i) => `
    <tr><td style="padding:0 36px ${i < blocks.length - 1 ? '0' : '40px'}">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;padding-top:24px;margin-bottom:24px"><tr>
        ${b.image_url ? `<td style="width:140px;padding-right:16px;vertical-align:top"><img src="${b.image_url}" alt="" style="width:140px;height:100px;object-fit:cover;border-radius:8px;display:block"></td>` : ''}
        <td style="vertical-align:top">
          ${b.title ? `<h3 style="font-size:17px;font-weight:700;color:#1a1a2e;margin:0 0 8px;font-family:Arial,sans-serif">${esc(b.title)}</h3>` : ''}
          ${b.text ? `<p style="font-size:14px;color:#555;line-height:1.7;margin:0;font-family:Arial,sans-serif">${esc(b.text)}</p>` : ''}
        </td>
      </tr></table>
    </td></tr>`).join('')}`
}

function bodyEvento(c, primary) {
  const dateStr = c.date ? new Date(c.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''
  return `
    ${c.image_url ? `<tr><td><img src="${c.image_url}" alt="" style="width:100%;max-height:280px;object-fit:cover;display:block"></td></tr>` : ''}
    <tr><td style="padding:36px 36px 40px">
      ${c.heading ? `<p style="font-size:13px;font-weight:700;color:${primary};text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;font-family:Arial,sans-serif">${esc(c.heading)}</p>` : ''}
      ${c.event_title ? `<h1 style="font-size:28px;font-weight:700;color:#1a1a2e;margin:0 0 20px;font-family:Georgia,serif;line-height:1.3">${esc(c.event_title)}</h1>` : ''}
      ${(c.date || c.location || c.price) ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:#f9f9fb;border-radius:10px;padding:16px 20px">
        ${c.date ? `<p style="font-size:14px;color:#555;margin:0 0 8px;font-family:Arial,sans-serif">📅 <strong>${dateStr}${c.time ? ' alle ' + esc(c.time) : ''}</strong></p>` : ''}
        ${c.location ? `<p style="font-size:14px;color:#555;margin:0 0 8px;font-family:Arial,sans-serif">📍 ${esc(c.location)}</p>` : ''}
        ${c.price ? `<p style="font-size:14px;color:#555;margin:0;font-family:Arial,sans-serif">💶 A partire da <strong>€${esc(c.price)}</strong></p>` : ''}
      </td></tr></table>` : ''}
      ${c.text ? `<p style="font-size:16px;color:#444;line-height:1.8;margin:0;font-family:Arial,sans-serif;white-space:pre-wrap">${esc(c.text)}</p>` : ''}
      ${ctaButton(c.cta_text, c.cta_url, primary)}
    </td></tr>`
}

export function buildNewsletterHtml({ entityName, entityLogo, primary = '#1a1a2e', template_id, content, unsubscribeUrl, preheader = '' }) {
  const body = template_id === 'promozione' ? bodyPromozione(content, primary)
    : template_id === 'notizie' ? bodyNotizie(content, primary)
    : template_id === 'evento' ? bodyEvento(content, primary)
    : bodySemplice(content, primary)

  const preheaderHtml = preheader ? `
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#ffffff;opacity:0">
    ${esc(preheader)}${'&nbsp;&zwnj;'.repeat(Math.max(0, 100 - preheader.length))}
  </div>` : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(entityName)}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5">
${preheaderHtml}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5"><tr><td style="padding:40px 20px">
<table width="600" align="center" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:100%">
  ${nlHeader(entityName, entityLogo)}
  ${body}
  ${nlFooter(unsubscribeUrl, entityName)}
</table>
</td></tr></table>
</body></html>`
}

// ─── Core send logic (shared between manual send and scheduler) ───────────────

export async function sendNewsletterById(id) {
  const { data: nl, error } = await supabase.from('newsletters').select('*').eq('id', id).single()
  if (error || !nl) throw new Error('Newsletter non trovata')
  if (nl.status === 'sent') throw new Error('Newsletter già inviata')
  if (!nl.subject?.trim()) throw new Error('Oggetto obbligatorio prima di inviare')

  const { data: contacts } = await supabase.from('contatti')
    .select('email, nome, unsubscribe_token')
    .eq('azienda_id', nl.azienda_id)
    .eq('iscritto_newsletter', true)
    .not('email', 'is', null)

  if (!contacts?.length) throw new Error('Nessun iscritto trovato')

  const entity = await getEntity(nl.entity_tipo, nl.entity_id)
  const entityName = entity?.name || 'StayApp'
  const entityLogo = entity?.logo_url || null
  const primary    = entity?.theme?.primaryColor || '#1a1a2e'
  const appUrl     = process.env.APP_URL || 'https://stayapp.it'

  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY non configurata')

  // Marca come inviata subito (previene doppi invii)
  const { data: marked } = await supabase.from('newsletters')
    .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', nl.id).eq('status', nl.status === 'draft' ? 'draft' : 'scheduled')
    .select('id').single()
  if (!marked) throw new Error('Newsletter già inviata da un altro processo')

  let sent = 0
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  for (let i = 0; i < contacts.length; i += 50) {
    const batch = contacts.slice(i, i + 50)
    const emails = batch.map(c => {
      const pContent = personalize(nl.content, c.nome)
      const pSubject = personalize(nl.subject, c.nome)
      return {
        from: process.env.RESEND_FROM || 'StayApp <noreply@stayapp.it>',
        to: c.email,
        subject: pSubject,
        html: buildNewsletterHtml({
          entityName, entityLogo, primary,
          template_id: nl.template_id,
          content: pContent,
          preheader: nl.preheader || '',
          unsubscribeUrl: `${appUrl}/unsubscribe?token=${c.unsubscribe_token || 'na'}&nl=${nl.id}`,
        }),
      }
    })
    await resend.batch.send(emails)
    sent += batch.length
  }

  await supabase.from('newsletters').update({ recipients_count: sent, updated_at: new Date().toISOString() }).eq('id', nl.id)
  return sent
}

// ─── Scheduled send job (chiamato da index.js ogni 60s) ──────────────────────

export async function runScheduledSends() {
  const { data: due } = await supabase.from('newsletters')
    .select('id').eq('status', 'draft')
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', new Date().toISOString())
  for (const { id } of due || []) {
    try {
      const sent = await sendNewsletterById(id)
      console.log(`[scheduler] Newsletter ${id} inviata a ${sent} iscritti`)
    } catch (e) { console.error(`[scheduler] Newsletter ${id}:`, e.message) }
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get('/archive/:entity_tipo/:entity_id', async (req, res) => {
  const { entity_tipo, entity_id } = req.params
  const { data, error } = await supabase.from('newsletters')
    .select('id, subject, sent_at, template_id, content, preheader, entity_tipo, entity_id')
    .eq('entity_tipo', entity_tipo).eq('entity_id', entity_id)
    .eq('status', 'sent').order('sent_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.get('/', requireAuth, async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })
  let q = supabase.from('newsletters')
    .select('id, subject, preheader, template_id, status, sent_at, scheduled_at, recipients_count, unsubscribes_count, entity_tipo, entity_id, created_at, updated_at')
    .order('created_at', { ascending: false })
  if (profile.role !== 'super_admin') {
    if (!profile.azienda_id) return res.json([])
    q = q.eq('azienda_id', profile.azienda_id)
  }
  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.get('/:id', requireAuth, async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })
  let q = supabase.from('newsletters').select('*').eq('id', req.params.id)
  if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
  const { data, error } = await q.single()
  if (error || !data) return res.status(404).json({ error: 'Newsletter non trovata' })
  res.json(data)
})

router.post('/', requireAuth, async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })
  const azienda_id = profile.azienda_id || req.body.azienda_id
  if (!azienda_id) return res.status(400).json({ error: 'azienda_id mancante' })
  const { subject = '', preheader = '', template_id = 'semplice', content = {}, entity_tipo = 'struttura', entity_id = null, scheduled_at = null } = req.body
  const { data, error } = await supabase.from('newsletters').insert({
    azienda_id, subject, preheader, template_id, content, entity_tipo,
    entity_id: entity_id || null, status: 'draft', scheduled_at: scheduled_at || null,
  }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

router.patch('/:id', requireAuth, async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

  const allowed = ['subject', 'preheader', 'template_id', 'content', 'entity_tipo', 'entity_id', 'scheduled_at']
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
  updates.updated_at = new Date().toISOString()

  let q = supabase.from('newsletters').update(updates).eq('id', req.params.id)
  if (profile.role !== 'super_admin') q = q.eq('azienda_id', profile.azienda_id)
  const { data, error } = await q.select().single()
  if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message })
  res.json(data)
})

router.delete('/:id', requireAuth, async (req, res) => {
  const profile = await getProfile(req.user.id)
  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

  let qCheck = supabase.from('newsletters').select('status').eq('id', req.params.id)
  if (profile.role !== 'super_admin') qCheck = qCheck.eq('azienda_id', profile.azienda_id)
  const { data: nl } = await qCheck.single()
  if (!nl) return res.status(404).json({ error: 'Newsletter non trovata' })
  if (nl.status === 'sent') return res.status(400).json({ error: 'Non puoi eliminare una newsletter già inviata' })

  const { error } = await supabase.from('newsletters').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

router.post('/:id/duplicate', requireAuth, async (req, res) => {
  const { data: orig, error } = await supabase.from('newsletters').select('*').eq('id', req.params.id).single()
  if (error || !orig) return res.status(404).json({ error: 'Non trovata' })
  const { data, error: e2 } = await supabase.from('newsletters').insert({
    azienda_id: orig.azienda_id, entity_tipo: orig.entity_tipo, entity_id: orig.entity_id,
    subject: `${orig.subject} (copia)`, preheader: orig.preheader || '',
    template_id: orig.template_id, content: orig.content, status: 'draft',
  }).select().single()
  if (e2) return res.status(500).json({ error: e2.message })
  res.status(201).json(data)
})

router.post('/:id/test', requireAuth, async (req, res) => {
  const { test_email } = req.body
  if (!test_email) return res.status(400).json({ error: 'test_email obbligatoria' })
  const { data: nl, error } = await supabase.from('newsletters').select('*').eq('id', req.params.id).single()
  if (error || !nl) return res.status(404).json({ error: 'Non trovata' })
  const entity = await getEntity(nl.entity_tipo, nl.entity_id)
  const appUrl = process.env.APP_URL || 'https://stayapp.it'
  const html = buildNewsletterHtml({
    entityName: entity?.name || 'StayApp', entityLogo: entity?.logo_url || null,
    primary: entity?.theme?.primaryColor || '#1a1a2e',
    template_id: nl.template_id,
    content: personalize(nl.content, 'Mario'),
    preheader: nl.preheader || '',
    unsubscribeUrl: `${appUrl}/unsubscribe?token=TEST`,
  })
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY non configurata' })
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'StayApp <noreply@stayapp.it>',
      to: test_email,
      subject: `[TEST] ${personalize(nl.subject, 'Mario') || '(senza oggetto)'}`,
      html,
    })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/:id/send', requireAuth, async (req, res) => {
  try {
    const sent = await sendNewsletterById(req.params.id)
    res.json({ ok: true, sent })
  } catch (e) {
    const status = e.message.includes('non trovata') ? 404 : e.message.includes('già inviata') ? 400 : 500
    res.status(status).json({ error: e.message })
  }
})

export default router
