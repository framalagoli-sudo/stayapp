// Costruisce su OltreNova il sito di «Panoramic — Luxury Suite Penthouse»
// (Giovanni Brunetti, Terni). I contenuti vengono dal documento del cliente
// (`suite-panoramic-attico.md`), le foto e il logo dalla sua cartella.
//
// Come costruisci-guru.mjs: passa dalle ROUTE della piattaforma con una
// sessione super_admin effimera (@playwright.internal), non dal database.
// Si può rilanciare: tiene in `stato-oltrenova.json` (nella cartella del
// cliente) cosa ha già creato, e a ogni giro riscrive tema e pagina.
//
// ⛔ Niente prezzi, recensioni o servizi che il documento non elenca. Telefono,
// email e WhatsApp non sono nel documento: si aggiungono quando li abbiamo.
//
// Uso: cd tests && node costruisci-panoramic.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes, randomUUID } from 'crypto'
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'

const sharp = createRequire(import.meta.url)('../client-next/node_modules/sharp')
config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = 'https://www.oltrenova.com'
const CLIENTE = 'C:/Francesco Malagoli/Clienti/Panoramic Gio Brunetti'
const PRONTE = `${CLIENTE}/pronte-per-oltrenova`        // foto ridotte e logo scontornato
const FILE_STATO = `${CLIENTE}/stato-oltrenova.json`
const stato = fs.existsSync(FILE_STATO) ? JSON.parse(fs.readFileSync(FILE_STATO, 'utf8')) : { immagini: {}, pagine: {} }
const salva = () => fs.writeFileSync(FILE_STATO, JSON.stringify(stato, null, 2))
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// ── Le foto: da 6000px e 18 MB a 2400px. Il caricamento accetta 4 MB e poi
// riscrive lui in WebP a 1920px; questo serve solo a farle passare.
fs.mkdirSync(PRONTE, { recursive: true })
async function pronta(nome) {
  const dest = `${PRONTE}/${path.parse(nome).name.replace(/[^A-Za-z0-9_-]+/g, '_')}.jpg`
  if (!fs.existsSync(dest)) await sharp(`${CLIENTE}/foto/${nome}`).rotate().resize(2400, 2400, { fit: 'inside' }).jpeg({ quality: 86, mozjpeg: true }).toFile(dest)
  return dest
}
// Il logo arriva come JPEG nero e grigio su fondo grigio chiaro: lo si
// scontorna (la luminosità diventa trasparenza) in due versioni, scura per i
// fondi chiari e bianca per l'intestazione scura.
async function loghi() {
  const scuro = `${PRONTE}/logo-scuro.png`, chiaro = `${PRONTE}/logo-chiaro.png`
  if (fs.existsSync(scuro) && fs.existsSync(chiaro)) return { scuro, chiaro }
  const { data, info } = await sharp(`${CLIENTE}/logo.jpeg`).greyscale().raw().toBuffer({ resolveWithObject: true })
  const crea = async (colore, file) => {
    const px = Buffer.alloc(info.width * info.height * 4)
    for (let i = 0; i < info.width * info.height; i++) {
      // fondo ≈ 247: trasparente; tratto nero = pieno, grigio del sottotitolo = in parte
      const a = Math.max(0, Math.min(255, Math.round((240 - data[i]) / 200 * 255)))
      px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = colore; px[i * 4 + 3] = a
    }
    await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } }).trim().png().toFile(file)
  }
  await crea(26, scuro); await crea(255, chiaro)
  return { scuro, chiaro }
}

let uid = null
try {
  const email = `probe-panoramic-${Date.now()}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u, error: eu } = await admin.auth.admin.createUser({ email, password, email_confirm: true }); if (eu) throw eu
  uid = u.user.id
  await admin.from('profiles').upsert({ id: uid, role: 'super_admin', full_name: 'Costruzione sito Panoramic' }, { onConflict: 'id' })
  const { data: s, error: es } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password }); if (es) throw es
  const H = { Authorization: `Bearer ${s.session.access_token}` }
  const api = async (metodo, percorso, corpo) => {
    const r = await fetch(BASE + percorso, { method: metodo, headers: { ...H, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined })
    const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = t }
    if (!r.ok) throw new Error(`${metodo} ${percorso} → ${r.status} ${t.slice(0, 200)}`)
    return j
  }

  // ── Azienda e struttura ────────────────────────────────────────────────────
  if (!stato.azienda) {
    const az = await api('POST', '/api/aziende', { ragione_sociale: 'Giovanni Brunetti', citta: 'Terni', provincia: 'TR', fuso_orario: 'Europe/Rome' })
    stato.azienda = az.id; salva(); console.log('azienda creata', az.id)
  }
  if (!stato.entita) {
    const e = await api('POST', '/api/properties', {
      azienda_id: stato.azienda, name: 'Panoramic Luxury Suite Penthouse', profilo: 'struttura_ricettiva',
      description: 'Attico di lusso nel centro di Terni con terrazza panoramica di oltre 80 mq, Jacuzzi privata, pergola bioclimatica e cromoterapia. Ideale per coppie.',
      address: 'Via Damiano Chiesa, 15 – 05100 Terni (TR)',
    })
    stato.entita = e.id; stato.slug = e.slug; salva(); console.log('struttura creata', e.id, e.slug)
  }
  const ID = stato.entita

  // ── Le immagini ────────────────────────────────────────────────────────────
  async function carica(chiave, file) {
    if (stato.immagini[chiave]) return stato.immagini[chiave]
    const tipo = file.endsWith('.png') ? 'image/png' : 'image/jpeg'
    const fd = new FormData(); fd.append('file', new Blob([fs.readFileSync(file)], { type: tipo }), path.basename(file))
    const r = await fetch(`${BASE}/api/upload/minisito-image?entity_type=struttura&entity_id=${ID}`, { method: 'POST', headers: H, body: fd })
    const j = await r.json(); if (!r.ok || !j.url) throw new Error(`foto ${chiave} → ${r.status} ${JSON.stringify(j)}`)
    stato.immagini[chiave] = j.url; salva(); await new Promise(x => setTimeout(x, 1100)) // un nome di file al millisecondo
    return j.url
  }
  const L = await loghi()
  const F = { logo: await carica('logo', L.scuro), logoChiaro: await carica('logoChiaro', L.chiaro) }
  for (const [k, nome] of Object.entries({
    jacuzziLed: 'DSC_6477_copia.jpg', jacuzziVista: 'DSC_6486_ copia.jpg', terrazzaTavolo: 'DSC_6424 - copia.jpg', terrazzaArco: 'DSC_6444_copia.jpg',
    camera: 'DSC_6414_copia.jpg', cameraLetto: 'DSC_6393.jpg', cameraArmadio: 'DSC_6419_copia.jpg', cameraDettaglio: 'DSC_6396_hdr copia.jpg',
    soggiorno: 'DSC_6537_ copia.jpg', soggiornoTv: 'DSC_6562_hdr copia.jpg', soggiornoTavolo: 'DSC_6524_hdr copia.jpg', pranzo: 'DSC_6501_ copia.jpg',
    giornoCucina: 'DSC_6514_copia.jpg', cucina: 'DSC_6522 copia.jpg', tavolaVista: 'DSC_6544_hdr copia.jpg',
    buddha: 'DSC_6541 copia.jpg', buddhaDettaglio: 'DSC_6549_hdr copia.jpg', bagno: 'DSC_6572 copia.jpg', doccia: 'DSC_6577 copia.jpg', palazzo: 'DSC_6596_copia.jpg',
  })) F[k] = await carica(k, await pronta(nome))
  console.log('immagini pronte:', Object.keys(F).length)

  // ── Il modulo: «Prenota ora» porta qui, finché non c'è un sistema di
  // prenotazione o un link esterno. Chiede le date, non promette niente.
  if (!stato.form) { const f = await api('POST', '/api/form-builder', { azienda_id: stato.azienda, nome: 'Richiesta di disponibilità — Panoramic' }); stato.form = f.id; stato.formToken = f.token; salva() }
  const campo = (tipo, label, placeholder, required = true, extra = {}) => ({ id: randomUUID(), tipo, label, opzioni: [], required, placeholder, ...extra })
  if (!stato.formCampi) {
    await api('PATCH', `/api/form-builder/${stato.form}`, {
      descrizione: 'Indicaci le date del soggiorno: ti risponderemo al più presto.', attivo: true,
      campi: [
        campo('text', 'Nome e cognome', 'Il tuo nome'), campo('email', 'Email', 'la-tua@email.it'), campo('tel', 'Telefono', '+39 …', false),
        campo('date', 'Data di arrivo', ''), campo('date', 'Data di partenza', ''),
        campo('textarea', 'Messaggio', 'Richieste particolari, orario di arrivo…', false),
        { ...campo('consenso', 'Accetto il trattamento dei miei dati personali ai sensi del GDPR', ''), privacy_url: '' },
      ],
    })
    stato.formCampi = true; salva()
  }
  // La frase sopra il modulo la dice già il titolo della sezione.
  await api('PATCH', `/api/form-builder/${stato.form}`, { descrizione: '' })

  // ── Tema, intestazione, piede ──────────────────────────────────────────────
  // Avorio caldo, antracite e bronzo: il logo è nero e grigio, e un accento
  // caldo dà il registro «lusso» senza competere con le foto. Titoli in
  // Instrument Serif (sottile, ricercato), testo in Manrope: l'accoppiata «Atelier».
  await api('PATCH', `/api/properties/${ID}`, {
    logo_url: F.logo, logo_dark_url: F.logoChiaro, cover_url: F.jacuzziLed,
    rules: 'La Jacuzzi esterna è a disposizione esclusiva degli ospiti ed è pronta all’uso tutto l’anno.\nSilenzio dopo le 23:00.\nNon sono ammessi party né ospiti non registrati.',
    theme: { primaryColor: '#8a6a42', secondaryColor: '#c9b28c', bgColor: '#faf8f4', textColor: '#1d1c1a', fontHeading: 'instrument-serif', fontBody: 'manrope', headerStyle: 'solid', borderStyle: 'mixed' },
    minisito: {
      // «App ospiti» nell'intestazione no: è l'app del QR, per chi è già dentro.
      active: true, logo_size: 'medium', show_pwa_link: false,
      tagline: 'Un rifugio esclusivo nel cuore di Terni',
      seo_title: 'Suite Panoramic Attico con Jacuzzi Privata – Terni Centro',
      seo_description: 'Attico di lusso nel centro di Terni con terrazza panoramica di oltre 80 mq, Jacuzzi privata, pergola bioclimatica e cromoterapia. Ideale per coppie.',
      header_cfg: {
        style: 'pillola', layout: 'classic', hover: 'underline', always_visible: true, logo_in_nav: true, scroll_behavior: 'smart',
        buttons: [
          { id: 'suite', label: 'La Suite', url: '#la-suite', shape: 'pill', variant: 'text', color: '#e8dcc6' },
          { id: 'wellness', label: 'Wellness', url: '#terrazza-wellness', shape: 'pill', variant: 'text', color: '#e8dcc6' },
          { id: 'interni', label: 'Interni', url: '#interni', shape: 'pill', variant: 'text', color: '#e8dcc6' },
          { id: 'posizione', label: 'Posizione', url: '#posizione', shape: 'pill', variant: 'text', color: '#e8dcc6' },
          { id: 'prenota', label: 'Prenota ora', url: '#prenota', shape: 'pill', variant: 'solid', color: 'primary' },
        ],
      },
      footer_cfg: {
        layout: 'full', style: 'dark', show_socials: true, show_description: true, show_contact: true,
        copyright: '© 2026 Suite Panoramic Attico · CIN IT055032C202034410',
        extra_links: [
          { id: 'f-prenota', label: 'Prenota', url: '#prenota' },
          { id: 'f-posizione', label: 'Posizione', url: '#posizione' },
          { id: 'f-info', label: 'Info utili', url: '#info-utili' },
        ],
      },
      social: {},
    },
    // Fuori dai motori finché il cliente non l'ha visto e non ci sono i recapiti.
    indicizzabile: false,
    privacy_data: {
      titolare_nome: 'Giovanni Brunetti', titolare_forma_giuridica: '', titolare_piva: '', titolare_cf: '',
      titolare_indirizzo: '', titolare_citta: '', titolare_cap: '', titolare_provincia: '',
      titolare_email: '', titolare_telefono: '', dpo_nome: '', dpo_email: '',
      usa_form_contatti: true, usa_newsletter: false, usa_richieste_ospiti: false, usa_prenotazioni: false,
    },
  })

  // ── La pagina ──────────────────────────────────────────────────────────────
  const b = (type, data, style) => ({ id: randomUUID(), type, data, ...(style ? { style } : {}) })
  const voci = lista => lista.map(x => ({ id: randomUUID(), ...x }))
  const testo = (...paragrafi) => ({ type: 'doc', content: paragrafi.map(p => p?.elenco
    ? { type: 'bulletList', content: p.elenco.map(v => ({ type: 'listItem', content: [{ type: 'paragraph', attrs: { textAlign: null }, content: [{ type: 'text', text: v }] }] })) }
    : ({ type: 'paragraph', attrs: { textAlign: null }, content: [].concat(p).map(pezzo => typeof pezzo === 'string' ? { type: 'text', text: pezzo } : { type: 'text', text: pezzo.forte, marks: [{ type: 'bold' }] }) })) })
  const tessera = (x) => ({ title: '', text: '', value: '', icon: '', image_url: '', size: '', style: '', ...x })

  const home = [
    b('hero', {
      occhiello: 'Terni · Centro storico',
      title: 'Luxury Panoramic Suite con <mark>Jacuzzi</mark> & Terrazza',
      tagline: 'Un rifugio esclusivo nel cuore di Terni. Jacuzzi privata, vista sulla città e totale privacy.',
      bg_image_url: F.jacuzziLed, focal: '50% 60%', overlay_opacity: 0.5,
      cta1_text: 'Prenota ora', cta1_url: '#prenota', cta2_text: 'Scopri la suite', cta2_url: '#la-suite', height: 'full',
    }),
    b('scorrevole', { items: [{ text: 'Jacuzzi privata tutto l’anno' }, { text: 'Terrazza 80+ mq' }, { text: 'Centro storico' }, { text: 'Solo per te' }] }, { bg: 'dark' }),
    b('foto_testo', {
      title: 'Benvenuti al Suite Panoramic Attico', image_url: F.soggiorno, inverti: false, button_label: 'Prenota ora', button_url: '#prenota',
      text: testo(
        'Un attico meraviglioso in un palazzo di recente costruzione, nel centro di Terni. Arredato con gusto ed eleganza e curato nei minimi particolari.',
        'Rilassati nella tua Jacuzzi privata sulla terrazza panoramica, goditi il tramonto e la vista sulla città. Design moderno, camera king-size, cucina attrezzata e totale privacy: l’ambiente ideale per coppie che cercano un soggiorno romantico, elegante e indimenticabile.'),
    }, { anchor: 'la-suite', etichetta: 'La Suite', paddingY: 'spacious' }),
    b('mosaico', {
      titolo: 'La tua zona Wellness privata',
      sottotitolo: 'Un lastrico solare di oltre 80 mq a uso esclusivo, sotto una magnifica pergola bioclimatica con illuminazione LED e cromoterapia. Una vera zona wellness per un soggiorno in pieno relax.',
      items: voci([
        tessera({ image_url: F.jacuzziVista, size: 'big', title: 'Minipiscina idromassaggio Softub', text: 'Pronta all’uso tutto l’anno' }),
        tessera({ icon: 'sparkles', size: 'wide', style: 'color', title: 'Pergola bioclimatica', text: 'Con illuminazione LED e cromoterapia' }),
        tessera({ icon: 'sun', title: 'Lettini prendisole' }),
        tessera({ icon: 'home', title: 'Salotto esterno Nova Talenti' }),
        // Quattro colonne, riempite senza buchi: le due righe sotto rispecchiano
        // le due sopra (foto grande a destra invece che a sinistra).
        tessera({ icon: 'leaf', title: 'Colonna doccia esterna' }),
        tessera({ icon: 'utensils', style: 'dark', title: 'Grande tavolo da pranzo all’aperto' }),
        tessera({ image_url: F.terrazzaArco, size: 'big' }),
        tessera({ image_url: F.terrazzaTavolo, size: 'wide' }),
      ]),
    }, { anchor: 'terrazza-wellness', etichetta: 'Terrazza Wellness', bg: 'white' }),
    // I quattro ambienti in un mosaico (grande · largo · due piccoli: quattro
    // colonne piene). In una griglia di schede il quarto restava da solo.
    b('mosaico', {
      titolo: 'Spazi interni eleganti e confortevoli', sottotitolo: 'Circa 60 mq climatizzati, pensati per il massimo comfort.',
      items: voci([
        tessera({ image_url: F.camera, size: 'big', title: 'Camera', text: 'Letto matrimoniale king-size con materasso di fascia alta' }),
        tessera({ image_url: F.soggiornoTv, size: 'wide', title: 'Zona giorno', text: 'Divano letto e Smart TV' }),
        tessera({ image_url: F.cucina, title: 'Angolo cottura', text: 'Piano a induzione, forno, macchina da caffè Nespresso' }),
        tessera({ image_url: F.bagno, title: 'Bagno', text: 'Con doccia' }),
      ]),
    }, { anchor: 'interni', etichetta: 'Interni' }),
    b('galleria_immagini', { titolo: '', columns: 3, format: 'classic', images: [
      F.cameraLetto, F.tavolaVista, F.buddha, F.soggiornoTavolo, F.giornoCucina, F.doccia, F.cameraArmadio, F.pranzo, F.buddhaDettaglio,
    ].map((url, i) => ({ id: randomUUID(), url, alt: ['Camera con letto king-size', 'Tavolo con vista sulle colline', 'Soggiorno, dettaglio d’arredo', 'Zona pranzo e soggiorno', 'Zona giorno con angolo cottura', 'Bagno con doccia', 'Camera e armadio', 'Zona pranzo verso la terrazza', 'Dettaglio d’arredo'][i] })) }, { paddingY: 'compact' }),
    b('highlights', { titolo: 'Tutto quello che ti serve', items: voci([
      { icon: 'wifi', text: 'Wi-Fi gratuito' }, { icon: 'parking', text: 'Parcheggio' }, { icon: 'ac', text: 'Aria condizionata' },
      { icon: 'zap', text: 'Domotica e illuminazione personalizzabile' }, { icon: 'star', text: 'Smart TV' }, { icon: 'coffee', text: 'Macchina Nespresso' },
      { icon: 'pool', text: 'Jacuzzi privata disponibile tutto l’anno' },
    ]) }, { anchor: 'servizi', etichetta: 'Servizi inclusi', bg: 'dark', glow: 'primary' }),
    b('foto_testo', {
      title: 'Tutto l’attico, solo per te', image_url: F.buddha, inverti: true, button_label: '', button_url: '',
      text: testo('Gli ospiti hanno accesso esclusivo all’intero attico: terrazza panoramica con Jacuzzi privata, area relax con lettini, soggiorno, camera, cucina e bagno. Nessuno spazio condiviso, per garantire privacy e comfort totali durante il soggiorno.'),
    }, { etichetta: 'Accesso esclusivo', paddingY: 'spacious' }),
    b('foto_testo', {
      title: 'Nel cuore di Terni', image_url: F.palazzo, inverti: false, button_label: '', button_url: '',
      text: testo([{ forte: 'Via Damiano Chiesa, 15 – Terni' }], { elenco: ['A pochi passi dal centro storico', 'Circa 8 km dalla Cascata delle Marmore', 'Base ideale per scoprire l’Umbria'] }),
    }, { anchor: 'posizione', etichetta: 'Posizione', bg: 'light' }),
    b('recapiti', { titolo: '', sottotitolo: '', mostra_mappa: true, nascondi: ['orari'] }, { bg: 'light', paddingY: 'compact' }),
    b('about', { title: 'Da sapere prima di arrivare', text: testo({ elenco: [
      'La Jacuzzi esterna è a disposizione esclusiva degli ospiti ed è pronta all’uso tutto l’anno. Si prega di utilizzarla con attenzione e rispetto.',
      'Silenzio dopo le 23:00, per la tranquillità del condominio.',
      'Non sono ammessi party né ospiti non registrati.',
      'L’attico è pensato per coppie in cerca di relax, privacy e comfort.',
    ] }) }, { anchor: 'info-utili', etichetta: 'Info utili' }),
    b('cta_banner', { title: 'Il tuo soggiorno romantico a Terni ti aspetta', subtitle: 'Jacuzzi privata, terrazza panoramica e totale privacy. Prenota ora la tua fuga a due.', button_text: 'Prenota ora', button_url: '#prenota' },
      { bg: 'image', bg_image: F.jacuzziLed, bg_overlay: 0.55, bg_focal: '50% 55%', paddingY: 'spacious' }),
    // Titolo e modulo sullo stesso fondo: si leggono come una sezione sola.
    b('titolo', { title: 'Prenota il tuo soggiorno', subtitle: 'Scrivici le date: ti risponderemo con la disponibilità.', size: 'medium' }, { anchor: 'prenota', etichetta: 'Prenota', bg: 'light', paddingY: 'compact' }),
    b('form_builder', { form_token: stato.formToken, titolo_sezione: '' }, { bg: 'light', paddingY: 'compact' }),
  ]

  const esistenti = await api('GET', `/api/pagine?entity_tipo=struttura&entity_id=${ID}`)
  let id = stato.pagine.__home__ || esistenti.find(x => x.slug === '__home__')?.id
  if (!id) id = (await api('POST', '/api/pagine', { entity_tipo: 'struttura', entity_id: ID, titolo: 'Home', slug: '__home__', status: 'pubblicata', nel_menu: false })).id
  stato.pagine.__home__ = id; salva()
  await api('PATCH', `/api/pagine/${id}`, { titolo: 'Home', status: 'pubblicata', blocks: home })
  console.log('home:', home.length, 'blocchi; altre pagine già presenti:', esistenti.filter(x => x.slug !== '__home__').map(x => `${x.slug} (${x.status})`).join(', ') || 'nessuna')
  console.log('\nFATTO —', `${BASE}/s/${stato.slug}`)
} catch (e) {
  console.error('ERRORE:', e.message)
} finally {
  if (uid) { try { await admin.auth.admin.deleteUser(uid) } catch {} }
  console.log('[sessione effimera eliminata]')
  process.exit(0)
}
