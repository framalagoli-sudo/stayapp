// Impianto i18n (Fase 1). IT = lingua base; EN sotto /en/.
// Niente framework: dizionario + helper t(). Le stringhe UI guest si
// migrano a t() in modo iterativo; finché una chiave non c'è, fallback a IT.

export const LANGS = ['it', 'en']
export const DEFAULT_LANG = 'it'

export function isLang(x) { return LANGS.includes(x) }
export function normalizeLang(x) { return isLang(x) ? x : DEFAULT_LANG }

// Rileva la lingua preferita da un header Accept-Language (server) o da
// navigator.language (client). Ritorna 'en' solo se l'inglese è la prima scelta.
export function detectLang(acceptLanguage) {
  if (!acceptLanguage) return DEFAULT_LANG
  const first = String(acceptLanguage).split(',')[0]?.trim().toLowerCase() || ''
  return first.startsWith('en') ? 'en' : DEFAULT_LANG
}

// Dizionario stringhe UI. Aggiungere chiavi mano a mano che si migrano i testi.
const DICT = {
  it: {
    book: 'Prenota',
    contacts: 'Contatti',
    contact_us: 'Contattaci',
    send: 'Invia',
    sending: 'Invio…',
    name: 'Nome e cognome',
    email: 'Email',
    message: 'Messaggio',
    subscribe: 'Iscriviti',
    newsletter_email: 'La tua email',
    privacy_policy: 'Privacy Policy',
    privacy: 'Privacy',
    cookie: 'Cookie',
    read_more: 'Scopri di più',
    read: 'Leggi',
    back_to_site: 'Torna al sito',
    back: 'Indietro',
    msg_sent: 'Messaggio inviato! Ti risponderemo presto.',
    newsletter_confirm: 'Controlla la tua email per confermare l’iscrizione.',
    consent_privacy: 'Acconsento al trattamento dei dati personali.',
    switch_to_en: 'English',
    switch_to_it: 'Italiano',
    our_services: 'I nostri servizi',
    activities_title: 'Attività',
    excursions_title: 'Escursioni',
    events_title: 'Prossimi eventi',
    news_title: 'News & Aggiornamenti',
    news_subtitle: 'Le ultime novità',
    offers_title: 'Offerte speciali',
    offers_subtitle: 'Promozioni esclusive per i nostri ospiti',
    packages_title: 'Pacchetti e soggiorni',
    packages_subtitle: 'Scegli il soggiorno pensato per te',
    activity_available: 'attività disponibile',
    activities_available: 'attività disponibili',
    excursion_available: 'escursione disponibile',
    excursions_available: 'escursioni disponibili',
    event_scheduled: 'evento in programma',
    events_scheduled: 'eventi in programma',
    view_all_articles: 'Vedi tutti gli articoli →',
    read_arrow: 'Leggi →',
    book_arrow: 'Prenota →',
    free: 'Gratuito',
  },
  en: {
    book: 'Book now',
    contacts: 'Contact',
    contact_us: 'Contact us',
    send: 'Send',
    sending: 'Sending…',
    name: 'Full name',
    email: 'Email',
    message: 'Message',
    subscribe: 'Subscribe',
    newsletter_email: 'Your email',
    privacy_policy: 'Privacy Policy',
    privacy: 'Privacy',
    cookie: 'Cookies',
    read_more: 'Learn more',
    read: 'Read',
    back_to_site: 'Back to site',
    back: 'Back',
    msg_sent: 'Message sent! We’ll get back to you soon.',
    newsletter_confirm: 'Check your email to confirm your subscription.',
    consent_privacy: 'I consent to the processing of my personal data.',
    switch_to_en: 'English',
    switch_to_it: 'Italiano',
    our_services: 'Our services',
    activities_title: 'Activities',
    excursions_title: 'Excursions',
    events_title: 'Upcoming events',
    news_title: 'News & Updates',
    news_subtitle: 'The latest updates',
    offers_title: 'Special offers',
    offers_subtitle: 'Exclusive deals for our guests',
    packages_title: 'Packages & stays',
    packages_subtitle: 'Choose the stay made for you',
    activity_available: 'activity available',
    activities_available: 'activities available',
    excursion_available: 'excursion available',
    excursions_available: 'excursions available',
    event_scheduled: 'event scheduled',
    events_scheduled: 'events scheduled',
    view_all_articles: 'View all articles →',
    read_arrow: 'Read →',
    book_arrow: 'Book →',
    free: 'Free',
  },
}

export function t(key, lang) {
  const l = normalizeLang(lang)
  return DICT[l]?.[key] ?? DICT[DEFAULT_LANG][key] ?? key
}

// Costruisce il path equivalente in un'altra lingua. IT = nessun prefisso,
// EN = prefisso /en. Es. ('/s/slug','en') → '/en/s/slug'; ('/en/s/slug','it') → '/s/slug'.
export function pathForLang(pathname, lang) {
  const stripped = pathname.replace(/^\/en(?=\/|$)/, '') || '/'
  if (lang === 'en') return stripped === '/' ? '/en' : `/en${stripped}`
  return stripped
}
