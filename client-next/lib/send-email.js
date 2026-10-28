import { Resend } from 'resend'

// Invio email centralizzato + OSSERVABILE. La SDK Resend ritorna { data, error }
// e NON lancia sugli errori API → senza controllare `error` ogni fallimento è
// invisibile (causa storica del "le mail non partono e non si capisce perché").
// Qui ogni invio logga esito/errore nei log runtime Vercel:
//   [email:<ctx>] ok → to=... id=...        (successo)
//   [email:<ctx>] FALLITA → to=... err=...   (errore API Resend)
//   [email:<ctx>] THREW → to=...             (eccezione rete/SDK)
// Non lancia mai: i chiamati possono usarla fire-and-forget o con await senza
// cambiare la logica di risposta. `from` default se non specificato.
// `fromName`: nome mittente visibile (white-label) → "Nome Business <noreply@oltrenova.com>".
// L'indirizzo resta il dominio verificato (oltrenova.com); solo l'etichetta cambia.
export async function sendEmail(payload, ctxArg) {
  // `_ctx` e `fromName` sono campi nostri: rimossi prima dell'invio a Resend.
  const { _ctx, fromName, ...rest } = payload || {}
  const ctx = ctxArg || _ctx || 'email'
  const key = (process.env.RESEND_API_KEY ?? '').trim()
  const to = Array.isArray(rest.to) ? rest.to.join(',') : rest.to
  if (!key) {
    console.error(`[email:${ctx}] RESEND_API_KEY assente → non inviata a ${to}`)
    return { data: null, error: { message: 'RESEND_API_KEY assente' } }
  }
  const rawFrom = rest.from || (process.env.RESEND_FROM ?? '').trim() || 'OltreNova <noreply@oltrenova.com>'
  // Indirizzo email nudo (da "Nome <email>" o "email"); su questo si costruisce l'etichetta.
  const addr = (rawFrom.match(/<([^>]+)>/)?.[1] || rawFrom).trim()
  // Sanitizza il nome mittente: no caratteri che romperebbero l'header (", <, >, a-capo).
  const name = typeof fromName === 'string' ? fromName.replace(/["<>\r\n]/g, '').trim() : ''
  const from = name ? `${name} <${addr}>` : rawFrom
  try {
    const r = await new Resend(key).emails.send({ ...rest, from })
    if (r?.error) console.error(`[email:${ctx}] FALLITA → to=${to} err=`, r.error)
    else console.log(`[email:${ctx}] ok → to=${to} id=${r?.data?.id ?? '?'}`)
    return r
  } catch (e) {
    console.error(`[email:${ctx}] THREW → to=${to}`, e?.message || e)
    return { data: null, error: { message: String(e?.message || e) } }
  }
}

// Per le route in cui l'email È l'azione («invia prova», «rimanda l'invito»):
// chi preme il pulsante deve sapere se è partita. `sendEmail` non lancia mai,
// quindi senza questo controllo la route rispondeva «ok» anche quando Resend
// rifiutava l'invio. Restituisce la risposta d'errore, o null se è partita.
export function rispostaSeNonPartita(esito) {
  if (!esito?.error) return null
  return Response.json({ error: `L'email non è partita: il servizio di posta l'ha rifiutata (${esito.error.message || 'motivo sconosciuto'}). Riprova tra qualche minuto.` }, { status: 502 })
}
