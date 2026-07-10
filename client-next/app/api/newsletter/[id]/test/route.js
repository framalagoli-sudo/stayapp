import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { buildNewsletterHtml, personalize } from '@/lib/newsletter-html'
import { sendEmail } from '@/lib/send-email'

async function getEntity(entity_tipo, entity_id) {
  if (!entity_tipo || !entity_id) return null
  const table = entity_tipo === 'struttura' ? 'properties' : entity_tipo === 'ristorante' ? 'ristoranti' : 'attivita'
  const { data } = await supabaseAdmin.from(table).select('id, name, logo_url, theme').eq('id', entity_id).single()
  return data
}

export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response

    const { test_email } = await request.json()
    if (!test_email) return Response.json({ error: 'test_email obbligatoria' }, { status: 400 })

    const { data: nl, error } = await supabaseAdmin.from('newsletters').select('*').eq('id', params.id).single()
    if (error || !nl) return Response.json({ error: 'Non trovata' }, { status: 404 })

    const entity = await getEntity(nl.entity_tipo, nl.entity_id)
    const appUrl = (process.env.APP_URL ?? '').trim() || 'https://oltrenova.com'
    const html = buildNewsletterHtml({
      entityName: entity?.name || 'OltreNova', entityLogo: entity?.logo_url || null,
      primary: entity?.theme?.primaryColor || '#1a1a2e',
      template_id: nl.template_id,
      content: personalize(nl.content, 'Mario'),
      preheader: nl.preheader || '',
      unsubscribeUrl: `${appUrl}/unsubscribe?token=TEST`,
    })

    if (!process.env.RESEND_API_KEY) return Response.json({ error: 'RESEND_API_KEY non configurata' }, { status: 500 })
    await sendEmail({
      _ctx: 'newsletter-test',
      from: (process.env.RESEND_FROM ?? '').trim() || 'OltreNova <noreply@oltrenova.com>',
      to: test_email,
      subject: `[TEST] ${personalize(nl.subject, 'Mario') || '(senza oggetto)'}`,
      html,
    })
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
