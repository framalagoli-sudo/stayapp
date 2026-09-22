import { supabaseAdmin } from './supabase-server'
import { hostUfficiale } from './indirizzo-ufficiale'

// Cosa ho appena pagato, e da chi?
//
// ⛔ Chi torna da Stripe atterrava su una pagina bianca che diceva «Il tuo
// ordine è stato registrato» — anche quando aveva prenotato una cena. Non il
// nome dell'evento, non il nome del locale, **nessun link per tornare indietro**.
// Parole di Francesco il 22/09/2026, dopo il primo incasso vero di Garage 22:
// «il cliente è smarrito e non ci raccapezza un cazzo».
//
// La radice: la pagina chiedeva a `/api/shop/public/esito`, che sa cercare solo
// negli **ordini del negozio**. Prenotazioni ed eventi cadevano sempre nel ramo
// «non trovato», e il ramo «non trovato» parlava lo stesso di ordini.
//
// Qui si cerca nei tre posti in cui si incassa, **nello stesso ordine del
// webhook** (`app/api/stripe/webhook/route.js`): è la stessa domanda fatta da
// due lati, e due risposte diverse sarebbero un modo per divergere in silenzio.
//
// ⚠️ Risponde a chi **non ha fatto login**: chi ha comprato non ha un account da
// noi. Quindi esce il minimo — cosa, quanto, di chi — e **niente che identifichi
// una persona**: né email, né telefono, né indirizzo. La chiave d'accesso è l'id
// della sessione Stripe, una stringa lunga e casuale che conosce solo chi è
// appena tornato dalla cassa; non è un segreto forte, ed è esattamente la
// ragione per cui qui non passa niente che valga la pena rubare.

// Forma di una sessione Stripe. Senza, un parametro qualsiasi finirebbe in una
// query: quello che arriva dal client non ci va mai grezzo.
export const FORMA_SESSIONE = /^cs_[A-Za-z0-9_]{10,200}$/

const PREFISSO = { struttura: 's', ristorante: 'r', attivita: 'a' }

// Il sito da cui si arriva: nome, logo, colore e **l'indirizzo giusto**.
//
// ⚠️ L'indirizzo lo decide `hostUfficiale`, non lo costruiamo qui: lo stesso
// sito vive su tre indirizzi e il cliente vuole tornare sul **suo** dominio,
// non sul nostro percorso interno (vedi `lib/indirizzo-ufficiale.js`).
async function sitoDi(entityTipo, entityId) {
  if (!entityId || !PREFISSO[entityTipo]) return null
  const { data: ent } = await supabaseAdmin.from('entita')
    // Colonne una per una: con l'asterisco, la prossima colonna riservata
    // aggiunta a `entita` verrebbe pubblicata da sola su una route senza login.
    .select('id, name, slug, tipo, logo_url, theme')
    .eq('id', entityId).maybeSingle()
  if (!ent) return null

  const host = await hostUfficiale(ent.id)
  const base = (process.env.CLIENT_URL ?? '').trim().replace(/\/$/, '') || 'https://www.oltrenova.com'
  return {
    nome: ent.name || null,
    logo: ent.logo_url || null,
    colore: ent.theme?.primaryColor || null,
    url: host ? `https://${host}` : `${base}/${PREFISSO[ent.tipo] || PREFISSO[entityTipo]}/${ent.slug}`,
  }
}

// Un ordine dello shop non è legato a un'entità: ha solo l'azienda (tabella
// `ordini`, migration 036). Se quell'azienda ha **una sola** entità il sito è
// quello; se ne ha più di una non si indovina — un link sbagliato è peggio di
// nessun link, perché chi ha pagato finirebbe sul sito di un'altra attività.
async function sitoDellAzienda(aziendaId) {
  if (!aziendaId) return null
  const { data } = await supabaseAdmin.from('entita')
    .select('id, tipo').eq('azienda_id', aziendaId).limit(2)
  if (data?.length !== 1) return null
  return sitoDi(data[0].tipo, data[0].id)
}

export async function esitoPagamento(sessionId) {
  const sid = String(sessionId || '').trim()
  if (!FORMA_SESSIONE.test(sid)) return { trovato: false, motivo: 'riferimento non valido' }

  // ── 1. Un ordine del negozio ───────────────────────────────────────────────
  const { data: ordine } = await supabaseAdmin.from('ordini')
    .select('numero, totale, stato, pagamento_stato, azienda_id')
    .eq('stripe_session_id', sid).maybeSingle()
  if (ordine) {
    return {
      trovato: true,
      tipo: 'ordine',
      titolo: `Ordine #${ordine.numero}`,
      importo: ordine.totale,
      pagato: ordine.pagamento_stato === 'pagato' || ordine.stato === 'pagato',
      sito: await sitoDellAzienda(ordine.azienda_id),
    }
  }

  // ── 2. Una prenotazione ────────────────────────────────────────────────────
  const { data: pren } = await supabaseAdmin.from('prenotazioni')
    .select('servizio, data, importo_totale, pagamento_stato, entity_tipo, entity_id')
    .eq('pagamento_id', sid).maybeSingle()
  if (pren) {
    return {
      trovato: true,
      tipo: 'prenotazione',
      titolo: pren.servizio || 'La tua prenotazione',
      quando: pren.data || null,
      importo: pren.importo_totale,
      pagato: pren.pagamento_stato === 'pagato',
      sito: await sitoDi(pren.entity_tipo, pren.entity_id),
    }
  }

  // ── 3. Una prenotazione di un evento ───────────────────────────────────────
  const { data: pev } = await supabaseAdmin.from('event_bookings')
    .select('seats, total_amount, pagamento_stato, event_id')
    .eq('pagamento_id', sid).maybeSingle()
  if (pev) {
    const { data: ev } = await supabaseAdmin.from('eventi')
      .select('title, date_start, entity_tipo, entity_id')
      .eq('id', pev.event_id).maybeSingle()
    return {
      trovato: true,
      tipo: 'evento',
      titolo: ev?.title || 'Il tuo posto',
      quando: ev?.date_start || null,
      posti: pev.seats || 1,
      importo: pev.total_amount,
      pagato: pev.pagamento_stato === 'pagato',
      sito: await sitoDi(ev?.entity_tipo, ev?.entity_id),
    }
  }

  // Nessuno dei tre. Succede anche legittimamente: il webhook può ancora non
  // essere arrivato quando il browser torna. Chi chiama lo dice con parole che
  // non spaventano, invece di dichiarare un errore che forse non c'è.
  return { trovato: false }
}
