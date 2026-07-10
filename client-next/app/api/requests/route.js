import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { sendWebhooks } from '@/lib/send-webhooks'
import { emailTemplate } from '@/lib/email-template'
import { sendEmail } from '@/lib/send-email'

export async function POST(request) {
  try {
    const { property_id, room, type, message } = await request.json()
    if (!property_id || !type || !message) return Response.json({ error: 'property_id, type e message sono obbligatori' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('requests')
      .insert({ property_id, room: room || null, type, message, status: 'open' }).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })

    supabaseAdmin.from('properties').select('name, email, azienda_id').eq('id', property_id).single().then(({ data: prop }) => {
      if (prop?.azienda_id) sendWebhooks(prop.azienda_id, 'nuova_richiesta', { richiesta_id: data.id, property_id, tipo: type, messaggio: message })
      if (!prop?.email || !process.env.RESEND_API_KEY) return
      sendEmail({
        _ctx: 'richiesta',
        from: (process.env.RESEND_FROM ?? '').trim() || 'OltreNova <noreply@oltrenova.com>',
        to: prop.email,
        subject: `[${prop.name}] Nuova richiesta: ${type}`,
        html: emailTemplate({
          title: 'Nuova richiesta ospite', entityName: prop.name,
          rows: [{ label: 'Tipo', value: type }, ...(room ? [{ label: 'Camera', value: room }] : []), { label: 'Messaggio', value: message.replace(/\n/g, '<br>') }],
          appUrl: (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com',
        }),
      }).catch(() => {})
    }).catch(() => {})

    return Response.json(data, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { searchParams } = new URL(request.url)
    const { data: profile } = await supabaseAdmin.from('profiles').select('role, azienda_id, property_id').eq('id', user.id).single()
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    let query = supabaseAdmin.from('requests').select('*, properties(name)').order('created_at', { ascending: false })

    if (['admin_struttura', 'staff'].includes(profile.role)) {
      if (!profile.property_id) return Response.json([])
      query = query.eq('property_id', profile.property_id)
    } else if (profile.role === 'admin_azienda') {
      if (!profile.azienda_id) return Response.json([])
      const { data: props } = await supabaseAdmin.from('properties').select('id').eq('azienda_id', profile.azienda_id)
      const ids = props?.map(p => p.id) || []
      if (!ids.length) return Response.json([])
      query = query.in('property_id', ids)
    } else if (profile.role === 'super_admin' && searchParams.get('azienda_id')) {
      const { data: props } = await supabaseAdmin.from('properties').select('id').eq('azienda_id', searchParams.get('azienda_id'))
      const ids = props?.map(p => p.id) || []
      if (!ids.length) return Response.json([])
      query = query.in('property_id', ids)
    }

    if (searchParams.get('property_id')) query = query.eq('property_id', searchParams.get('property_id'))
    if (searchParams.get('status')) query = query.eq('status', searchParams.get('status'))
    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
