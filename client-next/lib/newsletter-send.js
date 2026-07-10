import { supabaseAdmin } from './supabase-server.js'
import { buildNewsletterHtml, personalize } from './newsletter-html.js'
import { getAziendaLegale } from './guest-data.js'

async function getEntity(entity_tipo, entity_id) {
  if (!entity_tipo || !entity_id) return null
  const table = entity_tipo === 'struttura' ? 'properties' : entity_tipo === 'ristorante' ? 'ristoranti' : 'attivita'
  const { data } = await supabaseAdmin.from(table).select('id, name, logo_url, theme, slug').eq('id', entity_id).single()
  return data
}

export async function sendNewsletterById(id) {
  const { data: nl, error } = await supabaseAdmin.from('newsletters').select('*').eq('id', id).single()
  if (error || !nl) throw new Error('Newsletter non trovata')
  if (nl.status === 'sent') throw new Error('Newsletter già inviata')
  if (!nl.subject?.trim()) throw new Error('Oggetto obbligatorio prima di inviare')

  let contactsQuery = supabaseAdmin.from('contatti')
    .select('email, nome, unsubscribe_token')
    .eq('azienda_id', nl.azienda_id)
    .eq('iscritto_newsletter', true)
    .not('email', 'is', null)
    .not('email_non_valida', 'is', true)

  if (nl.tag_filter?.length) {
    contactsQuery = contactsQuery.overlaps('tags', nl.tag_filter)
  }

  const { data: contacts } = await contactsQuery
  if (!contacts?.length) throw new Error('Nessun iscritto trovato')

  const entity = await getEntity(nl.entity_tipo, nl.entity_id)
  const entityName = entity?.name || 'OltreNova'
  const entityLogo = entity?.logo_url || null
  const primary    = entity?.theme?.primaryColor || '#1a1a2e'
  const appUrl     = (process.env.APP_URL ?? '').trim() || 'https://oltrenova.com'
  const legale     = await getAziendaLegale(nl.azienda_id)
  const NL_PREFIX  = { struttura: 's', ristorante: 'r', attivita: 'a' }
  const privacyUrl = (entity?.slug && NL_PREFIX[nl.entity_tipo]) ? `${appUrl}/${NL_PREFIX[nl.entity_tipo]}/${entity.slug}/privacy` : null

  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY non configurata')

  const { data: marked } = await supabaseAdmin.from('newsletters')
    .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', nl.id).eq('status', nl.status === 'draft' ? 'draft' : 'scheduled')
    .select('id').single()
  if (!marked) throw new Error('Newsletter già inviata da un altro processo')

  let sent = 0
  const { Resend } = await import('resend')
  const resend = new Resend((process.env.RESEND_API_KEY ?? '').trim())
  // Mittente white-label: nome del business + indirizzo del dominio verificato.
  const fromAddr = ((process.env.RESEND_FROM ?? '').trim().match(/<([^>]+)>/)?.[1]) || (process.env.RESEND_FROM ?? '').trim() || 'noreply@oltrenova.com'
  const fromLine = `${(entityName || 'OltreNova').replace(/["<>\r\n]/g, '').trim()} <${fromAddr}>`

  for (let i = 0; i < contacts.length; i += 50) {
    const batch = contacts.slice(i, i + 50)
    const emails = batch.map(c => {
      const pContent = personalize(nl.content, c.nome)
      const pSubject = personalize(nl.subject, c.nome)
      return {
        from: fromLine,
        to: c.email,
        subject: pSubject,
        html: buildNewsletterHtml({
          entityName, entityLogo, primary,
          template_id: nl.template_id,
          content: pContent,
          preheader: nl.preheader || '',
          unsubscribeUrl: `${appUrl}/unsubscribe?token=${c.unsubscribe_token || 'na'}&nl=${nl.id}`,
          legale, privacyUrl,
        }),
      }
    })
    const { error: batchErr } = await resend.batch.send(emails)
    if (batchErr) console.error(`[email:newsletter] batch FALLITA (${batch.length} dest) →`, batchErr)
    sent += batch.length
  }

  await supabaseAdmin.from('newsletters').update({ recipients_count: sent, updated_at: new Date().toISOString() }).eq('id', nl.id)
  return sent
}

export async function runScheduledSends() {
  const { data: due } = await supabaseAdmin.from('newsletters')
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
