import { Logger } from 'next-axiom'

// Logga un errore server su Axiom (percorsi critici: booking, lead, pagamenti…).
// - No-op sicuro se mancano NEXT_PUBLIC_AXIOM_DATASET/TOKEN.
// - Non lancia MAI: l'osservabilità non deve rompere la route (try/catch totale).
// - In serverless bisogna fare flush() esplicito prima che la funzione termini.
//
// Uso nei catch: `catch (e) { await logError('booking/prenota', e, { azienda_id }); return Response.json({ error: e.message }, { status: 500 }) }`
export async function logError(source, err, extra = {}) {
  try {
    const log = new Logger()
    log.error(typeof err === 'string' ? err : (err?.message || 'errore server'), {
      source,
      stack: err?.stack,
      ...extra,
    })
    await log.flush()
  } catch {
    // fallback: almeno nel log runtime di Vercel
    try { console.error(`[${source}]`, err) } catch {}
  }
}
