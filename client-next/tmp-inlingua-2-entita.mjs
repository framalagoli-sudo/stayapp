// Scheda entità: contatti veri, registro visivo di Verona, SEO del brief.
// Senza --esegui mostra soltanto il prima/dopo.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('./.env.local', 'utf8')
const v = k => (env.match(new RegExp('^\\uFEFF?' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const db = createClient(v('NEXT_PUBLIC_SUPABASE_URL'), v('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
const ENT = '84368702-c9ea-41eb-8932-28cdbfd77399'
const esegui = process.argv.includes('--esegui')

const { data: e } = await db.from('entita').select('*').eq('id', ENT).single()

// Il registro misurato su inlinguaverona.it: bianco, quasi-nero, turchese.
// ⚠️ Non è il colore del marchio inlingua (nero + rosso): è la scelta di
// Verona, e Francesco l'ha indicata come riferimento il 22/09/2026.
const theme = {
  ...e.theme,
  bgColor: '#ffffff',
  textColor: '#221f20',
  primaryColor: '#00b5b4',
  secondaryColor: '#1cc691',
  fontHeading: 'sora',      // geometrico deciso, come l'Articulat CF di Verona
  fontBody: 'inter',
  borderStyle: 'mixed',     // angoli più netti delle card tonde di oggi
  headerStyle: 'solid',
}

// I contatti ufficiali (slide del cliente). Nella pagina «Contatti» c'erano
// già giusti: era la scheda dell'entità — quella che alimenta footer, mappa e
// dati strutturati — a essere rimasta indietro.
const patch = {
  theme,
  address: 'Via Cesare Battisti 7, 05100 Terni (TR)',
  phone: '0744 401560',
  whatsapp: '393382817713',
  email: 'terni@inlingua.it',
  schedule: 'Lun–Ven 9:30–19:30 · Sab 9:30–13:00',
  // ⚠️ «traduzioni» resta: è un servizio vero che il cliente aveva dichiarato
  // e che le slide confermano (traduzioni e interpretariato in tutte le lingue).
  settore: 'Scuola di lingue e centro esami a Terni — corsi, certificazioni e traduzioni',
  minisito: {
    ...(e.minisito || {}),
    seo_title: 'inlingua Terni | Corsi di Lingua a Terni — Inglese, Certificazioni, Aziende',
    seo_description: 'Corsi di lingua a Terni per bambini, adulti e aziende: metodo diretto inlingua dal 1968, certificazioni Cambridge, IELTS e altre. Prenota il test di livello gratuito.',
    tagline: 'Parla. Connetti. Cresci.',
  },
}

for (const [k, val] of Object.entries(patch)) {
  const prima = typeof e[k] === 'object' ? JSON.stringify(e[k]).slice(0, 70) : e[k]
  const dopo = typeof val === 'object' ? JSON.stringify(val).slice(0, 70) : val
  if (String(prima) !== String(dopo)) console.log(`${k}\n   prima: ${prima}\n   dopo : ${dopo}`)
}

if (!esegui) { console.log('\n(simulazione: rilancia con --esegui)'); process.exit(0) }
const { error } = await db.from('entita').update(patch).eq('id', ENT)
console.log(error ? '\n✗ ' + error.message : '\n✓ scheda aggiornata')
