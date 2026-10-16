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
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { readdirSync, statSync, readFileSync } from 'fs'
import { join } from 'path'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const verbose = process.argv.includes('--verbose')
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const t = Date.now().toString(36)
const FINTO = '00000000-0000-4000-8000-000000000000'
const SLUG_FINTO = `zz-non-esiste-${t}`
// La parola che segna i dati di A: se compare in una risposta a B, B li ha letti.
const M = `ZZSEGRETO${t}`
const API = '../client-next/app/api'

function elencaRoute(dir, base = '') {
  const out = []
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome)
    if (statSync(p).isDirectory()) out.push(...elencaRoute(p, base ? `${base}/${nome}` : nome))
    else if (nome === 'route.js') out.push({ route: base, metodi: [...readFileSync(p, 'utf8').matchAll(/export async function (GET|POST|PATCH|PUT|DELETE)/g)].map(m => m[1]) })
  }
  return out
}

async function creaAzienda(etichetta) {
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-ENUM-${etichetta}-${t}`, require_2fa: false, moduli: { attivita: true } }).select().single(), 'azienda')
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'attivita', name: `ZZ Enum ${etichetta}`, slug: `zz-enum-${etichetta.toLowerCase()}-${t}`, active: true, minisito: { active: false } }).select().single(), 'entità')
  const email = `zz-enum-${etichetta.toLowerCase()}-${t}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u, error } = await a.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error('utente: ' + error.message)
  await a.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', full_name: `ZZ ${etichetta}`, azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  return { az: az.id, ent: ent.id, user: u.user.id, token: s.session.access_token }
}

// Un oggetto di ogni tipo nell'azienda A. Le cose con uno stato pubblico nascono
// NON pubblicate: sulle porte pubbliche devono sembrare inesistenti.
async function popola(A) {
  const base = { azienda_id: A.az }, et = { entity_tipo: 'attivita', entity_id: A.ent }
  const ins = async (tab, riga) => { const r = await deve(a.from(tab).insert(riga).select().single(), tab); R._righe.push([tab, r.id]); return r }
  const R = { _righe: [] }
  R.contatto = (await ins('contatti', { ...base, nome: M, email: `zz-c-${t}@playwright.internal`, fonte: 'probe', pipeline_stage: null })).id
  const pagina = await ins('pagine', { ...et, slug: `zz-bozza-${t}`, titolo: M, status: 'bozza', blocks: [] })
  R.pagina = pagina.id; R.paginaSlug = pagina.slug
  R.evento = (await ins('eventi', { ...base, ...et, title: M, slug: `zz-ev-${t}`, date_start: new Date(Date.now() + 9e8).toISOString(), published: false, active: true, notify_owner_on_booking: false })).id
  R.booking = (await ins('event_bookings', { event_id: R.evento, guest_name: M, guest_email: `zz-b-${t}@playwright.internal`, seats: 1, status: 'confirmed' })).id
  R.newsletter = (await ins('newsletters', { ...base })).id
  R.preventivo = (await ins('preventivi', { ...base })).id
  const form = await ins('form_builder', { ...base, nome: M, attivo: false, campi: [] })
  R.form = form.id; R.formToken = form.token
  const art = await ins('articoli', { ...base, ...et, slug: `zz-art-${t}`, title: M, published: false, active: true })
  R.articolo = art.id; R.articoloSlug = art.slug
  R.categoria = (await ins('blog_categories', { ...base, name: M, slug: `zz-cat-${t}` })).id
  R.risorsa = (await ins('risorse', { ...base, ...et, nome: M, modalita: 'giornaliero', prezzo: 1, quantita: 1, attiva: false, visibile_minisito: false, disponibilita: {} })).id
  R.prenotazione = (await ins('prenotazioni', { ...base, ...et, risorsa_id: R.risorsa, data: '2031-01-01', cliente_nome: M, cliente_email: `zz-p-${t}@playwright.internal` })).id
  R.promo = (await ins('risorse_promozioni', { risorsa_id: R.risorsa, nome: M, prezzo_speciale: 1 })).id
  R.offerta = (await ins('offerte', { ...base, entity_id: A.ent, titolo: M, attiva: true, pubblicata: false, impegno: 'chiedi', modo: 'richiesta' })).id
  R.prodotto = (await ins('prodotti', { ...base, nome: M, prezzo: 1, attivo: false })).id
  R.ordine = (await ins('ordini', { ...base })).id
  R.vetrina = (await ins('vetrine', { ...et, titolo: M, preset: 'viaggi', slug: `zz-v-${t}`, status: 'bozza' })).id
  R.elemento = (await ins('vetrina_elementi', { vetrina_id: R.vetrina, ...et, titolo: M, slug: `zz-el-${t}`, status: 'bozza' })).id
  R.sezione = (await ins('sezioni', { ...et, nome: M, blocks: [] })).id
  R.automazione = (await ins('automazioni', { ...base, ...et, nome: M, trigger_evento: 'nuovo_contatto', attiva: false, steps: [] })).id
  R.blogAuto = (await ins('blog_automazioni', { ...base, ...et })).id
  R.post = (await ins('piano_editoriale', { ...base })).id
  R.commento = (await ins('pe_commenti', { ...base, post_id: R.post, author_id: A.user, testo: M })).id
  R.campagna = (await ins('pe_campagne', { ...base })).id
  R.hashtag = (await ins('hashtag_sets', { ...base })).id
  R.idea = (await ins('idee_editoriali', { ...base })).id
  R.recensione = (await ins('recensioni', { ...base, ...et, stelle: 5 })).id
  R.request = (await ins('requests', { property_id: A.ent, type: 'reception', message: M })).id
  R.webhook = (await ins('webhooks', { ...base, nome: M, url: 'https://example.invalid/zz' })).id
  R.collegamento = (await ins('collegamenti', { ...base, from_tipo: 'pagina', from_id: R.pagina, to_tipo: 'evento', to_id: R.evento })).id
  R.snapshot = (await ins('site_snapshots', { ...et })).id
  R.gift = (await ins('gift_cards', { ...base, codice: `ZZ${t}`, valore_iniziale: 1, valore_residuo: 1 })).id
  return R
}

// Il valore VERO di A per ogni segmento. null = la porta non si prova, con il motivo.
const NON_PROVATE = {
  // Il segreto È l'identificativo: chi lo conosce ha il diritto di aprire. Il
  // token di un modulo è un codice casuale che non si indovina, e chi lo apre
  // deve poter leggere «modulo non attivo».
  'form-builder/public/[token]': 'link con segreto', 'form-builder/public/[token]/submit': 'link con segreto', 'guest/recensione/[token]': 'link con segreto',
  'public/preventivo/[token]': 'link con segreto', 'public/preventivo/[token]/accetta': 'link con segreto',
  // Dati di un sito o di un'azienda che sono pubblici per costruzione.
  'guest/[slug]': 'sito pubblico', 'guest/a/[slug]': 'sito pubblico', 'guest/r/[slug]': 'sito pubblico',
  'guest/llms/[tipo]/[slug]': 'sito pubblico', 'guest/sitemap/[tipo]/[slug]': 'sito pubblico', 'llms/[tipo]/[slug]': 'sito pubblico',
  'manifest/[tipo]/[slug]': 'sito pubblico', 'sitemap/[tipo]/[slug]': 'sito pubblico', 'guest/canali/[entityTipo]/[entityId]': 'sito pubblico',
  'guest/pagine/[tipo]/[entityId]': 'sito pubblico', 'guest/recensioni/[tipo]/[entityId]': 'sito pubblico',
  'booking/public/risorse/[entityTipo]/[entityId]': 'sito pubblico', 'newsletter/archive/[entityTipo]/[entityId]': 'sito pubblico',
  'loyalty/public/[aziendaId]/gift-card': 'negozio pubblico', 'loyalty/public/[aziendaId]/saldo': 'negozio pubblico',
  'shop/public/[azienda_id]/ordine': 'negozio pubblico', 'shop/public/[azienda_id]/prodotti': 'negozio pubblico',
  // Solo super_admin, su cose della piattaforma e non di un'azienda: 404 a tutti gli altri.
  'admin/profili/[id]': 'piattaforma', 'admin/profili/[id]/riapplica': 'piattaforma', 'club/regia/[id]': 'piattaforma',
  'club/regia/consigli/[id]': 'piattaforma', 'club/[id]/gesto': 'piattaforma', 'demo/[id]': 'piattaforma',
  // Nessun dominio vero nelle aziende di prova: una riga in `domini` la prenderebbe il giro di manutenzione.
  'domini/[id]': 'niente domini di prova', 'domini/[id]/verify': 'niente domini di prova',
}
function valore(route, nome, A, R) {
  const s = route
  if (nome === 'tipo' || nome === 'entityTipo') return s.startsWith('translations') ? 'pagina' : 'attivita'
  if (s.startsWith('admin/backup/azienda') || s.startsWith('aziende/')) return nome === 'uid' ? A.user : A.az
  if (s.startsWith('admin/entita') || s.startsWith('attivita/') || s.startsWith('properties/') || s.startsWith('ristoranti/') || s.startsWith('entita/')) return A.ent
  if (s.startsWith('users/')) return A.user
  if (s.startsWith('guest/pagina/')) return nome === 'entityId' ? A.ent : R.paginaSlug
  if (s.startsWith('guest/eventi/')) return R.evento
  if (s.startsWith('guest/vetrina/')) return R.vetrina
  if (s.startsWith('blog/public/')) return R.articoloSlug
  if (s.startsWith('form-builder/public/')) return R.formToken
  if (s.startsWith('booking/public/disponibilita')) return R.risorsa
  if (s.startsWith('piano-editoriale/[id]/commenti/[cid]')) return nome === 'cid' ? R.commento : R.post
  const mappa = [
    ['automazioni/', R.automazione], ['blog-automazioni/', R.blogAuto], ['blog/categories/', R.categoria], ['blog/', R.articolo],
    ['booking/prenotazioni/', R.prenotazione], ['booking/promozioni/', R.promo], ['booking/risorse/', R.risorsa],
    ['collegamenti/', R.collegamento], ['contatti/', R.contatto], ['eventi/bookings/', R.booking], ['eventi/', R.evento],
    ['form-builder/', R.form], ['loyalty/contatto/', R.contatto], ['loyalty/gift-cards/', R.gift], ['newsletter/', R.newsletter],
    ['offerte/', R.offerta], ['pagine/', R.pagina], ['piano-editoriale/campagne/', R.campagna], ['piano-editoriale/hashtag-sets/', R.hashtag],
    ['piano-editoriale/idee/', R.idea], ['piano-editoriale/', R.post], ['preventivi/', R.preventivo], ['recensioni/', R.recensione],
    ['requests/', R.request], ['sezioni/', R.sezione], ['shop/ordini/', R.ordine], ['shop/prodotti/', R.prodotto],
    ['sito-snapshots/', R.snapshot], ['translations/', R.pagina], ['vetrina-elementi/', R.elemento], ['vetrine/', R.vetrina], ['webhooks/', R.webhook],
  ]
  for (const [pre, v] of mappa) if (s.startsWith(pre)) return v
  return null
}
// Il percorso vero e quello inventato: cambia solo l'ultimo segmento dinamico,
// quello che indica la cosa cercata. Gli altri restano veri.
function percorsi(route, A, R) {
  const segmenti = route.split('/')
  const dinamici = segmenti.map((x, i) => /^\[.+\]$/.test(x) ? i : -1).filter(i => i >= 0)
  const ultimo = dinamici[dinamici.length - 1]
  const vero = [], finto = []
  for (const [i, x] of segmenti.entries()) {
    if (!dinamici.includes(i)) { vero.push(x); finto.push(x); continue }
    const nome = x.slice(1, -1)
    const v = valore(route, nome, A, R)
    if (v == null) return null
    vero.push(v)
    const inventato = nome === 'tipo' || nome === 'entityTipo' ? v : /slug|token/i.test(nome) && !/^[0-9a-f-]{36}$/.test(v) ? SLUG_FINTO : FINTO
    finto.push(i === ultimo ? inventato : v)
  }
  return { vero: '/api/' + vero.join('/'), finto: '/api/' + finto.join('/') }
}

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
