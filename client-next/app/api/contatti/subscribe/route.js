import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/send-email'
import { guestEmailTemplate } from '@/lib/email-template'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'

async function sendConfirmationEmail({ email, nome, entityName, token }) {
  if (!email || !process.env.RESEND_API_KEY) return
  const appUrl = (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'
  const confirmUrl = `${appUrl}/api/guest/confirm-subscription?token=${token}`
  sendEmail({
    _ctx: 'newsletter-subscribe', fromName: entityName,
    to: email,
    subject: `Conferma la tua iscrizione alla newsletter di ${entityName}`,
    html: guestEmailTemplate({
      entityName, title: 'Conferma la tua iscrizione',
      intro: `${nome ? `Ciao ${nome}, ` : ''}clicca il pulsante per confermare e iniziare a ricevere le nostre comunicazioni.`,
      bodyHtml: `<div style="margin:24px 0"><a href="${confirmUrl}" style="display:inline-block;padding:14px 32px;background:#1a1a2e;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Conferma iscrizione &rarr;</a></div>`,
    }),
  }).catch(() => {})
}

export async function POST(request) {
  try {
    const ip = getClientIp(request)
    // Anti-spam: max 3 iscrizioni per IP all'ora.
    const rl = await rateLimit(request, { name: 'subscribe', limit: 3, windowSec: 3600, ip })
    if (!rl.allowed) return tooManyRequests()

    const { azienda_id, nome, email, telefono, fonte = 'minisito', turnstileToken } = await request.json()
    if (!azienda_id) return Response.json({ error: 'azienda_id obbligatorio' }, { status: 400 })
    if (!email?.trim() && !telefono?.trim()) return Response.json({ error: 'Email o telefono obbligatori' }, { status: 400 })

    const captcha = await verifyTurnstile(turnstileToken, ip)
    if (!captcha.success) return Response.json({ error: 'Verifica anti-bot fallita' }, { status: 403 })

    const { data: az } = await supabaseAdmin.from('aziende').select('ragione_sociale').eq('id', azienda_id).single()
    const entityName = az?.ragione_sociale || 'Newsletter'

    if (email) {
      const { data: existing } = await supabaseAdmin.from('contatti')
        .select('id, iscritto_newsletter').eq('azienda_id', azienda_id).eq('email', email.trim()).single()
      if (existing) {
        if (existing.iscritto_newsletter) return Response.json({ ok: true, duplicate: true })
        const token = randomUUID()
        await supabaseAdmin.from('contatti').update({ confirmation_token: token, nome: nome?.trim() || undefined, updated_at: new Date().toISOString() }).eq('id', existing.id)
        await sendConfirmationEmail({ email: email.trim(), nome: nome?.trim(), entityName, token })
        return Response.json({ ok: true, pending_confirmation: true })
      }
    }

    const token = randomUUID()
    const { error } = await supabaseAdmin.from('contatti').insert({
      azienda_id, nome: nome?.trim() || email?.trim() || '',
      email: email?.trim() || null, telefono: telefono?.trim() || null,
      fonte, iscritto_newsletter: false, confirmation_token: token, tags: ['newsletter'],
    })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    await sendConfirmationEmail({ email: email?.trim(), nome: nome?.trim(), entityName, token })
    return Response.json({ ok: true, pending_confirmation: true }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
