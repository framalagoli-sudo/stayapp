import { supabaseAdmin } from '@/lib/supabase-server'
import { prenotabilePerId } from '@/lib/offerte-prenotabili'
import { verificaPeriodo, unitaLibere, totaleGiornaliero, notti, siSovrappongono, periodoBloccato } from '@/lib/booking-giornaliero'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUUID = v => UUID_RE.test(v)

const DAY_KEYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

function parseTime(str) {
  const [h, m] = str.split(':').map(Number)
  return h * 60 + (m || 0)
}

function formatTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function isDateBlocked(blocchi, date) {
  return (blocchi || []).some(b => {
    if (b.data) return b.data === date
    if (b.data_inizio && b.data_fine) return date >= b.data_inizio && date <= b.data_fine
    return false
  })
}

function findPromo(promozioni, slotOra, date) {
  const slotMin = parseTime(slotOra)
  const dayOfWeek = new Date(date + 'T12:00:00').getDay()
  for (const p of promozioni) {
    if (!p.attiva) continue
    if (p.data_inizio && date < p.data_inizio) continue
    if (p.data_fine && date > p.data_fine) continue
    if (p.giorni_settimana?.length && !p.giorni_settimana.includes(dayOfWeek)) continue
    if (p.ora_inizio) {
      if (slotMin < parseTime(p.ora_inizio) || slotMin >= parseTime(p.ora_fine)) continue
    }
    return { id: p.id, nome: p.nome, prezzo: p.prezzo_speciale, badge: p.badge_label, colore: p.colore }
  }
  return null
}

async function calcolaSlotOrari(risorsa, promozioni, date) {
  if (isDateBlocked(risorsa.blocchi, date)) return []
  const dayKey = DAY_KEYS[new Date(date + 'T12:00:00').getDay()]
  const windows = risorsa.disponibilita[dayKey] || []
  if (!windows.length) return []

  const tuttiSlot = []
  for (const w of windows) {
    let cur = parseTime(w.start)
    const fine = parseTime(w.end) - risorsa.durata_minuti
    while (cur <= fine) {
      tuttiSlot.push(formatTime(cur))
      cur += risorsa.durata_minuti
    }
  }
  if (!tuttiSlot.length) return []

  const { data: bookings } = await supabaseAdmin.from('prenotazioni')
    .select('ora_inizio')
    .eq('risorsa_id', risorsa.id)
    .eq('data', date)
    .in('stato', ['confermata', 'in_attesa'])

  const occupancy = {}
  for (const b of bookings || []) {
    const k = b.ora_inizio?.slice(0, 5)
    occupancy[k] = (occupancy[k] || 0) + 1
  }

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const nowMinutes = now.getHours() * 60 + now.getMinutes() + (risorsa.anticipo_ore || 1) * 60

  return tuttiSlot
    .filter(slot => {
      if (date === today && parseTime(slot) < nowMinutes) return false
      return (occupancy[slot] || 0) < risorsa.quantita
    })
    .map(slot => ({
      ora: slot,
      ora_fine: formatTime(parseTime(slot) + risorsa.durata_minuti),
      disponibili: risorsa.quantita - (occupancy[slot] || 0),
      totale: risorsa.quantita,
      prezzo: risorsa.prezzo,
      promo: findPromo(promozioni, slot, date),
    }))
}

async function calcolaCoperti(risorsa, date) {
  const disp = risorsa.disponibilita || {}
  const giorniChiusura = disp.giorni_chiusura || []
  const dayOfWeek = new Date(date + 'T12:00:00').getDay()
  if (isDateBlocked(risorsa.blocchi, date)) return []
  if (giorniChiusura.includes(dayOfWeek)) return []

  const servizi = disp.servizi || []
  if (!servizi.length) return []

  const { data: bookings } = await supabaseAdmin.from('prenotazioni')
    .select('servizio, ora_inizio, n_persone')
    .eq('risorsa_id', risorsa.id)
    .eq('data', date)
    .in('stato', ['confermata', 'in_attesa'])

  const occupancy = {}
  for (const b of bookings || []) {
    const k = `${b.servizio}_${b.ora_inizio?.slice(0, 5)}`
    occupancy[k] = (occupancy[k] || 0) + (b.n_persone || 1)
  }

  const result = []
  for (const srv of servizi) {
    for (const orario of srv.orari || []) {
      const k = `${srv.nome}_${orario}`
      const occupati = occupancy[k] || 0
      const disponibili = (risorsa.max_coperti || 0) - occupati
      if (disponibili > 0) {
        result.push({ servizio: srv.nome, ora: orario, disponibili, totale: risorsa.max_coperti, prezzo: risorsa.prezzo })
      }
    }
  }
  return result
}

export async function GET(request, props) {
  const params = await props.params;
  try {
    const { risorsaId } = params
    if (!isUUID(risorsaId)) return Response.json({ error: 'risorsa_id non valido' }, { status: 400 })

    const { searchParams } = new URL(request.url)

    // Un mese intero: serve al calendario pubblico per colorare i giorni prima
    // che il visitatore scelga.
    //
    // ⚠️ Risponde **solo** con le date occupate. Chi guarda è un visitatore
    // qualsiasi: sapere che il 12 è preso è quello che gli serve per scegliere,
    // sapere *da chi* non lo riguarda. Nessun nome, nessuna email, nessun
    // importo — e non è un dettaglio, è l'elenco dei clienti di un'attività.
    const mese = searchParams.get('mese')
    if (mese) {
      if (!/^\d{4}-\d{2}$/.test(mese)) return Response.json({ error: 'mese non valido (YYYY-MM)' }, { status: 400 })
      const [anno, m] = mese.split('-').map(Number)
      const primo = `${mese}-01`
      const ultimo = `${mese}-${String(new Date(anno, m, 0).getDate()).padStart(2, '0')}`

      // L'id può essere di un'offerta o di una risorsa: chi chiede la
      // disponibilità non sa da quale delle due sorgenti venga, e non deve saperlo.
      const ris = await prenotabilePerId(risorsaId)
      if (!ris) return Response.json({ error: 'Risorsa non trovata' }, { status: 404 })

      const { data: prese } = await supabaseAdmin.from('prenotazioni')
        .select('data, data_fine')
        .eq('risorsa_id', risorsaId).in('stato', ['confermata', 'in_attesa'])
        .lte('data', ultimo)
        .or(`data_fine.gte.${primo},and(data_fine.is.null,data.gte.${primo})`)

      const occupati = []
      const capienza = ris.quantita || 1
      for (let g = 1; g <= new Date(anno, m, 0).getDate(); g++) {
        const giorno = `${mese}-${String(g).padStart(2, '0')}`
        const quante = (prese || []).filter(p => siSovrappongono(giorno, giorno, p.data, p.data_fine)).length
        const chiuso = periodoBloccato(ris.blocchi, giorno, giorno)
        if (chiuso || quante >= capienza) occupati.push(giorno)
      }
      return Response.json({
        risorsa_id: risorsaId, mese, modalita: ris.modalita,
        prezzo: ris.prezzo, minimo_notti: Number(ris.disponibilita?.minimo_notti) || 1,
        occupati,
      })
    }

    const date = searchParams.get('data')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return Response.json({ error: 'data non valida (YYYY-MM-DD)' }, { status: 400 })

    const risorsa = await prenotabilePerId(risorsaId)
    if (!risorsa) return Response.json({ error: 'Risorsa non trovata' }, { status: 404 })

    const { data: promozioni } = await supabaseAdmin.from('risorse_promozioni')
      .select('*').eq('risorsa_id', risorsaId).eq('attiva', true)

    // A giornate la domanda non è «quali ore sono libere» ma «questo periodo è
    // libero»: la risposta è una sola, con il totale e il motivo se non si può.
    if (risorsa.modalita === 'giornaliero') {
      const fine = searchParams.get('data_fine')
      if (fine && !/^\d{4}-\d{2}-\d{2}$/.test(fine))
        return Response.json({ error: 'data_fine non valida (YYYY-MM-DD)' }, { status: 400 })

      const { data: occupate } = await supabaseAdmin.from('prenotazioni')
        .select('data, data_fine').eq('risorsa_id', risorsaId)
        .in('stato', ['confermata', 'in_attesa'])
        // Solo quelle che possono toccare il periodo chiesto: senza filtro si
        // leggerebbe tutto lo storico a ogni richiesta.
        .gte('data_fine', date)

      // Senza la data di fine si dice solo se quel giorno si può iniziare: serve
      // al calendario, che colora i giorni prima che l'ospite scelga l'uscita.
      if (!fine) {
        const libere = unitaLibere(risorsa, date, date, occupate || [])
        return Response.json({
          risorsa_id: risorsaId, data: date, modalita: 'giornaliero',
          disponibile: libere > 0, libere, prezzo: risorsa.prezzo,
        })
      }

      const esito = verificaPeriodo(risorsa, date, fine, occupate || [])
      return Response.json({
        risorsa_id: risorsaId, data: date, data_fine: fine, modalita: 'giornaliero',
        disponibile: esito.ok, motivo: esito.motivo || null,
        notti: esito.notti ?? notti(date, fine),
        libere: esito.libere ?? 0,
        prezzo: risorsa.prezzo, totale: esito.totale ?? totaleGiornaliero(risorsa, date, fine),
      })
    }

    const slots = risorsa.modalita === 'coperti'
      ? await calcolaCoperti(risorsa, date)
      : await calcolaSlotOrari(risorsa, promozioni || [], date)

    return Response.json({ risorsa_id: risorsaId, data: date, modalita: risorsa.modalita, slots })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
