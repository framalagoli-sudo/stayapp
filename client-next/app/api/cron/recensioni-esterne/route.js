import { supabaseAdmin } from '@/lib/supabase-server'
import { leggiGoogle, googleConfigurato, daAggiornare, SCADENZA_ORE } from '@/lib/recensioni-esterne'
import { logError } from '@/lib/observability'
import { battitoEControllo } from '@/lib/cron-battito'

// Rilegge i punteggi delle piattaforme esterne.
//
// ⚠️ Ogni lettura si paga (~35 $ ogni mille richieste su Google, perché il
// punteggio sta nel livello «Enterprise»): si rileggono **solo** le schede
// collegate e **solo** se il dato ha più di un giorno. Con quindici attività
// sono quindici chiamate al giorno — meno di venti euro l'anno.
//
// ⚠️ Se una lettura fallisce NON si cancella il valore vecchio: si segna
// l'errore accanto, e il sito continua a mostrare l'ultimo numero buono con la
// sua data. Cancellare farebbe sparire il punteggio dal sito di un cliente per
// un problema di rete.

export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    if (!googleConfigurato()) {
      // Non è un guasto: è una funzione che nessuno ha ancora acceso.
      await battitoEControllo('recensioni-esterne')
      return Response.json({ ok: true, saltato: 'Google non configurato' })
    }

    const { data: entita } = await supabaseAdmin.from('entita')
      .select('id, name, recensioni_esterne')
      .not('recensioni_esterne', 'eq', '{}')
      .eq('active', true)

    let letti = 0, falliti = 0, saltati = 0
    for (const e of entita || []) {
      const dato = e.recensioni_esterne?.google
      if (!dato?.place_id) { saltati++; continue }
      if (!daAggiornare(dato)) { saltati++; continue }
      try {
        const letto = await leggiGoogle(dato.place_id)
        await supabaseAdmin.from('entita').update({
          recensioni_esterne: {
            ...e.recensioni_esterne,
            google: { ...dato, rating: letto.rating, totale: letto.totale, url: letto.url, aggiornato: new Date().toISOString(), errore: null },
          },
        }).eq('id', e.id)
        letti++
      } catch (err) {
        falliti++
        // Il valore vecchio resta: si annota solo che l'ultima lettura è andata male.
        await supabaseAdmin.from('entita').update({
          recensioni_esterne: { ...e.recensioni_esterne, google: { ...dato, errore: err.message.slice(0, 200) } },
        }).eq('id', e.id)
      }
    }

    await battitoEControllo('recensioni-esterne')
    return Response.json({ ok: true, letti, falliti, saltati, scadenza_ore: SCADENZA_ORE })
  } catch (e) {
    await logError('cron/recensioni-esterne', e, { alert: true })
    return Response.json({ error: e.message }, { status: 500 })
  }
}
