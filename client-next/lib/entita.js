import { supabaseAdmin } from '@/lib/supabase-server'
import { MAX_ETICHETTA } from '@/lib/funzioni'

// L'unico punto da cui si leggono e si scrivono le entità.
//
// Prima esistevano tre tabelle — `properties`, `ristoranti`, `attivita` — con
// campi diversi, perché OltreNova è nata come app per hotel e le altre due sono
// arrivate dopo ereditando solo una parte. Il risultato: 20 campi comuni e 17
// esclusivi di alcuni. Un hotel con ristorante interno non poteva avere un menù,
// un ristorante non poteva elencare i servizi, un hotel non poteva dichiarare
// gli orari — ed è la ragione per cui il chatbot rispondeva "Entità non trovata"
// su due verticali su tre.
//
// Ora c'è una tabella sola e **il tipo non limita niente**: serve a scegliere il
// preset di partenza e l'indirizzo pubblico, non a decidere cosa un cliente può
// fare. Quello lo decidono i `moduli`.
//
// Perché un file solo: perché ogni volta che l'accesso ai dati è sparso, prima o
// poi due copie divergono. È già successo.

export const TIPI = ['struttura', 'ristorante', 'attivita']

// Prefisso dell'indirizzo pubblico: /s/ /r/ /a/
export const PREFISSO = { struttura: 's', ristorante: 'r', attivita: 'a' }
export const TIPO_DA_PREFISSO = { s: 'struttura', r: 'ristorante', a: 'attivita' }

// Campi che il pubblico può vedere. Elencati uno per uno di proposito: un
// `select('*')` porterebbe fuori anche `wifi_password` e i dati privati.
export const CAMPI_PUBBLICI = [
  'id', 'azienda_id', 'tipo', 'settore', 'slug', 'name', 'description',
  'address', 'phone', 'email', 'schedule', 'whatsapp',
  'logo_url', 'logo_dark_url', 'cover_url', 'gallery', 'theme', 'minisito',
  'services', 'activities', 'excursions', 'menu', 'amenities', 'restaurant',
  'checkin_time', 'checkout_time', 'rules',
  'moduli', 'chatbot', 'privacy_data', 'active',
].join(', ')

// La password del WiFi si mostra solo dentro l'app dell'ospite, che è dietro il
// QR della camera — non sul sito pubblico.
export const CAMPI_OSPITE = `${CAMPI_PUBBLICI}, wifi_name, wifi_password`

const TABELLA = 'entita'

export function entita() {
  return supabaseAdmin.from(TABELLA)
}

export async function perId(id, campi = '*') {
  if (!id) return null
  const { data } = await entita().select(campi).eq('id', id).maybeSingle()
  return data || null
}

export async function perSlug(slug, tipo = null, campi = CAMPI_PUBBLICI) {
  if (!slug) return null
  let q = entita().select(campi).eq('slug', slug)
  if (tipo) q = q.eq('tipo', tipo)
  const { data } = await q.maybeSingle()
  return data || null
}

export async function dellAzienda(aziendaId, tipo = null, campi = '*') {
  if (!aziendaId) return []
  let q = entita().select(campi).eq('azienda_id', aziendaId).order('name')
  if (tipo) q = q.eq('tipo', tipo)
  const { data } = await q
  return data || []
}

// A quale azienda appartiene un'entità: è la domanda che ogni controllo di
// autorizzazione deve poter fare, e ora ha una risposta sola invece di tre.
export async function aziendaDi(id) {
  if (!id) return null
  const { data } = await entita().select('azienda_id').eq('id', id).maybeSingle()
  return data?.azienda_id ?? null
}

// Un modulo è acceso per questa entità? Il tipo NON entra nella risposta: è il
// senso dell'unificazione. Un hotel che accende il menù ce l'ha.
export function moduloAttivo(ent, chiave, predefinito = false) {
  const m = ent?.moduli
  if (!m || typeof m !== 'object') return predefinito
  return chiave in m ? !!m[chiave] : predefinito
}

// Traduce una riga di `entita` nella forma che il resto del codice conosce da
// sempre. Durante la migrazione si cambia la SORGENTE dei dati, non il contratto:
// componenti e pagine continuano a leggere `modules`, `pwa` e — per le attività —
// `tipo` come descrizione del settore. Così il passaggio non tocca decine di
// file e ogni pezzo migrato si può verificare da solo.
//
// Quando tutto leggerà da qui, questi tre alias si tolgono in un colpo: è un
// debito dichiarato, con una scadenza, non una scelta di stile.
export function allaFormaStorica(ent) {
  if (!ent) return null
  // `origine_tabella` serve solo durante la transizione, per riconciliare e per
  // tornare indietro: non deve uscire nelle risposte.
  const { moduli, settore, origine_tabella, ...resto } = ent
  if (ent.tipo === 'attivita') {
    // Nelle attività `tipo` era la descrizione del settore, mostrata come
    // sottotitolo nella PWA e nell'editor.
    return { ...resto, tipo: settore || null, pwa: moduli || {} }
  }
  return { ...resto, modules: moduli || {} }
}

// L'inverso: prende i campi come li manda il pannello (nomi storici) e li
// riporta a quelli della tabella. Serve in scrittura, dove il pannello continua
// a parlare la lingua di prima.
export function dallaFormaStorica(campi, tipo) {
  const out = { ...campi }
  if ('modules' in out) { out.moduli = out.modules; delete out.modules }
  if ('pwa' in out) { out.moduli = out.pwa; delete out.pwa }
  if (tipo === 'attivita' && 'tipo' in out) {
    // Nel pannello delle attività `tipo` è la descrizione del settore. Qui `tipo`
    // decide l'indirizzo pubblico e non si tocca mai da fuori.
    const v = typeof out.tipo === 'string' ? out.tipo.trim() : ''
    out.settore = v && !['attivita', 'attività'].includes(v) ? v : null
  }
  delete out.tipo   // il tipo tecnico non è mai modificabile dal client
  if (out.moduli) out.moduli = moduliRipuliti(out.moduli)
  return out
}

// I nomi che il cliente dà alle sezioni sono testo libero, e il testo libero
// che arriva dal browser non si scrive mai come viene.
//
// ⚠️ `maxLength` nell'input è un suggerimento all'utente, non una difesa: il
// corpo della richiesta si scrive a mano. Il taglio deve stare **qui**, dove il
// valore entra nel database — altrimenti un nome di mille caratteri sfonda la
// barra delle schede sul telefono di ogni cliente di quel cliente.
//
// Non serve invece ripulire l'HTML: le etichette vengono rese come testo, e
// React le neutralizza. Se un domani finissero in un `dangerouslySetInnerHTML`
// o in un attributo, questo commento è il posto da cui ripartire.
function moduliRipuliti(moduli) {
  if (!moduli || typeof moduli !== 'object' || Array.isArray(moduli)) return {}
  const { etichette, ...resto } = moduli
  if (!etichette || typeof etichette !== 'object' || Array.isArray(etichette)) return resto
  const pulite = {}
  for (const [k, v] of Object.entries(etichette)) {
    if (typeof v !== 'string') continue
    const nome = v.trim().slice(0, MAX_ETICHETTA)
    if (nome) pulite[k] = nome
  }
  return Object.keys(pulite).length ? { ...resto, etichette: pulite } : resto
}

// I campi che il pannello può modificare. **Uno solo per tutti i tipi.**
//
// Prima ogni route aveva la sua lista e le liste erano diverse: una struttura
// non poteva scrivere `menu`, un ristorante non poteva scrivere `services`. Non
// era una regola di prodotto, era un residuo di quando erano tre tabelle
// separate — e teneva in piedi il recinto anche dopo averlo tolto dai dati.
//
// La lista resta perché serve: senza, un PATCH potrebbe riscrivere
// `azienda_id` e spostare l'entità sotto un'altra azienda. Quello che cambia è
// che ora il confine è fra "contenuto del cliente" e "chiavi di sistema", non
// fra un verticale e l'altro.
//
// Fuori di proposito: `id`, `azienda_id`, `created_at`, `plan`, `group_id`,
// `origine_tabella` (chi appartiene a chi non si decide da una richiesta HTTP) e
// `slug`, che ha una strada sua perché va normalizzato e verificato unico.
export const CAMPI_MODIFICABILI = [
  'name', 'description', 'address', 'phone', 'email', 'schedule', 'whatsapp',
  'logo_url', 'logo_dark_url', 'cover_url', 'gallery', 'theme', 'minisito',
  'services', 'activities', 'excursions', 'menu', 'amenities', 'restaurant',
  'wifi_name', 'wifi_password', 'checkin_time', 'checkout_time', 'rules',
  'chatbot', 'privacy_data', 'active',
  // Nomi storici che il pannello manda ancora: `dallaFormaStorica` li riporta
  // a `moduli` e a `settore` prima della scrittura.
  'modules', 'pwa', 'tipo',
]

// Tiene del corpo della richiesta solo ciò che è lecito modificare.
export function campiAmmessi(body) {
  return Object.fromEntries(Object.entries(body || {}).filter(([k]) => CAMPI_MODIFICABILI.includes(k)))
}

// Il catalogo delle funzioni vive in `lib/funzioni.js` (senza dipendenze
// server, perché lo legge anche il browser). Ri-esportato qui perché le route
// continuino a trovarlo dove l'hanno sempre cercato.
export { FUNZIONI, funzioneAttiva, MODULI_PREDEFINITI, MINISITO_INIZIALE } from '@/lib/funzioni'
