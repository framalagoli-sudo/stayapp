import * as Sentry from '@sentry/nextjs'

// Route diagnostica TEMPORANEA: verifica che Sentry catturi e invii dal server
// in produzione. Da rimuovere dopo la verifica.
export async function GET() {
  Sentry.captureException(new Error('OltreNova — test cattura Sentry server-side (diagnostico, ignorabile)'))
  await Sentry.flush(2500) // assicura l'invio prima che la function serverless si congeli
  return Response.json({ ok: true, sent: true })
}
