import { manutenzioneDomini, controllaSaluteDomini } from '@/lib/domini-manutenzione'
import { logError } from '@/lib/observability'
import { battitoEControllo } from '@/lib/cron-battito'

// Ogni dominio costa qualche secondo (chiamate a Vercel + prova HTTPS reale).
export const maxDuration = 60

// Un dominio si collega quando il cliente tocca i DNS del suo provider: può
// succedere ore dopo averlo aggiunto, e nessuno garantisce che torni nel pannello
// a premere "Controlla". Questo giro passa i domini non ancora attivi, li
// riverifica e li porta online da solo.
export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const esito = await manutenzioneDomini({ soloPendenti: true })
    // ⚠️ Il giro qui sopra passa solo i domini NON attivi. Quelli attivi dei
    // clienti si provano qui, separatamente: da loro dipende se il redirect
    // verso il dominio del cliente è ancora sicuro. Un guasto di questa parte
    // non deve fermare l'altra, e viceversa.
    let salute = null
    try { salute = await controllaSaluteDomini() }
    catch (e) { await logError('cron/domini/salute', e, { alert: true }) }
    console.log('[cron/domini]', JSON.stringify({ ...esito, salute }))
    await battitoEControllo('domini')
    return Response.json({ ok: true, ...esito, salute })
  } catch (e) {
    await logError('cron/domini', e, { alert: true })
    return Response.json({ error: e.message }, { status: 500 })
  }
}
