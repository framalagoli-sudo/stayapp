// Il webhook dei rimbalzi funziona davvero? Prova end-to-end.
//
// Iscrive `bounced@resend.dev` alla newsletter di un'azienda effimera passando
// dal flusso vero della piattaforma: l'email di conferma parte, rimbalza
// (indirizzo di simulazione di Resend: rimbalzo autentico senza toccare la
// reputazione del dominio) e il contatto deve finire marcato
// `email_non_valida`. Se la catena Resend → webhook → database è rotta, il
// contatto resta pulito.
//
// Serve perché il guasto del 9/7–23/8 era invisibile: l'endpoint provato a mano
// rispondeva bene, ma l'URL registrato su Resend puntava all'apex (308).
//
// Uso: node probe-webhook-resend.mjs
// ⚠️ La route di iscrizione accetta 3 richieste all'ora per IP: non ripetere a raffica.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } })
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'

let az = null, esito = 1

try {
  const destinatario = "bounced@resend.dev"

  const { data: a } = await admin.from('aziende').insert({ ragione_sociale: `ZZ-WH-${Date.now()}` }).select().single()
  az = a.id
  console.log(`azienda di prova creata, iscrivo ${destinatario}\n`)

  const r = await fetch(`${BASE}/api/contatti/subscribe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ azienda_id: az, nome: 'Probe rimbalzo', email: destinatario, fonte: 'probe' }),
  })
  const risposta = await r.json()
  if (!r.ok) throw new Error(`iscrizione fallita (${r.status}): ${JSON.stringify(risposta)}`)

  const { data: c } = await admin.from('contatti').select('id, email_non_valida')
    .eq('azienda_id', az).eq('email', destinatario).maybeSingle()
  if (!c) throw new Error('il contatto non è stato creato dalla route di iscrizione')
  console.log(`email di conferma inviata — attendo il rimbalzo…\n`)

  // Il rimbalzo simulato arriva in pochi secondi; si controlla a intervalli.
  for (let i = 1; i <= 24; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const { data: agg } = await admin.from('contatti').select('email_non_valida').eq('id', c.id).maybeSingle()
    if (agg?.email_non_valida) {
      console.log(`✓ dopo ${i * 5}s il contatto è marcato email_non_valida`)
      console.log('\nLa catena Resend → webhook → database funziona.')
      esito = 0
      break
    }
    process.stdout.write(`  ${i * 5}s… `)
  }
  if (esito) {
    console.log('\n\n✗ dopo 120s il contatto NON è stato marcato.')
    console.log('  ⚠️ Attenzione all’ordine delle ipotesi: questo NON basta ad accusare il webhook.')
    console.log('  Prima verifica che l’email sia davvero partita, altrimenti non c’è nessun')
    console.log('  rimbalzo da consegnare e la prova non dimostra niente:')
    console.log('    npx vercel logs https://www.oltrenova.com | grep "\\[email:"')
    console.log('    → "ok →" = partita, il problema è a valle (webhook)')
    console.log('    → "FALLITA"/"THREW" = non partita, il problema è l’invio')
    console.log('  Se l’email è partita, controlla sul dashboard Resend:')
    console.log('  · l’URL è https://www.oltrenova.com/api/resend-webhook (con www, mai l’apex)?')
    console.log('  · l’endpoint è abilitato?')
    console.log('  · l’evento email.bounced è selezionato?')
  }
} catch (e) {
  console.error('ERRORE:', e.message)
} finally {
  if (az) {
    await admin.from('contatti').delete().eq('azienda_id', az)
    const { error } = await admin.from('aziende').delete().eq('id', az)
    if (error) console.error('pulizia azienda:', error.message)
    console.log('[probe] dati di prova eliminati')
  }
  process.exit(esito)
}
