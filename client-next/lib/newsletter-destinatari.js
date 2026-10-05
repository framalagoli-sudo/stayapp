import { supabaseAdmin } from './supabase-server.js'
import { costruisciListe } from './contatti-liste.js'

// A chi va una newsletter. Un posto solo, perché la stessa domanda la fanno in
// due: l'invio, e il pannello che prima di inviare dice «stai per scrivere a N
// persone». Se le due risposte divergessero, il numero letto non sarebbe quello
// delle email partite.
//
// ⛔ Era così: il pannello contava TUTTI gli iscritti, anche quando la
// newsletter aveva un filtro, e l'invio ne raggiungeva meno.
//
// Tre condizioni, sempre tutte:
//   1. iscritto alla newsletter, con un'email che non rimbalza — il consenso
//      non si scavalca mai, qualunque lista si scelga;
//   2. se c'è un filtro per tag (il modo storico), deve averne uno;
//   3. se c'è una LISTA (migration 131), deve farne parte. Chi c'è dentro si
//      ricalcola adesso, non quando la bozza è stata scritta: chi ha prenotato
//      ieri la riceve.
//
// ⚠️ Se la lista scelta non esiste più (l'etichetta è stata tolta a tutti,
// l'evento non ha più prenotazioni) si FERMA con un errore. Ripiegare su «tutti
// gli iscritti» manderebbe a trecento persone un messaggio scritto per dodici.

async function tutte(costruisci) {
  const out = []
  for (let da = 0; ; da += 1000) {
    const { data, error } = await costruisci().range(da, da + 999)
    if (error) throw new Error(error.message)
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

/**
 * @returns {{ contatti: Array<{id, email, nome, unsubscribe_token}>, lista: null | { titolo: string, persone: number } }}
 *   `lista.persone` = quante persone ha la lista in tutto; `contatti` = quante di queste si possono raggiungere.
 */
export async function destinatariNewsletter(nl) {
  const tuttiIContatti = await tutte(() => supabaseAdmin.from('contatti')
    .select('id, email, nome, unsubscribe_token, tags, fonte, telefono, telefono_e164, iscritto_newsletter, email_non_valida, whatsapp_optin, pipeline_stage')
    .eq('azienda_id', nl.azienda_id).order('created_at').order('id'))

  let raggiungibili = tuttiIContatti.filter(c => c.iscritto_newsletter && c.email && !c.email_non_valida)
  if (nl.tag_filter?.length) {
    const voluti = new Set(nl.tag_filter)
    raggiungibili = raggiungibili.filter(c => (c.tags || []).some(t => voluti.has(t)))
  }

  let lista = null
  if (nl.lista?.chiave) {
    const registro = await tutte(() => supabaseAdmin.from('contatti_attivita')
      .select('contatto_id, tipo, titolo, origine_id, riferimento, avvenuta_il')
      .eq('azienda_id', nl.azienda_id).order('avvenuta_il', { ascending: false }).order('id'))
    const scelta = costruisciListe(tuttiIContatti, registro).liste.find(l => l.chiave === nl.lista.chiave)
    if (!scelta) throw new Error(`La lista «${nl.lista.titolo || nl.lista.chiave}» non esiste più: scegline un'altra o togli la lista per scrivere a tutti gli iscritti.`)
    if (scelta.ids) raggiungibili = raggiungibili.filter(c => scelta.ids.has(c.id))
    lista = { titolo: scelta.titoloLungo || scelta.titolo, persone: scelta.n }
  }

  return { contatti: raggiungibili.map(({ id, email, nome, unsubscribe_token }) => ({ id, email, nome, unsubscribe_token })), lista }
}

// Le liste fra cui si sceglie a chi scrivere, ognuna col suo conto: quante
// persone ha, e a quante di queste si può scrivere davvero. Le stesse liste
// della pagina Contatti (`costruisciListe`) e la stessa regola dell'invio.
// Escono solo titoli e numeri: mai nomi né indirizzi.
//
// Non si offrono le liste che non sono un pubblico a cui scrivere: «Tutti» (è
// la scelta predefinita), «Si possono contattare» (lo è già chiunque riceva) e
// quelle «da sistemare».
const NON_SONO_UN_PUBBLICO = new Set(['tutti', 'contattabili', 'doppioni', 'da_correggere'])
export async function listeNewsletter(aziendaId) {
  const contatti = await tutte(() => supabaseAdmin.from('contatti')
    .select('id, email, nome, tags, fonte, telefono, telefono_e164, iscritto_newsletter, email_non_valida, whatsapp_optin, pipeline_stage')
    .eq('azienda_id', aziendaId).order('created_at').order('id'))
  const registro = await tutte(() => supabaseAdmin.from('contatti_attivita')
    .select('contatto_id, tipo, titolo, origine_id, riferimento, avvenuta_il')
    .eq('azienda_id', aziendaId).order('avvenuta_il', { ascending: false }).order('id'))
  const raggiungibili = new Set(contatti.filter(c => c.iscritto_newsletter && c.email && !c.email_non_valida).map(c => c.id))
  const liste = costruisciListe(contatti, registro).liste
    .filter(l => !NON_SONO_UN_PUBBLICO.has(l.chiave) && l.ids)
    .map(l => ({
      chiave: l.chiave, titolo: l.titoloLungo || l.titolo, gruppo: l.gruppo || 'In evidenza',
      persone: l.ids.size, raggiungibili: [...l.ids].filter(id => raggiungibili.has(id)).length,
    }))
    .filter(l => l.persone > 0)
  return { tutti: { persone: contatti.length, raggiungibili: raggiungibili.size }, liste }
}

// La lista che arriva dal client, ripulita: una chiave e un titolo, nient'altro.
// Che la chiave indichi una lista vera lo si scopre contando i destinatari.
export function listaValida(lista) {
  if (lista == null) return null
  const chiave = typeof lista.chiave === 'string' ? lista.chiave.trim().slice(0, 300) : ''
  if (!chiave || chiave === 'tutti') return null
  return { chiave, titolo: typeof lista.titolo === 'string' ? lista.titolo.trim().slice(0, 200) : '' }
}
