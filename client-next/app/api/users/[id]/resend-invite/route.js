import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { Resend } from 'resend'

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
      new Resend((process.env.RESEND_API_KEY ?? '').trim()).emails.send({
        from: (process.env.RESEND_FROM ?? '').trim() || 'OltreNova <noreply@oltrenova.com>',
        to: email, subject: 'Il tuo link per accedere a OltreNova',
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a2e"><img src="https://www.oltrenova.com/logo-onlight.png" alt="OltreNova" width="138" height="43" style="display:block;margin-bottom:24px"><h2 style="margin-top:0">Nuovo link di accesso</h2><p style="color:#666;line-height:1.6">Ciao <strong>${nome}</strong>,<br>il link precedente è scaduto. Usa questo nuovo link per impostare la tua password.</p><div style="margin:28px 0"><a href="${link}" style="display:inline-block;padding:13px 28px;background:#1a1a2e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Imposta password →</a></div><p style="color:#999;font-size:13px">Il link è valido per <strong>24 ore</strong>.</p></div>`,
      }).catch(() => {})
    }
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
