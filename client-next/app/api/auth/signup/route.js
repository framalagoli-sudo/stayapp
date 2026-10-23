import { supabaseAdmin } from '@/lib/supabase-server'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import { fusoSicuro } from '@/lib/fuso'
import { mandaConfermaEmail } from '@/lib/registrazione'

// La versione dei Termini in vigore, per data. Cambiando il testo si cambia
// anche questa: e' il modo per sapere cosa ha accettato chi, e quando.
const VERSIONE_TERMINI = '2026-08-31'

// La stessa risposta per «nuovo», «già registrato» e «robot nella trappola»:
// chi prova un indirizzo non deve poter sapere se ha già un account.
const INVIATA = () => Response.json({ ok: true, conferma: true }, { status: 201 })

// Pubblica di proposito: è la porta d'ingresso. Qui nasce SOLO l'account, non
// confermato; l'azienda nasce alla conferma dell'email (lib/registrazione.js).
export async function POST(request) {
  try {
    // Ogni registrazione spedisce un'email all'indirizzo indicato: senza limite
    // si bombarda una casella altrui (i suffissi `+etichetta` valgono come
    // indirizzi diversi ma arrivano tutti nella stessa). Un tetto per indirizzo
    // IP e uno per tutta la piattaforma, contro chi ne usa tanti.
    const ip = getClientIp(request)
    const rl = await rateLimit(request, { name: 'signup', limit: 3, windowSec: 3600, ip })
    if (!rl.allowed) return tooManyRequests()
    const tutti = await rateLimit(request, { name: 'signup-piattaforma', limit: 50, windowSec: 86400, ip: 'tutti' })
    if (!tutti.allowed) return tooManyRequests()

    const { data: cfg } = await supabaseAdmin.from('platform_config').select('signup_enabled').eq('id', 1).single()
    if (!cfg?.signup_enabled) return Response.json({ error: 'Le registrazioni sono temporaneamente chiuse.' }, { status: 403 })

    const { nome_azienda, email, password, accetta_termini, fuso_orario, turnstileToken, sito_web } = await request.json()
    // Campo trappola: invisibile a una persona, un robot lo riempie.
    if (sito_web) return INVIATA()
    const captcha = await verifyTurnstile(turnstileToken, ip)
    if (!captcha.success) return Response.json({ error: 'Verifica anti-bot fallita' }, { status: 403 })

    // ⛔ Il controllo sta QUI, non nel modulo: una spunta nel browser si toglie
    // con due clic, e un contratto non accettato non vale.
    if (accetta_termini !== true)
      return Response.json({ error: "Per registrarti devi accettare i Termini di servizio." }, { status: 400 })
    const nome = String(nome_azienda ?? '').trim().slice(0, 120)
    const indirizzo = String(email ?? '').trim().toLowerCase()
    if (!nome) return Response.json({ error: 'Nome azienda obbligatorio' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(indirizzo)) return Response.json({ error: 'Email non valida' }, { status: 400 })
    if (typeof password !== 'string' || password.length < 8) return Response.json({ error: 'Password minimo 8 caratteri' }, { status: 400 })

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: indirizzo, password, email_confirm: false,
      // In attesa della conferma. Solo il server scrive `app_metadata`.
      app_metadata: { registrazione: {
        nome_azienda: nome,
        // Il fuso dell'attività, preso dal browser: è l'unico momento in cui
        // lo sappiamo senza chiederlo. Una stringa inventata torna al predefinito.
        fuso_orario: fusoSicuro(fuso_orario),
        // La **prova** del consenso: quando, e quale versione.
        termini_accettati_il: new Date().toISOString(),
        termini_versione: VERSIONE_TERMINI,
      } },
    })
    if (authError) {
      const msg = authError.message?.toLowerCase() || ''
      if (msg.includes('already registered') || msg.includes('already exists')) return INVIATA()
      return Response.json({ error: authError.message }, { status: 400 })
    }

    const invio = await mandaConfermaEmail(indirizzo)
    if (!invio.ok) {
      // Senza l'email l'account non si potrebbe mai confermare: meglio non lasciarlo.
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return Response.json({ error: "Non riusciamo a mandarti l'email di conferma. Riprova fra qualche minuto." }, { status: 502 })
    }
    return INVIATA()
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
