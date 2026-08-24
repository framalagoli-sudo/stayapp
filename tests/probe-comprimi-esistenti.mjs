// Ricomprime le immagini GIÀ online sui siti dei clienti.
//
// La compressione al caricamento vale solo per le foto nuove: quelle già
// pubblicate restano pesanti (misurate il 24/08/2026: media 1 MB, punte di
// 3,9 MB). Qui si sistemano anche quelle.
//
// SCELTA PRUDENTE: si mantiene lo stesso formato e lo stesso percorso — un jpg
// resta un jpg, solo più leggero. Si rinuncia al guadagno del WebP, ma gli URL
// salvati nel database non cambiano e non c'è nulla da riallineare. Su file di
// siti veri, il rischio minore vale più del risparmio maggiore.
//
// Simula e basta, se non gli si dice altrimenti:
//   node probe-comprimi-esistenti.mjs            → mostra cosa farebbe
//   node probe-comprimi-esistenti.mjs --esegui   → sovrascrive davvero

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { createRequire } from 'module'

config({ path: '.env.test' })
const require = createRequire('C:/Users/francesco/progetti/hospitality/client-next/')
const sharp = require('sharp')
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } })

const ESEGUI = process.argv.includes('--esegui')
const LATO_MAX = 1920
const QUALITA = 82
const BUCKET = 'property-media'

// Dall'URL pubblico al percorso dentro il bucket, senza il cache-buster.
function percorsoDaUrl(url) {
  const m = String(url).split('?')[0].split(`/object/public/${BUCKET}/`)
  return m.length === 2 ? decodeURIComponent(m[1]) : null
}

// Le immagini realmente usate dai siti: schede entità e blocchi delle pagine.
async function raccogliImmagini() {
  const urls = new Set()
  for (const [tab, campi] of [
    ['properties', ['cover_url', 'logo_url', 'logo_dark_url']],
    ['ristoranti', ['cover_url', 'logo_url', 'logo_dark_url']],
    ['attivita',   ['cover_url', 'logo_url', 'logo_dark_url']],
  ]) {
    const { data } = await admin.from(tab).select(campi.join(','))
    for (const r of data || []) for (const c of campi) if (String(r[c] || '').startsWith('http')) urls.add(r[c])
  }
  const { data: pagine } = await admin.from('pagine').select('blocks')
  for (const p of pagine || []) {
    for (const m of JSON.stringify(p.blocks || []).matchAll(/https:\/\/[^"'\\ ]+?\.(?:jpg|jpeg|png|webp|avif)/gi)) urls.add(m[0])
  }
  return [...urls].filter(u => percorsoDaUrl(u))
}

console.log(ESEGUI
  ? '\n⚠️  MODALITÀ REALE: le immagini verranno sovrascritte.\n'
  : '\nSimulazione (nessuna modifica). Aggiungi --esegui per applicare.\n')

const immagini = await raccogliImmagini()
console.log(`immagini trovate sui siti: ${immagini.length}\n`)

let prima = 0, dopo = 0, toccate = 0, saltate = 0, errori = 0

for (const url of immagini) {
  const percorso = percorsoDaUrl(url)
  const nome = percorso.length > 46 ? '…' + percorso.slice(-45) : percorso
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) { console.log(`  ⨯ ${nome} — non scaricabile (${res.status})`); errori++; continue }
    const originale = Buffer.from(await res.arrayBuffer())
    const meta = await sharp(originale).metadata()

    if (meta.format === 'gif') { saltate++; continue } // le animazioni si rovinerebbero

    const daRidurre = Math.max(meta.width || 0, meta.height || 0) > LATO_MAX
    let lavoro = sharp(originale, { failOn: 'none' }).rotate()
    if (daRidurre) lavoro = lavoro.resize({ width: LATO_MAX, height: LATO_MAX, fit: 'inside', withoutEnlargement: true })
    // Stesso formato di partenza: l'estensione del file non deve cambiare.
    const compresso = meta.format === 'png'
      ? await lavoro.png({ quality: QUALITA, compressionLevel: 9 }).toBuffer()
      : await lavoro.jpeg({ quality: QUALITA, mozjpeg: true }).toBuffer()

    if (compresso.length >= originale.length * 0.9) {
      console.log(`  = ${nome} — già leggera, lasciata com'è`)
      saltate++; continue
    }

    // Prova di integrità: se il risultato non è rileggibile, non lo si carica.
    const verifica = await sharp(compresso).metadata()
    if (!verifica.width) { console.log(`  ⨯ ${nome} — risultato non valido, saltata`); errori++; continue }

    prima += originale.length; dopo += compresso.length; toccate++
    const kbP = Math.round(originale.length / 1024), kbD = Math.round(compresso.length / 1024)
    console.log(`  ${ESEGUI ? '↻' : '·'} ${nome.padEnd(47)} ${String(kbP).padStart(5)} → ${String(kbD).padStart(5)} KB  -${Math.round((1 - compresso.length / originale.length) * 100)}%`)

    if (ESEGUI) {
      const { error } = await admin.storage.from(BUCKET)
        .upload(percorso, compresso, { contentType: meta.format === 'png' ? 'image/png' : 'image/jpeg', upsert: true })
      if (error) { console.log(`     ⨯ scrittura fallita: ${error.message}`); errori++ }
    }
  } catch (e) {
    console.log(`  ⨯ ${nome} — ${e.message.slice(0, 60)}`); errori++
  }
}

console.log('\n' + '═'.repeat(64))
console.log(`da ricomprimere: ${toccate}   già a posto: ${saltate}   non riuscite: ${errori}`)
if (toccate) {
  console.log(`peso: ${(prima / 1048576).toFixed(1)} MB → ${(dopo / 1048576).toFixed(1)} MB   (-${Math.round((1 - dopo / prima) * 100)}%)`)
}
if (!ESEGUI && toccate) console.log('\nNessuna modifica applicata. Rilancia con --esegui per procedere.')
