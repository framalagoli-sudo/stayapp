import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { emailTemplate } from '@/lib/email-template'

const NOTIFY_EMAIL = process.env.DEMO_NOTIFY_EMAIL || 'fra.malagoli@gmail.com'

async function isSuperAdmin(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
  return data?.role === 'super_admin'
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { nome, email, telefono, tipo_attivita, messaggio } = body
    if (!nome?.trim()) return Response.json({ error: 'Nome obbligatorio' }, { status: 400 })
    if (!email?.trim() || !email.includes('@')) return Response.json({ error: 'Email non valida' }, { status: 400 })

    const { error } = await supabaseAdmin.from('demo_requests').insert({
      nome: nome.trim(), email: email.trim(),
      telefono: telefono?.trim() || null,
      tipo_attivita: tipo_attivita?.trim() || null,
      messaggio: messaggio?.trim() || null,
    })
    if (error) return Response.json({ error: error.message }, { status: 500 })

    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM || 'OltreNova <noreply@oltrenova.com>',
          to: NOTIFY_EMAIL,
          replyTo: email.trim(),
          subject: `[OltreNova] Nuova richiesta demo — ${nome.trim()}`,
          html: emailTemplate({
            title: 'Nuova richiesta demo',
            entityName: 'OltreNova',
            rows: [
              { label: 'Nome',      value: nome.trim() },
              { label: 'Email',     value: `<a href="mailto:${email}" style="color:#1A6490">${email}</a>` },
              { label: 'Telefono',  value: telefono?.trim() || '—' },
              { label: 'Attività',  value: tipo_attivita?.trim() || '—' },
              { label: 'Messaggio', value: messaggio?.trim() ? messaggio.replace(/\n/g, '<br>') : '—' },
            ],
            appUrl: process.env.APP_URL || 'https://oltrenova.com',
          }),
        })
      } catch (err) { console.error('[demo email]', err.message) }
    }

    return Response.json({ ok: true }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    if (!await isSuperAdmin(user.id)) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const { data, error } = await supabaseAdmin
      .from('demo_requests').select('*').order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
