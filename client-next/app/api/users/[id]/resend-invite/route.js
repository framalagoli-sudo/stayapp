import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { sendEmail } from '@/lib/send-email'
import { platformEmailTemplate } from '@/lib/email-template'

export async function POST(request, { params }) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: caller } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!['super_admin', 'admin_azienda'].includes(caller?.role)) return Response.json({ error: 'Accesso non autorizzato' }, { status: 403 })

    const { data: authUser, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(params.id)
    if (fetchErr || !authUser?.user) return Response.json({ error: 'Utente non trovato' }, { status: 404 })

    const email = authUser.user.email
    const clientUrl = (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'
    const { data, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: `${clientUrl}/admin/reset-password` } })
    if (linkErr) return Response.json({ error: linkErr.message }, { status: 400 })
    const actionLink = data?.properties?.action_link
    if (!actionLink) return Response.json({ error: 'Impossibile generare il link' }, { status: 500 })

    const actionUrl = new URL(actionLink)
    const tokenHash = actionUrl.searchParams.get('token')
    const tokenType = actionUrl.searchParams.get('type') || 'recovery'
    const link = `${clientUrl}/admin/accept-invite?token_hash=${tokenHash}&type=${tokenType}`

    if (process.env.RESEND_API_KEY) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', params.id).single()
      const nome = profile?.full_name || email
      sendEmail({ _ctx: 'reinvito-staff',
        to: email, subject: 'Il tuo link per accedere a OltreNova',
        html: platformEmailTemplate({
          title: 'Nuovo link di accesso',
          intro: `Ciao <strong>${nome}</strong>, il link precedente è scaduto. Usa questo nuovo link per impostare la tua password.`,
          ctaText: 'Imposta password →', ctaUrl: link,
          footerNote: 'Il link è valido per <strong>24 ore</strong>.',
        }),
      }).catch(() => {})
    }
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
