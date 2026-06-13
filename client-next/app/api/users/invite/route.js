import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { Resend } from 'resend'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: caller } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!['super_admin', 'admin_azienda'].includes(caller?.role)) return Response.json({ error: 'Accesso non autorizzato' }, { status: 403 })

    const body = await request.json()
    const { email, full_name, permissions = {} } = body
    if (!email?.trim()) return Response.json({ error: 'Email obbligatoria' }, { status: 400 })
    const azienda_id = caller.role === 'super_admin' ? body.azienda_id : caller.azienda_id
    if (!azienda_id) return Response.json({ error: 'azienda_id obbligatorio' }, { status: 400 })

    const clientUrl = process.env.CLIENT_URL || 'https://oltrenova.com'
    const { data, error: inviteErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite', email: email.trim(),
      options: { redirectTo: `${clientUrl}/admin/reset-password` },
    })
    if (inviteErr) return Response.json({ error: inviteErr.message }, { status: 400 })
    const actionLink = data?.properties?.action_link
    if (!actionLink) return Response.json({ error: 'Impossibile generare il link di invito' }, { status: 500 })

    const actionUrl = new URL(actionLink)
    const tokenHash = actionUrl.searchParams.get('token')
    const tokenType = actionUrl.searchParams.get('type') || 'invite'
    const inviteLink = `${clientUrl}/admin/accept-invite?token_hash=${tokenHash}&type=${tokenType}`

    await new Promise(r => setTimeout(r, 400))
    await supabaseAdmin.from('profiles').upsert({ id: data.user.id, role: 'staff', azienda_id, full_name: full_name?.trim() || '', permissions }, { onConflict: 'id' })

    if (process.env.RESEND_API_KEY) {
      const nome = full_name?.trim() || email.trim()
      new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.RESEND_FROM || 'OltreNova <noreply@oltrenova.com>',
        to: email.trim(), subject: 'Sei stato invitato su OltreNova',
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a2e"><h2 style="margin-top:0">Benvenuto su OltreNova</h2><p style="color:#666;line-height:1.6">Ciao <strong>${nome}</strong>,<br>sei stato invitato a collaborare sul pannello OltreNova.</p><div style="margin:28px 0"><a href="${inviteLink}" style="display:inline-block;padding:13px 28px;background:#1a1a2e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Accetta invito →</a></div><p style="color:#999;font-size:13px">Il link è valido per <strong>24 ore</strong>.</p></div>`,
      }).catch(() => {})
    }
    return Response.json({ id: data.user.id, email: data.user.email, role: 'staff', full_name: full_name?.trim() || '', azienda_id, permissions, invited: true }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
