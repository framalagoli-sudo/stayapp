import { supabaseAdmin } from './supabase-server'
import { dataLocale } from './fuso'
import { fusoDiAzienda } from './fuso-azienda'
import { normalizzaTelefono } from './contatti-import'

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

// ── Chi è la stessa persona ────────────────────────────────────────────────
//
// Finora un contatto si riconosceva SOLO dall'email. Ma c'è chi lascia soltanto
// un numero — chi prenota un'offerta scrivendo il telefono, chi il titolare
// segna a mano, e soprattutto chi arriverà da WhatsApp, che un'email non ce
// l'ha. Senza una seconda chiave quelle persone non entravano, oppure entravano
// una volta per ogni prenotazione.
//
// L'ordine: prima l'email, poi il telefono in forma internazionale. Se le due
// chiavi indicano due contatti diversi vince l'email e NON si uniscono: fondere
// due persone per sbaglio è peggio di un doppione, perché non si torna indietro.
//
// ⚠️ `limit(1)` e non `maybeSingle()`: con due righe uguali — i doppioni
// esistono — `maybeSingle` dà errore, il contatto «non si trova» e ne nasce un
// terzo.
const CAMPI = 'id, nome, email, telefono, telefono_e164, tags, note, pipeline_stage'

async function trovaContatto(aziendaId, mail, e164) {
  if (mail) {
    const { data } = await supabaseAdmin.from('contatti').select(CAMPI)
      .eq('azienda_id', aziendaId).eq('email', mail).order('created_at').limit(1)
    if (data?.[0]) return data[0]
    // Le righe vecchie possono avere l'email scritta con le maiuscole. In un
    // `ilike` il trattino basso e il percento sono caratteri jolly: si
    // neutralizzano, e l'uguaglianza si ricontrolla qui.
    const { data: simili } = await supabaseAdmin.from('contatti').select(CAMPI)
      .eq('azienda_id', aziendaId).ilike('email', mail.replace(/[\\%_]/g, '\\$&')).order('created_at').limit(5)
    const stessa = (simili || []).find(c => String(c.email || '').trim().toLowerCase() === mail)
    if (stessa) return stessa
  }
  if (e164) {
    const { data } = await supabaseAdmin.from('contatti').select(CAMPI)
      .eq('azienda_id', aziendaId).eq('telefono_e164', e164).order('created_at').limit(1)
    if (data?.[0]) return data[0]
  }
  return null
}

// I tipi che il registro accetta (migration 130): stesso elenco del CHECK.
const TIPI_ATTIVITA = new Set(['evento', 'lista_attesa', 'prenotazione', 'ordine', 'modulo',
  'richiesta', 'newsletter', 'whatsapp', 'preventivo', 'recensione', 'manuale', 'import', 'altro'])
// Chi entra nelle «Trattative» da solo: chi ha chiesto qualcosa e aspetta una
// risposta — un messaggio dal sito, WhatsApp, un preventivo.
//
// ⚠️ I moduli costruiti dal cliente NO: sono generici, e nei dati veri 40 invii
// su 42 erano iscrizioni a un gioco, non richieste. Quaranta «da contattare»
// finti sono lo stesso rumore di prima.
//
// ⛔ Prima ci finivano TUTTI: 114 contatti su 116 erano fermi a «Nuovo lead»,
// e chi aveva prenotato una serata di cabaret risultava una trattativa da
// lavorare. Chi prenota o compra non ha niente da trattare: ha già deciso.
// Resta sempre possibile metterlo in trattativa a mano dalla sua scheda —
// «perché privarci di una possibilità?» (Francesco, 04/10/2026).
const APRE_TRATTATIVA = new Set(['richiesta', 'whatsapp', 'preventivo'])
export const apreTrattativa = tipo => APRE_TRATTATIVA.has(tipo)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Scrive nel registro una cosa che il contatto ha fatto.
 *
 * ⚠️ Niente dati personali qui dentro: il titolo è il nome dell'evento, del
 * modulo, della risorsa; il dettaglio sono numeri («2 posti»). Chi sia la
 * persona lo dice `contatto_id`.
 *
 * Non lancia mai: registrare la storia non deve far fallire l'azione vera.
 *
 * @param attivita { tipo, titolo, origineId, riferimento, entityId, dettaglio, quando }
 */
export async function registraAttivita(aziendaId, contattoId, attivita) {
  if (!aziendaId || !contattoId || !attivita) return false
  const tipo = TIPI_ATTIVITA.has(attivita.tipo) ? attivita.tipo : 'altro'
  try {
    const { error } = await supabaseAdmin.from('contatti_attivita').insert({
      azienda_id: aziendaId,
      contatto_id: contattoId,
      tipo,
      titolo: attivita.titolo ? String(attivita.titolo).trim().slice(0, 200) : null,
      origine_id: UUID.test(attivita.origineId || '') ? attivita.origineId : null,
      riferimento: attivita.riferimento ? String(attivita.riferimento).slice(0, 200) : null,
      entity_id: UUID.test(attivita.entityId || '') ? attivita.entityId : null,
      dettaglio: attivita.dettaglio && typeof attivita.dettaglio === 'object' && !Array.isArray(attivita.dettaglio) ? attivita.dettaglio : {},
      ...(attivita.quando ? { avvenuta_il: new Date(attivita.quando).toISOString() } : {}),
    })
    // 23505 = c'è già: la stessa prenotazione non si conta due volte. Non è un errore.
    if (error && error.code !== '23505') { console.error('[crm] registraAttivita:', error.message); return false }
    return true
  } catch (e) {
    console.error('[crm] registraAttivita:', e.message)
    return false
  }
}

/**
 * Registra o aggiorna un contatto, e scrive nel registro cosa ha fatto.
 * È l'unica porta: ogni punto in cui una persona lascia i suoi dati passa di qui.
 *
 * Serve un'email **o** un telefono. `attivita` è facoltativa (vedi `registraAttivita`).
 *
 * `nota` va nelle note del contatto e serve SOLO per le parole della persona (il
 * messaggio scritto dal modulo del sito). Cosa ha fatto — «ha prenotato…» — non
 * si scrive lì: sta nel registro. Era la stessa storia scritta due volte, e nelle
 * note si mescolava a quello che scrive il titolare.
 *
 * @returns {{ nuovo: boolean, id: string|null }} `nuovo` serve a far partire
 *   l'automazione «nuovo contatto» una volta sola, non a ogni prenotazione.
 */
export async function registraContatto({ aziendaId, email, nome, telefono, fonte, tags = [], nota, attivita = null }) {
  const mail = String(email || '').trim().toLowerCase() || null
  const tel = String(telefono || '').trim() || null
  const e164 = normalizzaTelefono(tel)
  if (!aziendaId || (!mail && !e164)) return { nuovo: false, id: null }

  try {
    const esistente = await trovaContatto(aziendaId, mail, e164)

    // La data della nota è quella dell'azienda: sul server (UTC) dopo le 22
    // italiane la riga nasceva già con il giorno prima.
    const rigaNota = nota ? `[${dataLocale(new Date(), await fusoDiAzienda(aziendaId))}] ${nota}` : null

    let id = null, nuovo = false
    if (esistente) {
      id = esistente.id
      const patch = {
        tags: unisciTag(esistente.tags, tags),
        updated_at: new Date().toISOString(),
      }
      // ⚠️ Non si sovrascrive quello che c'è già: un nome scritto per esteso nel
      // CRM non va sostituito da come uno si è firmato di fretta prenotando.
      // Si riempie solo ciò che manca — compresa l'email di chi era entrato col
      // solo numero, che è il modo in cui un contatto di WhatsApp diventa completo.
      if (!esistente.nome && nome) patch.nome = nome
      if (!esistente.email && mail) patch.email = mail
      if (!esistente.telefono && tel) patch.telefono = tel
      // La chiave segue il numero che il contatto HA: il suo se c'è, altrimenti
      // quello appena lasciato (che qui sopra diventa il suo).
      if (!esistente.telefono_e164) {
        const chiave = esistente.telefono ? normalizzaTelefono(esistente.telefono) : e164
        if (chiave) patch.telefono_e164 = chiave
      }
      if (rigaNota) patch.note = [esistente.note, rigaNota].filter(Boolean).join('\n\n')
      // Chi non era in trattativa e ora chiede qualcosa, ci entra. Chi c'è già resta dov'è.
      if (!esistente.pipeline_stage && apreTrattativa(attivita?.tipo)) patch.pipeline_stage = 'lead'
      await supabaseAdmin.from('contatti').update(patch).eq('id', id)
    } else {
      const { data: creato, error } = await supabaseAdmin.from('contatti').insert({
        azienda_id: aziendaId,
        email: mail,
        nome: String(nome || '').trim() || mail || tel,
        telefono: tel,
        telefono_e164: e164,
        fonte: fonte || 'prenotazione',
        tags: unisciTag([], tags),
        note: rigaNota,
        iscritto_newsletter: false,
        // ⚠️ Esplicito: la colonna ha «lead» come predefinito, e lasciandola
        // in bianco ogni persona nuova tornerebbe a essere una trattativa.
        pipeline_stage: apreTrattativa(attivita?.tipo) ? 'lead' : null,
      }).select('id').maybeSingle()
      if (error) throw new Error(error.message)
      id = creato?.id || null
      nuovo = !!id
    }

    if (id && attivita) await registraAttivita(aziendaId, id, attivita)
    return { nuovo, id }
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
