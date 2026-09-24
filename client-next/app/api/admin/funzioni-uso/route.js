import { supabaseAdmin } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/server-auth'
import { logError } from '@/lib/observability'
import { FUNZIONI, FUNZIONI_AZIENDA, funzioneAttiva } from '@/lib/funzioni'

// Chi usa cosa, azienda per azienda. Solo per il super_admin.
//
// È la base dei profili di mestiere (STRATEGIA.md §6.1): prima di decidere
// quali funzioni un profilo accende, bisogna vedere quali vengono usate davvero.
// La Diagnostica conta le righe su tutta la piattaforma; qui la stessa misura è
// divisa per azienda, perché «shop: 0 righe» dice poco, «shop: nessuna delle
// nove aziende» dice cosa fare.
//
// ⚠️ Escono solo NOMI e CONTEGGI: nessuna riga, nessun dato di un contatto o di
// una prenotazione. Per misurare si legge soltanto la colonna che lega la riga
// a un'azienda.

// Dove si misura l'uso di ogni funzione di livello azienda. `via` dice come la
// tabella si lega all'azienda: direttamente, oppure passando dall'entità o
// dall'evento.
const MISURE = {
  richieste:        [{ tabella: 'requests',          via: 'property_id' }],
  prenotazioni:     [{ tabella: 'prenotazioni' }],
  booking:          [{ tabella: 'risorse' }],
  contatti:         [{ tabella: 'contatti' }],
  preventivi:       [{ tabella: 'preventivi' }],
  recensioni:       [{ tabella: 'recensioni' }],
  survey:           [{ tabella: 'survey_risposte' }],
  chat:             [{ tabella: 'messages',          via: 'property_id' }],
  form_builder:     [{ tabella: 'form_builder' }, { tabella: 'form_submissions' }],
  blog:             [{ tabella: 'articoli' }],
  eventi:           [{ tabella: 'eventi' }, { tabella: 'event_bookings', via: 'event_id' }],
  offerte:          [{ tabella: 'offerte' }],
  newsletter:       [{ tabella: 'newsletters' }],
  whatsapp:         [{ tabella: 'whatsapp_account' }, { tabella: 'whatsapp_campagna' }],
  automazioni:      [{ tabella: 'automazioni' }],
  piano_editoriale: [{ tabella: 'piano_editoriale' }, { tabella: 'pe_campagne' }],
  loyalty:          [{ tabella: 'loyalty_programs' }, { tabella: 'gift_cards' }],
  shop:             [{ tabella: 'prodotti' }, { tabella: 'ordini' }],
  analytics:        [{ tabella: 'page_views',        via: 'entity_id' }],
  // Content Studio non ha una tabella sua: la strategia che produce si salva
  // sull'azienda (vedi sotto), le bozze finiscono nel piano editoriale.
}

// PostgREST restituisce al massimo 1000 righe per richiesta: una lettura sola
// sotto-conterebbe in silenzio le tabelle che crescono (le visite, per prime).
async function leggiTutto(tabella, colonna) {
  const righe = []
  for (let da = 0; ; da += 1000) {
    const { data, error } = await supabaseAdmin.from(tabella).select(colonna).range(da, da + 999)
    if (error) throw new Error(`${tabella}: ${error.message}`)
    righe.push(...data)
    if (data.length < 1000) return righe
  }
}

export async function GET(request) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response

    const [{ data: aziende, error: eA }, { data: entita, error: eE }, { data: eventi, error: eV }] = await Promise.all([
      supabaseAdmin.from('aziende').select('id, ragione_sociale, content_strategy').order('ragione_sociale'),
      supabaseAdmin.from('entita').select('id, azienda_id, tipo, name, moduli').order('name'),
      supabaseAdmin.from('eventi').select('id, azienda_id'),
    ])
    if (eA || eE || eV) throw new Error((eA || eE || eV).message)

    const aziendaDi = {
      property_id: Object.fromEntries(entita.map(e => [e.id, e.azienda_id])),
      entity_id: Object.fromEntries(entita.map(e => [e.id, e.azienda_id])),
      event_id: Object.fromEntries(eventi.map(e => [e.id, e.azienda_id])),
    }

    // uso[azienda][funzione] = righe
    const uso = Object.fromEntries(aziende.map(a => [a.id, {}]))
    const nonMisurate = []
    for (const [funzione, misure] of Object.entries(MISURE)) {
      for (const { tabella, via } of misure) {
        let righe
        try {
          righe = await leggiTutto(tabella, via || 'azienda_id')
        } catch (err) {
          // Una tabella illeggibile non deve spegnere la pagina, ma nemmeno
          // passare per «nessun uso»: si dice che non è stata misurata.
          nonMisurate.push(tabella)
          logError('funzioni-uso', err)
          continue
        }
        for (const r of righe) {
          const az = via ? aziendaDi[via][r[via]] : r.azienda_id
          if (!az || !uso[az]) continue
          uso[az][funzione] = (uso[az][funzione] || 0) + 1
        }
      }
    }
    // ⚠️ La colonna nasce `{}` (migration 037): «non vuota» è vero per tutti.
    // Usata vuol dire che dentro c'è una strategia, cioè almeno un campo.
    for (const a of aziende) {
      const s = a.content_strategy
      if (s && typeof s === 'object' && Object.keys(s).length > 0) uso[a.id].content_studio = 1
    }

    return Response.json({
      funzioniAzienda: FUNZIONI_AZIENDA.map(({ chiave, titolo }) => ({ chiave, titolo })),
      funzioniEntita: FUNZIONI.map(({ chiave, titolo, sempre }) => ({ chiave, titolo, sempre: !!sempre })),
      aziende: aziende.map(a => ({
        id: a.id,
        nome: a.ragione_sociale,
        uso: uso[a.id],
        entita: entita.filter(e => e.azienda_id === a.id).map(e => ({
          id: e.id,
          tipo: e.tipo,
          nome: e.name,
          accese: FUNZIONI.filter(f => funzioneAttiva(e, f.chiave)).map(f => f.chiave),
        })),
      })),
      nonMisurate,
    })
  } catch (err) {
    logError('funzioni-uso', err)
    return Response.json({ error: 'Errore interno' }, { status: 500 })
  }
}
