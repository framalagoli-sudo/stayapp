import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-server'

function verifySignature(rawBody, headers) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return true // accetta senza verifica finché il secret non è configurato

  const msgId        = headers.get('svix-id')
  const msgTimestamp = headers.get('svix-timestamp')
  const msgSignature = headers.get('svix-signature')
  if (!msgId || !msgTimestamp || !msgSignature) return false

  // Rifiuta messaggi con timestamp fuori da 5 minuti (replay attack)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(msgTimestamp, 10)) > 300) return false

  const signedContent = `${msgId}.${msgTimestamp}.${rawBody}`
  const secretBytes   = Buffer.from(secret.replace('whsec_', ''), 'base64')
  const computed      = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64')

  return msgSignature.split(' ')
    .map(s => s.split(',')[1])
    .filter(Boolean)
    .some(sig => {
      try {
        return crypto.timingSafeEqual(Buffer.from(sig, 'base64'), Buffer.from(computed, 'base64'))
      } catch { return false }
    })
}

export async function POST(request) {
  try {
    // Legge il body come testo grezzo per la verifica della firma
    const rawBody = await request.text()

    if (!verifySignature(rawBody, request.headers)) {
      return Response.json({ error: 'Firma webhook non valida' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    const { type, data } = payload || {}

    if (type === 'email.bounced' || type === 'email.complained') {
      const emailRaw = Array.isArray(data?.to) ? data.to[0] : (data?.email_address || null)
      if (emailRaw) {
        const email = emailRaw.toLowerCase().trim()
        await supabaseAdmin.from('contatti').update({ email_non_valida: true }).eq('email', email)
        console.log(`[resend-webhook] ${type} → ${email} marcata email_non_valida`)
      }
    }

    return Response.json({ ok: true })
  } catch (e) {
    console.error('[resend-webhook]', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
