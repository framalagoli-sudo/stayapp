import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, entitaDellaAzienda } from '@/lib/server-auth'
import { cercaPostoGoogle, leggiGoogle, googleConfigurato, daAggiornare } from '@/lib/recensioni-esterne'

// Collegare la scheda Google di un'attività, e leggerne il punteggio.
//
// GET  ?entity_tipo&entity_id            → cosa c'è collegato adesso
// GET  ?cerca=...&entity_tipo&entity_id  → cerca la scheda su Google
// POST { entity_tipo, entity_id, fornitore, place_id }  → collega e legge
// DELETE ?entity_tipo&entity_id&fornitore                → scollega

async function profiloDi(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('role, azienda_id').eq('id', userId).single()
  return data
}

// ⚠️ L'entità arriva dal corpo o dalla query: si verifica SEMPRE che sia della
// propria azienda, o si scrive sulla scheda di un altro. È già successo con gli
// eventi (26/08) e con i link di recensione (02/09).
async function suaEntita(profile, tipo, id) {
  if (!tipo || !id) return false
  return await entitaDellaAzienda(profile, tipo, id)
}

async function leggiEntita(id) {
  const { data } = await supabaseAdmin.from('entita')
    .select('id, name, recensioni_esterne, description').eq('id', id).maybeSingle()
  return data
}

export async function GET(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await profiloDi(user.id)
    // Il super_admin non ha un'azienda propria: è la sua condizione normale.
    if (!profile) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const q = new URL(request.url).searchParams
    const tipo = q.get('entity_tipo'), id = q.get('entity_id')
    if (!(await suaEntita(profile, tipo, id))) return Response.json({ error: 'Entità non valida' }, { status: 404 })

    const cerca = q.get('cerca')
    if (cerca) {
      if (!googleConfigurato()) {
        return Response.json({ error: 'Google non è ancora collegato alla piattaforma.', non_configurato: true }, { status: 503 })
      }
      const risultati = await cercaPostoGoogle(cerca)
      return Response.json({ risultati })
    }

    const ent = await leggiEntita(id)
    return Response.json({
      collegati: ent?.recensioni_esterne || {},
      configurato: googleConfigurato(),
      // Suggerimento per la ricerca: il nome dell'attività, che il cliente non
      // deve ridigitare.
      suggerimento: ent?.name || '',
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await profiloDi(user.id)
    if (!profile) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const { entity_tipo, entity_id, fornitore = 'google', place_id } = await request.json()
    if (!(await suaEntita(profile, entity_tipo, entity_id))) {
      return Response.json({ error: 'Entità non valida' }, { status: 404 })
    }
    // Il fornitore si cerca in un catalogo chiuso: da qui diventa una chiave del
    // JSONB e poi un ramo di codice.
    if (fornitore !== 'google') return Response.json({ error: 'Fornitore non disponibile' }, { status: 400 })
    if (!googleConfigurato()) {
      return Response.json({ error: 'Google non è ancora collegato alla piattaforma.', non_configurato: true }, { status: 503 })
    }

    // Si legge subito: collegare una scheda e non vedere il punteggio lascia il
    // cliente a chiedersi se ha funzionato.
    const letto = await leggiGoogle(place_id)

    const ent = await leggiEntita(entity_id)
    const aggiornati = {
      ...(ent?.recensioni_esterne || {}),
      google: {
        place_id, rating: letto.rating, totale: letto.totale, url: letto.url,
        aggiornato: new Date().toISOString(), errore: null,
      },
    }
    const { error } = await supabaseAdmin.from('entita')
      .update({ recensioni_esterne: aggiornati }).eq('id', entity_id)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ collegati: aggiornati })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await profiloDi(user.id)
    if (!profile) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const q = new URL(request.url).searchParams
    const tipo = q.get('entity_tipo'), id = q.get('entity_id'), fornitore = q.get('fornitore') || 'google'
    if (!(await suaEntita(profile, tipo, id))) return Response.json({ error: 'Entità non valida' }, { status: 404 })

    const ent = await leggiEntita(id)
    const aggiornati = { ...(ent?.recensioni_esterne || {}) }
    delete aggiornati[fornitore]
    const { error } = await supabaseAdmin.from('entita')
      .update({ recensioni_esterne: aggiornati }).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ collegati: aggiornati })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
