import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { sendEmail } from '@/lib/send-email'
import { platformEmailTemplate } from '@/lib/email-template'

export async function POST(request, props) {
  const params = await props.params;
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: caller } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', user.id).single()
    if (!['super_admin', 'admin_azienda'].includes(caller?.role)) return Response.json({ error: 'Accesso non autorizzato' }, { status: 403 })

    // Un titolare rimanda l'invito solo a chi è della SUA azienda. Senza questo
    // controllo poteva far partire un'email «imposta la password» verso
    // l'account di chiunque sulla piattaforma (trovato il 16/10/2026 con
    // probe-enumerazione). Chi è di un'altra azienda riceve la stessa risposta
    // di un utente che non esiste: da fuori non si capisce chi c'è.
    if (caller.role !== 'super_admin') {
      const { data: target } = await supabaseAdmin.from('profiles').select('azienda_id, role').eq('id', params.id).maybeSingle()
      if (!target || !caller.azienda_id || target.azienda_id !== caller.azienda_id || target.role === 'super_admin') {
        return Response.json({ error: 'Utente non trovato' }, { status: 404 })
      }
    }

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
