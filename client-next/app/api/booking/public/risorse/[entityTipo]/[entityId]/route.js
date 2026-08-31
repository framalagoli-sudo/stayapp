import { supabaseAdmin } from '@/lib/supabase-server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

export async function GET(request, props) {
  const params = await props.params;
  try {
    const { entityTipo, entityId } = params
    if (!isUUID(entityId)) return Response.json({ error: 'entity_id non valido' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('risorse')
      // ⚠️ Le colonne si elencano: qui risponde chi non ha fatto login. E il
      // dato deve arrivare **fino in fondo** — aggiungere `galleria` alla
      // tabella senza aggiungerla qui vorrebbe dire foto che si caricano e non
      // si vedono, che è già successo due volte in un giorno.
      .select('id, nome, descrizione, modalita, durata_minuti, quantita, max_coperti, prezzo, valuta, colore, galleria, acconto_percentuale, disponibilita, blocchi, anticipo_ore, cancellazione_ore, conferma_auto')
      .eq('entity_tipo', entityTipo)
      .eq('entity_id', entityId)
      .eq('attiva', true)
      .eq('visibile_minisito', true)
      .order('nome')

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // ⚠️ Solo le risorse. Ci sono state anche le offerte, per un giorno, ed era
    // un errore di modello: **una risorsa non è un prodotto e un'offerta non si
    // prenota.** Le risorse sono la configurazione di ciò che si può prenotare
    // — un furgone, una casa, un campo — e insieme agli eventi sono le uniche
    // due cose prenotabili. I prodotti si acquistano, le offerte si chiedono.
    return Response.json(data || [])
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
