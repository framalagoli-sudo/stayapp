// Il menu del pannello: le voci, i gruppi, e chi vede cosa.
//
// Costruito per quello che fa il titolare, non per com'è fatto il database
// (24/09/2026, approvato da Francesco). Prima il menu metteva in alto le
// funzioni «di azienda» e in fondo quelle «di entità»: una distinzione giusta
// per noi e insignificante per lui, che trovava «Sito web» alla voce 27 di 43,
// fuori dallo schermo. Ora il sito è in cima.
//
// `costruisciMenu` è l'UNICO posto che decide cosa compare: lo leggono la barra
// laterale vera (AdminLayout) e l'anteprima dei profili di mestiere. Una seconda
// copia della regola mentirebbe alla prima voce aggiunta da una parte sola.
// Prova: tests/probe-menu-pannello.mjs.
import {
  Activity, BarChart2, BarChart3, Bot, BotMessageSquare, Building, Building2, CalendarCheck, CalendarDays, ClipboardList,
  CreditCard, FileText, FormInput, Gift, Globe, Image, Inbox, Info, LayoutGrid, Layers, LifeBuoy, Lock, Mail,
  MessageCircle, Newspaper, Palette, QrCode, SearchCheck, Settings, Shield, ShoppingBag, SlidersHorizontal, Sparkles,
  Star, Store, Tag, UserCheck, Users, UtensilsCrossed, Wand2, Webhook, Wrench, Zap,
} from 'lucide-react'
import { funzioneAttiva, staffPuoAprire } from '@/lib/funzioni'

// Le sezioni di un'entità (la pagina è /admin/<tipo>/<id>/<sezione>).
//
// `funzione` collega la sezione all'interruttore dell'entità: spenta, la voce
// non compare. `nomeSezione` esiste perché la stessa pagina ha percorsi storici
// diversi fra i tipi (`modules` per le strutture, `moduli` per gli altri).
// `soloSuper`: la pagina Funzioni, dove si accendono le sezioni, è nostra — le
// funzioni le decidiamo noi per categoria (STRATEGIA.md §6.1, 24/09).
export const SEZIONI = {
  sito:     { label: 'Sito web',             icon: Globe },
  theme:    { label: 'Aspetto',              icon: Palette },
  domini:   { label: 'Indirizzo web',        icon: Globe },
  chatbot:  { label: 'Assistente',           icon: Bot,             funzione: 'chatbot' },
  moduli:   { label: 'App del QR',           icon: Layers,          nomeSezione: { struttura: 'modules' } },
  menu:     { label: 'Menù',                 icon: UtensilsCrossed, funzione: 'menu' },
  services: { label: 'Servizi',              icon: Wrench,          funzione: 'servizi' },
  gallery:  { label: 'Galleria',             icon: Image,           funzione: 'galleria' },
  vetrine:  { label: 'Vetrine',              icon: LayoutGrid,      funzione: 'vetrine' },
  info:     { label: "Dati dell'attività",   icon: Info },
  privacy:  { label: 'Privacy',              icon: Lock },
  funzioni: { label: 'Funzioni',             icon: SlidersHorizontal, soloSuper: true },
}

// Le voci che non dipendono dall'entità, scritte UNA volta.
//
// `funzione` lega la voce al catalogo `FUNZIONI_AZIENDA` (lib/funzioni.js): da lì
// lo staff eredita il permesso, e da lì la spegne la categoria dell'azienda.
// `ruoli`: chi la vede, quando non la vedono tutti. `booking` non è un link ma il
// gruppo richiudibile Calendario + Risorse.
export const VOCI = {
  richieste:        { to: '/admin/requests',         label: 'Richieste',          icon: Inbox,            funzione: 'richieste' },
  prenotazioni:     { to: '/admin/prenotazioni',     label: 'Prenotazioni',       icon: CalendarCheck,    funzione: 'prenotazioni' },
  booking:          { label: 'Calendario e risorse',                              icon: CalendarDays,     funzione: 'booking' },
  contatti:         { to: '/admin/contatti',         label: 'Contatti',           icon: Users,            funzione: 'contatti' },
  preventivi:       { to: '/admin/preventivi',       label: 'Preventivi',         icon: FileText,         funzione: 'preventivi' },
  recensioni:       { to: '/admin/recensioni',       label: 'Recensioni',         icon: Star,             funzione: 'recensioni' },
  survey:           { to: '/admin/survey',           label: 'Sondaggi',           icon: BarChart3,        funzione: 'survey' },
  chat:             { to: '/admin/chat',             label: 'Chat',               icon: MessageCircle,    funzione: 'chat', ruoli: ['admin_azienda'] },
  form_builder:     { to: '/admin/form-builder',     label: 'Moduli',             icon: FormInput,        funzione: 'form_builder' },
  blog:             { to: '/admin/blog',             label: 'Blog',               icon: Newspaper,        funzione: 'blog' },
  eventi:           { to: '/admin/eventi',           label: 'Eventi',             icon: CalendarDays,     funzione: 'eventi' },
  offerte:          { to: '/admin/offerte',          label: 'Offerte',            icon: Tag,              funzione: 'offerte' },
  newsletter:       { to: '/admin/newsletter',       label: 'Newsletter',         icon: Mail,             funzione: 'newsletter' },
  whatsapp:         { to: '/admin/whatsapp',         label: 'WhatsApp',           icon: MessageCircle,    funzione: 'whatsapp' },
  automazioni:      { to: '/admin/automazioni',      label: 'Automazioni',        icon: BotMessageSquare, funzione: 'automazioni' },
  piano_editoriale: { to: '/admin/piano-editoriale', label: 'Piano editoriale',   icon: CalendarDays,     funzione: 'piano_editoriale' },
  content_studio:   { to: '/admin/content-studio',   label: 'Studio contenuti',   icon: Sparkles,         funzione: 'content_studio' },
  loyalty:          { to: '/admin/loyalty',          label: 'Fedeltà',            icon: Gift,             funzione: 'loyalty' },
  prodotti:         { to: '/admin/prodotti',         label: 'Prodotti',           icon: Store,            funzione: 'shop' },
  shop:             { to: '/admin/shop',             label: 'Negozio',            icon: ShoppingBag,      funzione: 'shop' },
  analytics:        { to: '/admin/analytics',        label: 'Statistiche',        icon: BarChart2,        funzione: 'analytics' },
  ai_site_builder:  { to: '/admin/ai-site-builder',  label: 'Costruttore AI',     icon: Wand2 },
  qrcode:           { to: '/admin/qrcode',           label: 'Codice QR',          icon: QrCode },
  demo:             { to: '/admin/demo',             label: 'Richieste demo',     icon: FileText,      ruoli: ['super_admin'] },
  collaboratori:    { to: '/admin/staff',            label: 'Collaboratori',      icon: UserCheck,     ruoli: ['admin_azienda'] },
  integrazioni:     { to: '/admin/integrazioni',     label: 'Integrazioni',       icon: Webhook,       ruoli: ['super_admin', 'admin_azienda'] },
  pagamenti:        { to: '/admin/pagamenti',        label: 'Pagamenti',          icon: CreditCard,    ruoli: ['super_admin', 'admin_azienda'] },
  seo_geo:          { to: '/admin/seo-geo',          label: 'SEO & GEO',          icon: SearchCheck,   ruoli: ['super_admin'] },
  audit_log:        { to: '/admin/audit-log',        label: 'Registro accessi',   icon: ClipboardList, ruoli: ['super_admin'] },
  impostazioni:     { to: '/admin/impostazioni',     label: 'Impostazioni',       icon: Settings,      ruoli: ['super_admin'] },
  sicurezza:        { to: '/admin/security',         label: 'Sicurezza',          icon: Shield },
  aiuto:            { to: '/admin/help',             label: 'Aiuto',              icon: LifeBuoy },
  aziende:          { to: '/admin/aziende',          label: 'Aziende',            icon: Building,      ruoli: ['super_admin'] },
  strutture:        { to: '/admin/properties',       label: 'Strutture',          icon: Building2,     ruoli: ['super_admin'] },
  ristoranti:       { to: '/admin/ristoranti',       label: 'Ristoranti',         icon: Store,         ruoli: ['super_admin'] },
  attivita:         { to: '/admin/attivita',         label: 'Attività',           icon: Zap,           ruoli: ['super_admin'] },
  utenti:           { to: '/admin/users',            label: 'Utenti',             icon: Users,         ruoli: ['super_admin'] },
  diagnostica:      { to: '/admin/diagnostica',      label: 'Stato piattaforma',  icon: Activity,      ruoli: ['super_admin'] },
  funzioni:         { to: '/admin/funzioni',         label: 'Funzioni e profili', icon: SlidersHorizontal, ruoli: ['super_admin'] },
}

// L'ordine, uguale per tutti i ruoli. `entita:<sezione>` è una pagina
// dell'entità su cui si sta lavorando; il resto sono voci di VOCI.
// Il sito è in cima: è la cosa per cui un cliente compra OltreNova.
export const GRUPPI = [
  { titolo: 'Il tuo sito', voci: ['entita:sito', 'ai_site_builder', 'entita:theme', 'entita:domini', 'entita:chatbot', 'entita:moduli', 'qrcode', 'analytics'] },
  { titolo: 'Contenuti',   voci: ['entita:menu', 'entita:services', 'entita:gallery', 'entita:vetrine', 'eventi', 'offerte', 'blog'] },
  { titolo: 'Clienti',     voci: ['contatti', 'richieste', 'prenotazioni', 'booking', 'recensioni', 'preventivi', 'form_builder', 'survey', 'chat', 'demo'] },
  { titolo: 'Promozione',  voci: ['newsletter', 'whatsapp', 'automazioni', 'piano_editoriale', 'content_studio', 'loyalty', 'prodotti', 'shop'] },
  { titolo: 'Impostazioni', voci: ['entita:info', 'entita:privacy', 'entita:funzioni', 'collaboratori', 'integrazioni', 'pagamenti', 'seo_geo', 'audit_log', 'impostazioni', 'sicurezza', 'aiuto'] },
  { titolo: 'Piattaforma', voci: ['aziende', 'strutture', 'ristoranti', 'attivita', 'utenti', 'diagnostica', 'funzioni'] },
]

const PERCORSO_TIPO = { struttura: 'struttura', ristorante: 'ristoranti', attivita: 'attivita' }

// Il menu di chi guarda, come elenco di gruppi con le loro voci.
//
//   ruolo           super_admin | admin_azienda | staff
//   permessi        profiles.permissions (solo staff)
//   funzioniAzienda le funzioni di livello azienda accese dalla sua categoria;
//                   null = mai deciso → tutte, come prima dei profili
//   entita          l'entità su cui si lavora { id, tipo, moduli } oppure null
//   conEntita       se le voci dell'entità vanno mostrate (dipende dal ruolo:
//                   il super_admin quando guarda un'entità, lo staff se ha il
//                   permesso di gestirle)
//
// Il super_admin vede tutto: quello che il cliente non vede è segnato `spenta`,
// così sa sempre cosa vede lui e cosa no, senza doverlo andare a controllare.
export function costruisciMenu({ ruolo, permessi = {}, funzioniAzienda = null, entita = null, conEntita = true }) {
  const superAdmin = ruolo === 'super_admin'
  const out = []
  for (const gruppo of GRUPPI) {
    const voci = []
    for (const chiave of gruppo.voci) {
      if (chiave.startsWith('entita:')) {
        const sub = chiave.slice(7)
        const s = SEZIONI[sub]
        if (!entita || !conEntita) continue
        if (s.soloSuper && !superAdmin) continue
        const accesa = !s.funzione || funzioneAttiva(entita, s.funzione)
        if (!accesa && !superAdmin) continue
        voci.push({
          key: chiave, label: s.label, icon: s.icon, spenta: !accesa,
          to: `/admin/${PERCORSO_TIPO[entita.tipo]}/${entita.id}/${s.nomeSezione?.[entita.tipo] || sub}`,
        })
        continue
      }
      const v = VOCI[chiave]
      if (v.ruoli && !v.ruoli.includes(ruolo)) continue
      if (ruolo === 'staff' && v.funzione && !staffPuoAprire(v.funzione, permessi)) continue
      // Le voci del sito che non sono pagine dell'entità (Costruttore AI, Codice
      // QR) stanno con il sito: senza un'entità su cui lavorare non hanno senso.
      // Il super_admin li ha sempre avuti a portata di mano: restano.
      if (gruppo.titolo === 'Il tuo sito' && (!entita || !conEntita) && chiave !== 'analytics' && !superAdmin) continue
      const accesa = !v.funzione || !funzioniAzienda || !!funzioniAzienda[v.funzione]
      if (!accesa && !superAdmin) continue
      voci.push({ key: chiave, label: v.label, icon: v.icon, to: v.to, spenta: !accesa, gruppo: chiave === 'booking' })
    }
    if (voci.length) out.push({ titolo: gruppo.titolo, voci })
  }
  return out
}
