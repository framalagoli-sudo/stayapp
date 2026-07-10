import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { sendEmail } from '@/lib/send-email'
import { platformEmailTemplate } from '@/lib/email-template'

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

    const clientUrl = (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'
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
      sendEmail({ _ctx: 'invito-staff',
        to: email.trim(), subject: 'Sei stato invitato su OltreNova',
        html: platformEmailTemplate({
          title: 'Benvenuto su OltreNova',
          intro: `Ciao <strong>${nome}</strong>, sei stato invitato a collaborare sul pannello OltreNova.`,
          ctaText: 'Accetta invito →', ctaUrl: inviteLink,
          footerNote: 'Il link è valido per <strong>24 ore</strong>.',
        }),
      }).catch(() => {})
    }
    return Response.json({ id: data.user.id, email: data.user.email, role: 'staff', full_name: full_name?.trim() || '', azienda_id, permissions, invited: true }, { status: 201 })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
