import { manutenzioneDomini } from '@/lib/domini-manutenzione'
import { logError } from '@/lib/observability'

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
    console.log('[cron/domini]', JSON.stringify(esito))
    return Response.json({ ok: true, ...esito })
  } catch (e) {
    await logError('cron/domini', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
