// La scheda di UN evento, per la sua pagina.
//
// È quella che può far comparire data, luogo e prezzo direttamente nei
// risultati di Google invece del solo titolo. Diversa da quella dentro
// `buildEntitySchema`, che elenca gli eventi di un sito: qui l'evento è la
// pagina, quindi porta anche l'indirizzo, lo stato e come ci si prenota.
//
// ⚠️ Si dichiara solo quello che sappiamo per certo. `location` è il testo
// scritto dal cliente («Sala interna Garage 22»), non un indirizzo verificato:
// si passa come nome del luogo, mai come indirizzo postale inventato.
export function buildEventoSchema({ evento, nomeEntita, url, concluso = false }) {
  if (!evento?.title || !evento?.date_start) return null
  const posti = evento.seats_total
    ? Math.max(0, evento.seats_total - (evento.seats_booked || 0))
    : null
  const esaurito = posti === 0 || evento.prenotazioni_chiuse === true
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: evento.title,
    startDate: evento.date_start,
    ...(evento.date_end && { endDate: evento.date_end }),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(evento.description && { description: String(evento.description).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) }),
    ...(evento.cover_url && { image: [evento.cover_url] }),
    location: { '@type': 'Place', name: evento.location || nomeEntita || 'Da definire' },
    ...(nomeEntita && { organizer: { '@type': 'Organization', name: nomeEntita, ...(url && { url }) } }),
    // Il prezzo si dichiara solo se il cliente ha scelto di mostrarlo: se lo
    // tiene nascosto sul sito, non lo pubblichiamo noi nei dati strutturati.
    ...(evento.price != null && evento.mostra_prezzo !== false && {
      offers: {
        '@type': 'Offer',
        price: Number(evento.price) || 0,
        priceCurrency: 'EUR',
        availability: concluso || esaurito
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
        ...(url && { url }),
      },
    }),
  }
}
