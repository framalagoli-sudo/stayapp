import { Router } from 'express'
import crypto from 'crypto'
import { supabase } from '../lib/supabase.js'

const router = Router()

// Verifica firma Svix (formato usato da Resend)
// RESEND_WEBHOOK_SECRET inizia con "whsec_"
function verifySignature(rawBody, headers) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return true // setup mode: accetta senza verifica fino a che il secret è configurato

  const msgId        = headers['svix-id']
  const msgTimestamp = headers['svix-timestamp']
  const msgSignature = headers['svix-signature']
  if (!msgId || !msgTimestamp || !msgSignature) return false

  // Reject messaggi con timestamp fuori da una finestra di 5 minuti (replay attack)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(msgTimestamp, 10)) > 300) return false

  const signedContent = `${msgId}.${msgTimestamp}.${rawBody}`
  const secretBytes   = Buffer.from(secret.replace('whsec_', ''), 'base64')
  const computed      = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64')

  // svix-signature può contenere più firme: "v1,sig1 v1,sig2"
  return msgSignature.split(' ')
    .map(s => s.split(',')[1])
    .filter(Boolean)
    .some(sig => {
      try {
        return crypto.timingSafeEqual(Buffer.from(sig, 'base64'), Buffer.from(computed, 'base64'))
      } catch { return false }
    })
}

// POST /api/resend-webhook
// Resend invia qui eventi email.bounced e email.complained
router.post('/', async (req, res) => {
  try {
    const rawBody = req.body instanceof Buffer
      ? req.body.toString('utf-8')
      : JSON.stringify(req.body)

    if (!verifySignature(rawBody, req.headers)) {
      return res.status(401).json({ error: 'Firma webhook non valida' })
    }

    const payload = typeof req.body === 'object' && !(req.body instanceof Buffer)
      ? req.body
      : JSON.parse(rawBody)

    const { type, data } = payload || {}

    if (type === 'email.bounced' || type === 'email.complained') {
      // Resend invia l'email destinataria in data.to (array) o data.email_address
      const emailRaw = Array.isArray(data?.to) ? data.to[0] : (data?.email_address || null)
      if (emailRaw) {
        const email = emailRaw.toLowerCase().trim()
        await supabase.from('contatti')
          .update({ email_non_valida: true })
          .eq('email', email)
        console.log(`[resend-webhook] ${type} → ${email} marcata email_non_valida`)
      }
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('[resend-webhook]', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
