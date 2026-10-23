import { createClient } from '@supabase/supabase-js'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'
import { mandaConfermaEmail } from '@/lib/registrazione'

// «Rimandami l'email di conferma», dalla pagina di accesso.
//
// Pubblica di proposito, e chiede la PASSWORD oltre all'email: Supabase dice
// «email non confermata» solo a chi la password ce l'ha giusta (a chi sbaglia
// risponde «credenziali errate», provato il 23/10/2026). Così questa porta non
// rivela quali indirizzi sono registrati — non più di quanto faccia il login —
// e non manda email a una casella qualunque. Risponde sempre allo stesso modo.
export async function POST(request) {
  try {
    const rl = await rateLimit(request, { name: 'conferma-rinvio', limit: 5, windowSec: 3600, ip: getClientIp(request) })
    if (!rl.allowed) return tooManyRequests()
    const { email, password } = await request.json().catch(() => ({}))
    const indirizzo = String(email ?? '').trim().toLowerCase()
    if (!indirizzo || typeof password !== 'string' || !password) return Response.json({ ok: true })

    const anon = createClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(), (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const { error } = await anon.auth.signInWithPassword({ email: indirizzo, password })
    // Solo l'account che esiste, con la password giusta, e non ancora confermato.
    if (error?.code === 'email_not_confirmed') await mandaConfermaEmail(indirizzo)
    return Response.json({ ok: true })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
