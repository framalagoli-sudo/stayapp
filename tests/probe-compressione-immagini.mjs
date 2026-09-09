// Le immagini caricate dal pannello escono compresse — o qualcuno se ne accorge.
//
// ⚠️ Questa sonda esiste per un guasto che NON darebbe errore. `comprimi()` in
// `lib/upload-helper.js` è avvolta da un try/catch che, se sharp non c'è,
// pubblica l'immagine originale e scrive una riga su console: la scelta è
// giusta (meglio una foto pesante che nessuna foto), ma rende il guasto muto.
// Fino al 09/09/2026 sharp arrivava come **optionalDependency di Next**: una
// installazione che la saltava — piattaforma, binari nativi, `--omit=optional`
// — usciva con codice 0 e la compressione moriva senza che niente gridasse.
// Ora sharp è una dipendenza dichiarata, e questa sonda è ciò che se ne accorge
// il giorno che tornasse a mancare.
//
// ⚠️ Qui dentro sharp NON si usa: né per costruire la foto di prova né per
// misurare il risultato. Una sonda che verifica sharp e ha bisogno di sharp, il
// giorno che manca muore lei invece di raccontare cosa è successo al server —
// provato il 09/09, ed è esattamente com'è andata al primo tentativo.
//
// Uso: node probe-compressione-immagini.mjs
//      TEST_URL=http://localhost:3000 node probe-compressione-immagini.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { deflateSync } from 'zlib'

config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const TEST_URL = process.env.TEST_URL || 'https://www.oltrenova.com'
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  throw new Error('Mancano variabili in tests/.env.test')
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

// Gli stessi numeri di lib/upload-helper.js. Se cambiano lì, cambiano qui.
const LATO_MAX = 1920
const BUCKET = 'property-media'
const LARGA = 2400, ALTA = 1800

let problemi = 0
const ok = (c, t) => { console.log(`  ${c ? '✓' : '✗'} ${t}`); if (!c) problemi++ }
const kb = n => `${Math.round(n / 1024)} KB`

// ── Un PNG vero, costruito a mano ────────────────────────────────────────────
// Deve essere più largo del lato massimo (o non ci sarebbe niente da ridurre) e
// stare sotto i 5 MB della route. Il disegno è una sfumatura con un po' di
// grana: si comprime come una fotografia, non come una tinta piatta.
const TAB_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = buf => {
  let c = 0xffffffff
  for (const b of buf) c = TAB_CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (tipo, dati) => {
  const testa = Buffer.alloc(8)
  testa.writeUInt32BE(dati.length, 0)
  testa.write(tipo, 4, 'ascii')
  const coda = Buffer.alloc(4)
  coda.writeUInt32BE(crc32(Buffer.concat([Buffer.from(tipo, 'ascii'), dati])), 0)
  return Buffer.concat([testa, dati, coda])
}
function pngDiProva() {
  const grana = randomBytes(LARGA)
  const righe = Buffer.alloc(ALTA * (1 + LARGA * 3))
  let p = 0
  for (let y = 0; y < ALTA; y++) {
    righe[p++] = 0 // nessun filtro: la riga è scritta com'è
    for (let x = 0; x < LARGA; x++) {
      const g = grana[(x + y) % LARGA] >> 4 // grana leggera, come il rumore di un sensore
      righe[p++] = (((x * 255 / LARGA) | 0) + g) & 0xff
      righe[p++] = (((y * 255 / ALTA) | 0) + g) & 0xff
      righe[p++] = ((((x + y) * 255 / (LARGA + ALTA)) | 0) + g) & 0xff
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(LARGA, 0); ihdr.writeUInt32BE(ALTA, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8 bit per canale, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(righe, { level: 6 })), chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Che cos'è, davvero, il file che il server ha pubblicato ──────────────────
// Si guardano i primi byte, non l'estensione dell'indirizzo: se la compressione
// fosse saltata, il nome direbbe una cosa e il contenuto un'altra.
function misura(buf) {
  const a4 = i => buf.toString('ascii', i, i + 4)
  if (a4(0) === 'RIFF' && a4(8) === 'WEBP') {
    const tipo = a4(12)
    if (tipo === 'VP8X') return { formato: 'webp', larghezza: buf.readUIntLE(24, 3) + 1, altezza: buf.readUIntLE(27, 3) + 1 }
    if (tipo === 'VP8 ') return { formato: 'webp', larghezza: buf.readUInt16LE(26) & 0x3fff, altezza: buf.readUInt16LE(28) & 0x3fff }
    if (tipo === 'VP8L') {
      const b = buf.readUInt32LE(21)
      return { formato: 'webp', larghezza: (b & 0x3fff) + 1, altezza: ((b >>> 14) & 0x3fff) + 1 }
    }
    return { formato: 'webp', larghezza: 0, altezza: 0 }
  }
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return { formato: 'png', larghezza: buf.readUInt32BE(16), altezza: buf.readUInt32BE(20) }
  if (buf[0] === 0xff && buf[1] === 0xd8) return { formato: 'jpeg', larghezza: 0, altezza: 0 }
  return { formato: 'sconosciuto', larghezza: 0, altezza: 0 }
}

let userId = null
let pathCaricato = null

try {
  const originale = pngDiProva()
  console.log(`\nFoto di prova: ${LARGA}×${ALTA} PNG, ${kb(originale.length)}\n`)
  if (originale.length > 5 * 1024 * 1024) throw new Error('la foto di prova supera il limite di 5 MB della route')

  // Un'entità qualsiasi: la route salva sotto la sua cartella e non tocca il
  // database. Il file si cancella nel finally.
  const { data: ent, error: eErr } = await admin.from('entita').select('id, tipo').limit(1).maybeSingle()
  if (eErr || !ent) throw new Error(`nessuna entità su cui provare: ${eErr?.message || 'tabella vuota'}`)

  const email = `probe-${Date.now()}@playwright.internal`
  const password = randomBytes(32).toString('base64url')
  const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cErr) throw new Error(`createUser: ${cErr.message}`)
  userId = created.user.id
  const { error: pErr } = await admin.from('profiles').upsert({ id: userId, role: 'super_admin', full_name: 'Probe' }, { onConflict: 'id' })
  if (pErr) throw new Error(`profilo: ${pErr.message}`)
  const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({ email, password })
  if (sErr) throw new Error(`signIn: ${sErr.message}`)

  const form = new FormData()
  form.append('file', new Blob([originale], { type: 'image/png' }), 'prova.png')
  const res = await fetch(`${TEST_URL}/api/upload/minisito-image?entity_type=${ent.tipo}&entity_id=${ent.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${signIn.session.access_token}` },
    body: form,
  })
  const body = await res.json().catch(() => ({}))
  ok(res.ok, `la route accetta il caricamento (${res.status}${body.error ? ': ' + body.error : ''})`)
  if (!res.ok) throw new Error('caricamento fallito: il resto non è misurabile')

  // Da qui in poi si guarda il file **vero**, quello che scaricherebbe un
  // visitatore — non quello che la route dice di aver salvato.
  const url = body.url
  pathCaricato = decodeURIComponent(new URL(url).pathname.split(`/${BUCKET}/`)[1] || '')
  ok(/\.webp(\?|$)/.test(url), `l'indirizzo finisce in .webp  (${url.split('/').pop().split('?')[0]})`)

  const scarico = await fetch(url)
  const servito = Buffer.from(await scarico.arrayBuffer())
  ok(scarico.headers.get('content-type') === 'image/webp',
    `viene servito come image/webp  (${scarico.headers.get('content-type')})`)

  const m = misura(servito)
  ok(m.formato === 'webp', `il file è davvero WebP  (${m.formato})`)
  ok(Math.max(m.larghezza, m.altezza) === LATO_MAX,
    `il lato lungo è stato portato a ${LATO_MAX}px  (${m.larghezza}×${m.altezza})`)
  console.log(`  · peso: ${kb(originale.length)} → ${kb(servito.length)}`)

  console.log('\n' + '─'.repeat(64))
  console.log(problemi
    ? `${problemi} PROBLEMI — la compressione NON sta lavorando: controllare che sharp sia installato`
    : 'LE IMMAGINI ESCONO COMPRESSE: sharp è vivo in produzione')
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  // La sonda gira sul sistema vero: non lascia né file né utenti.
  if (pathCaricato) {
    const { error } = await admin.storage.from(BUCKET).remove([pathCaricato])
    console.log(error ? `pulizia file: ${error.message}` : `[probe] file di prova rimosso (${pathCaricato})`)
  }
  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    console.log('[probe] utente effimero eliminato')
  }
  process.exit(problemi ? 1 : 0)
}
