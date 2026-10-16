// Sonda: lo «Stile sezione» vale allo stesso modo per TUTTI i blocchi?
//
// Mette ogni blocco in una pagina di prova e lo ripete con ogni opzione dello
// Stile (sfondo scuro, colore del sito, sfumato, immagine, alone, etichetta,
// spaziatura, allineamento, colore delle icone). Poi apre le pagine col
// browser e MISURA, blocco per blocco:
//   · se lo sfondo scelto arriva davvero alla sezione;
//   · se ogni testo si legge sul fondo su cui sta (contrasto);
//   · se l'etichetta compare, la spaziatura cambia, l'allineamento sposta il
//     titolo, le icone prendono il colore scelto.
// Il risultato è una tabella blocco × opzione: dove una scelta non fa niente,
// o rende il blocco illeggibile.
//
// A mano. Uso: cd tests && node probe-stile-blocchi.mjs [cartella-foto] [--solo tipo1,tipo2] [--sito-scuro]
//      $env:TEST_URL='http://localhost:3000' per il locale.
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'
import { config } from 'dotenv'
import fs from 'fs'
import { cancellaAziendaDiProva } from './probe-auth.mjs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = (process.env.TEST_URL || 'https://www.oltrenova.com').replace(/\/$/, '')
const args = process.argv.slice(2)
const iSolo = args.indexOf('--solo')
const SOLO = iSolo >= 0 ? args[iSolo + 1].split(',') : null
const FOTO = args.find((x, i) => !x.startsWith('--') && args[i - 1] !== '--solo' && args[i - 1] !== '--varianti') || null
if (FOTO) fs.mkdirSync(FOTO, { recursive: true })
const a = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const deve = async (q, cosa) => { const { data, error } = await q; if (error) throw new Error(`${cosa}: ${error.message}`); return data }
const t = Date.now().toString(36)

const PRIMARIO = '#2a5bd7', SECONDARIO = '#c2410c'
// Con --sito-scuro il sito ha il fondo scuro (come Metodo TVB): lì è un fondo CHIARO della sezione a poter rompere.
const SITO_SCURO = args.includes('--sito-scuro')
const FOTO_SFONDO = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=70'
const FOTO_X = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=70'
const ICONA = '#ff0080'

// Ogni blocco con contenuti che lo fanno disegnare.
const DATI = {
  hero: { title: 'ZZ Copertina', tagline: 'ZZ Frase sotto', cta1_text: 'ZZ Prenota', cta1_url: '#', height: 'medium' },
  about: { title: 'ZZ Blocco testo', text: 'ZZ Un paragrafo di testo per vedere come si legge.' },
  titolo: { title: 'ZZ Un titolo', subtitle: 'ZZ Una riga sotto', size: 'medium' },
  citazione: { text: 'ZZ Una frase in grande.', author: 'ZZ Autore', role: 'ZZ Ruolo' },
  pulsante: { text: 'ZZ Pulsante', url: '#', style: 'outline', size: 'medium', align: 'center' },
  foto_testo: { title: 'ZZ Foto e testo', text: 'ZZ Il testo accanto alla foto.', image_url: FOTO_X, button_label: 'ZZ Scopri', button_url: '#' },
  paragrafi: { titolo: 'ZZ Schede', items: [{ id: 'p1', icon: 'star', title: 'ZZ Prima', text: 'ZZ Testo uno.' }, { id: 'p2', icon: 'heart', title: 'ZZ Seconda', text: 'ZZ Testo due.' }] },
  team: { titolo: 'ZZ Le persone', variant: 'griglia', items: [{ id: 't1', nome: 'ZZ Mario', ruolo: 'ZZ Insegnante', bio: 'ZZ Due righe.' }, { id: 't2', nome: 'ZZ Anna', ruolo: 'ZZ Direttrice', bio: 'ZZ Due righe.' }] },
  steps: { titolo: 'ZZ Come funziona', items: [{ id: 's1', icon: 'check-circle', title: 'ZZ Primo', text: 'ZZ Testo.' }, { id: 's2', icon: 'check-circle', title: 'ZZ Secondo', text: 'ZZ Testo.' }] },
  colonne: { titolo: 'ZZ Colonne', columns: 2, items: [{ id: 'c1', title: 'ZZ Col uno', text: 'ZZ Testo uno.' }, { id: 'c2', title: 'ZZ Col due', text: 'ZZ Testo due.' }] },
  accordion: { titolo: 'ZZ Fisarmonica', items: [{ id: 'a1', title: 'ZZ Voce uno', text: 'ZZ Contenuto.' }, { id: 'a2', title: 'ZZ Voce due', text: 'ZZ Contenuto.' }] },
  linguette: { titolo: 'ZZ Linguette', items: [{ id: 'l1', title: 'ZZ Prima', text: 'ZZ Contenuto uno.' }, { id: 'l2', title: 'ZZ Seconda', text: 'ZZ Contenuto due.' }] },
  tabella: { titolo: 'ZZ Tabella', intestazioni: ['', 'ZZ Base', 'ZZ Plus'], evidenzia: 2, nota: 'ZZ Una nota.', items: [{ id: 'r1', celle: ['ZZ Riga', '✓', '✗'] }, { id: 'r2', celle: ['ZZ Prezzo', '10 €', '20 €'] }] },
  mosaico: { titolo: 'ZZ Mosaico', sottotitolo: 'ZZ Sotto', items: [
    { id: 'm1', title: 'ZZ Grande', text: 'ZZ Testo.', size: 'big', style: 'dark' },
    { id: 'm2', title: 'ZZ Numero', value: '00', size: '', style: '' },
    { id: 'm3', title: 'ZZ Colore', text: 'ZZ Testo.', icon: 'star', size: '', style: 'color' },
    { id: 'm4', title: 'ZZ Largo', text: 'ZZ Testo.', icon: 'heart', size: 'wide', style: '' }] },
  scorrevole: { items: [{ id: 'w1', text: 'ZZ Parola' }, { id: 'w2', text: 'ZZ Altra' }] },
  divisore: { variant: 'line', size: 'medium' },
  social: { titolo: 'ZZ Social', items: [{ id: 'so1', network: 'instagram', url: 'https://instagram.com/x' }, { id: 'so2', network: 'facebook', url: 'https://facebook.com/x' }] },
  highlights: { titolo: 'ZZ Punti', items: [{ id: 'h1', icon: 'star', text: 'ZZ Punto uno' }, { id: 'h2', icon: 'heart', text: 'ZZ Punto due' }] },
  stats: { titolo: 'ZZ Numeri', items: [{ id: 'n1', value: '10', label: 'ZZ anni' }, { id: 'n2', value: '250', label: 'ZZ clienti' }] },
  cta_banner: { title: 'ZZ Invito', subtitle: 'ZZ Frase', button_text: 'ZZ Vai', button_url: '#' },
  annuncio: { text: 'ZZ Annuncio', link_text: 'ZZ Leggi', link_url: '#', bg: 'primary' },
  countdown: { titolo: 'ZZ Manca poco', sottotitolo: 'ZZ Al via', target: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 16) },
  testimonianze: { titolo: 'ZZ Dicono di noi', items: [{ id: 'q1', text: 'ZZ Bellissimo.', author: 'ZZ Luca', rating: 5 }, { id: 'q2', text: 'ZZ Ottimo.', author: 'ZZ Sara', rating: 4 }] },
  promozioni: { titolo: 'ZZ Promozioni', items: [{ id: 'pr1', badge: 'ZZ -10', title: 'ZZ Promo', text: 'ZZ Cosa comprende.', cta_label: 'ZZ Prendi', cta_url: '#' }] },
  pacchetti: { titolo: 'ZZ Pacchetti', items: [{ id: 'pk1', name: 'ZZ Base', tagline: 'ZZ Riga', price: '10', price_label: 'ZZ al mese', features: ['ZZ Uno', 'ZZ Due'], cta_label: 'ZZ Scegli', cta_url: '#' }, { id: 'pk2', badge: 'ZZ Top', name: 'ZZ Plus', tagline: 'ZZ Riga', price: '20', cta_label: 'ZZ Scegli', cta_url: '#' }] },
  listino: { titolo: 'ZZ Listino', sottotitolo: 'ZZ Sotto', nota: 'ZZ Nota', items: [{ id: 'li1', name: 'ZZ Voce', description: 'ZZ Descrizione', price: '25 €' }, { id: 'li2', name: 'ZZ Altra', description: '', price: '30 €' }] },
  faq: { titolo: 'ZZ Domande', items: [{ id: 'f1', question: 'ZZ Domanda?', answer: 'ZZ Risposta.' }, { id: 'f2', question: 'ZZ Altra?', answer: 'ZZ Sì.' }] },
  clienti: { titolo: 'ZZ Clienti', items: [{ id: 'cl1', logo_url: FOTO_X }, { id: 'cl2', logo_url: FOTO_X }] },
  carosello: { titolo: 'ZZ Carosello', autoplay: false, items: [{ id: 'k1', title: 'ZZ Scheda uno', text: 'ZZ Testo.' }, { id: 'k2', title: 'ZZ Scheda due', text: 'ZZ Testo.' }, { id: 'k3', title: 'ZZ Scheda tre', text: 'ZZ Testo.' }] },
  immagine: { image_url: FOTO_X, alt: 'ZZ', caption: 'ZZ Didascalia', width: 'large' },
  galleria_immagini: { titolo: 'ZZ Galleria', columns: 3, images: [{ id: 'g1', url: FOTO_X }, { id: 'g2', url: FOTO_X }, { id: 'g3', url: FOTO_X }] },
  video: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', titolo: 'ZZ Video', testo: 'ZZ Testo del video.' },
  before_after: { before_url: FOTO_X, after_url: FOTO_X },
  eventi: { titolo: 'ZZ Eventi' },
  eventi_slider: { titolo: 'ZZ Slider eventi', sottotitolo: 'ZZ Sotto', autoplay: false, cta_label: 'ZZ Tutti', cta_url: '#' },
  newsletter: { title: 'ZZ Newsletter', subtitle: 'ZZ Iscriviti' },
  recapiti: { titolo: 'ZZ Contatti', sottotitolo: 'ZZ Sotto', mostra_mappa: false },
  show_map: {},
  // I blocchi che leggono i dati dell'attività: l'entità e le tabelle di prova
  // qui sotto li riempiono (menù, servizi, offerte, prodotti, articoli…).
  hero_slider: { height: 'medium', autoplay: false, slides: [{ id: 'hs1', title: 'ZZ Diapositiva', subtitle: 'ZZ Sotto', cta1_text: 'ZZ Vai', cta1_url: '#' }] },
  embed: { html: '<p>ZZ incorporato</p>', height: 120 },
  punteggio: { titolo: 'ZZ Il voto', sottotitolo: 'ZZ Da Google' },
  gallery: { titolo: 'ZZ Le foto', sottotitolo: 'ZZ Sotto' },
  booking: {},
  menu: { titolo: 'ZZ Il menù' },
  services: { titolo: 'ZZ Servizi', sottotitolo: 'ZZ Sotto' },
  activities: { titolo: 'ZZ Attività' },
  excursions: { titolo: 'ZZ Escursioni' },
  offerte: { titolo_sezione: 'ZZ Offerte' },
  shop: { titolo_sezione: 'ZZ Negozio' },
  news: { titolo: 'ZZ Articoli' },
  form_builder: { titolo_sezione: 'ZZ Scrivici' },   // form_token: dopo aver creato il modulo
  vetrina: { titolo: 'ZZ Vetrina' },                  // vetrina_id: dopo aver creato la vetrina
}

// Le opzioni dello Stile, una pagina per ognuna.
const VARIANTI = {
  base: {},
  scuro: { bg: 'dark' },
  colore: { bg: 'primary' },
  sfumato: { bg: 'gradient' },
  immagine: { bg: 'image', bg_image: FOTO_SFONDO, bg_overlay: 0.55 },
  grigio: { bg: 'muted' },
  bianco: { bg: 'white' },
  alone_etichetta: { glow: 'primary', etichetta: 'ZZ ETICHETTA' },
  spazio: { paddingY: 'xl' },
  sinistra: { align: 'left' },
  destra: { align: 'right' },
  icone: { iconColor: ICONA },
}
const iVar = args.indexOf('--varianti')
const SCELTE = Object.entries(VARIANTI).filter(([v]) => iVar < 0 || args[iVar + 1].split(',').includes(v))
// Il fondo di riferimento per misurare un testo che sta direttamente sulla sezione.
// Blocchi a cui il pannello non offre lo sfondo né l'alone (BG_EXCLUDED_TYPES).
const SENZA_SFONDO = ['hero', 'hero_slider', 'video', 'divisore', 'annuncio', 'menu', 'popup']
const RIFERIMENTO = { scuro: ['#14141f'], colore: [PRIMARIO], sfumato: [PRIMARIO, SECONDARIO], immagine: ['#3a3a3a'] }

let az = null, browser = null
const risultati = {}   // tipo → variante → { problemi: [] }
try {
  az = await deve(a.from('aziende').insert({ ragione_sociale: `ZZ-STILE-${t}`, require_2fa: false, moduli: { ristorante: true } }).select().single(), 'azienda')
  const slug = `zz-stile-${t}`
  const ent = await deve(a.from('entita').insert({
    azienda_id: az.id, tipo: 'ristorante', name: 'ZZ Stile', slug, active: true,
    minisito: { active: true }, theme: { primaryColor: PRIMARIO, secondaryColor: SECONDARIO, ...(SITO_SCURO ? { bgColor: '#0b0f14', textColor: '#eaf0f4' } : {}) },
    address: 'Via Roma 1, Terni', phone: '+39 0744 000000', email: 'zz@playwright.internal',
    gallery: [FOTO_X, FOTO_X, FOTO_X],
    services: [{ id: 'sv1', icon: 'wifi', name: 'ZZ Wifi', hours: 'ZZ Sempre' }, { id: 'sv2', icon: 'parking', name: 'ZZ Parcheggio' }],
    menu: [{ id: 'mn1', name: 'ZZ Carta', categories: [{ id: 'mc1', name: 'ZZ Antipasti', items: [{ id: 'mi1', name: 'ZZ Bruschetta', description: 'ZZ Pane e pomodoro', price: 6, active: true }] }] }],
    recensioni_esterne: { google: { rating: 4.6, totale: 120, aggiornato: new Date().toISOString() } },
  }).select().single(), 'entità')
  // Offerte: una nata come attività (blocco Attività), una no (Escursioni e Offerte).
  for (const [titolo, origine] of [['ZZ Corso di cucina', 'attivita'], ['ZZ Gita in barca', null]]) {
    await deve(a.from('offerte').insert({ azienda_id: az.id, entity_id: ent.id, titolo, descrizione: 'ZZ Cosa comprende', luogo: 'ZZ Terni', prezzo: 30, attiva: true, pubblicata: true, impegno: 'chiedi', modo: 'richiesta', ...(origine ? { origine } : {}) }).select('id').single(), `offerta ${titolo}`)
  }
  await deve(a.from('prodotti').insert({ azienda_id: az.id, nome: 'ZZ Bottiglia', descrizione: 'ZZ Vino rosso', prezzo: 12, attivo: true }).select('id').single(), 'prodotto')
  await deve(a.from('articoli').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, slug: `zz-art-${t}`, title: 'ZZ Un articolo', excerpt: 'ZZ Riassunto', published: true, published_at: new Date().toISOString(), active: true }).select('id').single(), 'articolo')
  await deve(a.from('risorse').insert({ azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, nome: 'ZZ Tavolo', modalita: 'giornaliero', prezzo: 10, quantita: 1, attiva: true, visibile_minisito: true, disponibilita: {} }).select('id').single(), 'risorsa')
  const modulo = await deve(a.from('form_builder').insert({ azienda_id: az.id, nome: 'ZZ Modulo', attivo: true, campi: [{ id: 'nome', tipo: 'text', label: 'ZZ Nome', required: true }] }).select('token').single(), 'modulo')
  DATI.form_builder.form_token = modulo.token
  const vt = await deve(a.from('vetrine').insert({ entity_tipo: 'ristorante', entity_id: ent.id, titolo: 'ZZ Catalogo', preset: 'viaggi', slug: `zz-v-${t}`, status: 'pubblicata' }).select('id').single(), 'vetrina')
  await deve(a.from('vetrina_elementi').insert({ vetrina_id: vt.id, entity_tipo: 'ristorante', entity_id: ent.id, titolo: 'ZZ Viaggio', slug: `zz-el-${t}`, status: 'pubblicata', valore_primario: '790' }).select('id').single(), 'elemento vetrina')
  DATI.vetrina.vetrina_id = vt.id
  for (const n of [1, 2]) {
    await deve(a.from('eventi').insert({
      azienda_id: az.id, entity_tipo: 'ristorante', entity_id: ent.id, title: `ZZ Serata ${n}`, slug: `zz-serata-${n}-${t}`,
      date_start: new Date(Date.now() + (n + 5) * 86400000).toISOString(), cover_url: FOTO_X,
      published: true, active: true, notify_owner_on_booking: false,
    }).select('id').single(), `evento ${n}`)
  }
  const tipi = Object.keys(DATI).filter(x => !SOLO || SOLO.includes(x))
  // Una pagina per variante. Un titolo in cima, così nessun blocco diventa l'H1.
  for (const [v, stile] of SCELTE) {
    const blocks = [{ id: 'apri', type: 'titolo', data: { title: 'ZZ Pagina ' + v } }]
    for (const tipo of tipi) {
      // Ai blocchi con un fondo loro il pannello non offre né sfondo né alone: non si provano.
      const { glow, ...senzaAlone } = stile
      const suo = SENZA_SFONDO.includes(tipo) ? senzaAlone : stile
      blocks.push({ id: `x-${tipo}`, type: tipo, data: DATI[tipo], style: { ...suo, anchor: `b-${tipo.replace(/_/g, '-')}` } })
    }
    await deve(a.from('pagine').insert({ entity_tipo: 'ristorante', entity_id: ent.id, slug: `zz-${v.replace(/_/g, '-')}`, titolo: v, status: 'pubblicata', blocks }).select('id').single(), `pagina ${v}`)
  }

  browser = await chromium.launch()
  const ctx = await browser.newContext({ locale: 'it-IT', viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie_consent_v2', JSON.stringify({ necessari: true, analitici: false, marketing: false, il: new Date().toISOString() })) } catch {} })
  const page = await ctx.newPage()
  const errori = []
  page.on('pageerror', e => errori.push(e.message))

  for (const [v, stile] of SCELTE) {
    const url = `${BASE}/r/${slug}/p/zz-${v.replace(/_/g, '-')}`
    const r = await page.goto(url, { waitUntil: 'load', timeout: 60000 }); await page.waitForTimeout(2500)
    if (r.status() !== 200) { console.log(`✗ ${v}: ${r.status()} ${url}`); continue }
    // Ogni sezione deve comparire: niente animazione di comparsa a metà.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)) }
      document.querySelectorAll('.lbr-reveal').forEach(e => e.classList.add('in'))
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(900)
    if (FOTO && !args.includes('--foto-blocchi')) await page.screenshot({ path: `${FOTO}/stile-${v}.png`, fullPage: true })
    const misure = await page.evaluate(({ tipi, v, stile, RIF, ICONA, SENZA_SFONDO }) => {
      const rgb = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 } }
      const hex = h => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16), a: 1 })
      const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4) }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b) }
      const contr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
      const mescola = (sopra, sotto) => ({ r: sopra.r * sopra.a + sotto.r * (1 - sopra.a), g: sopra.g * sopra.a + sotto.g * (1 - sopra.a), b: sopra.b * sopra.a + sotto.b * (1 - sopra.a), a: 1 })
      // Il fondo sotto un elemento: il primo antenato con un colore pieno o un'immagine.
      // Sulla radice della sezione con sfumato/immagine si usa il riferimento della variante.
      const fondi = (el, radice) => {
        let strati = []
        for (let e = el; e; e = e.parentElement) {
          const cs = getComputedStyle(e)
          const img = cs.backgroundImage && cs.backgroundImage !== 'none'
          if (img && /url\(|linear-gradient/.test(cs.backgroundImage)) {
            if (e === radice && RIF[v] && !SENZA_SFONDO.includes(radice.dataset.tipo)) return RIF[v].map(h => strati.reduceRight((acc, s) => mescola(s, acc), hex(h)))
            return null   // una foto o uno sfumato interno: non si giudica
          }
          const c = rgb(cs.backgroundColor)
          if (c && c.a > 0) { if (c.a >= 0.95) return [strati.reduceRight((acc, s) => mescola(s, acc), c)]; strati.push(c) }
        }
        return [strati.reduceRight((acc, s) => mescola(s, acc), { r: 255, g: 255, b: 255, a: 1 })]
      }
      const out = {}
      for (const tipo of tipi) {
        const id = 'b-' + tipo.replace(/_/g, '-')
        const radice = document.getElementById(id)
        const m = out[tipo] = { problemi: [], info: {} }
        if (!radice) { m.problemi.push('LA SEZIONE NON RICEVE LO STILE (niente sfondo, spaziatura, àncora)'); continue }
        radice.dataset.tipo = tipo
        const senzaSfondo = SENZA_SFONDO.includes(tipo)
        const rr = radice.getBoundingClientRect()
        if (rr.height < 2) { m.problemi.push('sezione vuota o nascosta'); continue }
        const cs = getComputedStyle(radice)
        // Sfondo
        if (stile.bg && !senzaSfondo) {
          const bi = cs.backgroundImage, bc = cs.backgroundColor
          const atteso = { dark: () => /20, 20, 31/.test(bc), muted: () => /244, 244, 247/.test(bc), primary: () => /42, 91, 215/.test(bc), gradient: () => /linear-gradient/.test(bi), image: () => /url\(/.test(bi) }[stile.bg]
          if (atteso && !atteso()) m.problemi.push(`lo sfondo «${stile.bg}» non arriva (${bc} ${bi.slice(0, 40)})`)
        }
        if (stile.glow && !senzaSfondo && !/radial-gradient/.test(cs.backgroundImage)) m.problemi.push('l’alone non arriva')
        // Annuncio e divisore non hanno un titolo: lì l'etichetta non si mette, di proposito.
        if (stile.etichetta && !['annuncio', 'divisore'].includes(tipo)) {
          const et = [...radice.querySelectorAll('div')].find(d => d.textContent.trim() === 'ZZ ETICHETTA' && !d.children.length)
          if (!et) m.problemi.push('l’etichetta non compare')
          else if (et.getBoundingClientRect().height < 4) m.problemi.push('l’etichetta c’è ma non si vede')
        }
        if (stile.paddingY) {
          const pt = parseFloat(cs.paddingTop)
          if (Math.abs(pt - 128) > 2) m.problemi.push(`la spaziatura «Extra» non cambia niente (sopra: ${pt}px)`)
        }
        // Testi: contrasto sul fondo su cui stanno davvero.
        const walker = document.createTreeWalker(radice, NodeFilter.SHOW_TEXT)
        const deboli = []
        let n
        while ((n = walker.nextNode())) {
          const tx = n.textContent.trim()
          if (tx.length < 2 || !/[\p{L}\p{N}]/u.test(tx)) continue
          const el = n.parentElement
          const ecs = getComputedStyle(el)
          if (ecs.visibility === 'hidden' || ecs.display === 'none' || el.closest('[hidden]')) continue
          // Un comando disattivato (un giorno già passato nel calendario) si
          // mostra spento di proposito: la regola del contrasto non lo conta.
          if (el.closest('button:disabled')) continue
          const br = el.getBoundingClientRect()
          if (br.width < 1 || br.height < 1) continue
          if (parseFloat(ecs.opacity) < 0.1) continue
          let col = rgb(ecs.color)
          if (!col) continue
          if (col.a === 0) { if (ecs.webkitTextStrokeWidth && parseFloat(ecs.webkitTextStrokeWidth) > 0) col = rgb(ecs.webkitTextStrokeColor); else continue }
          const fs = fondi(el, radice)
          if (!fs) continue
          const peggiore = Math.min(...fs.map(f => contr(col.a < 1 ? mescola(col, f) : col, f)))
          const grande = parseFloat(ecs.fontSize) >= 24 || (parseFloat(ecs.fontSize) >= 18.6 && parseInt(ecs.fontWeight) >= 700)
          const soglia = grande ? 3 : 4.5
          if (peggiore < soglia) deboli.push(`«${tx.slice(0, 28)}» ${peggiore.toFixed(2)}${peggiore < 2 ? ' ✗✗' : ''}`)
        }
        if (deboli.length) m.problemi.push('testi che non si leggono: ' + [...new Set(deboli)].slice(0, 6).join(' · '))
        // Allineamento: il titolo (o il primo testo) si sposta?
        if (stile.align) {
          const tit = radice.querySelector('h1,h2,h3') || [...radice.querySelectorAll('p,span,div')].find(e => e.textContent.trim().startsWith('ZZ') && !e.children.length)
          if (tit) {
            const sez = tit.closest('.lbr-section') || radice
            const sr = sez.getBoundingClientRect()
            const range = document.createRange(); range.selectNodeContents(tit)
            const tr = range.getBoundingClientRect()
            const daSx = tr.left - sr.left, daDx = sr.right - tr.right
            // Il titolo è allineato se sta dal lato giusto della sua sezione; fuori
            // dalla copertina basta anche il text-align (una riga con più pezzi,
            // una colonna accanto alla foto). Le parole che scorrono non si allineano.
            if (tipo === 'scorrevole') continue
            const ok = (stile.align === 'left' ? daSx < 60 : daDx < 60) || (tipo !== 'hero' && getComputedStyle(tit).textAlign === stile.align)
            m.info.allineamento = `${Math.round(daSx)}|${Math.round(daDx)}`
            if (!ok) m.problemi.push(`l’allineamento «${stile.align}» non sposta il titolo («${tit.textContent.trim().slice(0, 20)}» a ${Math.round(daSx)}px da sx, ${Math.round(daDx)}px da dx)`)
          }
        }
        // Icone
        if (stile.iconColor) {
          // Anche frecce e «✗» seguono la scelta. Restano fuori: un'icona su un
          // riquadro colorato del mosaico (chiara per leggersi), le frecce bianche
          // dello slider sopra le foto, i segni nei componenti del menù e della
          // prenotazione (che hanno i colori dell'app), il logo di Google e le
          // stelle gialle del voto (sono il marchio e il dato, non decorazioni).
          // Menù e prenotazione: componenti dell'app, misurati per il contrasto.
          const suRiquadroColorato = s => { for (let e = s.parentElement; e && e !== radice; e = e.parentElement) if (/gradient/.test(getComputedStyle(e).backgroundImage)) return true; return false }
          const fuori = ['hero_slider', 'menu', 'booking', 'punteggio'].includes(tipo)
          // Un'icona dentro un pulsante pieno («+ Aggiungi») è parte della scritta del pulsante.
          const inPulsantePieno = s => { const b = s.closest('button, a'); if (!b || !radice.contains(b)) return false; const c = rgb(getComputedStyle(b).backgroundColor); return !!(c && c.a > 0.5) }
          const svgs = fuori ? [] : [...radice.querySelectorAll('svg')].filter(s => s.getBoundingClientRect().width > 6 && !suRiquadroColorato(s) && !inPulsantePieno(s))
          if (svgs.length) {
            const target = rgb('rgb(255, 0, 128)')
            const prese = svgs.filter(s => { const c = rgb(getComputedStyle(s).color); const st = rgb(getComputedStyle(s).stroke); const f = rgb(getComputedStyle(s).fill); return [c, st, f].some(x => x && x.r === 255 && x.g === 0 && x.b === 128) })
            m.info.icone = `${prese.length}/${svgs.length}`
            if (prese.length < svgs.length) m.problemi.push(`colore icone: ${prese.length} su ${svgs.length} icone lo prendono (${svgs.filter(x => !prese.includes(x)).map(x => (x.getAttribute('class') || '?').replace('lucide ', '')).join(', ')})`)
          }
        }
      }
      return out
    }, { tipi, v, stile, RIF: RIFERIMENTO, ICONA, SENZA_SFONDO })
    for (const [tipo, m] of Object.entries(misure)) { (risultati[tipo] ||= {})[v] = m }
    // --foto-blocchi: una fotografia per blocco, per guardarli e non solo misurarli.
    if (FOTO && args.includes('--foto-blocchi')) {
      for (const tipo of tipi) {
        const el = page.locator('#b-' + tipo.replace(/_/g, '-'))
        if (await el.count()) await el.screenshot({ path: `${FOTO}/${v}-${tipo}.png` }).catch(() => {})
      }
    }
    const conProblemi = Object.entries(misure).filter(([, m]) => m.problemi.length)
    console.log(`\n── ${v.toUpperCase()} (${JSON.stringify(stile)}) — ${conProblemi.length} blocchi su ${tipi.length} con qualcosa che non va`)
    for (const [tipo, m] of conProblemi) console.log(`   ${tipo.padEnd(18)} ${m.problemi.join(' | ')}`)
  }

  // Riassunto: per ogni blocco, in quali varianti qualcosa non va.
  console.log('\n\nRIASSUNTO PER BLOCCO (varianti con problemi)\n')
  for (const tipo of Object.keys(risultati)) {
    const male = Object.entries(risultati[tipo]).filter(([, m]) => m.problemi.length).map(([v]) => v)
    console.log(`  ${male.length ? '✗' : '✓'} ${tipo.padEnd(18)} ${male.join(', ')}`)
  }
  if (errori.length) console.log('\nErrori nel browser:', [...new Set(errori)].slice(0, 5))
  fs.writeFileSync(`${FOTO || '.'}/stile-blocchi.json`, JSON.stringify(risultati, null, 2))
} catch (e) {
  console.error('ERRORE:', e.message)
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  if (az) await cancellaAziendaDiProva(az.id).catch(e => console.error('pulizia:', e.message))
}
