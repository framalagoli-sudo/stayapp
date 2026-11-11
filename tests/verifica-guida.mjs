// La guida del pannello dice la verità? (lib/guida, decisione di Francesco
// dell'11/11/2026: «se aggiorniamo cose aggiorni anche la guida»).
//
// Gira in deploy.ps1 PRIMA di Vercel e lo blocca. Controlla, leggendo il
// codice e la storia di git (niente rete):
//   1. ogni voce del menu ha la sua scheda, oppure è nell'elenco DA_SCRIVERE
//      qui sotto — che può solo accorciarsi: una voce nuova senza scheda ferma
//      il deploy;
//   2. ogni pulsante che una scheda nomina compare ancora, scritto così, in una
//      delle pagine che la scheda spiega;
//   3. nessuna pagina è cambiata DOPO la sua scheda. Chi cambia una pagina
//      rilegge la scheda, la corregge se serve, aggiorna `rivista` e la mette
//      nello stesso commit. Anche se la scheda va già bene: rileggerla è il
//      punto.
//
// Uso: node verifica-guida.mjs   (dalla cartella tests)

import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { pathToFileURL } from 'url'

const RADICE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..')
const CN = path.join(RADICE, 'client-next')
const CARTELLA = path.join(CN, 'lib', 'guida')

// Le voci che non hanno ancora la loro scheda. Si scrivono a gruppi; quando una
// scheda nasce, la voce si toglie da qui (il controllo lo pretende).
const DA_SCRIVERE = new Set([
  'entita:sito', 'ai_site_builder', 'entita:theme', 'entita:domini', 'entita:chatbot', 'entita:moduli', 'qrcode', 'analytics',
  'entita:menu', 'entita:services', 'entita:gallery', 'entita:vetrine', 'offerte', 'blog',
  'richieste', 'recensioni', 'preventivi', 'form_builder', 'survey', 'demo',
  'whatsapp', 'automazioni', 'piano_editoriale', 'content_studio', 'loyalty', 'prodotti', 'shop',
  'entita:info', 'entita:privacy', 'entita:funzioni', 'collaboratori', 'integrazioni', 'pagamenti', 'seo_geo', 'audit_log', 'impostazioni', 'sicurezza', 'aiuto',
  'aziende', 'strutture', 'ristoranti', 'attivita', 'utenti', 'diagnostica', 'funzioni',
])

const errori = []
const git = (...args) => execFileSync('git', args, { cwd: RADICE, encoding: 'utf8' }).trim()

// ── Le schede
const schede = []
for (const f of fs.readdirSync(CARTELLA).filter(f => f.endsWith('.js') && f !== 'index.js')) {
  const mod = await import(pathToFileURL(path.join(CARTELLA, f)).href)
  schede.push({ file: path.join('client-next', 'lib', 'guida', f), ...mod.default })
}
const indice = fs.readFileSync(path.join(CARTELLA, 'index.js'), 'utf8')
for (const s of schede) {
  if (!new RegExp(`from '\\./${path.basename(s.file, '.js')}'`).test(indice))
    errori.push(`${s.file}: la scheda non è in lib/guida/index.js, quindi nessuno la vede`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.rivista || '')) errori.push(`${s.file}: «rivista» deve essere una data (AAAA-MM-GG)`)
  if (!s.percorsi?.length || !s.pagine?.length) errori.push(`${s.file}: servono «percorsi» e «pagine»`)
}

// ── 1. ogni voce del menu ha la sua scheda
const menu = fs.readFileSync(path.join(CN, 'components', 'admin', 'menu-pannello.js'), 'utf8')
const voci = new Set()
for (const m of menu.matchAll(/voci:\s*\[([^\]]*)\]/g)) for (const v of m[1].matchAll(/'([^']+)'/g)) voci.add(v[1])
if (!voci.size) errori.push('non trovo le voci del menu in menu-pannello.js (è cambiato il formato?)')
const conScheda = new Set(schede.map(s => s.voce))
for (const v of voci) {
  if (!conScheda.has(v) && !DA_SCRIVERE.has(v)) errori.push(`la voce di menu «${v}» non ha una scheda nella guida: scrivila in client-next/lib/guida/`)
  if (conScheda.has(v) && DA_SCRIVERE.has(v)) errori.push(`«${v}» ha la sua scheda: toglila da DA_SCRIVERE in tests/verifica-guida.mjs`)
}
for (const s of schede) if (!voci.has(s.voce)) errori.push(`${s.file}: la voce «${s.voce}» non è più nel menu`)

// ── 2. i pulsanti nominati esistono ancora
for (const s of schede) {
  const testi = []
  for (const p of s.pagine || []) {
    const assoluto = path.join(CN, p)
    if (!fs.existsSync(assoluto)) { errori.push(`${s.file}: la pagina ${p} non esiste più`); continue }
    testi.push(fs.readFileSync(assoluto, 'utf8'))
  }
  const tutto = testi.join('\n')
  for (const b of s.pulsanti || [])
    if (!tutto.includes(b)) errori.push(`${s.file}: la guida nomina «${b}», ma nelle pagine non c'è più scritto così`)
}

// ── 3. nessuna pagina più nuova della sua scheda
const quando = f => Number(git('log', '-1', '--format=%ct', '--', f) || 0)
const modificato = f => git('status', '--porcelain', '--', f) !== ''
for (const s of schede) {
  const tScheda = modificato(s.file) ? Infinity : quando(s.file)
  for (const p of s.pagine || []) {
    const f = path.join('client-next', p)
    const tPagina = modificato(f) ? Infinity : quando(f)
    if (tPagina > tScheda) {
      const data = tPagina === Infinity ? 'ora (non ancora salvata in git)' : new Date(tPagina * 1000).toISOString().slice(0, 10)
      errori.push(`${s.file}: «${p}» è cambiata ${data}, dopo la scheda. Rileggi la scheda, correggila se serve, aggiorna «rivista» e mettila nello stesso commit.`)
    }
  }
}

console.log('\n  LA GUIDA DEL PANNELLO\n')
console.log(`  ${schede.length} schede · ${voci.size} voci di menu · ${DA_SCRIVERE.size} ancora da scrivere\n`)
if (errori.length) {
  for (const e of errori) console.log(`  ✗ ${e}`)
  console.log(`\n  ${errori.length} da sistemare prima del deploy\n`)
  process.exit(1)
}
console.log('  ✓ ogni scheda è allineata alle sue pagine\n')
