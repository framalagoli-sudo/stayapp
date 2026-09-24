// Il menu che vede DAVVERO ogni cliente, entità per entità.
//
// È l'ultimo miglio delle categorie: non basta che gli interruttori siano
// scritti nel database, bisogna aprire il pannello come lo apre il titolare.
// Per ogni azienda vera si crea per un minuto un accesso di prova, che fa il
// secondo fattore come una persona (le aziende hanno il 2FA obbligatorio: senza,
// il server giustamente non dà i dati dell'azienda e il menu resta vuoto), si
// legge la barra laterale di ogni entità, e l'accesso si cancella.
//
// ⚠️ Il 2FA dei clienti NON si spegne mai per provare: il 25/09 la prima prova
// senza secondo fattore mostrava un menu sbagliato per tutti, ed era la prova a
// essere sbagliata, non il menu.
//
// Controlla che:
//  · «Sito web» sia la prima voce dopo la Dashboard;
//  · non compaia nessuna funzione di livello azienda che la categoria spegne;
//  · non compaia «Funzioni» (è nostra).
//
// Uso (a mano, non in deploy.ps1: tocca aziende vere): node probe-menu-clienti.mjs
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import { randomBytes, createHmac } from 'crypto'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const PERC = { struttura: 'struttura', ristorante: 'ristoranti', attivita: 'attivita' }
// Le voci di livello azienda come le chiama il menu, per chiave di funzione.
const VOCE_DI = {
  richieste: 'Richieste', prenotazioni: 'Prenotazioni', booking: 'Calendario', contatti: 'Contatti', preventivi: 'Preventivi',
  recensioni: 'Recensioni', survey: 'Sondaggi', chat: 'Chat', form_builder: 'Moduli', blog: 'Blog', eventi: 'Eventi',
  offerte: 'Offerte', newsletter: 'Newsletter', whatsapp: 'WhatsApp', automazioni: 'Automazioni',
  piano_editoriale: 'Piano editoriale', content_studio: 'Studio contenuti', loyalty: 'Fedeltà', shop: 'Negozio', analytics: 'Statistiche',
}

function base32Decode(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''
  for (const c of s.replace(/=+$/, '').toUpperCase()) bits += A.indexOf(c).toString(2).padStart(5, '0')
  const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(out)
}
function totp(secret) {
  const c = Buffer.alloc(8); c.writeBigInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)))
  const h = createHmac('sha1', base32Decode(secret)).update(c).digest()
  const o = h[h.length - 1] & 0xf
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1000000)).padStart(6, '0')
}

// Un titolare di prova con il secondo fattore fatto: sessione aal2.
async function titolareDi(aziendaId, creati) {
  const email = `zz-menu-cliente-${Date.now()}@playwright.internal`
  const password = randomBytes(20).toString('base64url') + 'Aa1!'
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(`createUser: ${error.message}`)
  creati.push(u.user.id)
  await admin.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', azienda_id: aziendaId, full_name: 'Prova menu' }, { onConflict: 'id' })
  const cli = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { error: sErr } = await cli.auth.signInWithPassword({ email, password })
  if (sErr) throw new Error(`signIn: ${sErr.message}`)
  const { data: enr, error: eErr } = await cli.auth.mfa.enroll({ factorType: 'totp' })
  if (eErr) throw new Error(`2FA: ${eErr.message}`)
  const { error: vErr } = await cli.auth.mfa.challengeAndVerify({ factorId: enr.id, code: totp(enr.totp.secret) })
  if (vErr) throw new Error(`2FA: ${vErr.message}`)
  return (await cli.auth.getSession()).data.session
}

let problemi = 0
const creati = []
const browser = await chromium.launch()
try {
  const { data: aziende } = await admin.from('aziende').select('id, ragione_sociale, funzioni').order('ragione_sociale')
  for (const az of aziende) {
    const { data: ent } = await admin.from('entita').select('id, name, tipo, profilo').eq('azienda_id', az.id).order('name')
    if (!ent?.length) continue
    const sessione = await titolareDi(az.id, creati)
    for (const e of ent) {
      const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`, value: JSON.stringify(sessione) }] }] } })
      const p = await ctx.newPage()
      await p.goto(`${BASE}/admin/${PERC[e.tipo]}/${e.id}/info`, { waitUntil: 'domcontentloaded' })
      await p.waitForSelector('aside.admin-sidebar nav a:has-text("Sito web")', { timeout: 30_000 }).catch(() => {})
      await p.waitForTimeout(1000)
      const voci = await p.$$eval('aside.admin-sidebar nav a', as => as.map(a => a.textContent.trim()))
      await ctx.close()

      const spenteMaVisibili = az.funzioni
        ? Object.entries(VOCE_DI).filter(([k, v]) => !az.funzioni[k] && voci.includes(v)).map(([, v]) => v)
        : []
      const guai = []
      if (voci[1] !== 'Sito web') guai.push(`«Sito web» non è la prima voce (è: ${voci[1] || 'niente'})`)
      if (spenteMaVisibili.length) guai.push(`visibili ma spente dalla categoria: ${spenteMaVisibili.join(', ')}`)
      if (voci.includes('Funzioni')) guai.push('«Funzioni» visibile al titolare')
      problemi += guai.length
      console.log(`\n${guai.length ? '✗' : '✓'} ${az.ragione_sociale} › ${e.name} — ${e.profilo || 'nessuna categoria'} — ${voci.length} voci`)
      for (const g of guai) console.log(`    ✗ ${g}`)
      console.log(`    ${voci.join(' · ')}`)
    }
    await admin.auth.admin.deleteUser(creati.pop())
  }
} catch (e) {
  console.error('ERRORE:', e.message)
  problemi++
} finally {
  await browser.close()
  for (const id of creati) await admin.auth.admin.deleteUser(id).catch(() => {})
  console.log('\n[probe] accessi di prova eliminati')
  console.log(problemi ? `\n${problemi} PROBLEMI` : '\nOGNI CLIENTE VEDE IL MENU DELLA SUA CATEGORIA')
  process.exit(problemi ? 1 : 0)
}
