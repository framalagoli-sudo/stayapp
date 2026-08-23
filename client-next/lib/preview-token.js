import crypto from 'crypto'

// Permesso temporaneo di vedere le pagine in bozza di UNA entità.
//
// L'anteprima si apre in una scheda nuova o dentro un iframe: sono navigazioni
// del browser, non fetch, quindi non possono portare un header Bearer. Il
// permesso viaggia perciò nell'URL, firmato — chi non ha una firma valida vede
// solo le pagine pubblicate. Stesso schema dello `state` di Google Calendar.
//
// La firma è legata a tipo+entità: un titolare non può usare il proprio token
// per sbirciare le bozze di qualcun altro.

const DURATA_MS = 2 * 60 * 60 * 1000 // l'anteprima serve mentre si lavora, non per sempre

const segreto = () => (process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

const firma = (tipo, entityId, scadenza) =>
  crypto.createHmac('sha256', segreto()).update(`${tipo}:${entityId}:${scadenza}`).digest('hex').slice(0, 32)

export function creaTokenAnteprima(tipo, entityId) {
  if (!segreto()) return null
  const scadenza = Date.now() + DURATA_MS
  return `${scadenza}.${firma(tipo, entityId, scadenza)}`
}

export function verificaTokenAnteprima(token, tipo, entityId) {
  if (typeof token !== 'string' || !token.includes('.') || !segreto()) return false
  const [scadenza, sig] = token.split('.')
  if (!/^\d+$/.test(scadenza) || Number(scadenza) < Date.now()) return false
  const attesa = Buffer.from(firma(tipo, entityId, scadenza))
  const ricevuta = Buffer.from(sig || '')
  return attesa.length === ricevuta.length && crypto.timingSafeEqual(attesa, ricevuta)
}
