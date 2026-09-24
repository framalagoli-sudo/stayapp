// Il menu del pannello: le voci e come ogni ruolo le vede.
//
// Sta in un file suo perché lo leggono in due: la barra laterale vera
// (AdminLayout) e l'anteprima dei profili di mestiere (area «Funzioni e
// profili»). Un'anteprima che copiasse la lista mentirebbe alla prima voce
// aggiunta da una parte sola.
import {
  Activity, BarChart2, BarChart3, Bot, BotMessageSquare, Building, Building2, CalendarCheck, CalendarDays, ClipboardList, CreditCard, FileText, FormInput, Gift, Globe, Image, Inbox, Info, Layers, LifeBuoy, Lock, Mail, MessageCircle, Newspaper, Palette, QrCode, SearchCheck, Settings, Shield, ShoppingBag, SlidersHorizontal, Sparkles, Star, Store, Tag, UserCheck, Users, UtensilsCrossed, Wand2, Webhook, Wrench, Zap,
} from 'lucide-react'

// Sub-menu entità, raggruppati: Contenuti → Sito & presenza → Impostazioni.
// L'ordine dell'array definisce l'ordine di render; il campo `group` genera gli
// header di sezione (vedi renderSubs). AI Site Builder e QR Code vengono iniettati
// nel gruppo "Sito & presenza".
// Le sezioni di un'entità. UNA LISTA SOLA per tutti i tipi: prima ce n'erano
// tre, ed è il motivo per cui un hotel non poteva avere un menù e un ristorante
// non poteva elencare i servizi.
//
// `funzione` collega la voce all'interruttore nella pagina Funzioni: se quella
// funzione è spenta, la voce non compare. Le voci senza `funzione` sono
// l'ossatura del pannello e ci sono sempre.
//
// `nomeSezione` esiste perché lo stesso schermo ha percorsi storici diversi fra
// i tipi (`modules` per le strutture, `moduli` per gli altri): finché gli URL
// restano quelli, la differenza si gestisce qui e non in tre liste separate.
export const SEZIONI_ENTITA = [
  { sub: 'info',       label: 'Informazioni',  icon: Info,             group: 'Contenuti' },
  { sub: 'menu',       label: 'Menù',          icon: UtensilsCrossed,  group: 'Contenuti',        funzione: 'menu' },
  { sub: 'services',   label: 'Servizi',       icon: Wrench,           group: 'Contenuti',        funzione: 'servizi' },
  { sub: 'gallery',    label: 'Galleria',      icon: Image,            group: 'Contenuti',        funzione: 'galleria' },
  { sub: 'sito',       label: 'Sito web',      icon: Globe,            group: 'Sito & presenza' },
  { sub: 'theme',      label: 'Tema e colori', icon: Palette,          group: 'Sito & presenza' },
  { sub: 'domini',     label: 'Domini',        icon: Globe,            group: 'Sito & presenza' },
  { sub: 'moduli',     label: 'App Clienti',   icon: Layers,           group: 'Sito & presenza',  nomeSezione: { struttura: 'modules' } },
  { sub: 'chatbot',    label: 'Chatbot',       icon: Bot,              group: 'Sito & presenza',  funzione: 'chatbot' },
  { sub: 'funzioni',   label: 'Funzioni',      icon: SlidersHorizontal, group: 'Impostazioni' },
  { sub: 'privacy',    label: 'Privacy',       icon: Lock,             group: 'Impostazioni' },
]

// Ogni voce di primo livello del pannello, scritta UNA volta.
//
// Prima il menu era scritto a mano quattro volte (super_admin, admin azienda,
// staff, profili senza azienda): aggiungere una funzione voleva dire ricordarsi
// quattro punti, e le differenze fra i ruoli non si vedevano — si scoprivano.
//
// `funzione` lega la voce al catalogo `FUNZIONI_AZIENDA` (lib/funzioni.js): è da
// lì che lo staff eredita il permesso che la apre. Le voci senza `funzione` sono
// l'ossatura (account, piattaforma) e le vede chiunque abbia quel blocco.
// `booking` non è un link ma la sezione richiudibile Calendario + Risorse.
export const VOCI = {
  richieste:        { to: '/admin/requests',         label: 'Richieste',         icon: Inbox,            funzione: 'richieste' },
  prenotazioni:     { to: '/admin/prenotazioni',     label: 'Prenotazioni',      icon: CalendarCheck,    funzione: 'prenotazioni' },
  booking:          { funzione: 'booking' },
  contatti:         { to: '/admin/contatti',         label: 'Contatti',          icon: Users,            funzione: 'contatti' },
  preventivi:       { to: '/admin/preventivi',       label: 'Preventivi',        icon: FileText,         funzione: 'preventivi' },
  recensioni:       { to: '/admin/recensioni',       label: 'Recensioni',        icon: Star,             funzione: 'recensioni' },
  survey:           { to: '/admin/survey',           label: 'Survey & NPS',      icon: BarChart3,        funzione: 'survey' },
  chat:             { to: '/admin/chat',             label: 'Chat',              icon: MessageCircle,    funzione: 'chat' },
  form_builder:     { to: '/admin/form-builder',     label: 'Form Builder',      icon: FormInput,        funzione: 'form_builder' },
  blog:             { to: '/admin/blog',             label: 'Blog & News',       icon: Newspaper,        funzione: 'blog' },
  eventi:           { to: '/admin/eventi',           label: 'Eventi',            icon: CalendarDays,     funzione: 'eventi' },
  offerte:          { to: '/admin/offerte',          label: 'Offerte',           icon: Tag,              funzione: 'offerte' },
  newsletter:       { to: '/admin/newsletter',       label: 'Newsletter',        icon: Mail,             funzione: 'newsletter' },
  whatsapp:         { to: '/admin/whatsapp',         label: 'WhatsApp',          icon: MessageCircle,    funzione: 'whatsapp' },
  automazioni:      { to: '/admin/automazioni',      label: 'Automazioni',       icon: BotMessageSquare, funzione: 'automazioni' },
  piano_editoriale: { to: '/admin/piano-editoriale', label: 'Piano editoriale',  icon: CalendarDays,     funzione: 'piano_editoriale' },
  content_studio:   { to: '/admin/content-studio',   label: 'Content Studio',    icon: Sparkles,         funzione: 'content_studio' },
  loyalty:          { to: '/admin/loyalty',          label: 'Loyalty',           icon: Gift,             funzione: 'loyalty' },
  prodotti:         { to: '/admin/prodotti',         label: 'Prodotti',          icon: Store,            funzione: 'shop' },
  shop:             { to: '/admin/shop',             label: 'Shop',              icon: ShoppingBag,      funzione: 'shop' },
  analytics:        { to: '/admin/analytics',        label: 'Analytics',         icon: BarChart2,        funzione: 'analytics' },
  demo:             { to: '/admin/demo',             label: 'Richieste demo',    icon: FileText },
  ai_site_builder:  { to: '/admin/ai-site-builder',  label: 'AI Site Builder',   icon: Wand2 },
  qrcode:           { to: '/admin/qrcode',           label: 'QR Code',           icon: QrCode },
  collaboratori:    { to: '/admin/staff',            label: 'Collaboratori',     icon: UserCheck },
  integrazioni:     { to: '/admin/integrazioni',     label: 'Integrazioni',      icon: Webhook },
  pagamenti:        { to: '/admin/pagamenti',        label: 'Pagamenti',         icon: CreditCard },
  seo_geo:          { to: '/admin/seo-geo',          label: 'SEO & GEO',         icon: SearchCheck },
  audit_log:        { to: '/admin/audit-log',        label: 'Audit log',         icon: ClipboardList },
  impostazioni:     { to: '/admin/impostazioni',     label: 'Impostazioni',      icon: Settings },
  sicurezza:        { to: '/admin/security',         label: 'Sicurezza',         icon: Shield },
  aiuto:            { to: '/admin/help',             label: 'Aiuto',             icon: LifeBuoy },
  aziende:          { to: '/admin/aziende',          label: 'Aziende',           icon: Building },
  strutture:        { to: '/admin/properties',       label: 'Strutture',         icon: Building2 },
  ristoranti:       { to: '/admin/ristoranti',       label: 'Ristoranti',        icon: Store },
  attivita:         { to: '/admin/attivita',         label: 'Attività',          icon: Zap },
  utenti:           { to: '/admin/users',            label: 'Utenti',            icon: Users },
  diagnostica:      { to: '/admin/diagnostica',      label: 'Stato piattaforma', icon: Activity },
  funzioni:         { to: '/admin/funzioni',         label: 'Funzioni e profili', icon: SlidersHorizontal },
}

// Come ogni ruolo vede il pannello: blocchi in ordine, ciascuno con le sue voci.
// `'entita'` è il blocco delle sezioni dell'entità attiva; `'proprieta'` quello
// storico dei profili senza azienda.
//
// ⚠️ Le differenze fra i ruoli (gruppi con nomi diversi, voci in ordine diverso,
// la Chat che c'è per l'azienda e non per lo staff) sono quelle che c'erano: qui
// sono solo diventate leggibili. Uniformarle cambia cosa vede un cliente, e va
// deciso con Francesco — non di passaggio. `tests/probe-menu-pannello.mjs`
// confronta il menu di ogni ruolo con la fotografia attesa.
export const MENU_PER_RUOLO = {
  super_admin: [
    { titolo: 'Operativo',   voci: ['richieste', 'prenotazioni', 'booking', 'demo', 'recensioni', 'survey'] },
    { titolo: 'Marketing',   voci: ['contatti', 'newsletter', 'whatsapp', 'automazioni', 'blog', 'piano_editoriale', 'content_studio', 'ai_site_builder', 'preventivi', 'form_builder', 'prodotti', 'shop', 'loyalty', 'eventi', 'offerte'] },
    'entita',
    { titolo: 'Account',     voci: ['analytics', 'qrcode', 'integrazioni', 'pagamenti', 'seo_geo', 'audit_log', 'impostazioni', 'sicurezza', 'aiuto'] },
    { titolo: 'Piattaforma', voci: ['aziende', 'strutture', 'ristoranti', 'attivita', 'utenti', 'diagnostica', 'funzioni'] },
  ],
  admin_azienda: [
    { titolo: 'Clienti & richieste', voci: ['richieste', 'prenotazioni', 'booking', 'contatti', 'preventivi', 'recensioni', 'survey', 'chat', 'form_builder'] },
    { titolo: 'Contenuti & promo',   voci: ['blog', 'eventi', 'offerte', 'newsletter', 'whatsapp', 'automazioni', 'piano_editoriale', 'content_studio', 'loyalty', 'prodotti', 'shop'] },
    'entita',
    { titolo: 'Account',             voci: ['analytics', 'collaboratori', 'integrazioni', 'pagamenti', 'sicurezza', 'aiuto'] },
  ],
  staff: [
    { titolo: 'Operativo', voci: ['richieste', 'prenotazioni', 'booking', 'eventi', 'offerte', 'recensioni', 'survey'] },
    { titolo: 'Marketing', voci: ['contatti', 'newsletter', 'whatsapp', 'blog', 'automazioni', 'piano_editoriale', 'content_studio', 'preventivi', 'form_builder', 'prodotti', 'shop', 'loyalty'] },
    'entita',
    { titolo: 'Account',   voci: ['analytics', 'sicurezza', 'aiuto'] },
  ],
  legacy: [
    { titolo: 'Operativo', voci: ['richieste', 'prenotazioni', 'booking', 'chat', 'eventi', 'offerte'] },
    { titolo: 'Marketing', voci: ['blog', 'newsletter', 'contatti'] },
    'proprieta',
    { titolo: 'Account',   voci: ['sicurezza'] },
  ],
}
