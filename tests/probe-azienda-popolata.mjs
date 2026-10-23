// Un'azienda di prova con UN OGGETTO DI OGNI TIPO dentro, e la mappa che dice
// quale oggetto va in ogni segmento dinamico di ogni porta.
//
// La usano le sonde che chiedono «chi può toccare le cose di quest'azienda?»:
// `probe-enumerazione.mjs` (un'altra azienda, chi non ha fatto login) e
// `probe-permessi-collaboratori.mjs` (un collaboratore della stessa azienda
// senza permessi). Una sola copia: un tipo aggiunto qui lo provano tutte.
//
// Tutti i recapiti sono finti (@playwright.internal, example.invalid) e ogni
// testo contiene `M`: se compare in una risposta, chi l'ha ricevuta ha letto.
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes } from 'crypto'
import { readdirSync, statSync, readFileSync } from 'fs'
import { join } from 'path'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } = process.env
export const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
export const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
export const t = Date.now().toString(36)
export const FINTO = '00000000-0000-4000-8000-000000000000'
export const SLUG_FINTO = `zz-non-esiste-${t}`
// La parola che segna i dati di A: se compare in una risposta a B, B li ha letti.
export const M = `ZZSEGRETO${t}`
export const API = '../client-next/app/api'

export function elencaRoute(dir, base = '') {
  const out = []
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome)
    if (statSync(p).isDirectory()) out.push(...elencaRoute(p, base ? `${base}/${nome}` : nome))
    else if (nome === 'route.js') out.push({ route: base, metodi: [...readFileSync(p, 'utf8').matchAll(/export async function (GET|POST|PATCH|PUT|DELETE)/g)].map(m => m[1]) })
  }
  return out
}

export async function creaAzienda(etichetta, sigla = 'ENUM') {
  const az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-${sigla}-${etichetta}-${t}`, require_2fa: false, moduli: { attivita: true } }).select().single(), 'azienda')
  const ent = await deve(a.from('entita').insert({ azienda_id: az.id, tipo: 'attivita', name: `ZZ ${sigla} ${etichetta}`, slug: `zz-${sigla.toLowerCase()}-${etichetta.toLowerCase()}-${t}`, active: true, minisito: { active: false } }).select().single(), 'entità')
  const email = `zz-${sigla.toLowerCase()}-${etichetta.toLowerCase()}-${t}@playwright.internal`
  const password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u, error } = await a.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error('utente: ' + error.message)
  await a.from('profiles').upsert({ id: u.user.id, role: 'admin_azienda', full_name: `ZZ ${etichetta}`, azienda_id: az.id }, { onConflict: 'id' })
  const { data: s } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })
  return { az: az.id, ent: ent.id, user: u.user.id, token: s.session.access_token }
}

// Un oggetto di ogni tipo nell'azienda A. Le cose con uno stato pubblico nascono
// NON pubblicate: sulle porte pubbliche devono sembrare inesistenti.
export async function popola(A) {
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
export const NON_PROVATE = {
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
export function valore(route, nome, A, R) {
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
export function percorsi(route, A, R) {
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
