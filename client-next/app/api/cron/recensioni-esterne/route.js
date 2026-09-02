import { supabaseAdmin } from '@/lib/supabase-server'
import { leggiGoogle, googleConfigurato, daAggiornare, scadenzaOre, LETTURE_GRATUITE_AL_MESE } from '@/lib/recensioni-esterne'
import { logError } from '@/lib/observability'
import { battitoEControllo } from '@/lib/cron-battito'

// Rilegge i punteggi delle piattaforme esterne.
//
// ⚠️ Google regala **1.000 letture al mese** del livello «Enterprise», che è
// quello in cui cadono voto e numero di recensioni; oltre si paga ~35 $ ogni
// mille. La cadenza non è fissa: si calcola sul numero di schede collegate per
// restare dentro il gratuito — quotidiana con poche attività, più larga man
// mano che crescono. Il costo così non si accende **mentre si vendono
// clienti**, che è il modo peggiore di scoprire una bolletta.
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

    // La cadenza si calcola sul numero di schede collegate, per restare dentro
    // le letture gratuite: con poche attivita' e' quotidiana, con tante si
    // dirada da sola. Cosi' il costo non si accende mentre si vendono clienti.
    const collegate = (entita || []).filter(e => e.recensioni_esterne?.google?.place_id)
    const scadenza = scadenzaOre(collegate.length)

    let letti = 0, falliti = 0, saltati = 0
    for (const e of collegate) {
      const dato = e.recensioni_esterne.google
      if (!daAggiornare(dato, scadenza)) { saltati++; continue }
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
    return Response.json({
      ok: true, letti, falliti, saltati,
      collegate: collegate.length, scadenza_ore: scadenza,
      // Quante letture si consumeranno in un mese con questa cadenza: serve a
      // vedere a colpo d'occhio se si sta per uscire dal gratuito.
      letture_stimate_al_mese: Math.round(collegate.length * 30 * 24 / scadenza),
      gratuite_al_mese: LETTURE_GRATUITE_AL_MESE,
    })
  } catch (e) {
    await logError('cron/recensioni-esterne', e, { alert: true })
    return Response.json({ error: e.message }, { status: 500 })
  }
}
