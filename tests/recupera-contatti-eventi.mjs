// Porta nel CRM le persone che hanno prenotato un evento PRIMA che il
// collegamento esistesse.
//
// ⛔ Il difetto che questo script ripara non è nel codice: è nel modo in cui è
// stato acceso. `registraContatto` funziona, ma vale **dal momento in cui è
// stato pubblicato**. Le diciassette prenotazioni già in archivio non passano da
// nessuna parte, quindi il cliente apre i contatti e non vede niente — che è
// esattamente quello che è successo l'08/09/2026.
//
// È lo stesso identico errore del promemoria automatico, e sta scritto in un
// commento di quel file: «chi aveva già prenotato prima non è in nessuna coda, e
// non ci finirà mai». Accendere una funzione non è finirla: quello che c'era
// prima resta indietro, e va portato avanti a mano una volta.
//
// ⚠️ NON manda niente a nessuno. Scrive solo nel CRM: nessuna email, nessuna
// automazione — `registraContatto` non ne fa partire, e questo script non chiama
// nessuna route. Le persone qui dentro sono clienti veri.
//
// ⚠️ Di default **simula soltanto**. Per scrivere davvero: --esegui
//
// Uso: cd tests && node recupera-contatti-eventi.mjs [--esegui]
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.test' })

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ESEGUI = process.argv.includes('--esegui')

// Copia locale di `lib/crm.js`: quel file importa `supabase-server`, che è
// codice di Next e da qui non si carica. La logica è la stessa — se cambia là,
// va allineata qui. È il motivo per cui questo script è una tantum e non un
// pezzo del sistema.
function unisciTag(esistenti, nuovi) {
  return [...new Set([...(esistenti || []), ...(nuovi || []).map(t => String(t || '').trim().slice(0, 60)).filter(Boolean)])]
}

const fmt = iso => iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }) : ''

try {
  const { data: eventi } = await admin.from('eventi').select('id, title, date_start, azienda_id')
  const mappa = Object.fromEntries((eventi || []).map(e => [e.id, e]))

  const { data: prenotazioni } = await admin.from('event_bookings')
    .select('id, event_id, guest_name, guest_email, guest_phone, seats, status, created_at')
    .order('created_at')

  // Una persona può aver prenotato più eventi: si raggruppa per (azienda, email)
  // così i tag si sommano e la nota racconta tutte le volte, invece di scrivere
  // la stessa scheda cinque volte sovrascrivendola.
  const perPersona = new Map()
  for (const b of prenotazioni || []) {
    const ev = mappa[b.event_id]
    if (!ev?.azienda_id || !b.guest_email) continue
    // ⚠️ Chi ha annullato resta fuori. È una scelta conservativa e **diversa**
    // dal flusso nuovo, che registra il contatto quando uno prenota e lo lascia
    // lì anche se poi disdice: là il contatto è già stato creato, qui si
    // scriverebbe oggi la scheda di qualcuno che ha già detto di no. Riguarda
    // una prenotazione sola.
    if (b.status === 'cancelled') continue
    const email = b.guest_email.trim().toLowerCase()
    // ⚠️ Gli indirizzi delle prove non si portano nel CRM di nessuno.
    if (email.endsWith('@playwright.internal')) continue
    const chiave = `${ev.azienda_id}::${email}`
    if (!perPersona.has(chiave)) {
      perPersona.set(chiave, { aziendaId: ev.azienda_id, email, nome: b.guest_name, telefono: b.guest_phone, righe: [] })
    }
    const p = perPersona.get(chiave)
    if (!p.telefono && b.guest_phone) p.telefono = b.guest_phone
    p.righe.push({
      titolo: ev.title,
      quando: fmt(ev.date_start),
      posti: b.seats || 1,
      inLista: b.status === 'waitlist',
      prenotataIl: fmt(b.created_at),
    })
  }

  console.log(`\n${perPersona.size} persone da portare nel CRM (${(prenotazioni || []).length} prenotazioni in archivio)\n`)

  let creati = 0, aggiornati = 0, saltati = 0
  for (const p of perPersona.values()) {
    const tags = ['evento', ...new Set(p.righe.map(r => r.titolo).filter(Boolean))]
    if (p.righe.some(r => r.inLista)) tags.push('lista attesa')

    const nota = p.righe.map(r =>
      `[${r.prenotataIl}] ${r.inLista ? 'In lista d\'attesa per' : 'Ha prenotato'} «${r.titolo}»${r.quando ? ` del ${r.quando}` : ''} — ${r.posti} ${r.posti === 1 ? 'posto' : 'posti'}`
    ).join('\n')

    const { data: esistente } = await admin.from('contatti')
      .select('id, tags, note, telefono, nome')
      .eq('azienda_id', p.aziendaId).eq('email', p.email).maybeSingle()

    // ⛔ Chi ha già il tag di quell'evento è già stato recuperato: rilanciare lo
    // script non deve accodare la stessa nota una seconda volta. Senza questo,
    // due corse lascerebbero schede con la storia scritta in doppio.
    if (esistente && p.righe.every(r => (esistente.tags || []).includes(r.titolo))) {
      saltati++
      console.log(`  =  ${p.email} — già a posto`)
      continue
    }

    if (esistente) {
      const patch = { tags: unisciTag(esistente.tags, tags), updated_at: new Date().toISOString() }
      if (!esistente.nome && p.nome) patch.nome = p.nome
      if (!esistente.telefono && p.telefono) patch.telefono = p.telefono
      // Si accoda solo la parte che manca, non tutta la storia.
      const daAggiungere = p.righe.filter(r => !(esistente.tags || []).includes(r.titolo))
      if (daAggiungere.length) {
        const testo = daAggiungere.map(r =>
          `[${r.prenotataIl}] ${r.inLista ? 'In lista d\'attesa per' : 'Ha prenotato'} «${r.titolo}»${r.quando ? ` del ${r.quando}` : ''} — ${r.posti} ${r.posti === 1 ? 'posto' : 'posti'}`
        ).join('\n')
        patch.note = [esistente.note, testo].filter(Boolean).join('\n\n')
      }
      console.log(`  ~  ${p.email} — aggiorno: +${daAggiungere.length} ${daAggiungere.length === 1 ? 'evento' : 'eventi'}`)
      if (ESEGUI) await admin.from('contatti').update(patch).eq('id', esistente.id)
      aggiornati++
    } else {
      console.log(`  +  ${p.email} — ${p.nome} · ${p.righe.length} ${p.righe.length === 1 ? 'evento' : 'eventi'}`)
      if (ESEGUI) {
        const { error } = await admin.from('contatti').insert({
          azienda_id: p.aziendaId, email: p.email, nome: p.nome || p.email,
          telefono: p.telefono || null, fonte: 'evento', tags, note: nota,
          // ⛔ Nessuno viene iscritto alla newsletter: aver prenotato una cena
          // non è aver chiesto di ricevere pubblicità. Questa riga è il motivo
          // per cui lo script si può lanciare senza paura.
          iscritto_newsletter: false,
        })
        if (error) console.error(`     ⛔ ${error.message}`)
      }
      creati++
    }
  }

  console.log(`\n${'─'.repeat(64)}`)
  console.log(`${creati} da creare · ${aggiornati} da aggiornare · ${saltati} già a posto`)
  console.log(ESEGUI ? 'FATTO — scritto nel CRM.' : 'SIMULAZIONE: non ho scritto niente. Rilancia con --esegui.')
} catch (e) {
  console.error('ERRORE:', e.message)
  process.exitCode = 1
}
