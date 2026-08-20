import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth, getProfile, resolveAziendaId } from '@/lib/server-auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { preparaContatti } from '@/lib/contatti-import'

// Import di una rubrica dentro una lista (tag). Due modalità:
//  - anteprima: dice cosa succederebbe, senza scrivere niente
//  - conferma:  scrive davvero
// L'anteprima non è un vezzo: un import sbagliato su una rubrica di migliaia di
// numeri non si annulla con un tasto, e chi importa deve vedere prima cosa entra.
export const maxDuration = 60

const MAX_RIGHE = 5000

export async function POST(request) {
  try {
    const { user, response } = await requireAuth(request)
    if (response) return response
    const profile = await getProfile(user.id)
    if (!profile) return Response.json({ error: 'Profilo non trovato' }, { status: 403 })

    const body = await request.json()
    const azienda_id = resolveAziendaId(profile, body.azienda_id)
    if (!azienda_id) return Response.json({ error: 'Azienda non valida' }, { status: 400 })

    const { allowed } = await rateLimit(request, { name: 'contatti-import', limit: 20, windowSec: 3600 })
    if (!allowed) return tooManyRequests()

    const testo = String(body.csv || '')
    if (!testo.trim()) return Response.json({ error: 'File vuoto' }, { status: 400 })

    const lista = String(body.lista || '').trim().slice(0, 40)
    const { contatti, scartati, intestazioni, colonne_riconosciute } = preparaContatti(testo, { prefisso: body.prefisso || '39' })

    if (!contatti.length) {
      return Response.json({
        error: 'Nessun contatto utilizzabile nel file. Servono almeno un’email o un numero di telefono validi per riga.',
        intestazioni, scartati: scartati.slice(0, 20),
      }, { status: 400 })
    }
    if (contatti.length > MAX_RIGHE) {
      return Response.json({ error: `Il file contiene ${contatti.length} contatti: il massimo per import è ${MAX_RIGHE}. Dividilo in più file.` }, { status: 400 })
    }

    // Chi c'è già: si riconosce per email o telefono, nella stessa azienda.
    const emails = contatti.map(c => c.email).filter(Boolean)
    const telefoni = contatti.map(c => c.telefono).filter(Boolean)
    const { data: esistenti } = await supabaseAdmin
      .from('contatti')
      .select('id, nome, email, telefono, tags, note')
      .eq('azienda_id', azienda_id)
      .or([
        emails.length ? `email.in.(${emails.map(e => `"${e}"`).join(',')})` : null,
        telefoni.length ? `telefono.in.(${telefoni.map(t => `"${t}"`).join(',')})` : null,
      ].filter(Boolean).join(','))

    const perEmail = new Map((esistenti || []).filter(c => c.email).map(c => [c.email.toLowerCase(), c]))
    const perTelefono = new Map((esistenti || []).filter(c => c.telefono).map(c => [c.telefono, c]))
    const trovaEsistente = c => (c.telefono && perTelefono.get(c.telefono)) || (c.email && perEmail.get(c.email)) || null

    const daCreare = contatti.filter(c => !trovaEsistente(c))
    const daAggiornare = contatti.filter(c => trovaEsistente(c))

    // Anteprima: nessuna scrittura.
    if (!body.conferma) {
      return Response.json({
        anteprima: true,
        totale: contatti.length,
        nuovi: daCreare.length,
        gia_presenti: daAggiornare.length,
        scartati: scartati.length,
        dettaglio_scartati: scartati.slice(0, 20),
        colonne_riconosciute,
        intestazioni,
        esempio: contatti.slice(0, 5),
        // Dichiarato a chiare lettere: nessuno deve credere di aver importato
        // anche il permesso di scrivere su WhatsApp.
        nota_consenso: 'I contatti importati NON risultano autorizzati a ricevere messaggi WhatsApp. Il consenso va raccolto a parte.',
      })
    }

    // Scrittura. I nuovi entrano con il consenso WhatsApp a false: un file non è
    // un consenso.
    let creati = 0, aggiornati = 0
    for (let i = 0; i < daCreare.length; i += 200) {
      const blocco = daCreare.slice(i, i + 200).map(c => ({
        azienda_id,
        nome: c.nome,
        email: c.email,
        telefono: c.telefono,
        note: c.note,
        tags: lista ? [lista] : [],
        fonte: 'import',
        iscritto_newsletter: false,
        whatsapp_optin: false,
      }))
      const { error } = await supabaseAdmin.from('contatti').insert(blocco)
      if (error) return Response.json({ error: `Errore durante l’inserimento: ${error.message}`, creati }, { status: 500 })
      creati += blocco.length
    }

    // Sugli esistenti si aggiungono solo la lista e i campi mancanti: quello che
    // il cliente ha già raccolto sul campo vale più di una riga di CSV.
    for (const c of daAggiornare) {
      const e = trovaEsistente(c)
      const patch = {}
      if (lista && !(e.tags || []).includes(lista)) patch.tags = [...(e.tags || []), lista]
      if (!e.telefono && c.telefono) patch.telefono = c.telefono
      if (!e.email && c.email) patch.email = c.email
      if (!e.note && c.note) patch.note = c.note
      if (!Object.keys(patch).length) continue
      patch.updated_at = new Date().toISOString()
      const { error } = await supabaseAdmin.from('contatti').update(patch).eq('id', e.id).eq('azienda_id', azienda_id)
      if (!error) aggiornati++
    }

    return Response.json({
      ok: true,
      creati,
      aggiornati,
      scartati: scartati.length,
      lista: lista || null,
      nota_consenso: 'Nessuno dei contatti importati è autorizzato a ricevere messaggi WhatsApp: il consenso va raccolto separatamente.',
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
