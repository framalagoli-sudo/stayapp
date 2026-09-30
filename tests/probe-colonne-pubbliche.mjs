// Quali colonne escono da una route pubblica, davvero.
//
// Un `select('*')` su una route senza login non è un buco oggi: lo diventa il
// giorno in cui qualcuno aggiunge una colonna a quella tabella, perché viene
// pubblicata da sola e in silenzio. È già successo col catalogo dello shop
// (chiuso il 23/08) e con la password del WiFi (chiusa il 25/08).
//
// Questa sonda non legge il codice: chiama le route pubbliche con dati veri e
// stampa le chiavi che tornano, confrontandole con quelle attese. Una chiave
// nuova e non dichiarata è una segnalazione.
//
// Uso: node probe-colonne-pubbliche.mjs
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })
const a = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const BASE = process.env.TEST_URL || 'https://www.oltrenova.com'
let problemi = 0

// Colonne che possono uscire senza login. Tutto ciò che non è qui dentro va
// guardato: o è innocuo e si aggiunge, o non deve uscire.
const AMMESSE = {
  'landing-seo': ['id','meta','llms_txt','updated_at','created_at','faq','schema_extra','ai_bots_allowed','jsonld'],
  'pagina':      ['id','slug','titolo','title','blocks','status','seo','entity_tipo','entity_id',
                  'header_cfg','footer_cfg','lang','updated_at','created_at','azienda_id','og_image',
                  'seo_title','seo_description','nome','published_at','tema','traduzioni',
                  'parent_id','nel_menu','ordine','og_image_url','hide_header','hide_footer'],
  'evento':      ['id','titolo','descrizione','data_inizio','data_fine','luogo','prezzo','posti',
                  'posti_totali','posti_disponibili','cover_url','slug','entity_tipo','entity_id',
                  'azienda_id','active','published','created_at','updated_at','max_partecipanti',
                  'title','description','date_start','date_end','location','price','packages',
                  // 30/09: dei posti esce SOLO quanti se ne possono prenotare online
                  // (null = senza limite). Capienza, prenotati e riservati no: vedi
                  // VIETATE qui sotto e `postiPubblici` in lib/posti-evento.js.
                  'posti_online',
                  // 19–21/09: come si scrive il prezzo e se il telefono è obbligatorio
                  // nel modulo; `lingua` dice in che lingua sono i dati. Tutto ciò che
                  // la scheda pubblica deve sapere per disegnarsi.
                  'prezzo_modo','telefono_obbligatorio','lingua',
                  // 25/08: la forma della locandina e il punto da tenere visibile. Servono
                  // alla scheda dell'evento, che è pubblica; non dicono nulla di riservato
                  // e i valori ammessi sono un elenco chiuso (lib/formati-foto.js).
                  'formato_cover','cover_focal',
                  // 25/08: pulsante personalizzato, condizioni sotto di esso, e come si
                  // legge il prezzo (due decisioni: copertina e pagina aperta). Tutto
                  // contenuto scritto dal cliente per la sua scheda pubblica.
                  'cta_label','cta_condizioni','mostra_prezzo','mostra_prezzo_pagina','prezzo_testo',
                  // 08/09: lo stato delle prenotazioni e la lista d'attesa. Sono
                  // ciò che il visitatore DEVE vedere — un evento chiuso che
                  // sembra ancora aperto è peggio di nessuna informazione — e la
                  // migration 110/111 le concede al ruolo pubblico una per una.
                  'prenotazioni_chiuse','prenotazioni_chiuse_testo','lista_attesa',
                  // Il minimo per il piede di pagina: nome, logo, tema, footer_cfg,
                  // social e i dati legali del titolare — che sono pubblici per obbligo
                  // di legge. Verificato campo per campo il 25/08; il minisito NON esce
                  // intero, di proposito.
                  'sito',
                  // 12/09: il fuso dell'azienda («Europe/Rome»). Serve alla pagina
                  // per mostrare l'ora del POSTO invece di quella di chi guarda, e
                  // non dice niente che il visitatore non veda già dall'indirizzo.
                  'fuso'],
}
const SEGRETE = /password|secret|token|api_key|chiave|private|_key$/i
// Colonne che NON devono uscire anche se non hanno un nome «segreto». I posti
// riservati dicono quanti posti il locale tiene per il telefono; capienza e
// prenotati, insieme ai posti online, permetterebbero di ricavarli.
const VIETATE = { evento: ['seats_total', 'seats_booked', 'posti_riservati'] }

// `tipo` sceglie l'elenco delle ammesse; `etichetta` dice cosa si sta provando.
// Con `zitto` stampa solo i problemi (per i giri su tanti eventi).
async function esamina(tipo, url, etichetta = tipo, zitto = false) {
  const r = await fetch(url)
  if (!r.ok) { if (!zitto) console.log(`  · ${etichetta}: HTTP ${r.status} — non verificabile ora`); return false }
  const j = await r.json().catch(() => null)
  if (!j) { console.log(`  · ${etichetta}: risposta non JSON`); return false }
  const oggetti = Array.isArray(j) ? j : [j.pagina || j.evento || j]
  if (!oggetti.length) { if (!zitto) console.log(`  · ${etichetta}: elenco vuoto`); return false }
  const chiavi = [...new Set(oggetti.flatMap(o => Object.keys(o || {})))]
  const attese = AMMESSE[tipo] || []
  const nuove = chiavi.filter(k => !attese.includes(k))
  const segrete = chiavi.filter(k => SEGRETE.test(k))
  const vietate = chiavi.filter(k => (VIETATE[tipo] || []).includes(k))
  if (segrete.length || vietate.length) { console.log(`  ✗ ${etichetta}: ESCE UN CAMPO CHE NON DEVE USCIRE → ${[...segrete, ...vietate].join(', ')}`); problemi++ }
  else if (nuove.length) { console.log(`  ⚠ ${etichetta}: colonne non dichiarate → ${nuove.join(', ')}`); problemi++ }
  else if (!zitto) console.log(`  ✓ ${etichetta}: ${chiavi.length} colonne, tutte previste`)
  return true
}

console.log('\nCOSA ESCE DALLE ROUTE PUBBLICHE (nessun login)\n')
await esamina('landing-seo', `${BASE}/api/landing-seo`)

const { data: pag } = await a.from('pagine').select('entity_tipo, entity_id, slug').eq('status','pubblicata').limit(1).maybeSingle()
if (pag) await esamina('pagina', `${BASE}/api/guest/pagina/${pag.entity_tipo}/${pag.entity_id}/${pag.slug}`)
else console.log('  · pagina: nessuna pagina pubblicata da provare')

// Tutti gli eventi pubblicati, non uno a caso: il 30/09 la sonda ne sceglieva
// uno con limit(1) senza ordine, e per settimane è capitato un evento non
// pubblico — la colonna dei posti riservati usciva e nessuno se ne accorgeva.
const { data: eventi } = await a.from('eventi').select('id, entity_tipo, entity_id')
  .eq('published', true).eq('active', true).limit(200)
let provati = 0
for (const ev of eventi || []) if (await esamina('evento', `${BASE}/api/guest/eventi/${ev.id}`, `evento ${ev.id}`, true)) provati++
console.log(`  ${provati ? '✓' : '·'} evento: ${provati} eventi pubblicati provati uno per uno`)
// E l'elenco che servono i siti e l'app del QR, entità per entità.
const entita = [...new Map((eventi || []).filter(e => e.entity_id).map(e => [e.entity_id, e])).values()]
let elenchi = 0
for (const ev of entita) if (await esamina('evento', `${BASE}/api/guest/eventi?entity_tipo=${ev.entity_tipo}&entity_id=${ev.entity_id}`, `elenco eventi ${ev.entity_id}`, true)) elenchi++
console.log(`  ${elenchi ? '✓' : '·'} elenco eventi: ${elenchi} elenchi provati`)

console.log('\n' + '─'.repeat(58))
console.log(problemi ? `${problemi} DA GUARDARE` : 'nessuna colonna inattesa esce senza login')
process.exit(problemi ? 1 : 0)
