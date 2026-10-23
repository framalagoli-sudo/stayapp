// Sonda: una porta rivela che una cosa ESISTE, a chi non dovrebbe saperlo?
//
// Il classico: a un identificativo inventato risponde «non trovato», a quello
// vero di un'altra azienda «non autorizzato». Chi prova ha appena scoperto che
// quell'evento, quel contatto, quel preventivo esiste — e può contarli.
//
// Per ogni porta con un identificativo nell'indirizzo chiede due volte, come
// l'azienda B e come chi non ha fatto login: con un identificativo inventato e
// con uno VERO dell'azienda A. Le due risposte devono essere identiche (codice
// e testo, con gli identificativi tolti). Sulle porte pubbliche il confronto
// si fa con una cosa NON pubblicata (evento, pagina, vetrina, modulo spento,
// articolo in bozza): deve sembrare inesistente.
//
// Crea due aziende «ZZ-ENUM-…» con un oggetto di ogni tipo e le cancella con
// `cancellaAziendaDiProva`. Tutti i recapiti sono finti (@playwright.internal,
// example.invalid): anche se una porta cedesse, nessuna email arriva a qualcuno.
//
// Uso: cd tests && node probe-enumerazione.mjs [--verbose]
import { cancellaAziendaDiProva } from './probe-auth.mjs'
import { a, M, SLUG_FINTO, API, elencaRoute, creaAzienda, popola, NON_PROVATE, percorsi } from './probe-azienda-popolata.mjs'

const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const verbose = process.argv.includes('--verbose')

async function chiama(path, token, metodo) {
  try {
    const r = await fetch(BASE + path, {
      method: metodo, redirect: 'manual',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
      // Un testo qualunque, perché le porte che scrivono arrivino oltre il
      // «campo obbligatorio» fino al controllo di chi è la cosa.
      ...(metodo === 'GET' ? {} : { body: JSON.stringify({ testo: 'ZZ-B', nome: 'ZZ-B' }) }),
      signal: AbortSignal.timeout(30000),
    })
    return { status: r.status, corpo: (await r.text().catch(() => '')).slice(0, 600) }
  } catch (e) { return { status: 0, corpo: e.message } }
}
// Toglie quello che cambia per costruzione fra le due richieste: gli identificativi e gli slug.
const pulisci = (s, R) => {
  let x = s.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
  for (const v of [SLUG_FINTO, R.paginaSlug, R.articoloSlug]) x = x.split(v).join('<slug>')
  return x
}

let A = null, B = null, rossi = 0
const problemi = [], saltate = []
try {
  A = await creaAzienda('A'); B = await creaAzienda('B')
  const R = await popola(A)
  const tutte = elencaRoute(API).filter(r => r.route.includes('['))
  console.log(`porte con un identificativo: ${tutte.length}\n`)
  // Prima chi legge, poi chi scrive, per ultimo chi cancella: se una porta
  // cedesse, il resto della prova troverebbe ancora i dati di A.
  const ordine = { GET: 0, PATCH: 1, PUT: 1, POST: 2, DELETE: 3 }
  const fotografia = {}
  for (const [tab, id] of R._righe) {
    const { data } = await a.from(tab).select('*').eq('id', id).single()
    fotografia[`${tab}:${id}`] = JSON.stringify(Object.fromEntries(Object.entries(data).filter(([k]) => !/updated_at|_aggiornat/.test(k))))
  }
  const prove = []
  for (const r of tutte) {
    if (NON_PROVATE[r.route]) { saltate.push(`${r.route} (${NON_PROVATE[r.route]})`); continue }
    const p = percorsi(r.route, A, R)
    if (!p) { saltate.push(`${r.route} (nessun oggetto di prova)`); continue }
    for (const m of r.metodi) prove.push({ ...r, ...p, metodo: m })
  }
  prove.sort((x, y) => ordine[x.metodo] - ordine[y.metodo])
  let provate = 0
  for (const pr of prove) {
    for (const [chi, token] of [['azienda B', B.token], ['senza login', null]]) {
      const v = await chiama(pr.vero, token, pr.metodo)
      const f = await chiama(pr.finto, token, pr.metodo)
      provate++
      const sv = `${v.status} ${pulisci(v.corpo, R)}`, sf = `${f.status} ${pulisci(f.corpo, R)}`
      // Un «200» che non contiene niente di A e risponde uguale all'inventato è
      // una richiesta filtrata (zero righe toccate): non rivela né apre. Se le
      // ha toccate davvero lo dice il controllo nel database, alla fine.
      if (v.corpo.includes(M)) {
        problemi.push({ tipo: 'LETTA', riga: `${pr.metodo} /api/${pr.route} · ${chi} → ${v.status} con dentro i dati di A` })
      } else if (sv !== sf) {
        problemi.push({ tipo: 'RIVELA', riga: `${pr.metodo} /api/${pr.route} · ${chi}\n        vero:     ${sv.slice(0, 160)}\n        inventato: ${sf.slice(0, 160)}` })
      } else if (verbose) console.log(`  · ${pr.metodo} /api/${pr.route} · ${chi} → ${v.status}`)
    }
  }
  // Il rovescio: il titolare di A legge ogni sua cosa. Una correzione che
  // chiudesse la porta anche a lui sarebbe un guasto, non una difesa.
  // Chiuse al titolare per costruzione: si gestiscono da super_admin, vogliono
  // un parametro in più, o sono la porta di un altro tipo di entità.
  const CHIUSE_PER_COSTRUZIONE = ['aziende/[id]/credito-ai', 'aziende/[id]/utente', 'entita/[id]/stato-sito', 'properties/[id]', 'ristoranti/[id]']
  for (const pr of prove.filter(x => x.metodo === 'GET' && !/^(guest|blog\/public|booking\/public)\//.test(x.route) && !CHIUSE_PER_COSTRUZIONE.includes(x.route))) {
    const r = await chiama(pr.vero, A.token, 'GET')
    if (r.status < 200 || r.status >= 300) problemi.push({ tipo: 'CHIUSA AL TITOLARE', riga: `GET /api/${pr.route} · azienda A sulla sua cosa → ${r.status} ${r.corpo.slice(0, 100)}` })
  }
  // Le porte corrette il 16/10 funzionano ancora per chi ne ha il diritto.
  const sì = async (cosa, r, atteso = s => s >= 200 && s < 300) => { if (!atteso(r.status)) problemi.push({ tipo: 'CHIUSA AL TITOLARE', riga: `${cosa} → ${r.status} ${r.corpo.slice(0, 100)}` }) }
  await sì('POST commento di A sul suo post', await (async () => { const r = await fetch(`${BASE}/api/piano-editoriale/${R.post}/commenti`, { method: 'POST', headers: { Authorization: `Bearer ${A.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ testo: 'ZZ-A' }) }); return { status: r.status, corpo: await r.text() } })())
  // Il reinvio dell'invito a un utente proprio non si prova qui: manderebbe
  // un'email a ogni deploy. Verificato a mano il 16/10/2026 (200).
  await a.from('vetrine').update({ status: 'pubblicata' }).eq('id', R.vetrina)
  await sì('GET vetrina pubblicata dal sito', await chiama(`/api/guest/vetrina/${R.vetrina}`, null, 'GET'))
  await a.from('vetrine').update({ status: 'bozza' }).eq('id', R.vetrina)
  await a.from('pe_commenti').delete().eq('post_id', R.post).eq('testo', 'ZZ-A')
  // Dopo tutte le scritture e cancellazioni di B, i dati di A ci sono ancora, e
  // uguali a prima? (Le date di aggiornamento non contano: le tocca anche un trigger.)
  const senzaDate = r => JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => !/updated_at|_aggiornat/.test(k))))
  for (const [tab, id] of R._righe) {
    const { data } = await a.from(tab).select('*').eq('id', id).maybeSingle()
    if (!data) problemi.push({ tipo: 'CANCELLATA', riga: `una riga di «${tab}» dell'azienda A non c'è più dopo le richieste di B` })
    else if (senzaDate(data) !== fotografia[`${tab}:${id}`]) problemi.push({ tipo: 'MODIFICATA', riga: `una riga di «${tab}» dell'azienda A è cambiata dopo le richieste di B` })
  }
  // L'azienda B è nata vuota: una riga sua, a fine prova, l'ha creata una porta
  // partendo da un identificativo di A («duplica», «pianifica», un commento…).
  // Se contiene i dati di A, B se li è copiati.
  const conAzienda = ['contatti', 'eventi', 'newsletters', 'preventivi', 'form_builder', 'articoli', 'blog_categories', 'risorse', 'prenotazioni', 'offerte', 'prodotti', 'ordini', 'automazioni', 'blog_automazioni', 'piano_editoriale', 'pe_commenti', 'pe_campagne', 'hashtag_sets', 'idee_editoriali', 'recensioni', 'webhooks', 'collegamenti', 'gift_cards']
  for (const tab of conAzienda) {
    const { data } = await a.from(tab).select('*').eq('azienda_id', B.az)
    if (data?.length) problemi.push({ tipo: JSON.stringify(data).includes(M) ? 'COPIATA' : 'SCRITTA', riga: `«${tab}»: ${data.length} righe nuove dell'azienda B nate da richieste sugli oggetti di A` })
  }
  const { data: bookingsA } = await a.from('event_bookings').select('id').eq('event_id', R.evento)
  if ((bookingsA?.length || 0) > 1) problemi.push({ tipo: 'SCRITTA', riga: `«event_bookings»: B ha aggiunto ${bookingsA.length - 1} prenotazioni all'evento di A` })
  console.log(`${provate} confronti su ${prove.length} porte·metodo`)
  console.log(`non provate (${saltate.length}): ${saltate.map(s => s.split(' (')[0]).join(', ')}\n`)
  if (!problemi.length) console.log('✓ NESSUNA PORTA RIVELA COSA ESISTE')
  else {
    rossi = problemi.length
    console.log(`✗ ${problemi.length} PORTE DA GUARDARE\n`)
    for (const p of problemi) console.log(`  [${p.tipo}] ${p.riga}`)
  }
} catch (e) {
  rossi++; console.error('ERRORE:', e.message)
} finally {
  for (const x of [A, B]) {
    if (!x) continue
    await a.auth.admin.deleteUser(x.user).catch(() => {})
    await cancellaAziendaDiProva(x.az).catch(e => console.error('pulizia:', e.message))
  }
  console.log('\n[probe] aziende di prova eliminate')
  process.exitCode = rossi ? 1 : 0
}
