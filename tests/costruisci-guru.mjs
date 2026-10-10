// Ricostruisce su OltreNova il sito di Guru Management (era su SiteGround, in
// WordPress). Legge dall'archivio locale `progetti/gurumanagement-archivio` e
// passa dalle ROUTE della piattaforma — le stesse del pannello — con una
// sessione super_admin effimera, non dal database.
//
// Si può rilanciare: tiene in `stato-oltrenova.json` (nell'archivio) cosa ha
// già creato, e a ogni giro riscrive tema, pagine e articoli sopra gli stessi.
//
// Uso: cd tests && node costruisci-guru.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomBytes, randomUUID } from 'crypto'
import fs from 'fs'

config({ path: '.env.test', quiet: true })
const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
const BASE = 'https://www.oltrenova.com'
const ARCH = 'C:/Users/francesco/progetti/gurumanagement-archivio'
const UP = `${ARCH}/file/wp-content/uploads`
const FILE_STATO = `${ARCH}/stato-oltrenova.json`
const stato = fs.existsSync(FILE_STATO) ? JSON.parse(fs.readFileSync(FILE_STATO, 'utf8')) : { immagini: {}, pagine: {}, articoli: {} }
const salva = () => fs.writeFileSync(FILE_STATO, JSON.stringify(stato, null, 2))
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let uid = null
try {
  // ── La sessione ────────────────────────────────────────────────────────────
  const email = `probe-guru-${Date.now()}@playwright.internal`, password = randomBytes(24).toString('base64url') + 'Aa1!'
  const { data: u, error: eu } = await admin.auth.admin.createUser({ email, password, email_confirm: true }); if (eu) throw eu
  uid = u.user.id
  await admin.from('profiles').upsert({ id: uid, role: 'super_admin', full_name: 'Costruzione sito Guru' }, { onConflict: 'id' })
  const { data: s, error: es } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password }); if (es) throw es
  const H = { Authorization: `Bearer ${s.session.access_token}` }
  const api = async (metodo, percorso, corpo) => {
    const r = await fetch(BASE + percorso, { method: metodo, headers: { ...H, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined })
    const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = t }
    if (!r.ok) throw new Error(`${metodo} ${percorso} → ${r.status} ${t.slice(0, 200)}`)
    return j
  }

  // ── Azienda ed entità ──────────────────────────────────────────────────────
  if (!stato.azienda) {
    const az = await api('POST', '/api/aziende', {
      ragione_sociale: 'Guru Management srl', codice_fiscale: '18009121007', rea: 'RM 1755466',
      indirizzo: 'Via Salaria 290', citta: 'Roma', cap: '00199', provincia: 'RM',
      email: 'infogururoma@gmail.com', telefono: '+39 351 7808613', fuso_orario: 'Europe/Rome',
    })
    stato.azienda = az.id; salva(); console.log('azienda creata', az.id)
  }
  if (!stato.entita) {
    const e = await api('POST', '/api/attivita', {
      azienda_id: stato.azienda, name: 'Guru Management', tipo: 'Consulenza e gestione di hotel e strutture ricettive', profilo: 'studio_professionale',
      description: 'Gli esperti nella gestione di Hotel, Residence, Villaggi e Strutture ricettive: massimizzazione degli incassi, gestione completa, nessun costo fisso, assicurazione inclusa.',
      address: 'Via Salaria 290 – 00199 Roma (RM)', phone: '+39 351 7808613', email: 'infogururoma@gmail.com',
    })
    stato.entita = e.id; stato.slug = e.slug; salva(); console.log('entità creata', e.id, e.slug)
  }
  const ID = stato.entita, SITO = `/a/${stato.slug}`

  // ── Le immagini: dall'archivio al nostro deposito (la route le comprime) ───
  async function foto(rel) {
    if (stato.immagini[rel]) return stato.immagini[rel]
    const percorso = `${UP}/${rel}`; if (!fs.existsSync(percorso)) throw new Error('manca nell’archivio: ' + rel)
    const est = rel.split('.').pop().toLowerCase()
    const tipo = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' }[est]
    const fd = new FormData(); fd.append('file', new Blob([fs.readFileSync(percorso)], { type: tipo }), rel.split('/').pop())
    const r = await fetch(`${BASE}/api/upload/minisito-image?entity_type=attivita&entity_id=${ID}`, { method: 'POST', headers: H, body: fd })
    const j = await r.json(); if (!r.ok || !j.url) throw new Error(`foto ${rel} → ${r.status} ${JSON.stringify(j)}`)
    stato.immagini[rel] = j.url; salva(); await new Promise(x => setTimeout(x, 1100)) // un nome di file al millisecondo
    return j.url
  }
  const F = {}
  for (const [k, rel] of Object.entries({
    logo: '2024/12/logo-guru-management.jpg', logoScuro: '2025/02/logo-guru-management-black.png',
    fondoBlu: '2025/02/Untitled-2.webp', reception: '2025/03/check-in-roma.png', chiavi: '2025/03/gestione-appartamenti-affitti-brevi-roma.jpg',
    grafici: '2025/03/consulenza-booking.jpg', squadra: '2025/02/business-team-casual-collaboration-discussing-working-analysis-with-financial-data-and-marketing.webp',
    analisi: '2025/02/top-view-of-businessmen-analyzing-management-statistics-while-working-at-company-investments.webp',
    scrivania: '2025/02/top-view-of-tax-forms-digital-devices-and-stationery-on-desk.webp',
    sVisibilita: '2025/03/pubblicita-case-vacanze-roma.png', sBurocrazia: '2025/03/burocrazia-case-vacanza-roma.png', sPrenotazioni: '2025/03/booking-roma.png',
    sPulizia: '2025/03/biancheria-hotel-roma.png', sAccoglienza: '2025/03/check-in-roma.png', sAssicurazione: '2025/03/assicurazione-casa-vacanza-roma.png',
    mattia: '2025/05/mattia-guzzardi-guru-management-1536x1280.png', giuseppe: '2025/05/giuseppe-ruisi-guru-management-1536x1280.png',
    aWebinar: '2025/05/mattia-guzzardi-guru-management-1536x1280.png', aGuadagno: '2025/03/gestiamo-noi-la-tua-struttura-ricettiva.png', aImpegno: '2025/03/property-manager-roma.png', aAffidare: '2025/03/affitti-case-vacanza-roma.png',
    pSiteminder: '2025/05/logo-siteminder.png', pAirbnb: '2025/03/1.png', pBooking: '2025/03/2.png', pExpedia: '2025/03/3.png', pTripadvisor: '2025/03/4.png',
    pLazio: '2025/05/regione-lazio.png', pTeamSystem: '2025/05/team-system-logo.png',
  })) F[k] = await foto(rel)
  console.log('immagini pronte:', Object.keys(F).length)

  // ── Il modulo dei contatti ─────────────────────────────────────────────────
  if (!stato.form) { const f = await api('POST', '/api/form-builder', { azienda_id: stato.azienda, nome: 'Contatti Guru Management' }); stato.form = f.id; stato.formToken = f.token; salva() }
  const campo = (tipo, label, placeholder, required = true) => ({ id: randomUUID(), tipo, label, opzioni: [], required, placeholder })
  if (!stato.formCampi) {
    await api('PATCH', `/api/form-builder/${stato.form}`, {
      descrizione: 'Ti risponderemo al più presto.', attivo: true, email_notifica: 'infogururoma@gmail.com',
      campi: [campo('text', 'Nome', 'Il tuo nome'), campo('email', 'Email', 'la-tua@email.it'), campo('text', 'Oggetto', 'Di cosa vuoi parlarci', false), campo('textarea', 'Messaggio', 'Raccontaci della tua struttura'),
        { ...campo('consenso', 'Accetto il trattamento dei miei dati personali ai sensi del GDPR', ''), privacy_url: '' }],
    })
    stato.formCampi = true; salva()
  }

  // ── Tema, intestazione, piede ──────────────────────────────────────────────
  // I colori sono quelli del sito di prima, misurati: blu notte dei titoli,
  // verde acqua dei pulsanti. Titoli in DM Sans (il più vicino al loro Inter).
  await api('PATCH', `/api/attivita/${ID}`, {
    logo_url: F.logo, logo_dark_url: F.logoScuro, cover_url: F.reception,
    schedule: '9–18 dal lunedì al venerdì. Gli orari di ufficio possono variare in base alla stagionalità, tuttavia siamo sempre raggiungibili telefonicamente.',
    theme: { primaryColor: '#17A2A8', secondaryColor: '#4FD1D6', bgColor: '#ffffff', textColor: '#14305D', fontHeading: 'dm-sans', fontBody: 'inter', headerStyle: 'solid', borderStyle: 'mixed' },
    minisito: {
      active: true, tagline: 'I professionisti per la gestione del tuo Hotel', logo_size: 'large',
      seo_title: 'Guru Management – Gestione Hotel e strutture ricettive a Roma',
      seo_description: 'Gli esperti nella gestione di Hotel, Residence, Villaggi e Strutture ricettive: massimizzazione degli incassi, gestione completa, nessun costo fisso, assicurazione inclusa.',
      header_cfg: { style: 'light', layout: 'classic', hover: 'underline', always_visible: true, logo_in_nav: true, show_phone: false, show_cta: false, scroll_behavior: 'smart',
        buttons: [{ id: 'call', label: 'Fissiamo una call', url: `${SITO}/p/contatti`, shape: 'pill', variant: 'solid', color: 'primary' }] },
      footer_cfg: { layout: 'full', style: 'dark', copyright: '© GURU MANAGEMENT — All rights reserved', show_socials: false, show_description: true, show_contact: true, extra_links: [] },
      social: { whatsapp: '+393517808613' },
    },
    whatsapp: '+393517808613',
    // I dati del titolare per l'informativa: quelli dichiarati nel piede del
    // vecchio sito, con la partita IVA confermata da Francesco (10/10/2026).
    privacy_data: {
      titolare_nome: 'Guru Management', titolare_forma_giuridica: 'S.r.l.', titolare_piva: '18009121007', titolare_cf: '18009121007',
      titolare_indirizzo: 'Via Salaria 290', titolare_citta: 'Roma', titolare_cap: '00199', titolare_provincia: 'RM',
      titolare_email: 'infogururoma@gmail.com', titolare_telefono: '+39 351 7808613', dpo_nome: '', dpo_email: '',
      usa_form_contatti: true, usa_newsletter: false, usa_richieste_ospiti: false, usa_prenotazioni: false,
    },
  })
  await api('PATCH', `/api/aziende/${stato.azienda}`, { partita_iva: '18009121007' })

  // ── Le pagine ──────────────────────────────────────────────────────────────
  const b = (type, data, style) => ({ id: randomUUID(), type, data, ...(style ? { style } : {}) })
  const voci = lista => lista.map(x => ({ id: randomUUID(), ...x }))
  const testo = (...paragrafi) => ({ type: 'doc', content: paragrafi.map(p => p?.elenco
    ? { type: 'bulletList', content: p.elenco.map(v => ({ type: 'listItem', content: [{ type: 'paragraph', attrs: { textAlign: null }, content: [{ type: 'text', text: v }] }] })) }
    : ({ type: 'paragraph', attrs: { textAlign: null }, content: [].concat(p).map(pezzo => typeof pezzo === 'string' ? { type: 'text', text: pezzo } : { type: 'text', text: pezzo.forte, marks: [{ type: 'bold' }] }) })) })
  const CONTATTI = `${SITO}/p/contatti`
  const cta = b('cta_banner', {
    title: 'Pronto a trasformare il tuo immobile in un’opportunità?',
    subtitle: 'Contattaci oggi stesso per scoprire come possiamo gestire la tua struttura in modo professionale, senza stress e con il massimo rendimento. Ti abbiamo convinto? Ora tocca a te!',
    button_text: 'Contattaci', button_url: CONTATTI,
  })

  const pagine = {
    __home__: { titolo: 'Home', nel_menu: true, blocks: [
      b('hero', { title: 'I professionisti per la gestione <mark>del tuo Hotel</mark>', tagline: 'Gli esperti nella gestione di Hotel, Residence, Villaggi e Strutture ricettive. Massimizzazione incassi, gestione completa, nessun costo fisso, assicurazione inclusa.', bg_image_url: F.chiavi, focal: '55% 40%', overlay_opacity: 0.62, cta1_text: 'Contattaci', cta1_url: CONTATTI, cta2_text: 'Chi siamo', cta2_url: `${SITO}/p/chi-siamo`, height: 'large' }),
      b('testimonianze', { titolo: '', items: voci([{ author: 'Maria Cristina Angeli', location: 'Proprietaria di un immobile a Roma', rating: 5, source: '', text: 'È stata una svolta: ho affidato il mio Hotel a Guru Management ed ho guadagnato di più senza perdere tutto il tempo di prima. Meno problemi, meno lavoro, la loro organizzazione e professionalità ha fatto la differenza.' }]) }, { bg: 'light', paddingY: 'compact' }),
      b('foto_testo', { title: 'Affidati ai professionisti del settore alberghiero e ricettivo', image_url: F.reception, inverti: false, button_label: 'Contattaci', button_url: CONTATTI,
        text: testo([{ forte: 'Unisciti anche tu' }, ' ai proprietari che ci hanno affidato i loro immobili in gestione in tutta Italia, nel pieno rispetto delle regole.'], 'Ci occupiamo di tutto, dal primo avvio dell’immobile alla gestione completa, il tutto con reportistica continua:', { elenco: ['Aumento degli incassi, nessun rischio di morosità', 'Disponibilità dell’immobile per uso del proprietario', 'Aumento del valore in caso di vendita', 'Cura e manutenzione continua', 'Gestione completa degli ospiti e dell’immobile'] }) }, { etichetta: 'Guru Management' }),
      b('paragrafi', { titolo: '', items: voci([
        { icon: 'layers', title: 'Report dettagliati', text: 'Conoscerai sempre cosa sta accadendo.', image_url: '' },
        { icon: 'award', title: 'Qualità e professionalità', text: 'Siamo partner affidabili e ci prendiamo cura del tuo immobile.', image_url: '' },
      ]) }, { bg: 'light', paddingY: 'compact' }),
      b('stats', { titolo: 'È semplice e immediato: valutiamo subito il potenziale di rendimento della tua struttura ricettiva', items: voci([{ value: '90%', label: 'Tempo risparmiato' }, { value: '94%', label: 'Zero rischi' }]) }),
      b('steps', { titolo: 'Come funziona', items: voci([
        { icon: 'check-circle', title: 'Valutazione gratuita', text: 'Grazie alla nostra esperienza pluriennale valutiamo subito il potenziale di rendimento del tuo immobile.' },
        { icon: 'wrench', title: 'Setup immobile', text: 'Rendiamo il tuo immobile pronto ed accogliente.' },
        { icon: 'globe', title: 'Online', text: 'Non dovrai fare più nulla: alla gestione online del tuo immobile pensiamo a tutto noi.' },
      ]) }),
      b('carosello', { titolo: 'Cosa ti offriamo', formato: 'verticale', per_view: 3, autoplay: true, interval: 5, show_arrows: true, show_dots: true, items: voci([
        { image_url: F.sVisibilita, title: 'Massima visibilità', text: '' }, { image_url: F.sBurocrazia, title: 'Gestione burocratica', text: '' },
        { image_url: F.sPrenotazioni, title: 'Gestione delle prenotazioni', text: '' }, { image_url: F.sPulizia, title: 'Pulizia e biancheria', text: '' },
        { image_url: F.sAccoglienza, title: 'Accoglienza ospiti e gestione struttura', text: '' }, { image_url: F.sAssicurazione, title: 'Copertura assicurativa', text: '' },
      ]) }, { etichetta: 'I nostri servizi', bg: 'light' }),
      b('highlights', { titolo: 'Ci prendiamo cura del tuo immobile: gestiamo Hotel e strutture ricettive con amore e professionalità', items: voci([
        { icon: 'award', text: 'Professionalità dei nostri collaboratori' }, { icon: 'phone', text: 'Comunicazione continua con i proprietari' },
        { icon: 'clock', text: 'Risparmia il tuo tempo, ci pensiamo noi' }, { icon: 'shield', text: 'Affidabilità e qualità del servizio offerto' },
      ]) }, { bg: 'image', bg_image: F.fondoBlu, bg_overlay: 0.35, etichetta: 'Scegli Guru Management' }),
      cta,
      b('news', { titolo: 'Ultimi articoli del blog', sottotitolo: 'Le nostre pubblicazioni, una rubrica per tenerti sempre aggiornato su news ed iniziative' }),
      b('clienti', { titolo: 'Scegliamo il meglio per te', items: voci([
        { logo_url: F.pBooking, name: 'Booking', link_url: '' }, { logo_url: F.pSiteminder, name: 'SiteMinder', link_url: '' }, { logo_url: F.pAirbnb, name: 'Airbnb', link_url: '' },
        { logo_url: F.pExpedia, name: 'Expedia', link_url: '' }, { logo_url: F.pTripadvisor, name: 'Tripadvisor', link_url: '' }, { logo_url: F.pLazio, name: 'Regione Lazio', link_url: '' }, { logo_url: F.pTeamSystem, name: 'TeamSystem', link_url: '' },
      ]) }),
    ] },
    'chi-siamo': { titolo: 'Chi Siamo', nel_menu: true, seo_description: 'Scopri lo staff di Guru Management, Mattia Guzzardi e Giuseppe Ruisi, professionisti nel settore hospitality e nella gestione di Hotel e strutture ricettive a Roma.', blocks: [
      b('hero', { title: 'Guru Management — Chi siamo', tagline: 'I professionisti per la gestione del tuo Hotel e della tua struttura ricettiva', bg_image_url: F.squadra, overlay_opacity: 0.68, cta1_text: '', cta1_url: '', height: 'compatta' }),
      b('about', { title: 'I professionisti per la gestione del tuo Hotel e della tua struttura ricettiva', text: testo('Da anni lavoriamo con dedizione e passione nella gestione alberghiera ed extra-alberghiera. Ci avvaliamo di collaboratori per offrire un servizio completo sotto ogni punto di vista aziendale.') }, { etichetta: 'Guru Management' }),
      b('paragrafi', { titolo: '', items: voci([
        { icon: 'target', title: 'Numeri certi', text: 'Analisi e previsioni affinché nulla sia lasciato al caso.', image_url: '' },
        { icon: 'users', title: 'Competenze chiare', text: 'Divisione delle mansioni e dei ruoli, per un lavoro di squadra organizzato e proficuo.', image_url: '' },
        { icon: 'globe', title: 'Visione', text: 'Attenzione al mercato e alle nuove opportunità.', image_url: '' },
        { icon: 'trending-up', title: 'Marginalità', text: 'Il nostro obiettivo: lavorare per il successo insieme a te.', image_url: '' },
      ]) }, { bg: 'light' }),
      b('foto_testo', { title: 'Gestione di Hotel a Roma', image_url: F.analisi, inverti: false, button_label: '', button_url: '', text: testo('È il nostro core-business: strutture ricettive con obiettivi ambiziosi che necessitano di un management competente e preparato.') }),
      b('foto_testo', { title: 'Vinciamo insieme', image_url: F.grafici, inverti: true, button_label: '', button_url: '', text: testo('La tua struttura, il nostro lavoro: insieme possiamo raggiungere i traguardi che ci prefissiamo per ogni stagione.') }),
      b('team', { titolo: 'I nostri professionisti', formato: 'orizzontale', variant: 'editoriale', items: voci([
        { photo_url: F.mattia, photo_focal: '50% 25%', nome: 'Mattia Guzzardi', ruolo: 'Founder', bio: 'Professionista specializzato nella creazione di strategie di commercializzazione per l’hotellerie, con comprovata esperienza nella gestione di strutture ricettive come Hotel, Residence, Boutique Hotel e Village, sia per il segmento leisure che business.\n\nIl mio focus principale è lo sviluppo del mercato online attraverso la ricerca e il consolidamento di partnership nazionali ed internazionali.\n\nSono specializzato nel consolidamento e sviluppo della clientela diretta degli hotel, gestendo il database clienti e implementando azioni di marketing specifiche. Utilizzo strumenti tecnici avanzati come booking engine, channel manager e piattaforme di vendita (OTA, wholesaler, web agencies) per aumentare l’indice revenue di ogni hotel in gestione o management.' },
        { photo_url: F.giuseppe, photo_focal: '50% 25%', nome: 'Giuseppe Ruisi', ruolo: 'CEO & Founder', bio: 'Professionista esperto e orientato agli obiettivi con ampia esperienza in gestione alberghiera e operativa. Dimostrare abilità nel guidare operazioni alberghiere redditizie e promuovere una cultura di sviluppo di team e un servizio clienti eccezionale per capitalizzare le prestazioni e l’efficacia aziendale. Capacità comprovata di stabilire e implementare obiettivi strategici; prosperare nella pianificazione aziendale, marketing, gestione di profitti e perdite, risorse umane, comunicazione e gestione del personale. Esemplificare la conoscenza delle ultime tendenze in ambito alimentare e di ristorazione con un focus su qualità, produzione, igiene, controllo dei costi e presentazione. Multilingue; esperto in inglese, francese e spagnolo. Competente con i sistemi di gestione alberghiera.' },
      ]) }, { etichetta: 'La nostra squadra' }),
      { ...cta, id: randomUUID(), data: { ...cta.data, title: 'Contattaci oggi stesso' } },
    ] },
    contatti: { titolo: 'Contatti', nel_menu: true, seo_description: 'Prendiamo in gestione il tuo Hotel e la tua struttura ricettiva a Roma: affidati a professionisti del settore. Compila il form, ti risponderemo al più presto.', blocks: [
      b('about', { title: 'Contattaci', text: testo('Hai un Hotel, B&B, casa vacanze, appartamento o struttura ricettiva e vuoi massimizzare i tuoi guadagni senza stress? Compila il form e scopri come possiamo gestire tutto per te, in modo professionale e senza pensieri. Ti risponderemo al più presto!') }, { etichetta: 'Restiamo in contatto' }),
      b('paragrafi', { titolo: '', items: voci([
        { icon: 'mail', title: 'Email', text: 'infogururoma@gmail.com', image_url: '' },
        { icon: 'phone', title: 'Chiamaci', text: '(+39) 351 7808613', image_url: '' },
        { icon: 'clock', title: 'I nostri orari', text: '9–18 dal lunedì al venerdì', image_url: '' },
      ]) }, { bg: 'light', paddingY: 'compact' }),
      b('form_builder', { form_token: stato.formToken, titolo_sezione: 'Scrivici' }),
    ] },
    blog: { titolo: 'Blog', nel_menu: true, seo_description: 'Il blog di Guru Management: news e iniziative sulla gestione di hotel, case vacanza e strutture ricettive.', blocks: [
      b('hero', { title: 'Il blog di Guru Management', tagline: 'Una rubrica per tenerti sempre aggiornato su news ed iniziative', bg_image_url: F.scrivania, overlay_opacity: 0.68, cta1_text: '', cta1_url: '', height: 'compatta' }),
      b('news', { titolo: 'Articoli recenti' }),
      b('cta_banner', { title: 'Hai bisogno di informazioni?', subtitle: 'Hai un Hotel, una Casa Vacanze, una struttura ricettiva che vuoi dare in gestione? Contattaci e valutiamo insieme!', button_text: 'Contattaci', button_url: CONTATTI }),
    ] },
  }
  const esistenti = await api('GET', `/api/pagine?entity_tipo=attivita&entity_id=${ID}`)
  for (const [slug, p] of Object.entries(pagine)) {
    let id = stato.pagine[slug] || esistenti.find(x => x.slug === slug)?.id
    if (!id) id = (await api('POST', '/api/pagine', { entity_tipo: 'attivita', entity_id: ID, titolo: p.titolo, slug, status: 'pubblicata', nel_menu: p.nel_menu })).id
    stato.pagine[slug] = id; salva()
    await api('PATCH', `/api/pagine/${id}`, { titolo: p.titolo, slug, status: 'pubblicata', nel_menu: p.nel_menu, seo_description: p.seo_description || null, blocks: p.blocks })
    console.log('pagina', slug, p.blocks.length, 'blocchi')
  }

  // ── Gli articoli (dal feed del vecchio sito, salvato nell'archivio) ────────
  const articoli = JSON.parse(fs.readFileSync(`${ARCH}/articoli.json`, 'utf8'))
  const copertine = { 'guru-management-presente-al-webinar': F.aWebinar, 'come-trasformare-il-tuo-immobile-in-una-fonte-di-guadagno-con-guru-management': F.aGuadagno, 'il-tuo-hotel-il-nostro-impegno-cosa-fa-guru-management-per-te': F.aImpegno, 'affidare-il-tuo-immobile-a-guru-management-perche-conviene': F.aAffidare }
  const pulito = html => html.replace(/<img[^>]*class="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*>/g, '$1').replace(/\sclass="[^"]*"/g, '').replace(/\sstyle="[^"]*"/g, '').replace(/\n{2,}/g, '\n').trim()
  const soloTesto = html => html.replace(/<[^>]+>/g, '').replace(/&#8217;|&rsquo;/g, '’').replace(/&#8220;|&#8221;|&quot;/g, '"').replace(/&hellip;|\[&hellip;\]/g, '…').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
  for (const art of articoli.sort((x, y) => x.date.localeCompare(y.date))) {
    const corpo = { azienda_id: stato.azienda, entity_tipo: 'attivita', entity_id: ID, title: soloTesto(art.title.rendered), excerpt: soloTesto(art.excerpt.rendered).slice(0, 300), content: pulito(art.content.rendered), cover_url: copertine[art.slug] || '', author: 'Guru Management', published: true }
    if (!stato.articoli[art.slug]) { const n = await api('POST', '/api/blog', corpo); stato.articoli[art.slug] = { id: n.id, slug: n.slug, data: art.date }; salva() }
    else await api('PATCH', `/api/blog/${stato.articoli[art.slug].id}`, corpo)
    // La data è quella in cui l'articolo uscì davvero: la route mette «adesso»
    // e non la lascia scegliere, quindi questa sola cosa si scrive a mano.
    await admin.from('articoli').update({ published_at: art.date + 'Z', created_at: art.date + 'Z' }).eq('id', stato.articoli[art.slug].id).eq('azienda_id', stato.azienda)
    console.log('articolo', art.slug.slice(0, 50), '→', stato.articoli[art.slug].slug)
  }
  console.log('\nFATTO —', `${BASE}${SITO}`)
} catch (e) {
  console.error('ERRORE:', e.message)
} finally {
  if (uid) await admin.auth.admin.deleteUser(uid).catch(() => {})
  console.log('[sessione effimera eliminata]')
  process.exit(0)
}
