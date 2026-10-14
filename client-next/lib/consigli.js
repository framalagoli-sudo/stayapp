// Il consulente dentro OltreNova: «cosa fare adesso», calcolato dai dati veri
// dell'attività. È la seconda metà della visione del 14/10 (STRATEGIA.md §6.4):
// il cruscotto dice cosa succede, qui si dice cosa farne.
//
// Ogni consiglio ha quattro parti:
//   · QUANDO scatta — una regola sui dati, mai una spunta;
//   · PERCHÉ conta — le parole di Francesco: è il suo sapere, e non si inventa;
//   · COSA fare — un pulsante che porta già nel punto giusto;
//   · e in fondo una persona («ne parliamo?»), che il componente aggiunge.
//
// ⛔ Un consiglio con `approvato: false` è una BOZZA: lo vede solo il
// super_admin, con l'etichetta, così Francesco lo guarda scattare sui clienti
// veri prima di firmarlo. Al titolare arrivano solo quelli approvati — e il
// filtro sta qui, sul server, non nel componente.
//
// Escono titoli, testi e numeri dell'attività stessa: mai nomi o recapiti.
//
// Solo server. Chi chiama ha già deciso di quale azienda si parla.
import { supabaseAdmin } from './supabase-server'
import { soloAperti } from './evento-concluso'
import { postiEvento } from './posti-evento'

const GIORNO = 864e5
const giorniDa = iso => (Date.now() - new Date(iso).getTime()) / GIORNO
const giorniA = iso => (new Date(iso).getTime() - Date.now()) / GIORNO

// Il catalogo. L'ordine è la priorità: si mostrano i primi che scattano.
// `scatta(fatti)` restituisce null, oppure i pezzi che dipendono dai numeri.
export const CONSIGLI = [
  {
    chiave: 'evento-quasi-pieno',
    approvato: false,
    perche: 'Quando una serata è quasi piena, il rischio non è più vendere: è promettere posti che non ci sono. Chi risponde al telefono deve saperlo adesso, non la sera stessa.',
    scatta: f => {
      const ev = f.prossimo
      if (!ev || !ev.capienza || giorniA(ev.quando) > 14) return null
      const pieno = ev.prenotati / ev.capienza
      if (pieno < 0.85 || pieno >= 1) return null
      return {
        titolo: `«${ev.titolo}» è quasi piena: ${ev.prenotati} posti su ${ev.capienza}`,
        azione: { testo: 'Apri le prenotazioni', link: `/admin/eventi/${ev.id}` },
      }
    },
  },
  {
    chiave: 'evento-da-spingere',
    approvato: false,
    perche: 'Una serata che a pochi giorni ha ancora molti posti liberi di solito non si riempie da sola. Un messaggio a chi ti ha già detto sì costa due minuti ed è la promozione che rende di più.',
    scatta: f => {
      const ev = f.prossimo
      if (!ev || !ev.capienza || giorniA(ev.quando) > 7) return null
      if (ev.prenotati / ev.capienza >= 0.3 || f.invitabili < 5) return null
      return {
        titolo: `«${ev.titolo}» è fra pochi giorni e ha ancora ${ev.capienza - ev.prenotati} posti liberi`,
        azione: { testo: 'Scrivi a chi vuole essere avvisato', link: '/admin/newsletter' },
      }
    },
  },
  {
    chiave: 'scrivi-a-chi-ha-detto-si',
    approvato: false,
    perche: 'Queste persone ti hanno chiesto di essere avvisate. Se non scrivi loro, fra qualche mese non si ricorderanno più di averlo chiesto, e quel sì vale sempre meno.',
    scatta: f => {
      if (f.invitabili < 10) return null
      if (f.ultimaNewsletter && giorniDa(f.ultimaNewsletter) < 45) return null
      return {
        titolo: f.ultimaNewsletter
          ? `${f.invitabili} persone vogliono tue notizie, e non scrivi loro da più di un mese e mezzo`
          : `${f.invitabili} persone vogliono tue notizie, e non hai ancora mai scritto loro`,
        azione: { testo: 'Scrivi una newsletter', link: '/admin/newsletter' },
      }
    },
  },
  {
    chiave: 'calendario-vuoto',
    approvato: false,
    perche: 'Chi ha già partecipato a un tuo evento torna a guardare il sito per vedere cosa c’è dopo. Se il calendario è vuoto, va altrove.',
    scatta: f => {
      // Solo a chi gli eventi li fa davvero: almeno due negli ultimi sei mesi.
      // Uno solo, o vecchio, è un esperimento — non un calendario rimasto vuoto.
      if (f.eventiPassati < 2 || f.eventiFuturi > 0) return null
      return {
        titolo: 'Non hai eventi in programma',
        azione: { testo: 'Crea il prossimo evento', link: '/admin/eventi' },
      }
    },
  },
]

// I fatti che servono alle regole, letti una volta per tutte.
async function fatti(aziendaId) {
  const [invitabili, newsletter, passati, futuri, prossimo] = await Promise.all([
    supabaseAdmin.from('contatti').select('id', { count: 'exact', head: true })
      .eq('azienda_id', aziendaId).eq('iscritto_newsletter', true),
    supabaseAdmin.from('newsletters').select('sent_at')
      .eq('azienda_id', aziendaId).eq('status', 'sent').not('sent_at', 'is', null)
      .order('sent_at', { ascending: false }).limit(1),
    supabaseAdmin.from('eventi').select('id', { count: 'exact', head: true })
      .eq('azienda_id', aziendaId).eq('published', true)
      .lt('date_start', new Date().toISOString())
      .gte('date_start', new Date(Date.now() - 180 * GIORNO).toISOString()),
    soloAperti(supabaseAdmin.from('eventi').select('id', { count: 'exact', head: true })
      .eq('azienda_id', aziendaId).eq('published', true).eq('active', true)),
    soloAperti(supabaseAdmin.from('eventi')
      .select('id, title, date_start, seats_total, seats_booked, posti_riservati')
      .eq('azienda_id', aziendaId).eq('published', true).eq('active', true))
      .order('date_start').limit(1),
  ])
  const errore = invitabili.error || newsletter.error || passati.error || futuri.error || prossimo.error
  if (errore) throw new Error(errore.message)

  const ev = prossimo.data?.[0]
  const p = ev ? postiEvento(ev) : null
  return {
    invitabili: invitabili.count || 0,
    ultimaNewsletter: newsletter.data?.[0]?.sent_at || null,
    eventiPassati: passati.count || 0,
    eventiFuturi: futuri.count || 0,
    prossimo: ev ? {
      id: ev.id, titolo: ev.title, quando: ev.date_start,
      prenotati: p.prenotati, capienza: p.illimitato ? null : p.capienza,
    } : null,
  }
}

// `bozze`: true solo per il super_admin.
export async function consigliPer(aziendaId, { bozze = false } = {}) {
  const f = await fatti(aziendaId)
  const out = []
  for (const c of CONSIGLI) {
    if (!c.approvato && !bozze) continue
    const pezzi = c.scatta(f)
    if (!pezzi) continue
    out.push({ chiave: c.chiave, perche: c.perche, bozza: !c.approvato, ...pezzi })
  }
  return out
}
