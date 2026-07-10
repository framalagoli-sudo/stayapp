import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/server-auth'
import { sendEmail } from '@/lib/send-email'

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const { data: profile } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).single()
    const azienda_id = profile?.azienda_id
    if (!azienda_id) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

    const { email, nome } = await request.json()
    if (!email?.trim()) return Response.json({ error: 'Email obbligatoria' }, { status: 400 })

    const { data: az } = await supabaseAdmin.from('aziende').select('ragione_sociale').eq('id', azienda_id).single()

    const { data: survey, error } = await supabaseAdmin.from('survey_risposte')
      .insert({ azienda_id, nome_cliente: nome || '', email_cliente: email.trim() })
      .select().single()
    if (error) throw error

    const link = `${(process.env.CLIENT_URL ?? "").trim()}/survey?token=${survey.token}`
    const nomeDisplay = nome?.trim() || 'Cliente'
    const business = az?.ragione_sociale || 'il nostro team'

    if (process.env.RESEND_API_KEY) {
      await sendEmail({
        _ctx: 'survey', fromName: business,
        from: (process.env.RESEND_FROM ?? '').trim(),
        to: email.trim(),
        subject: `Come valuteresti la tua esperienza con ${business}?`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a2e;">
            <h2 style="margin:0 0 16px;font-size:22px;">Ciao ${nomeDisplay}!</h2>
            <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Quanto saresti propenso a raccomandare <strong>${business}</strong> a un amico o collega?
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${link}" style="background:#1a1a2e;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
                Lascia il tuo feedback →
              </a>
            </div>
            <p style="color:#aaa;font-size:12px;text-align:center;">Ci vogliono meno di 30 secondi.</p>
          </div>`,
      })
    }
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
