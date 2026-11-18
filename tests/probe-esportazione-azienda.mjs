// L'esportazione GDPR di un'azienda porta via TUTTO quello che è suo, e niente
// di quello che è di un altro?
//
// Nasce il 18/11/2026: la route esportava 16 tabelle scritte a mano su 67, e
// diceva di essere completa. Ora le tabelle le legge dallo schema
// (lib/esportazione-azienda.js). Questa sonda non si fida di nessuno dei due
// elenchi: crea due aziende con UN OGGETTO DI OGNI TIPO (probe-azienda-popolata,
// la stessa delle sonde di sicurezza) e controlla, riga per riga, che
//   · ogni riga di A sia nell'esportazione di A;
//   · nessuna riga di B ci sia (nemmeno passando da un collegamento);
//   · i token siano oscurati;
//   · la porta risponda solo al titolare di A e al super_admin.
//
// Uso: cd tests && node probe-esportazione-azienda.mjs [--locale]
//   --locale  chiama la funzione direttamente (prima del deploy), senza la route.
import { config } from 'dotenv'
import { a, creaAzienda, popola } from './probe-azienda-popolata.mjs'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const LOCALE = process.argv.includes('--locale')
let problemi = 0
const ok = (c, testo, dettaglio = '') => { console.log(`  ${c ? '✓' : '✗'} ${testo}${!c && dettaglio ? `  — ${dettaglio}` : ''}`); if (!c) problemi++ }

let A = null, B = null
try {
  A = await creaAzienda('A', 'ESP'); B = await creaAzienda('B', 'ESP')
  const RA = await popola(A), RB = await popola(B, 'b')
  console.log(`\nDue aziende di prova, ${RA._righe.length} oggetti ciascuna (uno per tipo)\n`)

  let dati
  if (LOCALE) {
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= process.env.SUPABASE_URL
    // Next risolve `./supabase-server` senza estensione, Node no.
    const { registerHooks } = await import('node:module')
    registerHooks({ resolve(spec, ctx, next) { try { return next(spec, ctx) } catch (e) { if (spec.startsWith('.')) return next(spec + '.js', ctx); throw e } } })
    const { esportaAzienda } = await import('../client-next/lib/esportazione-azienda.js')
    const r = await esportaAzienda(A.az)
    dati = { tables: r.tables, _meta: { tabelle_non_lette: Object.keys(r.errori), errori: r.errori } }
  } else {
    console.log('1. CHI PUÒ ESPORTARE\n')
    const porta = tok => fetch(`${BASE}/api/admin/backup/azienda/${A.az}`, { headers: tok ? { Authorization: `Bearer ${tok}` } : {} })
    ok((await porta(null)).status === 401, 'senza login → 401')
    const daB = await porta(B.token)
    ok(daB.status === 403, 'il titolare di un\'altra azienda → 403', String(daB.status))
    const r = await porta(A.token)
    ok(r.status === 200, 'il titolare di A → 200', String(r.status))
    dati = await r.json()
    console.log('')
  }

  console.log(`${LOCALE ? '' : '2. '}COSA C'È DENTRO\n`)
  const non = dati._meta?.tabelle_non_lette || []
  ok(!non.length, 'nessuna tabella saltata per errore', non.join(', ') + ' ' + JSON.stringify(dati._meta?.errori || ''))
  const idsIn = tab => new Set((Array.isArray(dati.tables[tab]) ? dati.tables[tab] : []).map(r => String(r.id)))
  const mancano = [['aziende', A.az], ['entita', A.ent], ['profiles', A.user], ...RA._righe].filter(([tab, id]) => !idsIn(tab).has(String(id)))
  ok(!mancano.length, `ogni oggetto di A è esportato (${RA._righe.length + 3} righe in ${new Set(RA._righe.map(r => r[0])).size + 3} tabelle)`, mancano.map(m => m[0]).join(', '))

  // Di B non deve uscire niente: cerco ogni suo id in tutto il file.
  const testo = JSON.stringify(dati.tables)
  const diB = [['aziende', B.az], ['entita', B.ent], ['profiles', B.user], ...RB._righe].filter(([, id]) => testo.includes(String(id)))
  ok(!diB.length, 'nessuna riga dell\'altra azienda', diB.map(m => m[0]).join(', '))

  const form = (dati.tables.form_builder || []).find(r => r.id === RA.form)
  ok(form && form.token === '[oscurato]', 'i token sono oscurati (modulo)', form?.token)
  ok(!/"(token|annulla_token|unsubscribe_token)":"(?!\[oscurato\])[^"]+"/.test(testo), 'nessun token in chiaro in tutto il file')
  for (const t of ['audit_log', 'rate_limits', 'platform_config']) ok(!(t in dati.tables), `fuori la tabella della piattaforma «${t}»`)
  console.log(`\n  tabelle esportate: ${Object.keys(dati.tables).length}`)
} catch (e) {
  console.error('ERRORE:', e.message); problemi++
} finally {
  for (const x of [A, B]) if (x) { await cancellaAziendaDiProva(x.az); try { await a.auth.admin.deleteUser(x.user) } catch {} }
  console.log('[probe] pulito')
  console.log(problemi ? `\n${problemi} PROBLEMI` : '\nL\'ESPORTAZIONE È COMPLETA E NON ESCE DAL RECINTO')
  process.exit(problemi ? 1 : 0)
}
