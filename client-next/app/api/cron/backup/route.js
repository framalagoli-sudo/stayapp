import { runBackup } from '@/lib/backup'
import { logError } from '@/lib/observability'
import { battitoEControllo } from '@/lib/cron-battito'

// Il giro legge 51 tabelle, gli account e copia le immagini nuove: nei pochi
// secondi di default non ci sta. La stessa dichiarazione c'è sulla route di
// diagnostica, che fa girare lo stesso backup a mano — qui mancava, e senza
// nessuno se ne sarebbe accorto: un timeout di notte lascia solo una riga in
// un log che non legge nessuno.
export const maxDuration = 60

export async function GET(request) {
  const auth = request.headers.get('authorization')
  // Fail-closed: se il secret non è configurato, rifiuta sempre (no 'Bearer undefined').
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runBackup()
    await battitoEControllo('backup')
    return Response.json({ ok: true, ...result })
  } catch (e) {
    // `alert: true`: un backup che smette di girare va SAPUTO subito, non il
    // giorno in cui servono i dati. Prima finiva in un log che non legge nessuno
    // — lo stesso modo in cui il webhook dei rimbalzi è morto per 45 giorni.
    await logError('cron/backup', e, { alert: true })
    return Response.json({ ok: false, error: e.message }, { status: 500 })
  }
}
