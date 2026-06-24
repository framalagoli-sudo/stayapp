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
