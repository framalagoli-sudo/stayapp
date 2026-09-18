// Cosa dichiariamo ai motori di ricerca, dominio per dominio e pagina per pagina.
//
// Non sostituisce Search Console (che dice cosa Google ha capito davvero, e al
// 18/09/2026 non esiste ancora): qui si misura ciò che **noi** diciamo, ed è la
// parte che possiamo sbagliare da soli. Cerca soprattutto gli **accavallamenti**:
// due pagine che dicono lo stesso titolo, un canonical che manda altrove, una
// sitemap che elenca indirizzi morti, un noindex dove non dovrebbe esserci.
//
//   node probe-seo.mjs                              → i siti dei clienti veri
//   SITI=www.garage22terni.it node probe-seo.mjs    → uno solo
//
// Solo GET: non scrive niente.

const SITI = (process.env.SITI || 'www.garage22terni.it,www.metodotvb.it,www.fondaconarni.com,www.oltrenova.com')
  .split(',').map(s => s.trim()).filter(Boolean)
const MAX_PAGINE = Number(process.env.MAX_PAGINE || 25)

const problemi = []
const nota = (host, gravita, testo) => problemi.push({ host, gravita, testo })

async function prendi(url) {
  const t0 = Date.now()
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'probe-seo (OltreNova)' } })
    const corpo = await r.text()
    return { stato: r.status, url: r.url, corpo, ms: Date.now() - t0, tipo: r.headers.get('content-type') || '' }
  } catch (e) {
    return { stato: 0, url, corpo: '', ms: Date.now() - t0, errore: e.message }
  }
}

const fra = (html, re) => (html.match(re)?.[1] || '').trim()
const meta = (html, nome) =>
  fra(html, new RegExp(`<meta[^>]+name=["']${nome}["'][^>]+content=["']([^"']*)["']`, 'i')) ||
  fra(html, new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${nome}["']`, 'i'))
const og = (html, nome) =>
  fra(html, new RegExp(`<meta[^>]+property=["']og:${nome}["'][^>]+content=["']([^"']*)["']`, 'i')) ||
  fra(html, new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:${nome}["']`, 'i'))

function analizza(host, url, html) {
  const p = {
    url,
    titolo: fra(html, /<title>([^<]*)<\/title>/i),
    descrizione: meta(html, 'description'),
    canonical: fra(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i),
    robots: meta(html, 'robots'),
    h1: (html.match(/<h1[\s>]/gi) || []).length,
    ogTitolo: og(html, 'title'),
    ogImmagine: og(html, 'image'),
    hreflang: (html.match(/hrefLang=["']([a-z-]+)["']/gi) || []).length + (html.match(/hreflang=["']([a-z-]+)["']/gi) || []).length,
    schema: (html.match(/application\/ld\+json/gi) || []).length,
    immaginiSenzaAlt: (html.match(/<img(?![^>]*\balt=)[^>]*>/gi) || []).length,
    immagini: (html.match(/<img[\s>]/gi) || []).length,
  }

  if (!p.titolo) nota(host, 'alto', `${url} — nessun <title>`)
  else if (p.titolo.length > 65) nota(host, 'basso', `${url} — titolo lungo ${p.titolo.length} caratteri: «${p.titolo.slice(0, 70)}…»`)
  if (!p.descrizione) nota(host, 'medio', `${url} — nessuna descrizione: la scrive Google da solo, pescando dalla pagina`)
  else if (p.descrizione.length > 165) nota(host, 'basso', `${url} — descrizione di ${p.descrizione.length} caratteri: viene troncata`)
  if (!p.canonical) nota(host, 'alto', `${url} — nessun canonical`)
  else if (new URL(p.canonical, url).hostname !== new URL(url).hostname) {
    nota(host, 'alto', `${url} — il canonical manda su un ALTRO dominio: ${p.canonical}`)
  }
  if (/noindex/i.test(p.robots)) nota(host, 'alto', `${url} — noindex: questa pagina non entrerà mai nei risultati`)
  if (p.h1 === 0) nota(host, 'medio', `${url} — nessun H1`)
  if (p.h1 > 1) nota(host, 'basso', `${url} — ${p.h1} H1 nella stessa pagina`)
  // ⛔ La prova decisiva: quanto testo c'è nell'HTML **senza JavaScript**. Un
  // motore di ricerca legge questo. Il 18/09/2026 la pagina di un evento ne
  // aveva zero — il contenuto arrivava dopo, dal browser — e per Google era una
  // pagina vuota. Non è un difetto che si veda guardando il sito.
  const testo = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ').trim()
  p.parole = testo ? testo.split(' ').length : 0
  // Una pagina che dice «non c'è ancora niente» è vuota di proposito: non è un
  // difetto, ed è quello che risponde un blog senza articoli. Segnalarla
  // farebbe suonare l'allarme a ogni deploy finché non si pubblica qualcosa.
  const vuotaDiProposito = /Nessun articolo|No articles|Nessun evento|nessun elemento/i.test(testo)
  if (p.parole < 60 && !vuotaDiProposito) {
    nota(host, 'alto', `${url} — solo ${p.parole} parole nell'HTML: per un motore di ricerca questa pagina è quasi vuota (il contenuto arriva dopo, col JavaScript?)`)
  }

  if (!p.ogImmagine) nota(host, 'basso', `${url} — nessuna immagine social: condiviso su WhatsApp o Facebook esce senza anteprima`)
  if (p.immaginiSenzaAlt > 0) nota(host, 'basso', `${url} — ${p.immaginiSenzaAlt} immagini su ${p.immagini} senza testo alternativo`)
  return p
}

async function indirizziDaSitemap(host) {
  const robots = await prendi(`https://${host}/robots.txt`)
  const dichiarata = fra(robots.corpo, /Sitemap:\s*(\S+)/i)
  if (!dichiarata) nota(host, 'alto', 'il robots.txt non dichiara nessuna sitemap')
  const sm = await prendi(dichiarata || `https://${host}/sitemap.xml`)
  if (sm.stato !== 200) { nota(host, 'alto', `la sitemap risponde ${sm.stato}`); return [] }
  const url = [...sm.corpo.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim())
  if (!url.length) nota(host, 'medio', 'la sitemap è vuota')
  for (const u of url) {
    if (new URL(u).hostname !== host) nota(host, 'alto', `la sitemap elenca un indirizzo di un altro dominio: ${u}`)
  }
  return url
}

console.log('\nCOSA DICIAMO AI MOTORI DI RICERCA\n')

for (const host of SITI) {
  console.log(`\n═══ ${host}`)
  const home = await prendi(`https://${host}/`)
  if (home.stato !== 200) { nota(host, 'alto', `la home risponde ${home.stato}`); console.log('  home non raggiungibile'); continue }

  const daSitemap = await indirizziDaSitemap(host)
  // ⚠️ `https://host` e `https://host/` sono la STESSA pagina: la sitemap scrive
  // l'una e noi partiamo dall'altra. Senza normalizzare, la sonda si segnalava
  // da sola un titolo duplicato e un canonical doppio su ogni sito — un allarme
  // che suona sempre e non vuol dire niente.
  const normalizza = u => u.replace(/\/+$/, '') || u
  const indirizzi = [...new Map([`https://${host}/`, ...daSitemap].map(u => [normalizza(u), u])).values()].slice(0, MAX_PAGINE)

  const pagine = []
  for (const u of indirizzi) {
    const r = u === `https://${host}/` ? home : await prendi(u)
    if (r.stato !== 200) { nota(host, 'alto', `${u} — risponde ${r.stato} ma è nella sitemap`); continue }
    if (!/text\/html/.test(r.tipo)) continue
    if (r.ms > 2500) nota(host, 'medio', `${u} — ${Math.round(r.ms)} ms per rispondere`)
    pagine.push(analizza(host, u, r.corpo))
  }

  // Accavallamenti: due pagine che dicono la stessa cosa a Google.
  const perTitolo = new Map(), perCanonical = new Map()
  for (const p of pagine) {
    if (p.titolo) perTitolo.set(p.titolo, [...(perTitolo.get(p.titolo) || []), p.url])
    if (p.canonical) perCanonical.set(p.canonical, [...(perCanonical.get(p.canonical) || []), p.url])
  }
  for (const [t, u] of perTitolo) if (u.length > 1) nota(host, 'medio', `stesso titolo su ${u.length} pagine («${t.slice(0, 50)}»): ${u.join(' , ')}`)
  for (const [c, u] of perCanonical) if (u.length > 1) nota(host, 'alto', `${u.length} pagine dichiarano lo stesso canonical (${c}): una sola verrà indicizzata`)

  console.log(`  ${pagine.length} pagine lette (${daSitemap.length} dalla sitemap)`)
  const mie = problemi.filter(p => p.host === host)
  console.log(`  ${mie.length ? mie.length + ' cose da guardare' : '✓ nessun problema'}`)
}

console.log('\n' + '═'.repeat(70))
for (const gravita of ['alto', 'medio', 'basso']) {
  const g = problemi.filter(p => p.gravita === gravita)
  if (!g.length) continue
  console.log(`\n${gravita.toUpperCase()} (${g.length})`)
  for (const p of g) console.log(`  · [${p.host}] ${p.testo}`)
}
console.log('')
process.exit(problemi.some(p => p.gravita === 'alto') ? 1 : 0)
