import { Router } from 'express'
import { randomUUID } from 'crypto'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

async function getAziendaId(userId) {
  const { data } = await supabase.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

// POST /api/contatti/subscribe — iscrizione pubblica da minisito/PWA (double opt-in)
router.post('/subscribe', async (req, res) => {
  const { azienda_id, nome, email, telefono, fonte = 'minisito' } = req.body
  if (!azienda_id) return res.status(400).json({ error: 'azienda_id obbligatorio' })
  if (!email?.trim() && !telefono?.trim()) return res.status(400).json({ error: 'Email o telefono obbligatori' })

  // Lookup azienda name for confirmation email
  let entityName = 'Newsletter'
  const { data: az } = await supabase.from('aziende').select('ragione_sociale').eq('id', azienda_id).single()
  if (az?.ragione_sociale) entityName = az.ragione_sociale

  // Check for existing contact
  if (email) {
    const { data: existing } = await supabase.from('contatti')
      .select('id, iscritto_newsletter').eq('azienda_id', azienda_id).eq('email', email.trim()).single()
    if (existing) {
      if (existing.iscritto_newsletter) return res.json({ ok: true, duplicate: true })
      // Pending confirmation — refresh token and resend
      const token = randomUUID()
      await supabase.from('contatti').update({ confirmation_token: token, nome: nome?.trim() || undefined, updated_at: new Date().toISOString() }).eq('id', existing.id)
      await sendConfirmationEmail({ email: email.trim(), nome: nome?.trim(), entityName, token })
      return res.json({ ok: true, pending_confirmation: true })
    }
  }

  const token = randomUUID()
  const { error } = await supabase.from('contatti').insert({
    azienda_id, nome: nome?.trim() || email?.trim() || '',
    email: email?.trim() || null,
    telefono: telefono?.trim() || null,
    fonte, iscritto_newsletter: false,
    confirmation_token: token,
    tags: ['newsletter'],
  })

  if (error) return res.status(500).json({ error: error.message })
  await sendConfirmationEmail({ email: email?.trim(), nome: nome?.trim(), entityName, token })
  res.status(201).json({ ok: true, pending_confirmation: true })
})

async function sendConfirmationEmail({ email, nome, entityName, token }) {
  if (!email || !process.env.RESEND_API_KEY) return
  const appUrl = process.env.APP_URL || 'https://stayapp-henna.vercel.app'
  const confirmUrl = `${appUrl}/confirm-subscription?token=${token}`
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'StayApp <noreply@stayapp.it>',
      to: email,
      subject: `Conferma la tua iscrizione alla newsletter di ${entityName}`,
      html: confirmationEmailHtml({ nome, entityName, confirmUrl }),
    })
  } catch (err) { console.error('[subscribe] email conferma:', err.message) }
}

function confirmationEmailHtml({ nome, entityName, confirmUrl }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:40px 20px">
<table width="600" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <tr><td style="background:#1a1a2e;padding:28px 36px">
    <div style="font-size:22px;font-weight:700;color:#fff">${entityName}</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:4px">Newsletter</div>
  </td></tr>
  <tr><td style="padding:36px 36px">
    <h2 style="margin:0 0 14px;font-size:20px;color:#1a1a2e">Conferma la tua iscrizione</h2>
    ${nome ? `<p style="font-size:15px;color:#555;margin:0 0 14px">Ciao ${nome},</p>` : ''}
    <p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 28px">Ti sei iscritto/a alla newsletter. Clicca il pulsante qui sotto per confermare e iniziare a ricevere le nostre comunicazioni.</p>
    <a href="${confirmUrl}" style="display:inline-block;padding:14px 32px;background:#1a1a2e;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;font-family:Arial,sans-serif">Conferma iscrizione &rarr;</a>
    <p style="font-size:12px;color:#aaa;margin-top:28px;line-height:1.6">Se non hai effettuato questa richiesta, ignora questa email.</p>
  </td></tr>
  <tr><td style="padding:16px 36px;background:#f9f9fb;border-top:1px solid #f0f0f0;text-align:center">
    <span style="font-size:11px;color:#bbb">Powered by StayApp</span>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

// GET /api/contatti — lista (auth)
router.get('/', requireAuth, async (req, res) => {
  const profile = await getAziendaId(req.user.id)
  if (!profile) return res.status(403).json({ error: 'Profilo non trovato' })

  let q = supabase.from('contatti').select('*').order('created_at', { ascending: false })

  if (profile.role !== 'super_admin') {
    if (!profile.azienda_id) return res.json([])
    q = q.eq('azienda_id', profile.azienda_id)
  } else if (req.query.azienda_id) {
    q = q.eq('azienda_id', req.query.azienda_id)
  }

  if (req.query.tag) q = q.contains('tags', [req.query.tag])
  if (req.query.newsletter === 'true') q = q.eq('iscritto_newsletter', true)
  if (req.query.search) {
    const s = req.query.search
    q = q.or(`nome.ilike.%${s}%,email.ilike.%${s}%,telefono.ilike.%${s}%`)
  }

  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// POST /api/contatti — crea manuale (auth)
router.post('/', requireAuth, async (req, res) => {
  const profile = await getAziendaId(req.user.id)
  const { nome, email, telefono, tags, note, iscritto_newsletter } = req.body
  const azienda_id = req.body.azienda_id || profile?.azienda_id
  if (!azienda_id || !nome?.trim()) return res.status(400).json({ error: 'azienda_id e nome obbligatori' })

  const { data, error } = await supabase.from('contatti').insert({
    azienda_id, nome: nome.trim(),
    email: email?.trim() || null,
    telefono: telefono?.trim() || null,
    tags: tags || [],
    note: note || null,
    iscritto_newsletter: !!iscritto_newsletter,
    fonte: 'manuale',
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// PATCH /api/contatti/:id — aggiorna (auth)
router.patch('/:id', requireAuth, async (req, res) => {
  const allowed = ['nome', 'email', 'telefono', 'tags', 'note', 'iscritto_newsletter']
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from('contatti').update(updates).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/contatti/:id — elimina (auth)
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('contatti').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

export default router
