'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { apiFetch } from '@/lib/api'
import Breadcrumb from './Breadcrumb'
import {
  LayoutDashboard, BarChart2, Shield,
  Inbox, CalendarCheck, Calendar, CalendarDays, Package, ListChecks,
  MessageCircle, FileText, Newspaper, Mail, Users,
  QrCode, UserCheck, ClipboardList, LogOut,
  Building, Building2, Store, Zap, Webhook, BotMessageSquare, Star, Settings,
  Info, Layers, Wrench, Image, Palette, MapPin, Globe, Lock, Bot, UtensilsCrossed,
  FormInput, ShoppingBag, Sparkles, BarChart3, Gift, SearchCheck, LifeBuoy, LayoutTemplate, Wand2,
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
const STRUTTURA_SUBS = [
  { sub: 'info',       label: 'Informazioni',  icon: Info },
  { sub: 'modules',    label: 'App Clienti',   icon: Layers },
  { sub: 'services',   label: 'Servizi',       icon: Wrench },
  { sub: 'gallery',    label: 'Galleria',      icon: Image },
  { sub: 'theme',      label: 'Tema e colori', icon: Palette },
  { sub: 'activities', label: 'Attività',      icon: Zap },
  { sub: 'excursions', label: 'Escursioni',    icon: MapPin },
  { sub: 'sito',       label: 'Sito web',      icon: Globe },
  { sub: 'vetrine',    label: 'Vetrine',       icon: Store },
  { sub: 'privacy',    label: 'Privacy',       icon: Lock },
  { sub: 'chatbot',    label: 'Chatbot',       icon: Bot },
  { sub: 'domini',     label: 'Domini',        icon: Globe },
]
const RISTORANTE_SUBS = [
  { sub: 'info',     label: 'Informazioni',  icon: Info },
  { sub: 'moduli',   label: 'App Clienti',   icon: Layers },
  { sub: 'menu',     label: 'Menu',          icon: UtensilsCrossed },
  { sub: 'gallery',  label: 'Galleria',      icon: Image },
  { sub: 'theme',    label: 'Tema e colori', icon: Palette },
  { sub: 'sito',     label: 'Sito web',      icon: Globe },
  { sub: 'vetrine',  label: 'Vetrine',       icon: Store },
  { sub: 'privacy',  label: 'Privacy',       icon: Lock },
  { sub: 'chatbot',  label: 'Chatbot',       icon: Bot },
  { sub: 'domini',   label: 'Domini',        icon: Globe },
]
const ATTIVITA_SUBS = [
  { sub: 'info',     label: 'Informazioni',  icon: Info },
  { sub: 'moduli',   label: 'App Clienti',   icon: Layers },
  { sub: 'gallery',  label: 'Galleria',      icon: Image },
  { sub: 'theme',    label: 'Tema e colori', icon: Palette },
  { sub: 'sito',     label: 'Sito web',      icon: Globe },
  { sub: 'vetrine',  label: 'Vetrine',       icon: Store },
  { sub: 'privacy',  label: 'Privacy',       icon: Lock },
  { sub: 'chatbot',  label: 'Chatbot',       icon: Bot },
  { sub: 'domini',   label: 'Domini',        icon: Globe },
]

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

  function StrutturaSubLinks({ baseId }) {
    if (!baseId) return (
      <div style={{ padding: '6px 12px 10px 20px', fontSize: 12, color: '#666', fontStyle: 'italic' }}>
        Nessuna struttura creata.
      </div>
    )
    return STRUTTURA_SUBS.map(({ sub, label, icon }) => (
      <NavItem key={sub} to={`/admin/struttura/${baseId}/${sub}`} icon={icon} label={label} sub />
    ))
  }

  function RistoranteSubLinks({ baseId }) {
    if (!baseId) return (
      <div style={{ padding: '6px 12px 10px 20px', fontSize: 12, color: '#666', fontStyle: 'italic' }}>
        Nessun ristorante creato.
      </div>
    )
    return RISTORANTE_SUBS.map(({ sub, label, icon }) => (
      <NavItem key={sub} to={`/admin/ristoranti/${baseId}/${sub}`} icon={icon} label={label} sub />
    ))
  }

  function AttivitaSubLinks({ baseId }) {
    if (!baseId) return (
      <div style={{ padding: '6px 12px 10px 20px', fontSize: 12, color: '#666', fontStyle: 'italic' }}>
        Nessuna attività creata.
      </div>
    )
    return ATTIVITA_SUBS.map(({ sub, label, icon }) => (
      <NavItem key={sub} to={`/admin/attivita/${baseId}/${sub}`} icon={icon} label={label} sub />
    ))
  }

  function renderBookingSection() {
    return (
      <CollapseSection label="Booking" icon={Calendar} isOpen={bookingOpen} onToggle={() => setBookingOpen(o => !o)}>
        <NavItem to="/admin/booking" icon={CalendarDays} label="Calendario" sub end />
        <NavItem to="/admin/booking/risorse" icon={Package} label="Risorse" sub />
        <NavItem to="/admin/booking/prenotazioni" icon={ListChecks} label="Prenotazioni" sub />
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
    if (activeEntityType === 'struttura') return <StrutturaSubLinks baseId={activeSitoId} />
    if (activeEntityType === 'ristorante') return <RistoranteSubLinks baseId={activeSitoId} />
    if (activeEntityType === 'attivita') return <AttivitaSubLinks baseId={activeSitoId} />
    return (
      <div style={{ padding: '6px 12px 10px', fontSize: 12, color: '#555', fontStyle: 'italic' }}>
        Nessuna entità attiva.
      </div>
    )
  }

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

        {/* ── Super Admin ── */}
        {isSuperAdmin && (
          <>
            <Divider />
            <SectionHeader label="Operativo" />
            <NavItem to="/admin/requests"     icon={Inbox}         label="Richieste" />
            <NavItem to="/admin/prenotazioni" icon={CalendarCheck} label="Prenotazioni" />
            {renderBookingSection()}
            <NavItem to="/admin/demo"         icon={FileText}      label="Richieste demo" />
            <NavItem to="/admin/recensioni"   icon={Star}          label="Recensioni" />
            <NavItem to="/admin/survey"       icon={BarChart3}     label="Survey & NPS" />

            <Divider />
            <SectionHeader label="Marketing" />
            <NavItem to="/admin/contatti"         icon={Users}            label="Contatti" />
            <NavItem to="/admin/newsletter"       icon={Mail}             label="Newsletter" />
            <NavItem to="/admin/automazioni"      icon={BotMessageSquare} label="Automazioni" />
            <NavItem to="/admin/blog"             icon={Newspaper}        label="Blog & News" />
            <NavItem to="/admin/piano-editoriale" icon={CalendarDays}     label="Piano editoriale" />
            <NavItem to="/admin/content-studio"   icon={Sparkles}         label="Content Studio" />
            <NavItem to="/admin/ai-site-builder"  icon={Wand2}            label="AI Site Builder" />
            <NavItem to="/admin/preventivi"       icon={FileText}         label="Preventivi" />
            <NavItem to="/admin/form-builder"     icon={FormInput}        label="Form Builder" />
            <NavItem to="/admin/shop"             icon={ShoppingBag}      label="Shop" />
            <NavItem to="/admin/loyalty"          icon={Gift}             label="Loyalty" />
            <NavItem to="/admin/eventi"           icon={CalendarDays}     label="Eventi" />

            {/* Sito & App: visibile con URL entità OPPURE quando super_admin ha un'azienda attiva con entità */}
            {(strutturaUrlId || ristoranteUrlId || attivitaUrlId || (activeAziendaId && activeSitoId)) && (
              <>
                <Divider />
                <SectionHeader label="Sito & App" />
                <SitoAppLinks />
              </>
            )}

            <Divider />
            <SectionHeader label="Account" />
            <NavItem to="/admin/analytics"    icon={BarChart2}     label="Analytics" />
            <NavItem to="/admin/qrcode"       icon={QrCode}        label="QR Code" />
            <NavItem to="/admin/integrazioni" icon={Webhook}       label="Integrazioni" />
            <NavItem to="/admin/seo-geo"      icon={SearchCheck}   label="SEO & GEO" />
            <NavItem to="/admin/audit-log"    icon={ClipboardList} label="Audit log" />
            <NavItem to="/admin/impostazioni" icon={Settings}      label="Impostazioni" />
            <NavItem to="/admin/security"     icon={Shield}        label="Sicurezza" />
            <NavItem to="/admin/help"         icon={LifeBuoy}      label="Aiuto" />

            <Divider />
            <SectionHeader label="Piattaforma" />
            <NavItem to="/admin/aziende"    icon={Building}  label="Aziende" />
            <NavItem to="/admin/properties" icon={Building2} label="Strutture" />
            <NavItem to="/admin/ristoranti" icon={Store}     label="Ristoranti" />
            <NavItem to="/admin/attivita"   icon={Zap}       label="Attività" />
            <NavItem to="/admin/users"      icon={Users}     label="Utenti" />
          </>
        )}

        {/* ── Admin Azienda ── */}
        {isAdminAzienda && (
          <>
            <Divider />
            <SectionHeader label="Operativo" />
            <NavItem to="/admin/requests"     icon={Inbox}         label="Richieste" />
            <NavItem to="/admin/prenotazioni" icon={CalendarCheck} label="Prenotazioni" />
            {renderBookingSection()}
            <NavItem to="/admin/chat"         icon={MessageCircle} label="Chat" />
            <NavItem to="/admin/recensioni"   icon={Star}          label="Recensioni" />
            <NavItem to="/admin/survey"       icon={BarChart3}     label="Survey & NPS" />

            <Divider />
            <SectionHeader label="Marketing" />
            <NavItem to="/admin/contatti"         icon={Users}            label="Contatti" />
            <NavItem to="/admin/newsletter"       icon={Mail}             label="Newsletter" />
            <NavItem to="/admin/automazioni"      icon={BotMessageSquare} label="Automazioni" />
            <NavItem to="/admin/blog"             icon={Newspaper}        label="Blog & News" />
            <NavItem to="/admin/piano-editoriale" icon={CalendarDays}     label="Piano editoriale" />
            <NavItem to="/admin/content-studio"   icon={Sparkles}         label="Content Studio" />
            <NavItem to="/admin/preventivi"       icon={FileText}         label="Preventivi" />
            <NavItem to="/admin/form-builder"     icon={FormInput}        label="Form Builder" />
            <NavItem to="/admin/shop"             icon={ShoppingBag}      label="Shop" />
            <NavItem to="/admin/loyalty"          icon={Gift}             label="Loyalty" />
            <NavItem to="/admin/eventi"           icon={CalendarDays}     label="Eventi" />

            {(hasStruttura || hasRistorante || hasAttivita) && (
              <>
                <Divider />
                <SectionHeader label="Sito & App" />
                <SitoAppLinks />
                <NavItem to="/admin/qrcode" icon={QrCode} label="QR Code" />
              </>
            )}

            <Divider />
            <SectionHeader label="Account" />
            <NavItem to="/admin/analytics"    icon={BarChart2}  label="Analytics" />
            <NavItem to="/admin/staff"        icon={UserCheck}  label="Collaboratori" />
            <NavItem to="/admin/integrazioni" icon={Webhook}    label="Integrazioni" />
            <NavItem to="/admin/security"     icon={Shield}     label="Sicurezza" />
            <NavItem to="/admin/help"         icon={LifeBuoy}   label="Aiuto" />
          </>
        )}

        {/* ── Staff (filtrato per permessi) ── */}
        {isStaff && (
          <>
            {(perm.richieste || perm.prenotazioni || perm.booking || perm.eventi || perm.recensioni || perm.survey) && (
              <>
                <Divider />
                <SectionHeader label="Operativo" />
                {perm.richieste    && <NavItem to="/admin/requests"     icon={Inbox}         label="Richieste" />}
                {perm.prenotazioni && <NavItem to="/admin/prenotazioni" icon={CalendarCheck} label="Prenotazioni" />}
                {perm.booking      && renderBookingSection()}
                {perm.eventi       && <NavItem to="/admin/eventi"       icon={CalendarDays}  label="Eventi" />}
                {perm.recensioni   && <NavItem to="/admin/recensioni"   icon={Star}          label="Recensioni" />}
                {perm.survey       && <NavItem to="/admin/survey"       icon={BarChart3}     label="Survey & NPS" />}
              </>
            )}

            {(perm.contatti || perm.newsletter || perm.blog || perm.automazioni || perm.piano_editoriale || perm.content_studio || perm.preventivi || perm.form_builder || perm.shop || perm.loyalty) && (
              <>
                <Divider />
                <SectionHeader label="Marketing" />
                {perm.contatti         && <NavItem to="/admin/contatti"         icon={Users}            label="Contatti" />}
                {perm.newsletter       && <NavItem to="/admin/newsletter"       icon={Mail}             label="Newsletter" />}
                {perm.blog             && <NavItem to="/admin/blog"             icon={Newspaper}        label="Blog & News" />}
                {perm.automazioni      && <NavItem to="/admin/automazioni"      icon={BotMessageSquare} label="Automazioni" />}
                {perm.piano_editoriale && <NavItem to="/admin/piano-editoriale" icon={CalendarDays}     label="Piano editoriale" />}
                {perm.content_studio   && <NavItem to="/admin/content-studio"   icon={Sparkles}         label="Content Studio" />}
                {perm.preventivi       && <NavItem to="/admin/preventivi"       icon={FileText}         label="Preventivi" />}
                {perm.form_builder     && <NavItem to="/admin/form-builder"     icon={FormInput}        label="Form Builder" />}
                {perm.shop             && <NavItem to="/admin/shop"             icon={ShoppingBag}      label="Shop" />}
                {perm.loyalty          && <NavItem to="/admin/loyalty"          icon={Gift}             label="Loyalty" />}
              </>
            )}

            {(perm.struttura || perm.ristorante || perm.attivita_gestione) && (hasStruttura || hasRistorante || hasAttivita) && (
              <>
                <Divider />
                <SectionHeader label="Sito & App" />
                <SitoAppLinks />
                <NavItem to="/admin/qrcode" icon={QrCode} label="QR Code" />
              </>
            )}

            <Divider />
            <SectionHeader label="Account" />
            {perm.analytics && <NavItem to="/admin/analytics" icon={BarChart2} label="Analytics" />}
            <NavItem to="/admin/security" icon={Shield}    label="Sicurezza" />
            <NavItem to="/admin/help"     icon={LifeBuoy}  label="Aiuto" />
          </>
        )}

        {/* ── Admin Struttura / Staff legacy ── */}
        {isLegacyStruttura && (
          <>
            <Divider />
            <SectionHeader label="Operativo" />
            <NavItem to="/admin/requests"     icon={Inbox}         label="Richieste" />
            <NavItem to="/admin/prenotazioni" icon={CalendarCheck} label="Prenotazioni" />
            {renderBookingSection()}
            <NavItem to="/admin/chat"         icon={MessageCircle} label="Chat" />
            <NavItem to="/admin/eventi"       icon={CalendarDays}  label="Eventi" />

            <Divider />
            <SectionHeader label="Marketing" />
            <NavItem to="/admin/blog"       icon={Newspaper} label="Blog & News" />
            <NavItem to="/admin/newsletter" icon={Mail}      label="Newsletter" />
            <NavItem to="/admin/contatti"   icon={Users}     label="Contatti" />

            <Divider />
            <SectionHeader label="Sito & App" />
            {NAV_PROPERTY.map(({ to, label, icon }) => (
              <NavItem key={to} to={to} icon={icon} label={label} sub />
            ))}
            <NavItem to="/admin/qrcode" icon={QrCode} label="QR Code" />

            <Divider />
            <SectionHeader label="Account" />
            <NavItem to="/admin/security" icon={Shield} label="Sicurezza" />
          </>
        )}

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
          {children}
        </main>
      </div>
    </>
  )
}
