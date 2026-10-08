import { after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { rateLimit, tooManyRequests, getClientIp } from '@/lib/rate-limit'
import { verificaPeriodo, totaleGiornaliero } from '@/lib/booking-giornaliero'
import { contoDelPeriodo } from '@/lib/offerte-risorsa'
import { confermaPostiPrenotazione } from '@/lib/capienza'
import { creaCheckout } from '@/lib/checkout'
import { logError } from '@/lib/observability'
import { quotaOnline, avvisaPrenotazione, automazioniPrenotazione } from '@/lib/prenotazione-risorsa'
import { MINUTI_PER_PAGARE } from '@/lib/prenotazioni-scadute'
import { registraContatto } from '@/lib/crm'
import { testoConsensoPromozioni } from '@/lib/consenso-promozioni'

// La formula che chi prenota accetta. La decide il server, non il componente:
// è il server a scriverla nella prova, e se le due copie divergessero
// resterebbe salvata una frase che nessuno ha mai letto.
export const TESTO_CONSENSO =
  "Ho letto e accetto l'informativa sulla privacy. I miei dati saranno usati per gestire questa prenotazione."

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

function parseTime(str) {
  const [h, m] = str.split(':').map(Number)
  return h * 60 + (m || 0)
}
function formatTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export async function POST(request) {
  try {
    const ip = getClientIp(request)
    const rl = await rateLimit(request, { name: 'booking-prenota', limit: 12, windowSec: 3600, ip })
    if (!rl.allowed) return tooManyRequests()
    const body = await request.json()
    const { risorsa_id, data, data_fine, ora_inizio, servizio,
      cliente_nome, cliente_email, cliente_telefono,
      n_persone, note_cliente, promozione_id, privacy_accettata, whatsapp_optin } = body

    if (!isUUID(risorsa_id)) return Response.json({ error: 'risorsa_id non valido' }, { status: 400 })
    if (!data) return Response.json({ error: 'data obbligatoria' }, { status: 400 })
    if (!cliente_nome?.trim()) return Response.json({ error: 'Nome obbligatorio' }, { status: 400 })
    // ⚠️ Qui si raccolgono nome, email e telefono di una persona: senza consenso
    // non si possono chiedere. Mancava del tutto — corretto sulle escursioni il
    // 26/08 e sulle attività il 28, mai qui. Il controllo sta nella route perché
    // la spunta nel modulo si toglie con due clic.
    if (privacy_accettata !== true)
      return Response.json({ error: 'Per prenotare serve il consenso al trattamento dei dati.' }, { status: 400 })
    if (!cliente_email?.trim()) return Response.json({ error: 'Email obbligatoria' }, { status: 400 })

    const { data: risorsa, error: re } = await supabaseAdmin.from('risorse')
      .select('*').eq('id', risorsa_id).eq('attiva', true).single()
    if (re || !risorsa) return Response.json({ error: 'Risorsa non trovata o non attiva' }, { status: 404 })

    let ora_fine = null
    if (risorsa.modalita === 'slot' && ora_inizio) {
      ora_fine = formatTime(parseTime(ora_inizio) + risorsa.durata_minuti)
    }

    // ⛔ L'offerta si rileggeva dal database — giusto, il prezzo non arriva mai
    // dal client — ma non si controllava che fosse di QUESTA risorsa. L'id di
    // un'offerta qualunque, anche di un'altra azienda, ne portava via il prezzo.
    // Quello che arriva dal client dice quale, mai quanto, e nemmeno se vale.
    let offertaScelta = null
    let prezzo_unitario = risorsa.prezzo
    if (isUUID(promozione_id)) {
      const { data: promo } = await supabaseAdmin.from('risorse_promozioni')
        .select('*').eq('id', promozione_id).eq('risorsa_id', risorsa_id).eq('attiva', true).maybeSingle()
      if (promo) {
        offertaScelta = promo
        // Per gli slot il prezzo speciale è sempre quello dell'unità: è ciò che
        // il campo ha sempre significato lì, e non cambia.
        if (risorsa.modalita !== 'giornaliero') prezzo_unitario = promo.prezzo_speciale
      }
    }
    const persone = Math.max(1, parseInt(n_persone) || 1)
    let importo_totale = prezzo_unitario * persone
    let fine = null

    // A giornate il totale non dipende da quante persone ma da quante notti: una
    // casa costa uguale che ci dormano in due o in quattro. Il conto lo rifà il
    // server — quello mostrato dalla pagina è solo un'anteprima, e chi costruisce
    // la richiesta a mano potrebbe proporre il totale che preferisce.
    if (risorsa.modalita === 'giornaliero') {
      if (!data_fine || !/^\d{4}-\d{2}-\d{2}$/.test(data_fine))
        return Response.json({ error: 'Serve anche la data di fine' }, { status: 400 })

      const { data: occupate } = await supabaseAdmin.from('prenotazioni')
        .select('data, data_fine').eq('risorsa_id', risorsa_id)
        .in('stato', ['confermata', 'in_attesa']).gte('data_fine', data)

      // Le regole del periodo (minimo, massimo, giorni d'arrivo) valgono qui,
      // non nel browser: una pagina si aggira, questa route no.
      const esito = verificaPeriodo(risorsa, data, data_fine, occupate || [])
      if (!esito.ok) return Response.json({ error: esito.motivo }, { status: 409 })

      fine = data_fine
      // ⛔ Qui l'offerta non la sceglie il client: la sceglie il server fra
      // quelle che valgono davvero per queste date. Fidarsi dell'id proposto
      // significherebbe far decidere lo sconto a chi paga.
      const { data: offerte } = await supabaseAdmin.from('risorse_promozioni')
        .select('*').eq('risorsa_id', risorsa_id).eq('attiva', true)
      const conto = contoDelPeriodo(risorsa, data, data_fine, offerte || [],
        totaleGiornaliero(risorsa, data, data_fine))
      importo_totale = conto.totale
      offertaScelta = conto.offerta ? { id: conto.offerta.id } : null
    }

    // Si paga online? Lo decide una funzione sola (quota chiesta, conferma
    // automatica, conto collegato). Se sì la prenotazione nasce «in attesa»:
    // tiene il posto, ma diventa vera solo quando il pagamento arriva.
    const quota = await quotaOnline(risorsa, importo_totale)

    const payload = {
      risorsa_id,
      azienda_id: risorsa.azienda_id,
      entity_tipo: risorsa.entity_tipo,
      entity_id: risorsa.entity_id,
      data,
      data_fine: fine,
      ora_inizio: ora_inizio || null,
      ora_fine,
      servizio: servizio || null,
      cliente_nome: cliente_nome.trim(),
      cliente_email: cliente_email.trim().toLowerCase(),
      cliente_telefono: cliente_telefono?.trim() || null,
      n_persone: persone,
      note_cliente: note_cliente?.trim() || null,
      stato: quota ? 'in_attesa' : (risorsa.conferma_auto ? 'confermata' : 'in_attesa'),
      // La cifra portata alla cassa si scrive adesso: è quella che fa fede, anche
      // se domani il titolare cambia la percentuale dell'acconto.
      ...(quota ? { pagamento_stato: 'non_pagato', importo_online: quota.dovuto } : {}),
      // La **prova**, non la spunta: quando è stato dato e quale formula è stata
      // letta. Se domani il testo cambia, le prenotazioni vecchie restano
      // ricostruibili.
      privacy_accettata: true,
      privacy_accettata_il: new Date().toISOString(),
      privacy_testo: TESTO_CONSENSO,
      prezzo_unitario,
      importo_totale,
      // Si registra l'offerta che il server ha **applicato**, non quella che il
      // client aveva proposto: la riga deve raccontare il prezzo che è stato
      // fatto, altrimenti mesi dopo nessuno sa più perché si è pagato quello.
      promozione_id: offertaScelta?.id || null,
    }

    const { data: inserita, error: pe } = await supabaseAdmin.from('prenotazioni').insert(payload).select().single()
    if (pe) return Response.json({ error: pe.message }, { status: 500 })
    let prenotazione = inserita

    // La disponibilità qui non era verificata affatto: gli slot liberi li calcolava
    // solo la pagina, e chiamando l'API si prenotava un posto già pieno. Il
    // controllo sta dopo l'inserimento perché deve reggere anche a richieste
    // simultanee — chi eccede la capienza si ritira, prima di ogni notifica.
    if (!(await confermaPostiPrenotazione(risorsa, prenotazione.id))) {
      return Response.json({ error: 'Questo orario non è più disponibile' }, { status: 409 })
    }

    // ── Se c'è da pagare online, si apre la cassa ────────────────────────────
    //
    // ⚠️ **Dopo** aver tenuto il posto, non prima: far pagare qualcuno per un
    // orario che nel frattempo è stato preso da un altro è il modo peggiore di
    // sbagliare. E l'importo è quello calcolato dal prezzo riletto dal
    // database: chi prenota dice *cosa*, non *quanto*.
    //
    // ⛔ La cassa ha una scadenza. Senza, Stripe la tiene aperta 24 ore e chi
    // libera i posti non pagati non può farlo prima (successo sugli eventi di
    // Garage 22 il 01/10/2026).
    let pagamento = null
    if (quota) {
      try {
        const base = (process.env.CLIENT_URL ?? '').trim() || new URL(request.url).origin
        const esito = await creaCheckout({
          aziendaId: risorsa.azienda_id,
          righe: [{
            nome: quota.tutto ? risorsa.nome : `${risorsa.nome} — acconto ${quota.perc}%`,
            importo: quota.dovuto, quantita: 1,
          }],
          email: prenotazione.cliente_email,
          riferimento: prenotazione.id,
          successUrl: `${base}/checkout/successo?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${base}/checkout/annullato`,
          minutiPerPagare: MINUTI_PER_PAGARE,
        })
        await supabaseAdmin.from('prenotazioni').update({ pagamento_id: esito.sessionId }).eq('id', prenotazione.id)
        pagamento = { url: esito.url, importo: quota.dovuto, saldo: quota.saldo, tutto: quota.tutto, minuti: MINUTI_PER_PAGARE }
      } catch (e) {
        // La cassa non si è aperta (Stripe giù, conto sospeso). Il posto è già
        // suo: la prenotazione resta valida e si paga sul posto, com'era prima
        // che esistessero i pagamenti. Ma va gridato: un conto collegato che
        // non incassa è un guasto, non un caso normale.
        await logError('booking/cassa', new Error(`la cassa non si è aperta per la prenotazione ${prenotazione.id}: ${e.message}`), { alert: true })
        const { data: sulPosto } = await supabaseAdmin.from('prenotazioni')
          .update({ stato: 'confermata', pagamento_stato: 'non_richiesto', importo_online: null })
          .eq('id', prenotazione.id).select().single()
        if (sulPosto) prenotazione = sulPosto
      }
    }
    // Finché non paga non è prenotato: niente conferma, niente avviso al
    // titolare, niente promemoria. Parte tutto quando il pagamento arriva
    // (`prenotazionePagata`, dal webhook di Stripe).
    const attendePagamento = !!pagamento

    // ⛔ Chi prenotava una risorsa entrava fra i contatti SOLO se spuntava il
    // consenso WhatsApp: tutti gli altri — nome, email, telefono lasciati per
    // prenotare — il titolare non li ritrovava più. Stesso difetto corretto
    // sugli eventi l'08/09. Entrare fra i contatti non iscrive a niente.
    await registraContatto({
      aziendaId: prenotazione.azienda_id,
      email: prenotazione.cliente_email, nome: prenotazione.cliente_nome, telefono: prenotazione.cliente_telefono,
      fonte: 'prenotazione',
      attivita: { tipo: 'prenotazione', titolo: risorsa.nome, origineId: risorsa.id, riferimento: prenotazione.id, entityId: risorsa.entity_id, dettaglio: { persone } },
      // Solo se la casella è stata spuntata: prenotare non è iscriversi.
      promozioni: body.promozioni === true ? { testo: testoConsensoPromozioni('altro', body.lang), fonte: `prenotazione di «${risorsa.nome}»` } : null,
    })

    // 🔒 Il consenso a essere avvisati su WhatsApp è una **prova**, non una
    // spunta: si salva quando è stato dato e da dove. E vale solo se è arrivato
    // esplicitamente insieme a un numero — mai dedotto dall'aver prenotato.
    //
    // ⚠️ Il contatto si tocca **solo** in questo caso. Chi prenota senza dare
    // questo consenso resta com'era: il consenso ha bisogno di un posto dove
    // stare, ma una prenotazione non è di per sé un'iscrizione a niente.
    if (whatsapp_optin === true && prenotazione.cliente_telefono) {
      try {
        const adesso = new Date().toISOString()
        const { data: esistente } = await supabaseAdmin.from('contatti')
          .select('id, telefono, whatsapp_optin')
          .eq('azienda_id', prenotazione.azienda_id)
          .eq('email', prenotazione.cliente_email)
          .maybeSingle()
        if (esistente) {
          const upd = {}
          if (!esistente.whatsapp_optin) {
            upd.whatsapp_optin = true
            upd.whatsapp_optin_il = adesso
            upd.whatsapp_optin_fonte = 'modulo di prenotazione'
            upd.whatsapp_optout_il = null
          }
          if (!esistente.telefono) upd.telefono = prenotazione.cliente_telefono
          if (Object.keys(upd).length) await supabaseAdmin.from('contatti').update(upd).eq('id', esistente.id)
        } else {
          await supabaseAdmin.from('contatti').insert({
            azienda_id: prenotazione.azienda_id,
            email: prenotazione.cliente_email,
            nome: prenotazione.cliente_nome || prenotazione.cliente_email,
            telefono: prenotazione.cliente_telefono,
            fonte: 'prenotazione',
            whatsapp_optin: true,
            whatsapp_optin_il: adesso,
            whatsapp_optin_fonte: 'modulo di prenotazione',
          })
        }
      } catch (e) { console.error('[booking] consenso whatsapp:', e.message) }
    }

    // ⚠️ Lasciato a se stesso, questo lavoro NON viene garantito: su Vercel la
    // funzione può essere congelata appena risposto. `after` lo fa uscire dalla
    // risposta (chi prenota non aspetta) tenendo viva la funzione finché non è
    // finito.
    if (!attendePagamento) {
      after(async () => {
        try {
          // Email a chi ha prenotato, calendario, webhook. A chi ha chiesto una
          // risorsa che si approva a mano NON si scrive «confermata».
          await avvisaPrenotazione(prenotazione, risorsa, prenotazione.stato === 'confermata' ? 'confermata' : 'richiesta')
          await automazioniPrenotazione(prenotazione, risorsa)
        } catch (e) { await logError('booking/automazioni', e, { alert: true }) }
      })
    }

    // ⚠️ Il link della cassa torna INSIEME alla prenotazione: chi ha appena
    // prenotato dev'essere portato a pagare subito, non con un'email che
    // magari legge domani. Se `pagamento` è null si paga sul posto, com'era.
    return Response.json({ ...prenotazione, pagamento }, { status: 201 })
  } catch (e) { await logError('booking/prenota', e, { alert: true }); return Response.json({ error: e.message }, { status: 500 }) }
}
