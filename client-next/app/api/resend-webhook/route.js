import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-server'
import { registraEvento, eventoStatistica } from '@/lib/newsletter-statistiche'
import { INDIRIZZO_POZZO_SENTINELLA } from '@/lib/sentinella-regole'

function verifySignature(rawBody, headers) {
  const secret = (process.env.RESEND_WEBHOOK_SECRET ?? '').trim()
  if (!secret) return false

  const msgId        = headers.get('svix-id')
  const msgTimestamp = headers.get('svix-timestamp')
  const msgSignature = headers.get('svix-signature')
  if (!msgId || !msgTimestamp || !msgSignature) return false

  // Rifiuta messaggi con timestamp fuori da 5 minuti (replay attack)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(msgTimestamp, 10)) > 300) return false

  const signedContent = `${msgId}.${msgTimestamp}.${rawBody}`
  const secretBytes   = Buffer.from(secret.replace('whsec_', ''), 'base64')
  const computed      = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64')

  return msgSignature.split(' ')
    .map(s => s.split(',')[1])
    .filter(Boolean)
    .some(sig => {
      try {
        return crypto.timingSafeEqual(Buffer.from(sig, 'base64'), Buffer.from(computed, 'base64'))
      } catch { return false }
    })
}

export async function POST(request) {
  try {
    // Legge il body come testo grezzo per la verifica della firma
    const rawBody = await request.text()

    if (!verifySignature(rawBody, request.headers)) {
      return Response.json({ error: 'Firma webhook non valida' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    const { type, data } = payload || {}

    if (type === 'email.bounced' || type === 'email.complained') {
      const emailRaw = Array.isArray(data?.to) ? data.to[0] : (data?.email_address || null)
      if (emailRaw) {
        const email = emailRaw.toLowerCase().trim()
        await supabaseAdmin.from('contatti').update({ email_non_valida: true }).eq('email', email)
        console.log(`[resend-webhook] ${type} → ${email} marcata email_non_valida`)
      }
    }

    // La consegna della prova quotidiana della sentinella (`lib/sentinella.js`):
    // lascia un battito, così se le conferme smettono di arrivare lo dice
    // l'allarme dei processi fermi. Soglia 30 ore: la prova parte una volta al
    // giorno. La riga nasce alla prima consegna, quindi finché il webhook non è
    // iscritto a email.delivered non c'è niente da sorvegliare (e nessun allarme).
    if (type === 'email.delivered' && (Array.isArray(data?.to) ? data.to : []).includes(INDIRIZZO_POZZO_SENTINELLA)) {
      const { data: b } = await supabaseAdmin.from('cron_battiti').select('esecuzioni').eq('nome', 'consegna-posta').maybeSingle()
      await supabaseAdmin.from('cron_battiti').upsert({
        nome: 'consegna-posta', ultimo_ok: new Date().toISOString(), soglia_minuti: 1800,
        esecuzioni: (b?.esecuzioni || 0) + 1, ultimo_esito: 'ok',
      }, { onConflict: 'nome' })
    }

    // Le statistiche delle newsletter (consegnata, aperta, cliccata…). Un errore
    // qui non deve far ripetere a Resend l'evento: i rimbalzi sono già segnati.
    if (eventoStatistica(type)) {
      try { await registraEvento(type, data) } catch (e) { console.error('[resend-webhook] statistiche', e.message) }
    }

    return Response.json({ ok: true })
  } catch (e) {
    console.error('[resend-webhook]', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
