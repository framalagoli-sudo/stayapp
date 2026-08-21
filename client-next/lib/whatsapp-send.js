import { supabaseAdmin } from './supabase-server'
import { decifra, inviaTemplate, stimaCosto, numeroValido } from './whatsapp'
import { trovaTemplate, nomeMeta } from './whatsapp-catalogo'

// Invio di una campagna WhatsApp. Stesso schema della newsletter (selezione per
// lista, invio a blocchi, registro degli esiti), con due differenze che contano:
//  - si scrive SOLO a chi ha dato il consenso: senza, il numero del cliente viene
//    segnalato e Meta lo limita;
//  - ogni messaggio costa, quindi ogni destinatario lascia una riga nel registro:
//    se qualcosa va storto si deve poter dire a chi è arrivato e a chi no.

// Destinatari: consenso + lista + numero valido. Ogni filtro toglie qualcuno, e
// il conto va mostrato al cliente prima dell'invio.
export async function destinatariCampagna(campagna) {
  let q = supabaseAdmin
    .from('contatti')
    .select('id, nome, telefono, tags')
    .eq('azienda_id', campagna.azienda_id)
    .eq('whatsapp_optin', true)
    .not('telefono', 'is', null)
  if (campagna.tag_filter?.length) q = q.overlaps('tags', campagna.tag_filter)

  const { data, error } = await q
  if (error) throw new Error(error.message)

  const validi = []
  const senzaNumero = []
  for (const c of data || []) {
    if (numeroValido(c.telefono)) validi.push(c)
    else senzaNumero.push(c)
  }
  return { validi, senzaNumero }
}

// Anteprima onesta: quanti riceveranno, quanti restano fuori e perché, e quanto
// costa. Serve alla pagina PRIMA che il cliente prema invia.
export async function anteprimaCampagna(campagna) {
  const t = trovaTemplate(campagna.catalogo_key)
  if (!t) throw new Error('Messaggio non trovato nel catalogo')
  const { validi, senzaNumero } = await destinatariCampagna(campagna)

  // Quanti hanno la lista giusta ma non il consenso: è il numero che dice al
  // cliente quanto gli conviene raccoglierlo.
  let qSenzaConsenso = supabaseAdmin
    .from('contatti')
    .select('id', { count: 'exact', head: true })
    .eq('azienda_id', campagna.azienda_id)
    .eq('whatsapp_optin', false)
  if (campagna.tag_filter?.length) qSenzaConsenso = qSenzaConsenso.overlaps('tags', campagna.tag_filter)
  const { count: senzaConsenso } = await qSenzaConsenso

  return {
    destinatari: validi.length,
    esclusi_senza_consenso: senzaConsenso || 0,
    esclusi_numero_non_valido: senzaNumero.length,
    costo_stimato: stimaCosto(t.categoria, validi.length),
    categoria: t.categoria,
  }
}

// Esegue la campagna. Non lancia: registra l'esito sulla campagna, perché questo
// gira da un cron e nessuno legge le eccezioni.
export async function eseguiCampagna(campagnaId) {
  const { data: campagna } = await supabaseAdmin.from('whatsapp_campagna').select('*').eq('id', campagnaId).single()
  if (!campagna) return { ok: false, errore: 'Campagna non trovata' }
  if (campagna.stato === 'in_corso' || campagna.stato === 'completata') {
    return { ok: false, errore: `Campagna già ${campagna.stato}` }
  }

  const t = trovaTemplate(campagna.catalogo_key)
  const { data: account } = await supabaseAdmin.from('whatsapp_account').select('*').eq('azienda_id', campagna.azienda_id).maybeSingle()

  const fermaCon = async errore => {
    await supabaseAdmin.from('whatsapp_campagna').update({ stato: 'errore', errore, updated_at: new Date().toISOString() }).eq('id', campagnaId)
    return { ok: false, errore }
  }
  if (!t) return await fermaCon('Messaggio non più presente nel catalogo')
  if (!account || account.stato !== 'attivo') return await fermaCon('Il numero WhatsApp non è collegato')

  const token = decifra(account.access_token_cifrato)
  if (!token) return await fermaCon('Collegamento con WhatsApp non più valido: ricollega il numero')

  // Il template dev'essere approvato da Meta su quell'account, altrimenti ogni
  // invio fallirebbe uno per uno lasciando il cliente col conto dei tentativi.
  const { data: tpl } = await supabaseAdmin
    .from('whatsapp_template').select('stato')
    .eq('azienda_id', campagna.azienda_id).eq('catalogo_key', t.key).eq('catalogo_versione', t.versione).maybeSingle()
  if (tpl && tpl.stato !== 'approvato') return await fermaCon(`Il messaggio "${t.titolo}" non è ancora approvato da Meta`)

  const { validi } = await destinatariCampagna(campagna)
  if (!validi.length) return await fermaCon('Nessun destinatario: serve almeno un contatto con consenso WhatsApp e numero valido')

  await supabaseAdmin.from('whatsapp_campagna').update({
    stato: 'in_corso', destinatari_totali: validi.length, costo_stimato: stimaCosto(t.categoria, validi.length),
    errore: null, updated_at: new Date().toISOString(),
  }).eq('id', campagnaId)

  const nome = nomeMeta(t.key, t.versione)
  let inviati = 0, falliti = 0

  for (const contatto of validi) {
    // I valori nell'ordine in cui compaiono nel testo. {{1}} è quasi sempre il
    // nome: si prende dal contatto, non da quello che ha scritto il cliente.
    const valori = t.variabili.map(v =>
      v.chiave === 'nome' ? (contatto.nome || '') : (campagna.variabili?.[v.chiave] ?? ''))

    const r = await inviaTemplate({
      phoneNumberId: account.phone_number_id,
      token,
      a: contatto.telefono,
      nomeTemplate: nome,
      valori,
    })

    await supabaseAdmin.from('whatsapp_messaggio').insert({
      azienda_id: campagna.azienda_id,
      campagna_id: campagnaId,
      contatto_id: contatto.id,
      telefono: contatto.telefono,
      message_id_meta: r.data?.messages?.[0]?.id || null,
      stato: r.ok ? 'inviato' : 'fallito',
      errore: r.ok ? null : r.error,
      inviato_il: r.ok ? new Date().toISOString() : null,
    })

    if (r.ok) inviati++
    else falliti++

    // Se Meta ci sta limitando, insistere peggiora la situazione: si ferma e si
    // riprende al giro successivo, invece di bruciare la reputazione del numero.
    if (!r.ok && /rate limit|too many/i.test(r.error || '')) {
      await supabaseAdmin.from('whatsapp_campagna').update({
        stato: 'programmata', inviati, falliti,
        errore: 'Invio sospeso: WhatsApp sta limitando il numero. Riprendiamo tra poco.',
        programmata_per: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', campagnaId)
      return { ok: false, sospesa: true, inviati, falliti }
    }
  }

  await supabaseAdmin.from('whatsapp_campagna').update({
    stato: 'completata', inviati, falliti, updated_at: new Date().toISOString(),
  }).eq('id', campagnaId)

  return { ok: true, inviati, falliti }
}

// Campagne programmate arrivate a scadenza: le raccoglie il cron.
export async function eseguiProgrammate() {
  const { data: dovute } = await supabaseAdmin
    .from('whatsapp_campagna').select('id')
    .eq('stato', 'programmata')
    .lte('programmata_per', new Date().toISOString())
    .limit(5)

  const esiti = []
  for (const c of dovute || []) esiti.push({ id: c.id, ...(await eseguiCampagna(c.id)) })
  return esiti
}
