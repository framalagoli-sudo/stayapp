'use client'
import { Fragment, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { funzioneAttiva, staffPuoAprire } from '@/lib/funzioni'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { apiFetch } from '@/lib/api'
import Breadcrumb from './Breadcrumb'
import {
  LayoutDashboard, BarChart2, Shield,
  Inbox, CalendarCheck, Calendar, CalendarDays, Package, ListChecks,
  MessageCircle, FileText, Newspaper, Mail, Users,
  QrCode, UserCheck, ClipboardList, LogOut, Activity,
  Building, Building2, Store, Zap, Webhook, BotMessageSquare, Star, Settings,
  Info, Layers, Wrench, Image, Palette, MapPin, Globe, Lock, Bot, UtensilsCrossed,
  FormInput, ShoppingBag, Sparkles, BarChart3, Gift, SearchCheck, LifeBuoy, LayoutTemplate, Wand2, SlidersHorizontal, Tag,
  CreditCard,
} from 'lucide-react'

// ─── Nav definitions ──────────────────────────────────────────────────────────
const NAV_PROPERTY = [
  { to: '/admin/property/info',       label: 'Informazioni',  icon: Info },
  { to: '/admin/property/modules',    label: 'App Clienti',   icon: Layers },
  { to: '/admin/property/services',   label: 'Servizi',       icon: Wrench },
  { to: '/admin/property/gallery',    label: 'Galleria',      icon: Image },
  { to: '/admin/property/theme',      label: 'Tema e colori', icon: Palette },
  { to: '/admin/property/activities', label: 'Attività',      icon: Zap },
  { to: '/admin/property/excursions', label: 'Escursioni',    icon: MapPin },
  { to: '/admin/property/sito',       label: 'Sito web',      icon: Globe },
  { to: '/admin/property/privacy',    label: 'Privacy',       icon: Lock },
  { to: '/admin/property/chatbot',    label: 'Chatbot',       icon: Bot },
  { to: '/admin/property/domini',     label: 'Domini',        icon: Globe },
]
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
const SEZIONI_ENTITA = [
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
const VOCI = {
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
const MENU_PER_RUOLO = {
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

// ─── CSS ──────────────────────────────────────────────────────────────────────
const STYLES = `
  .admin-wrap { display: flex; min-height: 100vh; font-family: system-ui, sans-serif; }
  .admin-topbar { display: none; }
  .admin-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; }
  .admin-sidebar {
    width: 220px; background: #1a1a2e; color: #fff;
    display: flex; flex-direction: column; flex-shrink: 0;
    overflow-y: auto;
  }
  .admin-main { flex: 1; padding: 32px; background: #f5f5f5; min-width: 0; overflow-x: hidden; }

  @media (max-width: 767px) {
    .admin-wrap { display: block; }
    .admin-topbar {
      display: flex; align-items: center; gap: 12px;
      position: fixed; top: 0; left: 0; right: 0; height: 56px;
      background: #1a1a2e; padding: 0 16px; z-index: 150;
    }
    .admin-sidebar {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 200;
      width: 260px; transform: translateX(-100%);
      transition: transform 0.24s cubic-bezier(0.4,0,0.2,1);
      box-shadow: 4px 0 24px rgba(0,0,0,0.3);
    }
    .admin-sidebar.open { transform: translateX(0); }
    .admin-backdrop.open { display: block; }
    .admin-main { padding: 72px 16px 32px; }
  }

  .sidebar-collapse-btn {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 9px 12px; background: none; border: none; color: #aaa;
    cursor: pointer; font-size: 14px;
    margin-top: 1px;
  }
  .sidebar-collapse-btn:hover { background: rgba(255,255,255,0.06); border-radius: 8px; color: #fff; }
  .collapse-body { overflow: hidden; transition: max-height 0.25s ease; }
  .sidebar-selector {
    margin: 4px 12px 6px; padding: 7px 10px; background: rgba(255,255,255,0.08);
    border: none; border-radius: 8px; color: #fff; font-size: 13px; width: calc(100% - 24px);
    cursor: pointer; outline: none;
  }
  .sidebar-selector option { color: #1a1a2e; background: #fff; }
  .sidebar-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 6px 12px; }
`

// ─── Trial banner ─────────────────────────────────────────────────────────────
function TrialBanner({ azienda }) {
  if (!azienda?.trial_ends_at || azienda?.subscription_status !== 'trial') return null
  const daysLeft = Math.ceil((new Date(azienda.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
  if (daysLeft <= 0) return null
  const urgent = daysLeft <= 3
  return (
    <div style={{
      marginBottom: 20, padding: '10px 16px', borderRadius: 10,
      background: urgent ? '#fff5f5' : '#fffbeb',
      border: `1px solid ${urgent ? '#fed7d7' : '#fef3c7'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 13, color: urgent ? '#c53030' : '#b7791f', fontWeight: 600 }}>
        {urgent ? '⚠️' : '⏳'} Trial: {daysLeft} {daysLeft === 1 ? 'giorno rimasto' : 'giorni rimasti'}
      </span>
      <span style={{ fontSize: 12, color: urgent ? '#c53030' : '#b7791f' }}>
        Piano a pagamento disponibile nelle prossime versioni.
      </span>
    </div>
  )
}

// ─── Credito AI in esaurimento ────────────────────────────────────────────────
// Senza questo il cliente scopriva il tetto solo quando un pulsante smetteva di
// funzionare. Dall'80% lo vede in cima a ogni pagina, in tempo per chiedere una
// ricarica. Solo la percentuale: il cliente non paga l'AI a consumo.
function CreditoAIBanner({ attivo, pathname }) {
  const [uso, setUso] = useState(null)
  useEffect(() => {
    if (!attivo) return
    apiFetch('/api/ai/usage').then(setUso).catch(() => {})
  }, [attivo, pathname])
  if (!attivo || !uso || uso.percentuale < 80) return null

  const adesso = new Date()
  const mese = new Date(Date.UTC(adesso.getUTCFullYear(), adesso.getUTCMonth() + 1, 1))
    .toLocaleDateString('it-IT', { month: 'long', timeZone: 'UTC' })
  const rinnovo = `1° ${mese}`
  // «l'80%»…«l'89%» ma «il 90%»: ottanta comincia per vocale.
  const articolo = uso.percentuale >= 80 && uso.percentuale < 90 ? "l'" : 'il '
  const finito = uso.esaurito
  return (
    <div style={{
      marginBottom: 20, padding: '10px 16px', borderRadius: 10,
      background: finito ? '#fff5f5' : '#fffbeb',
      border: `1px solid ${finito ? '#fed7d7' : '#fef3c7'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 13, color: finito ? '#c53030' : '#b7791f', fontWeight: 600 }}>
        {finito
          ? `Hai usato tutto il credito AI di questo mese: le funzioni AI ripartono il ${rinnovo}.`
          : `Hai usato ${articolo}${uso.percentuale}% del credito AI di questo mese. Si rinnova il ${rinnovo}.`}
      </span>
      <a href="mailto:oltrenova@gmail.com?subject=Credito%20AI" style={{ fontSize: 12, color: finito ? '#c53030' : '#b7791f', fontWeight: 600 }}>
        Te ne serve di più? Scrivici
      </a>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminLayout({ children }) {
  const { profile, signOut } = useAuth()
  const {
    azienda, strutture, ristoranti, attivita,
    selectedStrutturaId, setSelectedStrutturaId,
    selectedRistoranteId, setSelectedRistoranteId,
    selectedAttivitaId, setSelectedAttivitaId,
    activeAziendaId, setActiveAziendaId,
    getAllEntities,
    loading: aziendaLoading,
  } = useAzienda()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [aziendeLista, setAziendeLista] = useState([])

  useEffect(() => { setMenuOpen(false) }, [pathname])
  useEffect(() => {
    if (pathname.startsWith('/admin/booking')) setBookingOpen(true)
  }, [pathname])
  useEffect(() => {
    if (profile?.role !== 'super_admin') return
    apiFetch('/api/aziende').then(setAziendeLista).catch(() => {})
  }, [profile?.role])

  async function handleSignOut() {
    await signOut()
    router.push('/admin/login')
  }

  const role = profile?.role
  const isSuperAdmin = role === 'super_admin'
  const isAdminAzienda = role === 'admin_azienda'
  const isStaff = role === 'staff' && !!profile?.azienda_id
  const isLegacyStruttura = ['admin_struttura', 'admin_gruppo'].includes(role) || (role === 'staff' && !profile?.azienda_id)
  const perm = profile?.permissions || {}

  const moduli = azienda?.moduli || {}
  const hasStruttura = isAdminAzienda ? (!!moduli.struttura && !aziendaLoading) : (moduli.struttura || strutture.length > 0)
  const hasRistorante = isAdminAzienda ? (!!moduli.ristorante && !aziendaLoading) : (moduli.ristorante || ristoranti.length > 0)
  const hasAttivita = isAdminAzienda ? (!!moduli.attivita && !aziendaLoading) : (moduli.attivita || attivita?.length > 0)

  const strutturaUrlMatch = pathname.match(/^\/admin\/struttura\/([^/]+)/)
  const ristoranteUrlMatch = pathname.match(/^\/admin\/ristoranti\/([^/]+)\//)
  const attivitaUrlMatch = pathname.match(/^\/admin\/attivita\/([^/]+)\//)
  const strutturaUrlId = strutturaUrlMatch?.[1]
  const ristoranteUrlId = ristoranteUrlMatch?.[1]
  const attivitaUrlId = attivitaUrlMatch?.[1]

  // Entità attiva per la sezione Sito & App
  const activeEntityType = strutturaUrlId ? 'struttura'
    : ristoranteUrlId ? 'ristorante'
    : attivitaUrlId ? 'attivita'
    : pathname.startsWith('/admin/property/') ? 'struttura'
    : hasStruttura ? 'struttura'
    : hasRistorante ? 'ristorante'
    : hasAttivita ? 'attivita'
    : null

  const activeSitoId = activeEntityType === 'struttura' ? (strutturaUrlId || selectedStrutturaId)
    : activeEntityType === 'ristorante' ? (ristoranteUrlId || selectedRistoranteId)
    : activeEntityType === 'attivita' ? (attivitaUrlId || selectedAttivitaId)
    : null

  // ─── Style helpers ────────────────────────────────────────────────────────
  const navLinkStyle = (isActive, sub = false) => ({
    display: 'block',
    padding: sub ? '6px 12px 6px 16px' : '9px 12px',
    marginBottom: 1,
    borderRadius: 8,
    color: isActive ? '#fff' : '#aaa',
    background: isActive ? 'rgba(255,255,255,0.13)' : 'transparent',
    textDecoration: 'none',
    fontSize: sub ? 13 : 14,
  })

  // ─── Shared sub-components ────────────────────────────────────────────────
  function NavItem({ to, icon: Icon, label, sub = false, end = false, activeOverride = false }) {
    const isActive = end ? pathname === to : pathname.startsWith(to)
    return (
      <Link href={to} style={navLinkStyle(isActive || activeOverride, sub)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: sub ? 7 : 9 }}>
          {Icon && <Icon size={sub ? 13 : 15} strokeWidth={1.8} style={{ flexShrink: 0 }} />}
          {label}
        </span>
      </Link>
    )
  }

  function SectionHeader({ label }) {
    return (
      <div style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: 1, padding: '12px 12px 4px', textTransform: 'uppercase' }}>
        {label}
      </div>
    )
  }

  function Divider() {
    return <div className="sidebar-divider" />
  }

  function CollapseSection({ label, icon: Icon, isOpen, onToggle, children }) {
    return (
      <>
        <button className="sidebar-collapse-btn" onClick={onToggle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {Icon && <Icon size={15} strokeWidth={1.8} style={{ flexShrink: 0 }} />}
            {label}
          </span>
          <span style={{ fontSize: 14, opacity: 0.4, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
        </button>
        <div className="collapse-body" style={{ maxHeight: isOpen ? 800 : 0 }}>
          {children}
        </div>
      </>
    )
  }

  // Rende i sub-menu entità raggruppati: un SectionHeader per ogni `group`, e inietta
  // AI Site Builder (dopo "Sito web") e QR Code (dopo "Domini") nel gruppo del sito.
  function renderSubs(subs, hrefFor) {
    const out = []
    let lastGroup = null
    subs.forEach((voce) => {
      const { sub, label, icon, group, spenta } = voce
      if (group !== lastGroup) { out.push(<SectionHeader key={`h-${group}`} label={group} />); lastGroup = group }
      // Il pallino segna le sezioni che il cliente NON vede: le apri lo stesso,
      // ma sai che per lui sono spente — senza doverlo andare a controllare.
      out.push(
        <NavItem key={sub} to={hrefFor(sub, voce)} icon={icon} sub
          label={spenta
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                {label}
                <span title="Spenta per il cliente: la vedi perché sei super_admin"
                  style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9a227', flexShrink: 0 }} />
              </span>
            : label} />
      )
      if (sub === 'sito')   out.push(<NavItem key="ai-builder" to="/admin/ai-site-builder" icon={Wand2}  label="AI Site Builder" sub />)
      if (sub === 'domini') out.push(<NavItem key="qr"         to="/admin/qrcode"          icon={QrCode} label="QR Code"        sub />)
    })
    return out
  }

  const noneMsg = (txt) => (
    <div style={{ padding: '6px 12px 10px 20px', fontSize: 12, color: '#666', fontStyle: 'italic' }}>{txt}</div>
  )
  // Le voci di un'entità dipendono da cosa il cliente ha acceso, non dal tipo.
  // Una lista sola per tutti e tre: prima erano tre, ed è la ragione per cui un
  // hotel non poteva avere un menù.
  function EntitaSubLinks({ tipo, baseId }) {
    const vuoto = { struttura: 'Nessuna struttura creata.', ristorante: 'Nessun ristorante creato.', attivita: 'Nessuna attività creata.' }
    if (!baseId) return noneMsg(vuoto[tipo])

    const elenco = { struttura: strutture, ristorante: ristoranti, attivita }[tipo] || []
    const ent = elenco.find(e => e.id === baseId)
    // `modules` per strutture e ristoranti, `pwa` per le attività: sono i nomi
    // storici che le route restituiscono ancora.
    const conModuli = { ...(ent || {}), tipo, moduli: ent?.moduli || ent?.modules || ent?.pwa }

    const base = { struttura: 'struttura', ristorante: 'ristoranti', attivita: 'attivita' }[tipo]

    // Chi amministra la piattaforma vede TUTTE le sezioni, sempre.
    //
    // Gli interruttori decidono cosa vede il cliente e cosa compare sul suo sito:
    // non devono nascondere niente a chi il prodotto lo sta costruendo. Con i
    // preset di ieri le Vetrine risultavano invisibili su tutte e tredici le
    // entità — un modulo intero, completo e irraggiungibile, e ci si arrivava
    // solo sapendo di doverlo accendere da un'altra pagina.
    //
    // Le sezioni spente per il cliente restano riconoscibili (vedi `spenta`),
    // così si sa sempre cosa lui vede e cosa no.
    const visibili = SEZIONI_ENTITA
      .filter(s => !s.funzione || isSuperAdmin || (ent && funzioneAttiva(conModuli, s.funzione)))
      .map(s => ({ ...s, spenta: !!s.funzione && ent && !funzioneAttiva(conModuli, s.funzione) }))
    return renderSubs(visibili, (sub, voce) => `/admin/${base}/${baseId}/${voce?.nomeSezione?.[tipo] || sub}`)
  }

  function renderBookingSection() {
    return (
      <CollapseSection label="Booking" icon={Calendar} isOpen={bookingOpen} onToggle={() => setBookingOpen(o => !o)}>
        <NavItem to="/admin/booking" icon={CalendarDays} label="Calendario" sub end />
        {/* ⚠️ «Risorse» era stata tolta dal menu il 29/08, pensando che Offerte
            la sostituisse. Non era vero: l'editor delle offerte sa gestire
            posti, anticipo e disdetta, ma **non** gli orari di apertura, i
            giorni, i coperti, le unità identiche né la modalità.
            Togliere lo strumento prima di aver finito il sostituto lascia il
            cliente senza un modo di configurare quello che vende. Rimessa: si
            toglie quando Offerte saprà fare tutto, non prima. */}
        <NavItem to="/admin/booking/risorse" icon={Package} label="Risorse" sub />
      </CollapseSection>
    )
  }

  function handleAziendaChange(e) {
    const newId = e.target.value || null
    setActiveAziendaId(newId)
    if (!newId) { router.push('/admin'); return }
    // Naviga direttamente alla prima entità dell'azienda selezionata
    const { strutture: s, ristoranti: r, attivita: a } = getAllEntities()
    const firstS = s.find(x => x.azienda_id === newId)
    const firstR = r.find(x => x.azienda_id === newId)
    const firstA = a?.find(x => x.azienda_id === newId)
    if (firstS) router.push(`/admin/struttura/${firstS.id}/info`)
    else if (firstR) router.push(`/admin/ristoranti/${firstR.id}/info`)
    else if (firstA) router.push(`/admin/attivita/${firstA.id}/info`)
    else router.push('/admin')
  }

  // ─── Entity switcher (header) ─────────────────────────────────────────────
  function EntitySwitcher() {
    const allEntities = [
      ...strutture.map(e => ({ id: e.id, name: e.name, key: `s:${e.id}` })),
      ...ristoranti.map(e => ({ id: e.id, name: e.name, key: `r:${e.id}` })),
      ...(attivita || []).map(e => ({ id: e.id, name: e.name, key: `a:${e.id}` })),
    ]
    if (allEntities.length === 0) {
      // Super_admin ha selezionato un'azienda senza entità → mostra feedback
      if (isSuperAdmin && activeAziendaId) {
        return (
          <div style={{ padding: '0 12px 12px', fontSize: 12, color: '#555', fontStyle: 'italic' }}>
            Nessuna entità registrata.
          </div>
        )
      }
      return null
    }

    const activeKey = activeEntityType === 'struttura' && activeSitoId ? `s:${activeSitoId}`
      : activeEntityType === 'ristorante' && activeSitoId ? `r:${activeSitoId}`
      : activeEntityType === 'attivita' && activeSitoId ? `a:${activeSitoId}`
      : allEntities[0]?.key || ''

    function handleChange(e) {
      const [prefix, id] = e.target.value.split(':')
      if (prefix === 's') { setSelectedStrutturaId(id); router.push(`/admin/struttura/${id}/info`) }
      else if (prefix === 'r') { setSelectedRistoranteId(id); router.push(`/admin/ristoranti/${id}/info`) }
      else if (prefix === 'a') { setSelectedAttivitaId(id); router.push(`/admin/attivita/${id}/info`) }
    }

    const activeName = allEntities.find(e => e.key === activeKey)?.name || allEntities[0]?.name

    return (
      <div style={{ padding: '0 12px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#444', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>
          Entità attiva
        </div>
        {allEntities.length === 1 ? (
          <button
            onClick={() => handleChange({ target: { value: allEntities[0].key } })}
            style={{ fontSize: 13, color: '#ddd', fontWeight: 600, padding: '7px 10px', background: 'rgba(255,255,255,0.07)', borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
          >
            {activeName}
          </button>
        ) : (
          <select className="sidebar-selector" style={{ margin: 0, width: '100%' }} value={activeKey} onChange={handleChange}>
            {strutture.length > 0 && strutture.map(e => <option key={e.id} value={`s:${e.id}`}>{e.name}</option>)}
            {ristoranti.length > 0 && ristoranti.map(e => <option key={e.id} value={`r:${e.id}`}>{e.name}</option>)}
            {(attivita || []).length > 0 && (attivita || []).map(e => <option key={e.id} value={`a:${e.id}`}>{e.name}</option>)}
          </select>
        )}
      </div>
    )
  }

  // ─── Sito & App links (derivati dall'entità attiva) ───────────────────────
  function SitoAppLinks() {
    if (activeEntityType) return <EntitaSubLinks tipo={activeEntityType} baseId={activeSitoId} />
    return (
      <div style={{ padding: '6px 12px 10px', fontSize: 12, color: '#555', fontStyle: 'italic' }}>
        Nessuna entità attiva.
      </div>
    )
  }

  // ─── Quale menu, per chi ──────────────────────────────────────────────────
  const bloccoMenu = MENU_PER_RUOLO[
    isSuperAdmin ? 'super_admin'
      : isAdminAzienda ? 'admin_azienda'
      : isStaff ? 'staff'
      : isLegacyStruttura ? 'legacy'
      : null
  ] || []

  // Il blocco dell'entità compare a condizioni diverse per ruolo: il
  // super_admin quando sta guardando un'entità, l'azienda quando ne ha, lo
  // staff quando ha anche il permesso di gestirle.
  const haEntita = hasStruttura || hasRistorante || hasAttivita
  const mostraEntita = isSuperAdmin
    ? !!(strutturaUrlId || ristoranteUrlId || attivitaUrlId || (activeAziendaId && activeSitoId))
    : isStaff
      ? !!((perm.struttura || perm.ristorante || perm.attivita_gestione) && haEntita)
      : !!haEntita

  // Allo staff si apre solo ciò che un permesso concede; l'ossatura (Sicurezza,
  // Aiuto) non ha funzione e resta visibile. Gli altri ruoli vedono il loro
  // blocco per intero.
  const voceVisibile = (k) => !isStaff || !VOCI[k].funzione || staffPuoAprire(VOCI[k].funzione, perm)

  // ─── Sidebar content ──────────────────────────────────────────────────────
  const sidebarContent = (
    <>
      <div style={{ padding: '22px 20px 10px' }}>
        <img src="/logo-ondark.png" alt="OltreNova" style={{ height: 36, width: 'auto', display: 'block' }} />
      </div>

      {/* Selettore azienda — solo super_admin */}
      {isSuperAdmin && aziendeLista.length > 0 && (
        <div style={{ padding: '0 12px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#444', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>
            Azienda attiva
          </div>
          <select
            className="sidebar-selector"
            style={{ margin: 0, width: '100%' }}
            value={activeAziendaId || ''}
            onChange={handleAziendaChange}
          >
            <option value="">— tutte —</option>
            {aziendeLista.map(a => (
              <option key={a.id} value={a.id}>{a.ragione_sociale}</option>
            ))}
          </select>
        </div>
      )}

      {/* Entity switcher — admin azienda, staff, e super_admin quando ha un'azienda attiva */}
      {(isAdminAzienda || isStaff || (isSuperAdmin && activeAziendaId)) && <EntitySwitcher />}

      <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>

        <NavItem to="/admin" icon={LayoutDashboard} label="Dashboard" end />

        {bloccoMenu.map((blocco, i) => {
          if (blocco === 'entita') {
            return mostraEntita ? <Fragment key="entita"><Divider /><SitoAppLinks /></Fragment> : null
          }
          if (blocco === 'proprieta') {
            return (
              <Fragment key="proprieta">
                <Divider />
                <SectionHeader label="Sito & App" />
                {NAV_PROPERTY.map(({ to, label, icon }) => (
                  <NavItem key={to} to={to} icon={icon} label={label} sub />
                ))}
                <NavItem to="/admin/qrcode" icon={QrCode} label="QR Code" />
              </Fragment>
            )
          }
          // Allo staff un gruppo compare solo se almeno una voce gli è aperta.
          const voci = blocco.voci.filter(voceVisibile)
          if (voci.length === 0) return null
          return (
            <Fragment key={i}>
              <Divider />
              <SectionHeader label={blocco.titolo} />
              {voci.map(k => k === 'booking'
                ? <Fragment key={k}>{renderBookingSection()}</Fragment>
                : <NavItem key={k} to={VOCI[k].to} icon={VOCI[k].icon} label={VOCI[k].label} />)}
            </Fragment>
          )
        })}

      </nav>

      {/* ── Footer utente ── */}
      <div style={{ padding: '10px 12px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: '#ddd', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.full_name || profile?.email}
            </div>
            <div style={{ fontSize: 11, color: '#555' }}>{profile?.role}</div>
          </div>
        </div>
        <button onClick={handleSignOut} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 8px', background: 'none', border: 'none',
          color: '#666', cursor: 'pointer', fontSize: 13, borderRadius: 6,
        }}>
          <LogOut size={14} strokeWidth={1.8} />
          Esci
        </button>

        {/* ⚠️ Un contratto che sparisce dopo la firma non è consultabile.
            Chi accetta i Termini all'iscrizione deve poterli rileggere quando
            vuole, senza cercarli fuori dal pannello — soprattutto ora che
            regolano anche come incassa i suoi soldi.
            Nel piede e non fra le voci di menu: si consultano di rado, e non
            devono togliere spazio a quello che si usa ogni giorno. */}
        <div style={{ display: 'flex', gap: 10, padding: '10px 8px 2px', fontSize: 11, color: '#555' }}>
          <a href="/termini" target="_blank" rel="noopener noreferrer" style={{ color: '#666', textDecoration: 'none' }}>Termini</a>
          <span style={{ opacity: 0.4 }}>·</span>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#666', textDecoration: 'none' }}>Privacy</a>
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{STYLES}</style>

      <div className="admin-topbar">
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 22, lineHeight: 1, padding: 4 }}
          aria-label="Menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <img src="/logo-ondark.png" alt="OltreNova" style={{ height: 29, width: 'auto', display: 'block' }} />
      </div>

      <div className={`admin-backdrop${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />

      <div className="admin-wrap">
        <aside className={`admin-sidebar${menuOpen ? ' open' : ''}`}>
          {sidebarContent}
        </aside>
        <main className="admin-main">
          <Breadcrumb />
          <TrialBanner azienda={azienda} />
          <CreditoAIBanner attivo={!!profile?.azienda_id && profile?.role !== 'super_admin'} pathname={pathname} />
          {children}
        </main>
      </div>
    </>
  )
}
