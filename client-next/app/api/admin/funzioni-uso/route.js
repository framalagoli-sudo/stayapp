import { supabaseAdmin } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/server-auth'
import { logError } from '@/lib/observability'
import { FUNZIONI, FUNZIONI_AZIENDA, funzioneAttiva } from '@/lib/funzioni'
import { usoDiTutte } from '@/lib/uso-funzioni'

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

export async function GET(request) {
  try {
    const { response } = await requireSuperAdmin(request)
    if (response) return response

    const [{ data: aziende, error: eA }, { data: entita, error: eE }, { data: eventi, error: eV }] = await Promise.all([
      supabaseAdmin.from('aziende').select('id, ragione_sociale, content_strategy, funzioni').order('ragione_sociale'),
      supabaseAdmin.from('entita').select('id, azienda_id, tipo, name, moduli, profilo, profilo_versione').order('name'),
      supabaseAdmin.from('eventi').select('id, azienda_id'),
    ])
    if (eA || eE || eV) throw new Error((eA || eE || eV).message)

    // La misura è condivisa con l'assegnazione delle categorie (lib/uso-funzioni.js).
    const { uso, nonMisurate } = await usoDiTutte(aziende, entita, eventi)
    for (const t of nonMisurate) logError('funzioni-uso', new Error(`tabella non misurata: ${t}`))

    return Response.json({
      funzioniAzienda: FUNZIONI_AZIENDA.map(({ chiave, titolo }) => ({ chiave, titolo })),
      funzioniEntita: FUNZIONI.map(({ chiave, titolo, sempre }) => ({ chiave, titolo, sempre: !!sempre })),
      aziende: aziende.map(a => ({
        id: a.id,
        nome: a.ragione_sociale,
        // Le funzioni di livello azienda decise dalle categorie (null = mai decise: vede tutto).
        funzioni: a.funzioni ?? null,
        uso: uso[a.id],
        entita: entita.filter(e => e.azienda_id === a.id).map(e => ({
          id: e.id,
          tipo: e.tipo,
          nome: e.name,
          profilo: e.profilo ?? null,
          profilo_versione: e.profilo_versione ?? null,
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
