// Le offerte su una risorsa prenotabile: quando valgono e quanto fanno pagare.
//
// ⚠️ Nessun import, come `booking-giornaliero`: questo file lo legge anche il
// browser, e il prezzo che si vede nel widget deve uscire dalla stessa funzione
// che calcola quello che si paga. Due copie divergono, e diverge proprio quella
// che si legge di rado.
//
// ⛔ Perché esiste: il prezzo speciale veniva applicato **solo** agli slot
// orari. Su una risorsa a giornate — il Furgone di Automax — l'offerta si
// compilava, si salvava, e non succedeva niente: né nel prezzo, né sul
// calendario. E nella route di prenotazione bastava mandare l'id di
// un'offerta qualunque per ottenerne il prezzo, senza che nessuno controllasse
// che fosse di quella risorsa e di quelle date.

import { notti, unitaDaPagare, contaGiorni } from './booking-giornaliero'

// Un'offerta vale per questo periodo?
//
// Ogni condizione vuota è «sempre»: chi non mette le date fa un'offerta che
// vale tutto l'anno, chi non mette il minimo non chiede una durata. Sono
// facoltative apposta — pretenderle tutte trasformerebbe un'offerta di tre
// campi in un modulo.
export function offertaVale(promo, risorsa, dal, al) {
  if (!promo || promo.attiva === false) return false

  // ⛔ Il controllo che mancava del tutto: un'offerta appartiene alla SUA
  // risorsa. Senza, l'id di un'offerta di un'altra risorsa — o di un'altra
  // azienda — ne portava via il prezzo.
  if (risorsa?.id && promo.risorsa_id && promo.risorsa_id !== risorsa.id) return false

  // Il periodo dev'essere contenuto nell'offerta, non solo sfiorarlo: chi
  // prenota dal 3 al 20 non sta facendo il ponte dell'Immacolata perché due dei
  // suoi giorni ci cadono dentro.
  if (promo.data_inizio && dal < promo.data_inizio) return false
  if (promo.data_fine && al > promo.data_fine) return false

  // Quanto dura. `minimo_notti` è in notti come ogni altro limite del booking.
  if (promo.minimo_notti != null && notti(dal, al) < Number(promo.minimo_notti)) return false

  // I giorni della settimana, quando l'offerta li elenca: si guarda il giorno
  // in cui si comincia, che è quello che il cliente sceglie.
  if (Array.isArray(promo.giorni_settimana) && promo.giorni_settimana.length) {
    if (!promo.giorni_settimana.includes(new Date(`${dal}T12:00:00`).getDay())) return false
  }
  return true
}

// Quanto costa il periodo con questa offerta.
//
// ⚠️ `prezzo_modo` non è un dettaglio di forma: dice se quel numero è il prezzo
// di una giornata o il totale del soggiorno. Su cinque giorni le due letture
// differiscono di cinque volte, e prima la sceglieva il codice.
export function totaleConOfferta(risorsa, dal, al, promo) {
  const unita = unitaDaPagare(dal, al, contaGiorni(risorsa))
  const speciale = Number(promo?.prezzo_speciale)
  if (!Number.isFinite(speciale)) return null
  return promo.prezzo_modo === 'periodo' ? speciale : speciale * unita
}

// Fra più offerte valide vince **la più conveniente per chi prenota**.
//
// ⛔ Va scritto e non lasciato al caso: un cliente che scopre di aver pagato il
// prezzo peggiore fra due offerte entrambe valide non torna, e ha ragione. A
// parità di prezzo tiene la prima, così l'esito non dipende dall'ordine con cui
// il database restituisce le righe.
export function miglioreOfferta(promozioni, risorsa, dal, al) {
  if (!dal || !al) return null
  let vincente = null, minimo = Infinity
  for (const p of promozioni || []) {
    if (!offertaVale(p, risorsa, dal, al)) continue
    const t = totaleConOfferta(risorsa, dal, al, p)
    if (t == null) continue
    if (t < minimo) { minimo = t; vincente = p }
  }
  return vincente ? { offerta: vincente, totale: minimo } : null
}

// Il conto finale di un periodo: prezzo pieno, offerta applicata se conviene, e
// **entrambi i numeri**, perché «€850 anziché €600» si scrive solo se si sa
// anche quanto costava prima.
//
// ⚠️ Un'offerta che costa più del listino non si applica da sola. Il cliente la
// usa per l'alta stagione — il ponte del Furgone costa più di una settimana
// qualunque — e in quel caso la scelta è sua: si applica perché **vale per quel
// periodo**, non perché conviene. Il confronto serve solo a scegliere fra più
// offerte valide insieme.
export function contoDelPeriodo(risorsa, dal, al, promozioni, totalePieno) {
  const migliore = miglioreOfferta(promozioni, risorsa, dal, al)
  if (!migliore) return { totale: totalePieno, offerta: null, totalePieno }
  return {
    totale: migliore.totale,
    totalePieno,
    offerta: {
      id: migliore.offerta.id,
      nome: migliore.offerta.nome,
      badge: migliore.offerta.badge_label || 'Offerta',
      colore: migliore.offerta.colore || '#e53e3e',
    },
  }
}

// I giorni di un mese toccati da un'offerta, per colorare il calendario prima
// che il visitatore scelga.
//
// ⚠️ Qui si guarda il **giorno**, non il periodo: un'offerta che chiede almeno
// tre notti si segnala lo stesso sui suoi giorni, perché serve a far vedere che
// lì c'è qualcosa. Il prezzo vero si dice dopo, quando le date ci sono — e se
// il minimo non è raggiunto l'offerta semplicemente non si applica.
export function offerteDelGiorno(promozioni, giorno) {
  return (promozioni || []).filter(p => {
    if (!p || p.attiva === false) return false
    if (p.data_inizio && giorno < p.data_inizio) return false
    if (p.data_fine && giorno > p.data_fine) return false
    if (!p.data_inizio && !p.data_fine) return false   // «sempre» non si colora
    if (Array.isArray(p.giorni_settimana) && p.giorni_settimana.length) {
      if (!p.giorni_settimana.includes(new Date(`${giorno}T12:00:00`).getDay())) return false
    }
    return true
  })
}
