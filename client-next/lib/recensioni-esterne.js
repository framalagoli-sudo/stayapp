// Il punteggio vero, chiesto alla piattaforma che lo tiene.
//
// ⛔ Il problema che risolve: un cliente poteva scrivere «4,8 su Google» in un
// blocco di testo. Vero il giorno che lo scrive, falso il mese dopo, e nessuno
// se ne accorge — men che meno chi legge. Qui il numero arriva dalla fonte e
// porta con sé **la data in cui è stato chiesto**: se invecchia, si vede.
//
// ⚠️ Il fornitore è sostituibile, come per i domini. Oggi c'è Google; la Content
// API di TripAdvisor è stata dismessa il 31/08/2026 e la sostituta (Terra) ha
// tempi incerti, quindi entra quando è chiara — senza toccare né il database né
// chi legge questi dati.
//
// ⚠️ Nessun import di supabaseAdmin: questo file lo può leggere il browser per
// il catalogo dei fornitori (`FORNITORI`), e il resto gira solo lato server.

export const FORNITORI = [
  { key: 'google', nome: 'Google', colore: '#4285F4' },
  // TripAdvisor: in attesa di Terra. Aggiungere qui e implementare `leggi`.
]

export const fornitoreDi = key => FORNITORI.find(f => f.key === key) || null

// ── Google ────────────────────────────────────────────────────────────────
//
// Places API (New). I campi `rating` e `userRatingCount` fanno salire la
// chiamata al livello «Enterprise», ~35 $ ogni mille richieste: **la cache non è
// un'ottimizzazione, è la differenza tra due euro al mese e una bolletta.**
// Per questo si aggiorna al massimo una volta al giorno per entità.

const CHIAVE = () => (process.env.GOOGLE_PLACES_API_KEY ?? '').trim()

export const googleConfigurato = () => !!CHIAVE()

// Cerca il posto per nome e indirizzo: serve UNA volta, quando il cliente
// collega la sua scheda. Da lì in poi si usa il `place_id`, che non cambia.
export async function cercaPostoGoogle(query) {
  const chiave = CHIAVE()
  if (!chiave) throw new Error('Google non è collegato: manca la chiave')
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': chiave,
      // Si chiede SOLO quello che serve: la maschera decide anche quanto costa.
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount',
    },
    body: JSON.stringify({ textQuery: String(query || '').slice(0, 200), languageCode: 'it', maxResultCount: 5 }),
  })
  if (!r.ok) throw new Error(`Google ha risposto ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const d = await r.json()
  return (d.places || []).map(p => ({
    place_id: p.id,
    nome: p.displayName?.text || '',
    indirizzo: p.formattedAddress || '',
    rating: p.rating ?? null,
    totale: p.userRatingCount ?? null,
  }))
}

// Il punteggio di adesso per un posto già collegato.
export async function leggiGoogle(placeId) {
  const chiave = CHIAVE()
  if (!chiave) throw new Error('Google non è collegato: manca la chiave')
  if (!/^[A-Za-z0-9_\-]{5,255}$/.test(String(placeId || ''))) throw new Error('Identificativo del posto non valido')
  const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=it`, {
    headers: {
      'X-Goog-Api-Key': chiave,
      'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,googleMapsUri',
    },
  })
  if (!r.ok) throw new Error(`Google ha risposto ${r.status}`)
  const p = await r.json()
  return {
    rating: p.rating ?? null,
    totale: p.userRatingCount ?? null,
    url: p.googleMapsUri || null,
    nome: p.displayName?.text || '',
  }
}

// ── Comune a tutti i fornitori ────────────────────────────────────────────

// Quanto può essere vecchio un punteggio prima di rileggerlo. Un giorno è un
// compromesso: le recensioni non arrivano al minuto, e ogni lettura si paga.
export const SCADENZA_ORE = 24

export function daAggiornare(dato) {
  if (!dato?.place_id) return false
  if (!dato.aggiornato) return true
  return (Date.now() - new Date(dato.aggiornato).getTime()) > SCADENZA_ORE * 3_600_000
}

// Quello che si può mostrare senza mentire.
//
// ⚠️ Un punteggio **senza data non si mostra**: è la differenza tra «4,8 su
// Google» e «4,8 su Google, letto stamattina». E se l'ultima lettura è fallita
// si tiene il valore vecchio dicendo quando è stato preso — meglio un numero
// datato che un numero che finge di essere di adesso.
export function daMostrare(recensioniEsterne, fornitore = 'google') {
  const d = recensioniEsterne?.[fornitore]
  if (!d || typeof d.rating !== 'number' || !d.aggiornato) return null
  return {
    fornitore,
    nome: fornitoreDi(fornitore)?.nome || fornitore,
    rating: d.rating,
    totale: d.totale ?? null,
    url: d.url || null,
    aggiornato: d.aggiornato,
  }
}
