import { supabaseAdmin } from './supabase-server'
import { normalizzaTelefono } from './contatti-import'

// Le due operazioni sui contatti che non si disfano: rendere anonima una
// persona e unire due schede della stessa persona. Stanno insieme perché hanno
// lo stesso problema: i dati di una persona non stanno solo nella sua scheda.
//
// ⚠️ Chi chiama ha già verificato che il contatto sia dell'azienda di chi
// chiede. Qui ogni lettura e scrittura resta comunque dentro `azienda_id`.

const stessaEmail = (a, b) => !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase()

// Le righe di una tabella che appartengono a questa persona: per email, o per
// numero di telefono (confrontato in forma internazionale, perché ognuno lo
// scrive a modo suo). A pagine: PostgREST ne dà mille per volta.
async function righeDellaPersona({ tabella, colonne, filtro, campoEmail, campoTelefono, email, e164 }) {
  const sue = []
  for (let da = 0; ; da += 1000) {
    const { data, error } = await filtro(supabaseAdmin.from(tabella).select(colonne)).order('id').range(da, da + 999)
    if (error) throw new Error(`${tabella}: ${error.message}`)
    for (const r of data || []) {
      if (stessaEmail(r[campoEmail], email) || (e164 && normalizzaTelefono(r[campoTelefono]) === e164)) sue.push(r.id)
    }
    if (!data || data.length < 1000) break
  }
  return sue
}

/**
 * Rende anonima una persona: per chi chiede la cancellazione dei suoi dati.
 *
 * ⛔ Prima si puliva SOLO la scheda del contatto. Nome, email e telefono
 * restavano nelle prenotazioni degli eventi, in quelle di risorse e offerte e
 * negli invii dei moduli: per una richiesta di cancellazione vera non bastava.
 *
 * Le righe non si cancellano, si svuotano: «una prenotazione per 2 posti» resta,
 * così i conteggi di una serata non cambiano; chi fosse non si legge più.
 *
 * ⚠️ NON tocca gli ordini del negozio: sono documenti di vendita, e la legge
 * chiede di conservarli anche a chi ha diritto alla cancellazione. Lo dice a
 * chi chiama, che lo dice al titolare.
 *
 * @returns {{ eventi: number, prenotazioni: number, moduli: number }} quante righe ha svuotato
 */
export async function anonimizzaContatto(contatto) {
  const { id, azienda_id: aziendaId, email } = contatto
  const e164 = contatto.telefono_e164 || normalizzaTelefono(contatto.telefono)

  // 1. Le prenotazioni degli eventi dell'azienda.
  const { data: eventi } = await supabaseAdmin.from('eventi').select('id').eq('azienda_id', aziendaId)
  const idEventi = (eventi || []).map(e => e.id)
  let nEventi = 0
  for (let i = 0; i < idEventi.length; i += 100) {
    const sue = await righeDellaPersona({
      tabella: 'event_bookings', colonne: 'id, guest_email, guest_phone', campoEmail: 'guest_email', campoTelefono: 'guest_phone', email, e164,
      filtro: q => q.in('event_id', idEventi.slice(i, i + 100)),
    })
    for (let k = 0; k < sue.length; k += 200) {
      const { error } = await supabaseAdmin.from('event_bookings')
        .update({ guest_name: 'Anonimo', guest_email: null, guest_phone: null, notes: null }).in('id', sue.slice(k, k + 200))
      if (error) throw new Error(`prenotazioni evento: ${error.message}`)
    }
    nEventi += sue.length
  }

  // 2. Le prenotazioni di risorse e offerte.
  const suePren = await righeDellaPersona({
    tabella: 'prenotazioni', colonne: 'id, cliente_email, cliente_telefono', campoEmail: 'cliente_email', campoTelefono: 'cliente_telefono', email, e164,
    filtro: q => q.eq('azienda_id', aziendaId),
  })
  for (let k = 0; k < suePren.length; k += 200) {
    const { error } = await supabaseAdmin.from('prenotazioni')
      .update({ cliente_nome: 'Anonimo', cliente_email: '', cliente_telefono: null, note_cliente: null, messaggio: null }).in('id', suePren.slice(k, k + 200))
    if (error) throw new Error(`prenotazioni: ${error.message}`)
  }

  // 3. Quello che ha scritto nei moduli.
  const { data: invii, error: eInvii } = await supabaseAdmin.from('form_submissions')
    .update({ dati: {}, ip: null }).eq('contatto_id', id).eq('azienda_id', aziendaId).select('id')
  if (eInvii) throw new Error(`moduli: ${eInvii.message}`)

  // 4. La scheda, per ultima: se qualcosa sopra fallisce, la persona si può
  // ancora ritrovare e riprovare — al contrario non si saprebbe più chi cercare.
  const { error } = await supabaseAdmin.from('contatti').update({
    nome: 'Anonimo', email: `cancellato-${String(id).slice(0, 8)}@gdpr.anonimo`,
    telefono: null, telefono_e164: null, note: null, tags: [], iscritto_newsletter: false,
    whatsapp_optin: false, whatsapp_optin_il: null, whatsapp_optin_fonte: null,
    marketing_consenso_il: null, marketing_consenso_testo: null, marketing_consenso_fonte: null,
    marketing_revoca_il: null, marketing_revoca_fonte: null,
    pipeline_stage: null, updated_at: new Date().toISOString(),
  }).eq('id', id).eq('azienda_id', aziendaId)
  if (error) throw new Error(`contatto: ${error.message}`)

  return { eventi: nEventi, prenotazioni: suePren.length, moduli: (invii || []).length }
}

// Le tabelle che puntano a un contatto. Unendo due schede vanno spostate TUTTE:
// quella che si dimentica perde i suoi dati quando la seconda scheda viene
// cancellata (i punti fedeltà se ne vanno in cascata, gli altri restano orfani).
const PUNTANO_AL_CONTATTO = ['form_submissions', 'preventivi', 'loyalty_points', 'whatsapp_messaggio']

/**
 * Unisce due schede della stessa persona: tutto ciò che è di `altro` passa a
 * `principale`, e `altro` sparisce.
 *
 * Non si annulla, e per questo non parte mai da sola: la decide il titolare,
 * guardando le due schede. Riconoscere «la stessa persona» da soli sbagliando
 * una volta fonde due clienti, e non si torna indietro.
 *
 * Cosa vince: i dati della scheda principale. Dell'altra si prende solo quello
 * che alla principale manca. Un consenso vale per l'indirizzo o il numero a cui
 * è stato dato: passa solo se quel recapito è quello che resta.
 */
export async function unisciContatti(principale, altro) {
  const aziendaId = principale.azienda_id
  if (!aziendaId || altro.azienda_id !== aziendaId || principale.id === altro.id) throw new Error('Le due schede devono essere diverse e della stessa azienda')

  // 1. Il registro. La stessa cosa registrata su tutte e due (capita con
  // l'iscrizione alla newsletter) resta una volta sola.
  const { data: fatti } = await supabaseAdmin.from('contatti_attivita').select('id').eq('contatto_id', altro.id)
  for (const f of fatti || []) {
    const { error } = await supabaseAdmin.from('contatti_attivita').update({ contatto_id: principale.id }).eq('id', f.id)
    if (error?.code === '23505') await supabaseAdmin.from('contatti_attivita').delete().eq('id', f.id)
    else if (error) throw new Error(`registro: ${error.message}`)
  }

  // 2. Tutto il resto che punta alla seconda scheda.
  for (const tabella of PUNTANO_AL_CONTATTO) {
    const { error } = await supabaseAdmin.from(tabella).update({ contatto_id: principale.id }).eq('contatto_id', altro.id)
    if (error) throw new Error(`${tabella}: ${error.message}`)
  }

  // 3. I dati della scheda.
  const patch = { updated_at: new Date().toISOString() }
  if (!principale.email && altro.email) patch.email = altro.email
  if (!principale.telefono && altro.telefono) { patch.telefono = altro.telefono; patch.telefono_e164 = altro.telefono_e164 || normalizzaTelefono(altro.telefono) }
  const emailFinale = patch.email || principale.email
  const e164Finale = patch.telefono_e164 || principale.telefono_e164 || normalizzaTelefono(principale.telefono)
  patch.tags = [...new Set([...(principale.tags || []), ...(altro.tags || [])])]
  if (!principale.pipeline_stage && altro.pipeline_stage) patch.pipeline_stage = altro.pipeline_stage

  // L'altro recapito non sparisce: una persona con due email resta raggiungibile
  // alla seconda, che finisce nelle note insieme a quelle dell'altra scheda.
  const altriRecapiti = [
    altro.email && !stessaEmail(altro.email, emailFinale) ? altro.email : null,
    altro.telefono && (altro.telefono_e164 || normalizzaTelefono(altro.telefono)) !== e164Finale ? altro.telefono : null,
  ].filter(Boolean)
  const note = [principale.note, altro.note, altriRecapiti.length ? `Altri recapiti: ${altriRecapiti.join(', ')}` : null].filter(Boolean).join('\n\n')
  if (note !== (principale.note || '')) patch.note = note || null

  // ⚠️ Se la scheda che resta si è disiscritta DOPO quel sì (o non si sa quando
  // il sì sia stato dato), il no vince: unire due schede non riscrive a chi
  // aveva chiesto di smettere.
  const noPiuRecente = principale.marketing_revoca_il
    && (!altro.marketing_consenso_il || new Date(principale.marketing_revoca_il) >= new Date(altro.marketing_consenso_il))
  if (!principale.iscritto_newsletter && altro.iscritto_newsletter && stessaEmail(altro.email, emailFinale) && !noPiuRecente) {
    Object.assign(patch, { iscritto_newsletter: true, marketing_consenso_il: altro.marketing_consenso_il, marketing_consenso_testo: altro.marketing_consenso_testo, marketing_consenso_fonte: altro.marketing_consenso_fonte, marketing_revoca_il: null, marketing_revoca_fonte: null })
  }
  if (!principale.whatsapp_optin && altro.whatsapp_optin && e164Finale && (altro.telefono_e164 || normalizzaTelefono(altro.telefono)) === e164Finale) {
    Object.assign(patch, { whatsapp_optin: true, whatsapp_optin_il: altro.whatsapp_optin_il, whatsapp_optin_fonte: altro.whatsapp_optin_fonte })
  }

  const { error: e1 } = await supabaseAdmin.from('contatti').update(patch).eq('id', principale.id).eq('azienda_id', aziendaId)
  if (e1) throw new Error(`scheda: ${e1.message}`)

  // 4. Solo adesso la seconda scheda se ne va: tutto ciò che era suo è già altrove.
  const { error: e2 } = await supabaseAdmin.from('contatti').delete().eq('id', altro.id).eq('azienda_id', aziendaId)
  if (e2) throw new Error(`seconda scheda: ${e2.message}`)
  return { id: principale.id }
}
