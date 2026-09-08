import { supabaseAdmin } from './supabase-server'

// Chi lascia i suoi dati finisce fra i contatti dell'azienda. Un punto solo.
//
// ⛔ Misurato l'08/09/2026: quattordici persone avevano prenotato un evento
// lasciando nome, email e telefono, e **una sola** era nel CRM — arrivata da
// un'altra strada. Le altre tredici erano perse: il cliente non poteva
// invitarle alla serata dopo, che è tutto il valore di un evento.
//
// Il pattern era scritto a mano in ogni route che se ne ricordava, con
// variazioni: chi metteva i tag e chi no, chi accodava la nota e chi la
// sovrascriveva, chi usava `.single()` (che con zero righe è un errore) e chi
// `.maybeSingle()`. Le prenotazioni evento non lo facevano affatto.
//
// ⚠️ Questo NON iscrive nessuno alla newsletter. Lasciare i propri dati per
// venire a una cena non è acconsentire a ricevere pubblicità: `iscritto_newsletter`
// resta falso e ci si iscrive dal suo modulo, con il suo consenso.

// I tag si uniscono, non si sostituiscono: chi ha prenotato due eventi diversi
// deve restare cercabile per tutti e due.
function unisciTag(esistenti, nuovi) {
  const puliti = (nuovi || [])
    .map(t => String(t || '').trim().slice(0, 60))
    .filter(Boolean)
  return [...new Set([...(esistenti || []), ...puliti])]
}

/**
 * Registra o aggiorna un contatto.
 *
 * @returns {{ nuovo: boolean, id: string|null }} `nuovo` serve a far partire
 *   l'automazione «nuovo contatto» una volta sola, non a ogni prenotazione.
 */
export async function registraContatto({ aziendaId, email, nome, telefono, fonte, tags = [], nota }) {
  const mail = String(email || '').trim().toLowerCase()
  if (!aziendaId || !mail) return { nuovo: false, id: null }

  try {
    const { data: esistente } = await supabaseAdmin.from('contatti')
      .select('id, tags, note, telefono, nome')
      .eq('azienda_id', aziendaId).eq('email', mail).maybeSingle()

    const rigaNota = nota ? `[${new Date().toLocaleDateString('it-IT')}] ${nota}` : null

    if (esistente) {
      const patch = {
        tags: unisciTag(esistente.tags, tags),
        updated_at: new Date().toISOString(),
      }
      // ⚠️ Non si sovrascrive quello che c'è già: un nome scritto per esteso nel
      // CRM non va sostituito da come uno si è firmato di fretta prenotando.
      if (!esistente.nome && nome) patch.nome = nome
      if (!esistente.telefono && telefono) patch.telefono = telefono
      if (rigaNota) patch.note = [esistente.note, rigaNota].filter(Boolean).join('\n\n')
      await supabaseAdmin.from('contatti').update(patch).eq('id', esistente.id)
      return { nuovo: false, id: esistente.id }
    }

    const { data: creato } = await supabaseAdmin.from('contatti').insert({
      azienda_id: aziendaId,
      email: mail,
      nome: nome || mail,
      telefono: telefono || null,
      fonte: fonte || 'prenotazione',
      tags: unisciTag([], tags),
      note: rigaNota,
      iscritto_newsletter: false,
    }).select('id').maybeSingle()
    return { nuovo: true, id: creato?.id || null }
  } catch (e) {
    // ⚠️ Non blocca mai l'azione che l'ha chiamata. Chi sta prenotando una cena
    // non deve vedere un errore perché il CRM ha avuto un problema: la
    // prenotazione vale più della scheda contatto.
    console.error('[crm] registraContatto:', e.message)
    return { nuovo: false, id: null }
  }
}

// Il tag di un evento: la categoria più il titolo, così si può cercare sia
// «tutti quelli che vengono agli eventi» sia «quelli dell'ultima serata jazz» —
// che è come si riempie l'evento successivo.
export function tagEvento(titolo) {
  const t = String(titolo || '').trim().slice(0, 60)
  return t ? ['evento', t] : ['evento']
}
