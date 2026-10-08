import { supabaseAdmin } from './supabase-server'
import { stripeConnect, stripeConfigurato } from './stripe-connect'
import { creaCheckout, contoDi, accontoDovuto } from './checkout'
import { sendEmail } from './send-email'
import { guestEmailTemplate } from './email-template'
import { getAziendaLegale } from './guest-data'
import { oraLocale } from './fuso'
import { mandaConfermaEvento } from './evento-conferma'
import { annunciaPrenotazioneEvento } from './evento-prenotato'
import { prenotazionePagata } from './prenotazione-risorsa'

// Il link di pagamento che il titolare manda a chi ha prenotato a voce.
//
// Idea di Francesco (08/10/2026): «un hotel che riceve una prenotazione
// telefonica e invia il link per il pagamento». Vale per le due cose che si
// prenotano — eventi e risorse — con una funzione sola.
//
// Tre regole, diverse da quelle della cassa che si apre prenotando dal sito:
//
//   1. **Chiedere il pagamento non cambia la prenotazione.** L'ha scritta il
//      titolare: resta com'è, col suo posto. Se il link scade torna «si paga
//      sul posto» e lui può mandarne un altro. Non si annulla mai da sola —
//      quello vale solo per chi si è prenotato da solo ed è alla cassa.
//   2. **Vale un giorno, non mezz'ora.** Chi lo riceve per email lo apre quando
//      può. Ventiquattro ore sono il massimo che Stripe concede a una cassa.
//   3. **La cifra la decide il titolare**, dal pannello, entro il totale della
//      prenotazione. Chi paga non dice mai quanto.
//
// ⚠️ Il link che si copia NON è l'indirizzo di Stripe (lungo trecento caratteri,
// e muto quando scade): è `www.oltrenova.com/paga/<sessione>`, che porta alla
// cassa finché è aperta e dopo dice di chi è e che è scaduto.

export const ORE_LINK = 24
const MINUTI_LINK = ORE_LINK * 60 - 5      // Stripe rifiuta oltre le 24 ore: cinque minuti di margine.
const IMPORTO_MINIMO = 0.5                 // sotto, Stripe non apre una cassa in euro
const IMPORTO_MASSIMO_LIBERO = 10000       // tetto quando la prenotazione non ha un totale suo

const round2 = n => Math.round((Number(n) || 0) * 100) / 100
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function linkPubblico(sessionId) {
  const base = ((process.env.CLIENT_URL ?? '').trim() || 'https://www.oltrenova.com').replace(/\/+$/, '').replace('://oltrenova.com', '://www.oltrenova.com')
  return `${base}/paga/${sessionId}`
}

const TABELLA = { evento: 'event_bookings', risorsa: 'prenotazioni' }

// La prenotazione, letta dalla sua tabella e raccontata con le stesse parole
// per i due tipi. Restituisce null se non esiste.
export async function leggiPrenotazione(tipo, id) {
  if (tipo === 'evento') {
    const { data: b } = await supabaseAdmin.from('event_bookings')
      .select('id, event_id, guest_name, guest_email, guest_phone, seats, total_amount, status, pagamento_stato, pagamento_id, pagamento_richiesto_il, importo_online')
      .eq('id', id).maybeSingle()
    if (!b) return null
    const { data: ev } = await supabaseAdmin.from('eventi')
      .select('id, title, date_start, azienda_id, entity_tipo, entity_id, acconto_percentuale, aziende(fuso_orario)')
      .eq('id', b.event_id).maybeSingle()
    if (!ev) return null
    return {
      tipo, id: b.id, aziendaId: ev.azienda_id, entityTipo: ev.entity_tipo, entityId: ev.entity_id,
      titolo: (b.seats || 1) > 1 ? `${ev.title} — ${b.seats} posti` : ev.title,
      quando: ev.date_start ? oraLocale(ev.date_start, ev.aziende?.fuso_orario, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : null,
      nome: b.guest_name, email: b.guest_email || '', telefono: b.guest_phone || '',
      totale: round2(b.total_amount),
      // Si può chiedere un pagamento a chi ha (o può avere) un posto: non a chi
      // è stato annullato o è in lista d'attesa.
      attiva: b.status === 'confirmed' || b.status === 'pending',
      allaCassa: b.status === 'pending' && b.pagamento_stato === 'non_pagato' && !b.pagamento_richiesto_il,
      pagamento_stato: b.pagamento_stato, pagamento_id: b.pagamento_id,
      richiesto_il: b.pagamento_richiesto_il, importo_online: b.importo_online,
      proposta: accontoDovuto(ev.acconto_percentuale, b.total_amount).dovuto || round2(b.total_amount),
    }
  }
  if (tipo === 'risorsa') {
    const { data: p } = await supabaseAdmin.from('prenotazioni')
      .select('id, azienda_id, entity_tipo, entity_id, risorsa_id, data, data_fine, ora_inizio, cliente_nome, cliente_email, cliente_telefono, importo_totale, stato, pagamento_stato, pagamento_id, pagamento_richiesto_il, importo_online, risorse(nome, acconto_percentuale), offerte(titolo)')
      .eq('id', id).maybeSingle()
    if (!p) return null
    const giorno = g => g ? new Date(g).toLocaleDateString('it-IT', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }) : ''
    return {
      tipo, id: p.id, aziendaId: p.azienda_id, entityTipo: p.entity_tipo, entityId: p.entity_id,
      titolo: p.risorse?.nome || p.offerte?.titolo || 'Prenotazione',
      quando: p.data_fine && p.data_fine !== p.data ? `dal ${giorno(p.data)} al ${giorno(p.data_fine)}` : `${giorno(p.data)}${p.ora_inizio ? ` alle ${p.ora_inizio.slice(0, 5)}` : ''}`,
      nome: p.cliente_nome, email: p.cliente_email || '', telefono: p.cliente_telefono || '',
      totale: round2(p.importo_totale),
      attiva: p.stato === 'confermata' || p.stato === 'in_attesa',
      allaCassa: p.stato === 'in_attesa' && p.pagamento_stato === 'non_pagato' && !p.pagamento_richiesto_il,
      pagamento_stato: p.pagamento_stato, pagamento_id: p.pagamento_id,
      richiesto_il: p.pagamento_richiesto_il, importo_online: p.importo_online,
      proposta: accontoDovuto(p.risorse?.acconto_percentuale, p.importo_totale).dovuto || round2(p.importo_totale),
    }
  }
  return null
}

// Il link ancora valido di questa prenotazione, se c'è.
export function linkAttivo(pren) {
  if (!pren?.richiesto_il || pren.pagamento_stato !== 'non_pagato' || !pren.pagamento_id) return null
  const scade = new Date(new Date(pren.richiesto_il).getTime() + MINUTI_LINK * 60_000)
  if (scade <= new Date()) return null
  return { url: linkPubblico(pren.pagamento_id), importo: round2(pren.importo_online), scade_il: scade.toISOString() }
}

// Perché a questa prenotazione non si può chiedere un pagamento, o null se si può.
export function motivoNonSiPuo(pren) {
  if (!pren) return 'Prenotazione non trovata'
  if (!pren.attiva) return 'Questa prenotazione è annullata o in lista d’attesa: non si chiede un pagamento a chi non ha un posto.'
  if (pren.pagamento_stato === 'pagato') return 'Questa prenotazione risulta già pagata online.'
  if (pren.allaCassa) return 'Questa persona sta già pagando dal sito: ha mezz’ora per completare. Riprova dopo.'
  return null
}

// La cifra chiesta, controllata. Con un totale non lo si supera; senza un
// totale (una prenotazione scritta a mano senza prezzo) vale un tetto fisso.
export function importoValido(pren, importo) {
  const n = round2(String(importo ?? '').replace(',', '.'))
  if (!Number.isFinite(n) || n < IMPORTO_MINIMO) return { errore: `L’importo minimo è €${IMPORTO_MINIMO.toFixed(2)}.` }
  const tetto = pren.totale > 0 ? pren.totale : IMPORTO_MASSIMO_LIBERO
  if (n > tetto) return { errore: pren.totale > 0 ? `Non puoi chiedere più del totale della prenotazione (€${pren.totale.toFixed(2)}).` : `L’importo massimo è €${IMPORTO_MASSIMO_LIBERO}.` }
  return { importo: n }
}

async function chiudiSessione(aziendaId, sessionId) {
  if (!sessionId || !stripeConfigurato()) return
  try {
    const conto = await contoDi(aziendaId)
    if (conto) await stripeConnect().checkout.sessions.expire(sessionId, {}, { stripeAccount: conto })
  } catch { /* già scaduta o già pagata: non c'è niente da chiudere */ }
}

// Crea il link. Se ce n'era uno ancora valido lo chiude prima: due casse aperte
// per la stessa prenotazione vorrebbero dire poter pagare due volte.
export async function creaLinkPagamento(pren, importoChiesto, base) {
  const no = motivoNonSiPuo(pren)
  if (no) return { errore: no, status: 409 }
  const v = importoValido(pren, importoChiesto)
  if (v.errore) return { errore: v.errore, status: 400 }

  if (pren.pagamento_stato === 'non_pagato' && pren.pagamento_id) await chiudiSessione(pren.aziendaId, pren.pagamento_id)

  const parziale = pren.totale > 0 && v.importo < pren.totale
  let esito
  try {
    esito = await creaCheckout({
      aziendaId: pren.aziendaId,
      righe: [{ nome: parziale ? `${pren.titolo} — acconto` : pren.titolo, importo: v.importo, quantita: 1 }],
      email: pren.email || null,
      riferimento: pren.id,
      successUrl: `${base}/checkout/successo?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/checkout/annullato`,
      minutiPerPagare: MINUTI_LINK,
    })
  } catch (e) {
    // Il caso più probabile: il conto per gli incassi non c'è, o il collegamento
    // è rimasto a metà. Va detto con parole che portino a risolverlo.
    return { errore: `Non è stato possibile creare il link: ${e.message}. Controlla in «Pagamenti» che il conto per gli incassi sia collegato e attivo.`, status: 409 }
  }

  const adesso = new Date().toISOString()
  const { error } = await supabaseAdmin.from(TABELLA[pren.tipo])
    .update({ pagamento_id: esito.sessionId, pagamento_stato: 'non_pagato', pagamento_richiesto_il: adesso, importo_online: v.importo, updated_at: adesso })
    .eq('id', pren.id)
  if (error) {
    // La cassa esiste ma non siamo riusciti ad annotarla: va chiusa, o qualcuno
    // potrebbe pagare una cosa che da noi non risulta.
    await chiudiSessione(pren.aziendaId, esito.sessionId)
    return { errore: 'Non siamo riusciti a salvare il link. Riprova.', status: 500 }
  }
  return { link: { url: linkPubblico(esito.sessionId), importo: v.importo, scade_il: new Date(Date.now() + MINUTI_LINK * 60_000).toISOString() } }
}

// La prenotazione viene annullata (o confermata «paga sul posto») mentre il
// link è ancora valido: il link si chiude, altrimenti la persona potrebbe
// pagare una prenotazione che non c'è più.
export async function ritiraLink(tipo, riga, aziendaId) {
  if (!riga?.pagamento_richiesto_il || riga.pagamento_stato !== 'non_pagato') return null
  await chiudiSessione(aziendaId, riga.pagamento_id)
  return { pagamento_stato: 'non_richiesto', pagamento_richiesto_il: null, importo_online: null }
}

async function nomeAttivita(pren) {
  if (pren.entityId) {
    const { data } = await supabaseAdmin.from('entita').select('name').eq('id', pren.entityId).maybeSingle()
    if (data?.name) return data.name
  }
  const { data: az } = await supabaseAdmin.from('aziende').select('ragione_sociale').eq('id', pren.aziendaId).maybeSingle()
  return az?.ragione_sociale || 'OltreNova'
}

// L'email con il link. `a` è l'indirizzo scritto dal titolare nel pannello.
export async function mandaLinkPagamento(pren, a) {
  const link = linkAttivo(pren)
  if (!link) return { errore: 'Non c’è un link valido da inviare: creane uno.', status: 409 }
  if (!(process.env.RESEND_API_KEY ?? '').trim()) return { errore: 'L’invio delle email non è configurato su questo ambiente.', status: 503 }
  const nome = await nomeAttivita(pren)
  const legale = await getAziendaLegale(pren.aziendaId)
  const parziale = pren.totale > 0 && link.importo < pren.totale
  const r = await sendEmail({
    _ctx: 'link-pagamento', fromName: nome, to: a,
    subject: `Completa il pagamento — ${pren.titolo}`,
    html: guestEmailTemplate({
      entityName: esc(nome), title: 'Il link per pagare',
      intro: `Ciao <strong>${esc(pren.nome || '')}</strong>, per completare la prenotazione da <strong>${esc(nome)}</strong> puoi pagare online in modo sicuro.`,
      rows: [
        { label: 'Prenotazione', value: esc(pren.titolo) },
        pren.quando ? { label: 'Quando', value: esc(pren.quando) } : null,
        { label: parziale ? 'Acconto da pagare' : 'Da pagare', value: `€${link.importo.toFixed(2)}` },
        parziale ? { label: 'Resta da saldare', value: `€${round2(pren.totale - link.importo).toFixed(2)}` } : null,
      ].filter(Boolean),
      ctaText: 'Paga ora', ctaUrl: link.url,
      bodyHtml: `<p style="font-size:13px;color:#888;margin-top:18px;line-height:1.6">Il link vale ${ORE_LINK} ore. Se scade, scrivi a ${esc(nome)} e te ne mandano un altro.</p>`,
      legale,
    }),
  })
  if (r?.error) return { errore: 'L’email non è partita. Controlla l’indirizzo e riprova.', status: 502 }
  // Se la prenotazione non aveva un'email, questa diventa la sua: è lì che
  // arriverà la conferma quando paga. Una già scritta non si sovrascrive.
  if (!pren.email) {
    const campo = pren.tipo === 'evento' ? 'guest_email' : 'cliente_email'
    await supabaseAdmin.from(TABELLA[pren.tipo]).update({ [campo]: a }).eq('id', pren.id)
  }
  return { ok: true }
}

// Dove porta `/paga/<sessione>`: alla cassa se è aperta, alla pagina di
// ringraziamento se è già pagata, altrimenti a una pagina che dice di chi era.
export async function destinazioneLink(sessionId) {
  let pren = null
  const { data: ev } = await supabaseAdmin.from('event_bookings').select('id').eq('pagamento_id', sessionId).limit(1)
  if (ev?.length) pren = await leggiPrenotazione('evento', ev[0].id)
  if (!pren) {
    const { data: ri } = await supabaseAdmin.from('prenotazioni').select('id').eq('pagamento_id', sessionId).limit(1)
    if (ri?.length) pren = await leggiPrenotazione('risorsa', ri[0].id)
  }
  if (!pren) return { stato: 'sconosciuto' }
  const nome = await nomeAttivita(pren)
  if (pren.pagamento_stato === 'pagato') return { stato: 'pagato', nome }
  try {
    const conto = await contoDi(pren.aziendaId)
    if (!conto || !stripeConfigurato()) return { stato: 'scaduto', nome }
    const s = await stripeConnect().checkout.sessions.retrieve(sessionId, {}, { stripeAccount: conto })
    if (s.payment_status === 'paid') return { stato: 'pagato', nome }
    if (s.status === 'open' && s.url) return { stato: 'aperto', url: s.url, nome }
    return { stato: 'scaduto', nome }
  } catch { return { stato: 'scaduto', nome } }
}

// Il giro che chiude i link scaduti. Chiamato dallo stesso cron che libera chi
// non paga alla cassa, ma con la regola opposta: qui la prenotazione RESTA.
//
// ⚠️ Prima di togliere «da pagare» si chiede a Stripe: se ha pagato e il
// webhook non è arrivato, si ripara qui invece di dire al titolare «non pagato»
// di una persona che ha la ricevuta in mano.
export async function chiudiLinkScaduti() {
  const limite = new Date(Date.now() - (MINUTI_LINK + 10) * 60_000).toISOString()
  let chiusi = 0, recuperati = 0, incerti = 0
  const motivi = []
  for (const tipo of ['evento', 'risorsa']) {
    const { data: righe } = await supabaseAdmin.from(TABELLA[tipo])
      .select('id').eq('pagamento_stato', 'non_pagato').not('pagamento_richiesto_il', 'is', null)
      .lt('pagamento_richiesto_il', limite).limit(50)
    for (const { id } of righe || []) {
      const pren = await leggiPrenotazione(tipo, id)
      if (!pren) continue
      let pagata = false
      try {
        if (!stripeConfigurato()) throw new Error('Stripe non configurato')
        const conto = await contoDi(pren.aziendaId)
        // Senza un conto collegato nessuno può più pagare quel link (il conto è
        // stato scollegato dopo): è scaduto per definizione, non «incerto».
        if (conto) {
          const s = await stripeConnect().checkout.sessions.retrieve(pren.pagamento_id, {}, { stripeAccount: conto })
          pagata = s.payment_status === 'paid'
          if (!pagata && s.status === 'open') await stripeConnect().checkout.sessions.expire(pren.pagamento_id, {}, { stripeAccount: conto }).catch(() => {})
        }
      } catch (e) { incerti++; motivi.push(`link ${tipo} ${id}: ${e?.message || e}`); continue }

      if (pagata) { await pagamentoDaLinkArrivato(tipo, id); recuperati++; continue }
      await supabaseAdmin.from(TABELLA[tipo])
        .update({ pagamento_stato: 'non_richiesto', pagamento_richiesto_il: null, importo_online: null })
        .eq('id', id).eq('pagamento_stato', 'non_pagato')
      chiusi++
    }
  }
  return { chiusi, recuperati, incerti, motivi }
}

// Un pagamento arrivato che il webhook non ha registrato: si fa qui quello che
// avrebbe fatto lui.
async function pagamentoDaLinkArrivato(tipo, id) {
  if (tipo === 'risorsa') {
    const { data: p } = await supabaseAdmin.from('prenotazioni').select('stato').eq('id', id).maybeSingle()
    if (p?.stato === 'in_attesa') return prenotazionePagata(id, { automazioni: false })
    return supabaseAdmin.from('prenotazioni').update({ pagamento_stato: 'pagato', updated_at: new Date().toISOString() }).eq('id', id)
  }
  const { data: b } = await supabaseAdmin.from('event_bookings').select('status').eq('id', id).maybeSingle()
  const eraInAttesa = b?.status === 'pending'
  await supabaseAdmin.from('event_bookings')
    .update({ pagamento_stato: 'pagato', ...(eraInAttesa ? { status: 'confirmed' } : {}), updated_at: new Date().toISOString() }).eq('id', id)
  await mandaConfermaEvento(id)
  if (eraInAttesa) await annunciaPrenotazioneEvento(id)
}
