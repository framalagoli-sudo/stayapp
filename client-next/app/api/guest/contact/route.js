import { supabaseAdmin } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { emailTemplate } from '@/lib/email-template'
import { triggerAutomazione } from '@/lib/guest-utils'

export async function POST(request) {
  try {
    const body = await request.json()
    const { entity_tipo, entity_id, name, email, message, source, source_name } = body
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
          fonte: 'minisito', tags: ['lead', entity_tipo], note: message.trim(), iscritto_newsletter: false,
        })
        isNewContact = true
      }
    }

    if (isNewContact && azienda_id) {
      triggerAutomazione('nuovo_contatto', { azienda_id, entity_tipo, entity_id }, { nome: name.trim(), email: email.trim() }).catch(() => {})
    }

    if (entityEmail && process.env.RESEND_API_KEY) {
      new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.RESEND_FROM || 'OltreNova <noreply@oltrenova.com>',
        to: entityEmail, replyTo: email,
        subject: `[${entityName}] Nuovo messaggio dal sito`,
        html: emailTemplate({
          title: 'Nuovo messaggio dal sito', entityName,
          rows: [{ label: 'Nome', value: name }, { label: 'Email', value: `<a href="mailto:${email}" style="color:#00b5b5">${email}</a>` }, { label: 'Messaggio', value: message.replace(/\n/g, '<br>') }],
          appUrl: process.env.CLIENT_URL || 'https://oltrenova.com',
        }),
      }).catch(() => {})
    }
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
