import { supabaseAdmin } from '@/lib/supabase-server'
import { requireRecordAccess } from '@/lib/server-auth'
import { sendEmail } from '@/lib/send-email'
import { guestEmailTemplate } from '@/lib/email-template'
import { getAziendaLegale } from '@/lib/guest-data'
import { inviaMessaggioWhatsapp } from '@/lib/whatsapp-messaggio'
import { testoRicco } from '@/lib/testo-ricco'

// «Ci vediamo domani»: il promemoria a chi ha già prenotato.
//
// ⛔ Perché non basta l'automazione. Il promemoria automatico si programma **nel
// momento in cui uno prenota**: chi aveva già prenotato prima che l'automazione
// esistesse non è in nessuna coda, e non lo sarà mai. Per la cena del 10
// settembre significa ventisette persone che non riceverebbero niente.
//
// Serviva un modo di dire «mandalo adesso a chi c'è». È anche più adatto al
// caso: il titolare guarda la lista, decide, e preme. Non deve configurare
// niente.
//
// ⚠️ GET dice quante persone lo riceverebbero, così chi preme sa cosa sta per
// fare. POST manda davvero.

async function raccogli(eventoId) {
  const { data: evento } = await supabaseAdmin.from('eventi')
    .select('id, title, date_start, location, azienda_id, entity_id')
    .eq('id', eventoId).maybeSingle()
  if (!evento) return { errore: 'Evento non trovato' }

  const { data: tutte } = await supabaseAdmin.from('event_bookings')
    .select('id, guest_name, guest_email, guest_phone, seats, promemoria_inviato_il, status')
    .eq('event_id', eventoId).neq('status', 'cancelled')

  // Chi ha un'email e non l'ha già ricevuto. Chi ha prenotato al telefono senza
  // lasciare l'email resta fuori: non c'è dove scrivergli, e fingere che sia
  // stato avvisato sarebbe peggio.
  const destinatari = (tutte || []).filter(b => b.guest_email && !b.promemoria_inviato_il)
  const giaFatto = (tutte || []).filter(b => b.promemoria_inviato_il).length
  const senzaEmail = (tutte || []).filter(b => !b.guest_email).length
  return { evento, destinatari, giaFatto, senzaEmail, totale: (tutte || []).length, tutte: tutte || [] }
}

// Il messaggio che parte se il titolare non ne scrive uno suo. Sta qui e non nel
// pannello perché è il server a mandarlo: due copie divergerebbero, e a divergere
// sarebbe proprio quella che nessuno rilegge.
export const TESTO_PREDEFINITO =
  'Ti ricordiamo la tua prenotazione. Se non riesci a venire, rispondi a questa email: liberiamo il posto per qualcun altro.'

export async function GET(request, props) {
  const params = await props.params
  try {
    const { response } = await requireRecordAccess(request, 'eventi', params.id)
    if (response) return response
    const r = await raccogli(params.id)
    if (r.errore) return Response.json({ error: r.errore }, { status: 404 })
    return Response.json({
      da_avvisare: r.destinatari.length,
      gia_avvisati: r.giaFatto,
      senza_email: r.senzaEmail,
      totale: r.totale,
      // ⛔ Serve l'elenco, non solo il conteggio: il titolare deve poter
      // scegliere **chi** avvisare, non solo premere e sperare. Chi ha già
      // ricevuto e chi non ha lasciato l'email compaiono lo stesso, con il
      // motivo — sparire senza spiegazione fa credere a un dato mancante.
      persone: r.tutte.map(b => ({
        id: b.id,
        nome: b.guest_name,
        email: b.guest_email,
        posti: b.seats || 1,
        stato: b.status,
        gia_avvisato: !!b.promemoria_inviato_il,
        senza_email: !b.guest_email,
      })),
      testo_predefinito: TESTO_PREDEFINITO,
    })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request, props) {
  const params = await props.params
  try {
    const { response } = await requireRecordAccess(request, 'eventi', params.id)
    if (response) return response

    const r = await raccogli(params.id)
    if (r.errore) return Response.json({ error: r.errore }, { status: 404 })

    const corpo = await request.json().catch(() => ({}))

    // ⛔ Il testo lo scrive il titolare, e arriva dal browser: si **escapa** e si
    // riaccendono solo i pochi tag di formattazione (`testoRicco`). Senza,
    // qualunque cosa finisse in quel campo verrebbe spedita come HTML a decine
    // di persone, con il mittente del cliente.
    const testo = String(corpo.testo || '').trim().slice(0, 2000) || TESTO_PREDEFINITO

    // ⛔ Chi avvisare lo sceglie il titolare spuntando la lista. Gli id passano
    // da un filtro contro le prenotazioni **di questo evento**: un id di un
    // altro evento — o di un'altra azienda — non deve poter ricevere niente.
    let destinatari = r.destinatari
    if (Array.isArray(corpo.destinatari)) {
      const scelti = new Set(corpo.destinatari)
      destinatari = r.tutte.filter(b => scelti.has(b.id) && b.guest_email)
      // ⚠️ Se il titolare rimanda apposta a qualcuno che l'ha già ricevuto, si
      // manda: è una sua decisione, e la protezione dal doppio invio serve
      // contro il giro automatico, non contro una scelta esplicita.
    }

    if (!destinatari.length) {
      return Response.json({ inviati: 0, messaggio: 'Nessuno da avvisare: o l’hanno già ricevuto, o non hanno lasciato un’email.' })
    }

    const { evento } = r
    let nome = 'OltreNova', slug = null
    if (evento.entity_id) {
      const { data: ent } = await supabaseAdmin.from('entita').select('name, slug').eq('id', evento.entity_id).maybeSingle()
      if (ent) { nome = ent.name || nome; slug = ent.slug }
    }
    const legale = evento.azienda_id ? await getAziendaLegale(evento.azienda_id) : null
    const quando = evento.date_start
      ? new Date(evento.date_start).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
      : ''

    let inviati = 0, falliti = 0
    for (const b of destinatari) {
      try {
        await sendEmail({
          _ctx: 'evento-promemoria', fromName: nome, to: b.guest_email,
          subject: `Ci vediamo ${quando ? 'il ' + quando.split(' ').slice(0, 3).join(' ') : 'presto'} — ${evento.title}`,
          html: guestEmailTemplate({
            entityName: nome, title: 'Ti aspettiamo', legale,
            // ⚠️ Il titolo dell'evento resta scritto dal server: è l'unica cosa
            // che chi legge deve poter riconoscere con certezza, e non dipende
            // da cosa il titolare ha battuto nel campo.
            intro: `Ciao ${b.guest_name || ''}, a proposito di <strong>${evento.title}</strong>:<br><br>${testoRicco(testo)}`,
            rows: [
              quando ? { label: 'Quando', value: quando } : null,
              evento.location ? { label: 'Dove', value: evento.location } : null,
              { label: 'Posti', value: String(b.seats || 1) },
            ].filter(Boolean),
          }),
        })
        // ⚠️ Si segna **subito dopo l'invio riuscito**, una riga per volta: se il
        // giro si interrompe a metà, chi ha già ricevuto non lo riceve due volte
        // al tentativo successivo.
        await supabaseAdmin.from('event_bookings')
          .update({ promemoria_inviato_il: new Date().toISOString() }).eq('id', b.id)
        inviati++

        // Anche sul telefono, quando le condizioni ci sono. Non blocca l'email.
        if (b.guest_phone) {
          inviaMessaggioWhatsapp({
            aziendaId: evento.azienda_id, telefono: b.guest_phone, email: b.guest_email,
            templateKey: 'promemoria_appuntamento',
            vars: { nome: b.guest_name, data: quando, ora: '', luogo: evento.location || nome },
            nomeEntita: nome,
          }).catch(() => {})
        }
      } catch (e) {
        falliti++
        console.error('[evento-promemoria]', b.guest_email, e.message)
      }
    }

    return Response.json({ inviati, falliti, senza_email: r.senzaEmail })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
