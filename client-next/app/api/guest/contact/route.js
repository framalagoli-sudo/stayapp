import { supabaseAdmin } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/send-email'
import { emailTemplate } from '@/lib/email-template'
import { triggerAutomazione } from '@/lib/guest-utils'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'

export async function POST(request) {
  try {
    const ip = getClientIp(request)
    // Anti-spam: max 5 invii del form contatto per IP all'ora.
    const rl = await rateLimit(request, { name: 'guest-contact', limit: 5, windowSec: 3600, ip })
    if (!rl.allowed) return tooManyRequests()

    const body = await request.json()
    const { entity_tipo, entity_id, source, source_name } = body

    const captcha = await verifyTurnstile(body.turnstileToken, ip)
    if (!captcha.success) return Response.json({ error: 'Verifica anti-bot fallita' }, { status: 403 })
    // Accetta sia i nomi EN (name/message) sia IT (nome/messaggio): diversi form
    // del frontend usano convenzioni diverse — non perdere lead per questo.
    const name = body.name ?? body.nome ?? ''
    const email = body.email ?? ''
    const message = body.message ?? body.messaggio ?? ''
    if (!name?.trim() || !email?.trim() || !message?.trim())
      return Response.json({ error: 'Nome, email e messaggio sono obbligatori' }, { status: 400 })

    let entityEmail = null, entityName = null, azienda_id = null
    const tableMap = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }
    if (entity_tipo && entity_id && tableMap[entity_tipo]) {
      const { data } = await supabaseAdmin.from(tableMap[entity_tipo]).select('name, email, azienda_id').eq('id', entity_id).single()
      if (data) { entityEmail = data.email; entityName = data.name; azienda_id = data.azienda_id }
    }

    if (source === 'offerta' && entity_tipo === 'struttura' && entity_id) {
      const msgLines = [`[Interesse offerta: ${source_name || ''}]`, `Nome: ${name.trim()}`, `Email: ${email.trim()}`,
        message.trim() ? `Messaggio: ${message.trim()}` : null].filter(Boolean).join('\n')
      await supabaseAdmin.from('requests').insert({ property_id: entity_id, type: 'other', message: msgLines, status: 'open' })
    }

    let isNewContact = false
    if (azienda_id && email) {
      const { data: existing } = await supabaseAdmin.from('contatti')
        .select('id, note').eq('azienda_id', azienda_id).eq('email', email.trim()).single()
      if (existing) {
        const notes = [existing.note, `[${new Date().toLocaleDateString('it-IT')}] ${message.trim()}`].filter(Boolean).join('\n\n')
        await supabaseAdmin.from('contatti').update({ nome: name.trim(), note: notes, updated_at: new Date().toISOString() }).eq('id', existing.id)
      } else {
        await supabaseAdmin.from('contatti').insert({
          azienda_id, nome: name.trim(), email: email.trim(),
          fonte: 'minisito', tags: ['lead', entity_tipo, ...(source && source !== 'minisito' ? [source] : [])], note: message.trim(), iscritto_newsletter: false,
        })
        isNewContact = true
      }
    }

    if (isNewContact && azienda_id) {
      triggerAutomazione('nuovo_contatto', { azienda_id, entity_tipo, entity_id }, { nome: name.trim(), email: email.trim() }).catch(() => {})
    }

    if (entityEmail && process.env.RESEND_API_KEY) {
      sendEmail({
        _ctx: 'contatto',
        from: (process.env.RESEND_FROM ?? '').trim() || 'OltreNova <noreply@oltrenova.com>',
        to: entityEmail, replyTo: email,
        subject: `[${entityName}] Nuovo messaggio dal sito`,
        html: emailTemplate({
          title: 'Nuovo messaggio dal sito', entityName,
          rows: [{ label: 'Nome', value: name }, { label: 'Email', value: `<a href="mailto:${email}" style="color:#00b5b5">${email}</a>` }, { label: 'Messaggio', value: message.replace(/\n/g, '<br>') }],
          appUrl: (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com',
        }),
      }).catch(() => {})
    }
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
