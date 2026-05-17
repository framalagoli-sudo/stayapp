import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAzienda } from '../../context/AziendaContext'
import Breadcrumb from './Breadcrumb'
import {
  LayoutDashboard, BarChart2, Shield,
  Inbox, CalendarCheck, Calendar, CalendarDays, Package, ListChecks,
  MessageCircle, FileText, Newspaper, Mail, Users,
  QrCode, UserCheck, ClipboardList, LogOut,
  Building, Building2, Store, Zap, Webhook, BotMessageSquare, Star, Settings,
  Info, Layers, Wrench, Image, Palette, MapPin, Globe, Lock, Bot, UtensilsCrossed,
  FormInput, ShoppingBag,
} from 'lucide-react'

// ─── Nav definitions ──────────────────────────────────────────────────────────
const NAV_PROPERTY = [
  { to: '/admin/property/info',       label: 'Informazioni',  icon: Info },
  { to: '/admin/property/modules',    label: 'Moduli attivi', icon: Layers },
  { to: '/admin/property/services',   label: 'Servizi',       icon: Wrench },
  { to: '/admin/property/gallery',    label: 'Galleria',      icon: Image },
  { to: '/admin/property/theme',      label: 'Tema e colori', icon: Palette },
  { to: '/admin/property/activities', label: 'Attività',      icon: Zap },
  { to: '/admin/property/excursions', label: 'Escursioni',    icon: MapPin },
  { to: '/admin/property/sito',       label: 'Sito',          icon: Globe },
  { to: '/admin/property/privacy',    label: 'Privacy',       icon: Lock },
  { to: '/admin/property/chatbot',    label: 'Chatbot',       icon: Bot },
  { to: '/admin/property/domini',     label: 'Domini',        icon: Globe },
]
const STRUTTURA_SUBS = [
  { sub: 'info',       label: 'Informazioni',  icon: Info },
  { sub: 'modules',    label: 'Moduli attivi', icon: Layers },
  { sub: 'services',   label: 'Servizi',       icon: Wrench },
  { sub: 'gallery',    label: 'Galleria',      icon: Image },
  { sub: 'theme',      label: 'Tema e colori', icon: Palette },
  { sub: 'activities', label: 'Attività',      icon: Zap },
  { sub: 'excursions', label: 'Escursioni',    icon: MapPin },
  { sub: 'sito',       label: 'Sito',          icon: Globe },
  { sub: 'privacy',    label: 'Privacy',       icon: Lock },
  { sub: 'chatbot',    label: 'Chatbot',       icon: Bot },
  { sub: 'domini',     label: 'Domini',        icon: Globe },
]
const RISTORANTE_SUBS = [
  { sub: 'info',     label: 'Informazioni',  icon: Info },
  { sub: 'moduli',   label: 'Moduli attivi', icon: Layers },
  { sub: 'menu',     label: 'Menu',          icon: UtensilsCrossed },
  { sub: 'gallery',  label: 'Galleria',      icon: Image },
  { sub: 'theme',    label: 'Tema e colori', icon: Palette },
  { sub: 'sito',     label: 'Sito',          icon: Globe },
  { sub: 'privacy',  label: 'Privacy',       icon: Lock },
  { sub: 'chatbot',  label: 'Chatbot',       icon: Bot },
  { sub: 'domini',   label: 'Domini',        icon: Globe },
]
const ATTIVITA_SUBS = [
  { sub: 'info',    label: 'Informazioni',  icon: Info },
  { sub: 'gallery', label: 'Galleria',      icon: Image },
  { sub: 'theme',   label: 'Tema e colori', icon: Palette },
  { sub: 'sito',    label: 'Sito',          icon: Globe },
  { sub: 'privacy', label: 'Privacy',       icon: Lock },
  { sub: 'chatbot', label: 'Chatbot',       icon: Bot },
  { sub: 'domini',  label: 'Domini',        icon: Globe },
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
export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const { azienda, strutture, ristoranti, attivita, selectedStrutturaId, setSelectedStrutturaId, selectedRistoranteId, setSelectedRistoranteId, selectedAttivitaId, setSelectedAttivitaId, loading: aziendaLoading } = useAzienda()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [strutturaOpen, setStrutturaOpen] = useState(true)
  const [ristoranteOpen, setRistoranteOpen] = useState(false)
  const [attivitaOpen, setAttivitaOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(() => location.pathname.startsWith('/admin/booking'))

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    if (location.pathname.includes('/admin/struttura/') || location.pathname.includes('/admin/property/')) {
      setStrutturaOpen(true)
    }
    if (location.pathname.includes('/admin/ristoranti/')) {
      setRistoranteOpen(true)
    }
    if (location.pathname.includes('/admin/attivita/')) {
      setAttivitaOpen(true)
    }
    if (location.pathname.startsWith('/admin/booking')) {
      setBookingOpen(true)
    }
  }, [location.pathname])

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
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
  const bothActive = hasStruttura && hasRistorante

  const strutturaUrlMatch = location.pathname.match(/^\/admin\/struttura\/([^/]+)/)
  const ristoranteUrlMatch = location.pathname.match(/^\/admin\/ristoranti\/([^/]+)\//)
  const attivitaUrlMatch = location.pathname.match(/^\/admin\/attivita\/([^/]+)\//)
  const strutturaUrlId = strutturaUrlMatch?.[1]
  const ristoranteUrlId = ristoranteUrlMatch?.[1]
  const attivitaUrlId = attivitaUrlMatch?.[1]

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
    return (
      <NavLink to={to} end={end} style={({ isActive }) => navLinkStyle(isActive || activeOverride, sub)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: sub ? 7 : 9 }}>
          {Icon && <Icon size={sub ? 13 : 15} strokeWidth={1.8} style={{ flexShrink: 0 }} />}
          {label}
        </span>
      </NavLink>
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

  function StrutturaSelector() {
    if (strutture.length <= 1) return null
    return (
      <select className="sidebar-selector" value={selectedStrutturaId || ''}
        onChange={e => { setSelectedStrutturaId(e.target.value); navigate(`/admin/struttura/${e.target.value}/info`) }}>
        {strutture.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    )
  }

  function RistoranteSelector() {
    if (ristoranti.length <= 1) return null
    return (
      <select className="sidebar-selector" value={selectedRistoranteId || ''}
        onChange={e => { setSelectedRistoranteId(e.target.value); navigate(`/admin/ristoranti/${e.target.value}/info`) }}>
        {ristoranti.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
    )
  }

  function AttivitaSelector() {
    if (!attivita || attivita.length <= 1) return null
    return (
      <select className="sidebar-selector" value={selectedAttivitaId || ''}
        onChange={e => { setSelectedAttivitaId(e.target.value); navigate(`/admin/attivita/${e.target.value}/info`) }}>
        {attivita.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    )
  }

  function StrutturaSubLinks({ baseId }) {
    if (!baseId) return (
      <div style={{ padding: '6px 12px 10px 20px', fontSize: 12, color: '#666', fontStyle: 'italic' }}>
        Nessuna struttura creata.<br />
        <span style={{ color: '#888' }}>Aggiungila dal pannello Aziende.</span>
      </div>
    )
    return STRUTTURA_SUBS.map(({ sub, label, icon }) => (
      <NavItem key={sub} to={`/admin/struttura/${baseId}/${sub}`} icon={icon} label={label} sub />
    ))
  }

  function RistoranteSubLinks({ baseId }) {
    if (!baseId) return (
      <div style={{ padding: '6px 12px 10px 20px', fontSize: 12, color: '#666', fontStyle: 'italic' }}>
        Nessun ristorante creato.<br />
        <span style={{ color: '#888' }}>Aggiungilo dal pannello Aziende.</span>
      </div>
    )
    return RISTORANTE_SUBS.map(({ sub, label, icon }) => (
      <NavItem key={sub} to={`/admin/ristoranti/${baseId}/${sub}`} icon={icon} label={label} sub />
    ))
  }

  function AttivitaSubLinks({ baseId }) {
    if (!baseId) return (
      <div style={{ padding: '6px 12px 10px 20px', fontSize: 12, color: '#666', fontStyle: 'italic' }}>
        Nessuna attività creata.<br />
        <span style={{ color: '#888' }}>Aggiungila dal pannello Attività.</span>
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

  // ─── Sidebar content ──────────────────────────────────────────────────────
  const sidebarContent = (
    <>
      <div style={{ padding: '22px 20px 14px', fontWeight: 700, fontSize: 18, letterSpacing: 1, color: '#fff' }}>
        StayApp
      </div>

      <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>

        {/* ── Sempre visibili ── */}
        <NavItem to="/admin" icon={LayoutDashboard} label="Dashboard" end />
        <NavItem to="/admin/analytics" icon={BarChart2} label="Analytics" />
        <NavItem to="/admin/security" icon={Shield} label="Sicurezza account" />

        {/* ── Super Admin ── */}
        {isSuperAdmin && (
          <>
            <Divider />
            <NavItem to="/admin/aziende"    icon={Building}   label="Aziende" />
            <NavItem to="/admin/properties" icon={Building2}  label="Strutture" />
            <NavItem to="/admin/ristoranti" icon={Store}      label="Ristoranti" />
            <NavItem to="/admin/attivita"   icon={Zap}        label="Attività" />
            <NavItem to="/admin/users"      icon={Users}      label="Utenti" />

            <Divider />
            <NavItem to="/admin/requests"      icon={Inbox}         label="Richieste" />
            <NavItem to="/admin/prenotazioni"  icon={CalendarCheck} label="Prenotazioni" />
            {renderBookingSection()}
            <NavItem to="/admin/demo"          icon={FileText}      label="Richieste demo" />

            <Divider />
            <NavItem to="/admin/eventi"        icon={CalendarDays}    label="Eventi" />
            <NavItem to="/admin/blog"          icon={Newspaper}       label="Blog & News" />
            <NavItem to="/admin/newsletter"    icon={Mail}            label="Newsletter" />
            <NavItem to="/admin/automazioni"   icon={BotMessageSquare} label="Automazioni" />
            <NavItem to="/admin/recensioni"    icon={Star}            label="Recensioni" />
            <NavItem to="/admin/preventivi"        icon={FileText}    label="Preventivi" />
            <NavItem to="/admin/form-builder"      icon={FormInput}   label="Form Builder" />
            <NavItem to="/admin/piano-editoriale"  icon={CalendarDays} label="Piano editoriale" />
            <NavItem to="/admin/shop"              icon={ShoppingBag}  label="Shop" />
            <NavItem to="/admin/contatti"      icon={Users}           label="Contatti" />
            <NavItem to="/admin/integrazioni"  icon={Webhook}         label="Integrazioni" />
            <NavItem to="/admin/audit-log"     icon={ClipboardList}   label="Audit log" />
            <NavItem to="/admin/impostazioni"  icon={Settings}        label="Impostazioni" />

            {strutturaUrlId && (
              <>
                <Divider />
                <SectionHeader label="Struttura" />
                <StrutturaSubLinks baseId={strutturaUrlId} />
              </>
            )}
            {ristoranteUrlId && !strutturaUrlId && (
              <>
                <Divider />
                <SectionHeader label="Ristorante" />
                <RistoranteSubLinks baseId={ristoranteUrlId} />
              </>
            )}
            {attivitaUrlId && !strutturaUrlId && !ristoranteUrlId && (
              <>
                <Divider />
                <SectionHeader label="Attività" />
                <AttivitaSubLinks baseId={attivitaUrlId} />
              </>
            )}
          </>
        )}

        {/* ── Admin Azienda ── */}
        {isAdminAzienda && (
          <>
            <Divider />
            <NavItem to="/admin/requests"     icon={Inbox}         label="Richieste" />
            <NavItem to="/admin/prenotazioni" icon={CalendarCheck} label="Prenotazioni" />
            {renderBookingSection()}
            <NavItem to="/admin/chat"         icon={MessageCircle} label="Chat" />
            <NavItem to="/admin/eventi"       icon={CalendarDays}  label="Eventi" />

            <Divider />
            <NavItem to="/admin/blog"          icon={Newspaper}       label="Blog & News" />
            <NavItem to="/admin/newsletter"    icon={Mail}            label="Newsletter" />
            <NavItem to="/admin/automazioni"       icon={BotMessageSquare} label="Automazioni" />
            <NavItem to="/admin/recensioni"        icon={Star}        label="Recensioni" />
            <NavItem to="/admin/preventivi"        icon={FileText}    label="Preventivi" />
            <NavItem to="/admin/form-builder"      icon={FormInput}   label="Form Builder" />
            <NavItem to="/admin/piano-editoriale"  icon={CalendarDays} label="Piano editoriale" />
            <NavItem to="/admin/shop"              icon={ShoppingBag}  label="Shop" />
            <NavItem to="/admin/contatti"          icon={Users}       label="Contatti" />

            <Divider />
            <NavItem to="/admin/qrcode"        icon={QrCode}    label="QR Code" />
            <NavItem to="/admin/staff"         icon={UserCheck} label="Collaboratori" />
            <NavItem to="/admin/integrazioni"  icon={Webhook}   label="Integrazioni" />

            {hasStruttura && !bothActive && (
              <>
                <Divider />
                <SectionHeader label={strutture.length === 1 ? strutture[0]?.name || 'La mia struttura' : 'Struttura'} />
                <StrutturaSelector />
                <StrutturaSubLinks baseId={selectedStrutturaId} />
              </>
            )}
            {hasRistorante && !bothActive && (
              <>
                <Divider />
                <SectionHeader label={ristoranti.length === 1 ? ristoranti[0]?.name || 'Il mio ristorante' : 'Ristorante'} />
                <RistoranteSelector />
                <RistoranteSubLinks baseId={selectedRistoranteId} />
              </>
            )}
            {bothActive && (
              <>
                <Divider />
                <CollapseSection label="Struttura" isOpen={strutturaOpen} onToggle={() => setStrutturaOpen(o => !o)}>
                  <StrutturaSelector />
                  <StrutturaSubLinks baseId={selectedStrutturaId} />
                </CollapseSection>
                <CollapseSection label="Ristorante" isOpen={ristoranteOpen} onToggle={() => setRistoranteOpen(o => !o)}>
                  <RistoranteSelector />
                  <RistoranteSubLinks baseId={selectedRistoranteId} />
                </CollapseSection>
              </>
            )}
            {hasAttivita && (
              <>
                {!bothActive && <Divider />}
                <CollapseSection label="Attività" isOpen={attivitaOpen} onToggle={() => setAttivitaOpen(o => !o)}>
                  <AttivitaSelector />
                  <AttivitaSubLinks baseId={selectedAttivitaId} />
                </CollapseSection>
              </>
            )}
          </>
        )}

        {/* ── Staff (company-level, permissions-filtered) ── */}
        {isStaff && (
          <>
            <Divider />
            {perm.richieste    && <NavItem to="/admin/requests"     icon={Inbox}         label="Richieste" />}
            {perm.prenotazioni && <NavItem to="/admin/prenotazioni" icon={CalendarCheck} label="Prenotazioni" />}
            {perm.booking      && renderBookingSection()}
            {perm.eventi       && <NavItem to="/admin/eventi"       icon={CalendarDays}  label="Eventi" />}

            {(perm.blog || perm.newsletter || perm.contatti) && <Divider />}
            {perm.blog         && <NavItem to="/admin/blog"         icon={Newspaper}  label="Blog & News" />}
            {perm.newsletter   && <NavItem to="/admin/newsletter"   icon={Mail}       label="Newsletter" />}
            {perm.contatti     && <NavItem to="/admin/contatti"     icon={Users}      label="Contatti" />}

            {perm.struttura && hasStruttura && !(perm.ristorante && bothActive) && (
              <>
                <Divider />
                <SectionHeader label={strutture.length === 1 ? strutture[0]?.name || 'La mia struttura' : 'Struttura'} />
                <StrutturaSelector />
                <StrutturaSubLinks baseId={selectedStrutturaId} />
              </>
            )}
            {perm.ristorante && hasRistorante && !(perm.struttura && bothActive) && (
              <>
                <Divider />
                <SectionHeader label={ristoranti.length === 1 ? ristoranti[0]?.name || 'Il mio ristorante' : 'Ristorante'} />
                <RistoranteSelector />
                <RistoranteSubLinks baseId={selectedRistoranteId} />
              </>
            )}
            {perm.struttura && perm.ristorante && bothActive && (
              <>
                <Divider />
                <CollapseSection label="Struttura" isOpen={strutturaOpen} onToggle={() => setStrutturaOpen(o => !o)}>
                  <StrutturaSelector />
                  <StrutturaSubLinks baseId={selectedStrutturaId} />
                </CollapseSection>
                <CollapseSection label="Ristorante" isOpen={ristoranteOpen} onToggle={() => setRistoranteOpen(o => !o)}>
                  <RistoranteSelector />
                  <RistoranteSubLinks baseId={selectedRistoranteId} />
                </CollapseSection>
              </>
            )}
            {perm.attivita_gestione && hasAttivita && (
              <>
                <Divider />
                <CollapseSection label="Attività" isOpen={attivitaOpen} onToggle={() => setAttivitaOpen(o => !o)}>
                  <AttivitaSelector />
                  <AttivitaSubLinks baseId={selectedAttivitaId} />
                </CollapseSection>
              </>
            )}
          </>
        )}

        {/* ── Admin Struttura / Staff legacy ── */}
        {isLegacyStruttura && (
          <>
            <Divider />
            <NavItem to="/admin/requests"     icon={Inbox}         label="Richieste" />
            <NavItem to="/admin/prenotazioni" icon={CalendarCheck} label="Prenotazioni" />
            {renderBookingSection()}
            <NavItem to="/admin/chat"         icon={MessageCircle} label="Chat" />
            <NavItem to="/admin/eventi"       icon={CalendarDays}  label="Eventi" />

            <Divider />
            <NavItem to="/admin/blog"         icon={Newspaper}  label="Blog & News" />
            <NavItem to="/admin/newsletter"   icon={Mail}       label="Newsletter" />
            <NavItem to="/admin/contatti"     icon={Users}      label="Contatti" />

            <Divider />
            <NavItem to="/admin/qrcode" icon={QrCode} label="QR Code" />

            <Divider />
            <SectionHeader label="La mia struttura" />
            {NAV_PROPERTY.map(({ to, label, icon }) => (
              <NavItem key={to} to={to} icon={icon} label={label} sub />
            ))}
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
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>StayApp</span>
      </div>

      <div className={`admin-backdrop${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />

      <div className="admin-wrap">
        <aside className={`admin-sidebar${menuOpen ? ' open' : ''}`}>
          {sidebarContent}
        </aside>
        <main className="admin-main">
          <Breadcrumb />
          <TrialBanner azienda={azienda} />
          <Outlet />
        </main>
      </div>
    </>
  )
}
