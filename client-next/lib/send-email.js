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
export async function sendEmail(payload, ctxArg) {
  // Il contesto può arrivare come 2° argomento o come campo `_ctx` nel payload
  // (comodo per la migrazione inline). Viene rimosso prima dell'invio a Resend.
  const { _ctx, ...rest } = payload || {}
  const ctx = ctxArg || _ctx || 'email'
  const key = (process.env.RESEND_API_KEY ?? '').trim()
  const to = Array.isArray(rest.to) ? rest.to.join(',') : rest.to
  if (!key) {
    console.error(`[email:${ctx}] RESEND_API_KEY assente → non inviata a ${to}`)
    return { data: null, error: { message: 'RESEND_API_KEY assente' } }
  }
  const from = rest.from || (process.env.RESEND_FROM ?? '').trim() || 'OltreNova <noreply@oltrenova.com>'
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
