import { supabaseAdmin } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { emailTemplate } from '@/lib/email-template'

export async function POST(request) {
  try {
    const body = await request.json()
    const { entity_tipo, entity_id, item_type, item_name, name, email, phone, persons, notes } = body
    if (!name?.trim() || !email?.trim()) return Response.json({ error: 'Nome e email obbligatori' }, { status: 400 })

    let propertyId = null, entityEmail = null, entityName = null
    if (entity_tipo === 'struttura' && entity_id) {
      const { data } = await supabaseAdmin.from('properties').select('id, name, email').eq('id', entity_id).single()
      if (data) { propertyId = data.id; entityEmail = data.email; entityName = data.name }
    } else if (entity_tipo === 'ristorante' && entity_id) {
      const { data } = await supabaseAdmin.from('ristoranti').select('id, name, email').eq('id', entity_id).single()
      if (data) { entityEmail = data.email; entityName = data.name }
    }

    const typeLabel = item_type === 'excursion' ? 'escursione' : 'attività'
    const msgLines = [
      `[Prenotazione ${typeLabel}] ${item_name || ''}`,
      `Nome: ${name}`, `Email: ${email}`,
      phone ? `Telefono: ${phone}` : null,
      persons ? `Persone: ${persons}` : null,
      notes ? `Note: ${notes}` : null,
    ].filter(Boolean).join('\n')

    if (propertyId) await supabaseAdmin.from('requests').insert({ property_id: propertyId, type: 'other', message: msgLines })

    if (entityEmail && process.env.RESEND_API_KEY) {
      new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.RESEND_FROM || 'OltreNova <noreply@oltrenova.com>',
        to: entityEmail, replyTo: email,
        subject: `[${entityName}] Nuova prenotazione ${typeLabel}: ${item_name || ''}`,
        html: emailTemplate({
          title: `Nuova prenotazione ${typeLabel}`, entityName,
          rows: [
            { label: 'Nome', value: name }, { label: 'Email', value: `<a href="mailto:${email}" style="color:#00b5b5">${email}</a>` },
            ...(phone ? [{ label: 'Telefono', value: phone }] : []),
            ...(persons ? [{ label: 'Persone', value: String(persons) }] : []),
            { label: typeLabel === 'escursione' ? 'Escursione' : 'Attività', value: item_name || '' },
            ...(notes ? [{ label: 'Note', value: notes.replace(/\n/g, '<br>') }] : []),
          ],
          appUrl: process.env.CLIENT_URL || 'https://oltrenova.com',
        }),
      }).catch(() => {})
    }
    return Response.json({ ok: true }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
