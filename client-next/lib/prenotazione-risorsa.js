import { supabaseAdmin } from './supabase-server'
import { istanteDi } from './fuso'
import { unitaDaPagare, contaGiorni, nomeUnita } from './booking-giornaliero'
import { accontoDovuto, puoIncassare } from './checkout'
import { sendWebhooks } from './send-webhooks'
import { triggerAutomazione } from './guest-utils'
import { syncBookingCreate } from './google-calendar-stub'
import { sendEmail } from './send-email'
import { guestEmailTemplate, emailTemplate } from './email-template'
import { getAziendaLegale } from './guest-data'

// La prenotazione di una risorsa (un furgone, una casa, un campo): quando si
// paga online, e cosa succede quando diventa VERA.
//
// Stesso schema degli eventi (`lib/evento-prenotato.js`, 01/10/2026):
//   · niente da pagare online → vale subito;
//   · c'è da pagare online    → nasce «in attesa», tiene il posto mezz'ora, e
//     diventa confermata quando il pagamento arriva (webhook di Stripe).
//
// ⛔ Prima la cassa si apriva senza scadenza e la prenotazione nasceva già
// confermata: chi apriva Stripe e chiudeva il browser teneva il furgone per
// sempre e riceveva pure «Prenotazione confermata». Difetto dormiente — al
// 08/10/2026 nessuna risorsa incassava online — corretto prima che servisse.

// Si paga online prenotando? Una risposta sola, usata dalla route che prenota e
// dall'elenco pubblico delle risorse (che dice al modulo se annunciare la
// cassa): due risposte diverse sarebbero un «Conferma e paga» che poi non
// chiede niente.
//
// Tre condizioni, tutte:
//   1. la risorsa chiede una quota (`acconto_percentuale` > 0) e c'è un importo;
//   2. la risorsa si conferma da sola. Con l'approvazione a mano NON si chiede
//      denaro: far pagare qualcosa che il titolare può ancora rifiutare vuol
//      dire dover rimborsare — lì si paga sul posto, come sempre;
//   3. l'azienda ha un conto collegato su cui incassare.
export async function quotaOnline(risorsa, importoTotale) {
  if (!risorsa || risorsa.conferma_auto === false) return null
  const conto = accontoDovuto(risorsa.acconto_percentuale, importoTotale)
  if (!(conto.dovuto > 0)) return null
  if (!(await puoIncassare(risorsa.azienda_id))) return null
  return conto
}

// La stessa domanda senza l'importo: «questa risorsa manda alla cassa?». Serve
// all'elenco pubblico, dove il totale non si conosce ancora.
export function puoMandareAllaCassa(risorsa, aziendaIncassa) {
  return !!aziendaIncassa && risorsa?.conferma_auto !== false && (parseInt(risorsa?.acconto_percentuale) || 0) > 0
}

const ENTITY_PREFIX = { struttura: 's', ristorante: 'r', attivita: 'a' }

function buildWaUrl(raw) {
  if (!raw) return null
  if (raw.startsWith('http')) return raw
  const clean = raw.replace(/[\s\-\(\)\+]/g, '').replace(/^00/, '').replace(/^0/, '39')
  return `https://wa.me/${clean}`
}

async function entitaDi(risorsa) {
  if (!risorsa?.entity_id) return null
  const { data } = await supabaseAdmin.from('entita')
    .select('name, slug, whatsapp, minisito').eq('id', risorsa.entity_id).maybeSingle()
  return data || null
}

// Ogni modalità si racconta a modo suo: senza questo, una prenotazione a
// giornate arrivava al cliente come «ore undefined–undefined».
// ⚠️ La parola segue la risorsa: a chi noleggia un furgone l'email diceva
// «2 notti» sopra un totale calcolato su 3 giorni, ed è l'ambiguità sul prezzo
// quella che genera contestazioni.
export function quandoDi(prenotazione, risorsa) {
  if (risorsa.modalita === 'giornaliero') {
    const unita = unitaDaPagare(prenotazione.data, prenotazione.data_fine, contaGiorni(risorsa))
    return `dal ${prenotazione.data} al ${prenotazione.data_fine} (${unita} ${nomeUnita(risorsa, unita)})`
  }
  if (risorsa.modalita === 'coperti') return `${prenotazione.data} — ${prenotazione.servizio} ore ${prenotazione.ora_inizio}`
  return `${prenotazione.data} ore ${prenotazione.ora_inizio?.slice(0, 5)}–${prenotazione.ora_fine?.slice(0, 5)}`
}

// L'email a chi ha prenotato. Tre momenti, tre frasi diverse — e nessuna dice
// «confermata» prima che lo sia:
//   · 'confermata' → la prenotazione vale (subito, o a pagamento arrivato);
//   · 'richiesta'  → la risorsa si approva a mano: è arrivata, non è confermata;
//   · 'scaduta'    → non ha pagato in tempo, il posto è tornato libero.
//
// ⛔ Fino all'08/10/2026 partiva sempre «Prenotazione confermata ✓», anche per
// una richiesta che il titolare doveva ancora approvare: una frase falsa, a una
// persona che poi si presenta convinta di avere il furgone.
export async function mandaEmailPrenotazione(prenotazione, risorsa, momento = 'confermata') {
  if (!(process.env.RESEND_API_KEY ?? '').trim() || !prenotazione?.cliente_email) return
  try {
    const appUrl = (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'
    const ent = await entitaDi(risorsa)
    const bizName = ent?.name || risorsa.nome
    const legale = risorsa.azienda_id ? await getAziendaLegale(risorsa.azienda_id) : null
    const privacyUrl = (ent?.slug && ENTITY_PREFIX[risorsa.entity_tipo]) ? `${appUrl}/${ENTITY_PREFIX[risorsa.entity_tipo]}/${ent.slug}/privacy` : null
    const waUrl = buildWaUrl(risorsa.entity_tipo === 'struttura' ? ent?.whatsapp : ent?.minisito?.social?.whatsapp)
    const cancelUrl = `${appUrl}/cancella-prenotazione?token=${prenotazione.cancellation_token}`
    const online = Number(prenotazione.importo_online) || 0
    const pagato = prenotazione.pagamento_stato === 'pagato' && online > 0

    const rows = [
      { label: 'Servizio', value: risorsa.nome },
      { label: 'Quando', value: quandoDi(prenotazione, risorsa) },
      { label: 'Persone', value: String(prenotazione.n_persone) },
      prenotazione.importo_totale > 0 ? { label: 'Importo', value: `€${prenotazione.importo_totale}` } : null,
      // Con un acconto la cifra pagata NON è il totale: scriverle entrambe evita
      // la domanda «ma ho già pagato tutto?» il giorno del ritiro.
      pagato ? { label: 'Pagato online', value: `€${online.toFixed(2)}` } : null,
      pagato && Number(prenotazione.importo_totale) - online > 0 ? { label: 'Da saldare', value: `€${(Number(prenotazione.importo_totale) - online).toFixed(2)}` } : null,
      prenotazione.note_cliente ? { label: 'Note', value: prenotazione.note_cliente } : null,
    ].filter(Boolean)

    const contatto = waUrl ? `<div style="margin:20px 0;padding:14px 18px;background:#f0fdf4;border-radius:10px;text-align:center">
      <p style="margin:0;font-size:14px;color:#166534">Hai domande? <a href="${waUrl}" style="color:#128C7E;font-weight:700;text-decoration:none">Scrivici su WhatsApp →</a></p>
    </div>` : ''
    const disdetta = `<p style="font-size:13px;color:#999;margin-top:20px">Hai bisogno di cancellare? <a href="${cancelUrl}" style="color:#00b5b5">Clicca qui</a> (entro ${risorsa.cancellazione_ore || 24} ore prima).</p>`
    const nome = `<strong>${String(prenotazione.cliente_nome || '').replace(/[<>&"]/g, '')}</strong>`

    const testi = {
      confermata: { ctx: 'booking-conferma', oggetto: `Prenotazione confermata — ${risorsa.nome}`, titolo: 'Prenotazione confermata ✓',
        intro: `Ciao ${nome}, la tua prenotazione è confermata.`, corpo: contatto + disdetta },
      richiesta: { ctx: 'booking-richiesta', oggetto: `Richiesta ricevuta — ${risorsa.nome}`, titolo: 'Abbiamo ricevuto la tua richiesta',
        intro: `Ciao ${nome}, la tua richiesta è arrivata. <strong>Non è ancora confermata</strong>: ${bizName} la controlla e ti scrive per confermarla.`, corpo: contatto },
      scaduta: { ctx: 'booking-scaduta', oggetto: `Prenotazione non confermata — ${risorsa.nome}`, titolo: 'La prenotazione non è andata a buon fine',
        intro: `Ciao ${nome}, il pagamento per <strong>${risorsa.nome}</strong> non è arrivato in tempo, quindi la prenotazione è stata annullata e la disponibilità è tornata libera.<br><br>Se la vuoi ancora puoi prenotare di nuovo — se nel frattempo è rimasta disponibile.`, corpo: contatto },
    }
    const t = testi[momento] || testi.confermata
    await sendEmail({
      _ctx: t.ctx, fromName: bizName, to: prenotazione.cliente_email, subject: t.oggetto,
      html: guestEmailTemplate({ entityName: bizName, title: t.titolo, intro: t.intro, rows, bodyHtml: t.corpo, legale, privacyUrl }),
    })
  } catch (e) { console.error(`[booking] email «${momento}» fallita:`, e.message) }
}

// L'avviso al titolare: è arrivata una prenotazione (o una richiesta da
// approvare). Sugli eventi c'è da sempre; per le risorse non partiva niente, e
// una richiesta da approvare la si scopriva solo aprendo il pannello.
// Si spegne nella scheda della risorsa (`avvisa_titolare`).
// ⚠️ Quando ci sarà WhatsApp, l'avviso potrà partire anche da lì: questo è il
// punto in cui aggiungerlo.
export async function avvisaTitolare(prenotazione, risorsa, momento = 'confermata') {
  if (risorsa?.avvisa_titolare === false || momento === 'scaduta') return
  if (!(process.env.RESEND_API_KEY ?? '').trim()) return
  try {
    const ent = await entitaDi(risorsa)
    let a = null, nome = ent?.name || null
    if (risorsa.entity_id) {
      const { data } = await supabaseAdmin.from('entita').select('email').eq('id', risorsa.entity_id).maybeSingle()
      a = data?.email || null
    }
    if (!a || !nome) {
      const { data: az } = await supabaseAdmin.from('aziende').select('ragione_sociale, email').eq('id', risorsa.azienda_id).maybeSingle()
      a = a || az?.email || null; nome = nome || az?.ragione_sociale || risorsa.nome
    }
    if (!a) return
    const pulito = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const daApprovare = momento === 'richiesta'
    const online = Number(prenotazione.importo_online) || 0
    const appUrl = ((process.env.CLIENT_URL ?? '').trim() || 'https://www.oltrenova.com').replace('://oltrenova.com', '://www.oltrenova.com')
    await sendEmail({
      _ctx: 'booking-owner', fromName: nome, to: a,
      ...(prenotazione.cliente_email ? { replyTo: prenotazione.cliente_email } : {}),
      subject: `[${nome}] ${daApprovare ? 'Richiesta da approvare' : 'Nuova prenotazione'}: ${risorsa.nome}`,
      html: emailTemplate({
        title: `${daApprovare ? 'Richiesta da approvare' : 'Nuova prenotazione'} — ${pulito(risorsa.nome)}`, entityName: pulito(nome),
        rows: [
          { label: 'Nome', value: pulito(prenotazione.cliente_nome) },
          prenotazione.cliente_email ? { label: 'Email', value: `<a href="mailto:${pulito(prenotazione.cliente_email)}" style="color:#00b5b5">${pulito(prenotazione.cliente_email)}</a>` } : null,
          prenotazione.cliente_telefono ? { label: 'Telefono', value: pulito(prenotazione.cliente_telefono) } : null,
          { label: 'Quando', value: pulito(quandoDi(prenotazione, risorsa)) },
          { label: 'Persone', value: String(prenotazione.n_persone || 1) },
          prenotazione.importo_totale > 0 ? { label: 'Totale', value: `€${Number(prenotazione.importo_totale).toFixed(2)}` } : null,
          prenotazione.pagamento_stato === 'pagato' && online > 0 ? { label: 'Pagato online', value: `€${online.toFixed(2)}` } : null,
          prenotazione.note_cliente ? { label: 'Note', value: pulito(prenotazione.note_cliente) } : null,
          daApprovare ? { label: 'Da fare', value: 'Aprila in «Prenotazioni» e confermala: chi l’ha chiesta sta aspettando la tua risposta.' } : null,
        ].filter(Boolean),
        appUrl,
      }),
    })
  } catch (e) { console.error('[booking] avviso al titolare fallito:', e.message) }
}

// Gli avvisi verso fuori: email a chi ha prenotato, calendario, webhook del
// titolare. Restituisce una promessa: chi chiama la aspetta (il webhook di
// Stripe) o la mette dentro `after` (la route che risponde subito a chi
// prenota). Lasciata in volo, su Vercel può non partire mai.
export function avvisaPrenotazione(prenotazione, risorsa, momento = 'confermata') {
  return Promise.allSettled([
    mandaEmailPrenotazione(prenotazione, risorsa, momento),
    avvisaTitolare(prenotazione, risorsa, momento),
    Promise.resolve().then(() => syncBookingCreate(prenotazione, risorsa)),
    Promise.resolve().then(() => sendWebhooks(prenotazione.azienda_id, 'nuova_prenotazione', {
      prenotazione_id: prenotazione.id,
      risorsa_id: prenotazione.risorsa_id,
      cliente_nome: prenotazione.cliente_nome,
      cliente_email: prenotazione.cliente_email,
      data: prenotazione.data,
      ora_inizio: prenotazione.ora_inizio,
      importo_totale: prenotazione.importo_totale,
    })),
  ])
}

// Le automazioni del titolare: «nuova prenotazione», promemoria prima, grazie
// dopo. Si AWAIT-a: su Vercel il lavoro lasciato in volo dopo la risposta non è
// garantito (misurato: un promemoria su cinque arrivava dopo trenta secondi, o
// mai). Chi chiama da una route che risponde subito lo mette dentro `after`.
export async function automazioniPrenotazione(prenotazione, risorsa) {
  // ⚠️ «10:00» non è un istante finché non si sa dove. Letto nel fuso di chi
  // esegue (Vercel gira in UTC) le 10:00 di un'attività italiana diventavano le
  // 12:00, e il promemoria «24 ore prima» partiva due ore prima del dovuto.
  const { data: aziendaFuso } = await supabaseAdmin.from('aziende')
    .select('fuso_orario').eq('id', prenotazione.azienda_id).maybeSingle()
  const visitDatetime = prenotazione.data
    ? istanteDi(prenotazione.data, prenotazione.ora_inizio || '09:00', aziendaFuso?.fuso_orario)?.toISOString() || null
    : null

  // Il link per la recensione, che l'automazione «dopo la visita» può usare.
  let reviewLink = ''
  if (visitDatetime) {
    try {
      const { data: recData } = await supabaseAdmin.from('recensioni').insert({
        azienda_id: prenotazione.azienda_id,
        entity_tipo: risorsa.entity_tipo,
        entity_id: risorsa.entity_id,
        autore: prenotazione.cliente_nome,
        stelle: 5, testo: '', fonte: 'form',
        verificata: false, pubblica: false,
      }).select('token').single()
      if (recData?.token) reviewLink = `${(process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'}/recensione?token=${recData.token}`
    } catch (e) { console.error('[booking] genera token recensione:', e.message) }
  }

  const vars = {
    nome: prenotazione.cliente_nome,
    email: prenotazione.cliente_email,
    // Serve al canale WhatsApp. Senza, l'automazione non avrebbe dove scrivere
    // e la riga di coda non verrebbe nemmeno creata.
    telefono: prenotazione.cliente_telefono || '',
    // `data` è un giorno scritto («2026-10-14»), non un istante: si legge come
    // mezzanotte UTC e in UTC si formatta, così il giorno è quello ovunque giri.
    data: new Date(prenotazione.data).toLocaleDateString('it-IT', { timeZone: 'UTC' }),
    ora: prenotazione.ora_inizio || '',
    servizio: prenotazione.servizio || risorsa.nome || '',
    n_persone: String(prenotazione.n_persone || '1'),
    note: prenotazione.note_cliente || '',
    link_recensione: reviewLink,
    visit_datetime: visitDatetime,
    source_tipo: 'prenotazione',
    source_id: prenotazione.id,
  }
  const ctx = { azienda_id: prenotazione.azienda_id, entity_tipo: risorsa.entity_tipo, entity_id: risorsa.entity_id }
  await triggerAutomazione('nuova_prenotazione', ctx, vars)
  if (visitDatetime) {
    await triggerAutomazione('pre_visita', ctx, vars)
    await triggerAutomazione('post_visita', ctx, vars)
  }
}

// Il pagamento è arrivato: la prenotazione che aspettava diventa confermata, e
// parte tutto quello che per le altre parte subito. La chiamano il webhook di
// Stripe e il giro che ripara un webhook perso — una funzione sola, perché due
// copie divergono, e diverge quella che si legge di rado.
//
// ⚠️ Lo scambio `in_attesa → confermata` è atomico (`eq('stato', 'in_attesa')`):
// Stripe rispedisce lo stesso evento in caso di dubbio, e senza questo
// partirebbero due conferme e due promemoria.
//
// `automazioni: false` quando il pagamento arriva da un link mandato dal
// titolare su una richiesta già arrivata: i suoi promemoria sono partiti allora.
export async function prenotazionePagata(prenotazioneId, { automazioni = true } = {}) {
  const { data: fatte } = await supabaseAdmin.from('prenotazioni')
    .update({ stato: 'confermata', pagamento_stato: 'pagato', updated_at: new Date().toISOString() })
    .eq('id', prenotazioneId).eq('stato', 'in_attesa').select()
  const prenotazione = fatte?.[0]
  if (!prenotazione) return { ok: false, motivo: 'non era in attesa' }
  const { data: risorsa } = await supabaseAdmin.from('risorse').select('*').eq('id', prenotazione.risorsa_id).maybeSingle()
  if (!risorsa) return { ok: false, motivo: 'risorsa non trovata' }
  await avvisaPrenotazione(prenotazione, risorsa, 'confermata')
  if (automazioni) await automazioniPrenotazione(prenotazione, risorsa)
  return { ok: true }
}
