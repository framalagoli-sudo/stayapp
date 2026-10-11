// Un dominio che risponde NON è un dominio che risponde da noi.
//
// Il 10/10/2026 il pannello diceva «Online · protetto da certificato» su
// gurumanagement.it mentre a rispondere era ancora il vecchio WordPress: la
// prova guardava solo se arrivava una risposta. Questa sonda chiama la diagnosi
// vera (`lib/vercel-domains.js`) su indirizzi di cui si sa chi risponde.
//
// Uso:  node tests/probe-dominio-altrove.mjs      (dalla root, nessuna scrittura)
//
// Non serve il token di Vercel: senza, la diagnosi lavora con la sola prova
// HTTPS, che è il pezzo sotto esame.
import { pathToFileURL } from 'url'
import path from 'path'

const lib = await import(pathToFileURL(path.resolve('client-next/lib/vercel-domains.js')).href)
const { probeHttps, rispondeDaNoi, diagnosticaDominio, controllaGemello } = lib

let rossi = 0
const esito = (ok, cosa, dettaglio = '') => { console.log(`  ${ok ? '✓' : '✗'} ${cosa}${ok || !dettaglio ? '' : ' — ' + dettaglio}`); if (!ok) rossi++ }

// Serviti da noi: pagina, redirect fra www e radice, sottodominio dietro Cloudflare.
const NOSTRI = ['www.oltrenova.com', 'oltrenova.com', 'www.garage22terni.it', 'garage22terni.it', 'guru-management.oltrenova.com']
// Rispondono benissimo, con certificato valido, da server che non sono nostri.
const ALTRUI = ['wordpress.org', 'www.siteground.com', 'example.com']

console.log('\nLA PROVA DISTINGUE CHI RISPONDE\n')
for (const h of NOSTRI) {
  const p = await probeHttps(h, { timeoutMs: 20000 })
  esito(rispondeDaNoi(p), `${h}: risponde da noi (HTTP ${p.status ?? '—'})`, JSON.stringify(p))
}
for (const h of ALTRUI) {
  const p = await probeHttps(h, { timeoutMs: 20000 })
  esito(p.raggiungibile && !rispondeDaNoi(p), `${h}: risponde, ma non da noi`, JSON.stringify(p))
}
const morto = await probeHttps('non-esiste-davvero-zz91.it', { timeoutMs: 8000 })
esito(!morto.raggiungibile && !rispondeDaNoi(morto), 'un dominio che non esiste non risponde affatto', JSON.stringify(morto))
esito(rispondeDaNoi({ raggiungibile: true, status: 200 }), 'una prova salvata prima di oggi (senza il campo) vale come prima')

console.log('\nLA DIAGNOSI NON DICE «ONLINE» A TORTO\n')
for (const h of ALTRUI) {
  const d = await diagnosticaDominio(h)
  esito(d.stato === 'pending' && d.fase === 'dns_errato', `${h}: «in attesa», con i record da correggere`, `${d.stato} / ${d.fase}`)
  esito(/vecchio hosting/.test(d.messaggio) && d.records.length > 0, '  e lo dice a parole, con i record da mettere', d.messaggio)
}
const nostro = await diagnosticaDominio('www.garage22terni.it')
esito(nostro.stato === 'attivo', 'www.garage22terni.it: online', `${nostro.stato} / ${nostro.fase}`)

console.log('\nL’ALTRA FORMA DELL’INDIRIZZO\n')
const g = await controllaGemello('www.wordpress.org', 'wordpress.org')
esito(g && !g.raggiungibile && g.causa === 'altrove', 'wordpress.org come «gemello»: porta a un altro server', JSON.stringify({ r: g?.raggiungibile, c: g?.causa }))
const gn = await controllaGemello('www.garage22terni.it', 'garage22terni.it')
esito(gn && gn.raggiungibile && gn.reindirizza, 'garage22terni.it come gemello: porta all’indirizzo principale', JSON.stringify({ r: gn?.raggiungibile, re: gn?.reindirizza }))

console.log(rossi ? `\n✗ ${rossi} da guardare\n` : '\n✓ tutto regge\n')
process.exit(rossi ? 1 : 0)
