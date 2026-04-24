import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAzienda } from '../../context/AziendaContext'

// ─── Nav definitions ──────────────────────────────────────────────────────────
const NAV_PROPERTY = [  // admin_struttura / staff (profile.property_id)
  { to: '/admin/property/info',       label: 'Informazioni' },
  { to: '/admin/property/modules',    label: 'Moduli attivi' },
  { to: '/admin/property/services',   label: 'Servizi' },
  { to: '/admin/property/gallery',    label: 'Galleria foto' },
  { to: '/admin/property/theme',      label: 'Tema e colori' },
  { to: '/admin/property/activities', label: 'Attività' },
  { to: '/admin/property/excursions', label: 'Escursioni' },
]
const STRUTTURA_SUBS = [
  { sub: 'info',       label: 'Informazioni' },
  { sub: 'services',   label: 'Servizi' },
  { sub: 'gallery',    label: 'Galleria foto' },
  { sub: 'theme',      label: 'Tema e colori' },
  { sub: 'activities', label: 'Attività' },
  { sub: 'excursions', label: 'Escursioni' },
]
const RISTORANTE_SUBS = [
  { sub: 'info',    label: 'Informazioni' },
  { sub: 'menu',    label: 'Menu' },
  { sub: 'gallery', label: 'Galleria foto' },
  { sub: 'theme',   label: 'Tema e colori' },
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
    padding: 10px 12px; background: none; border: none; color: #fff;
    cursor: pointer; font-size: 10px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; margin-top: 8px;
  }
  .sidebar-collapse-btn:hover { background: rgba(255,255,255,0.06); border-radius: 6px; }
  .collapse-body { overflow: hidden; transition: max-height 0.25s ease; }
  .sidebar-selector {
    margin: 4px 12px 8px; padding: 7px 10px; background: rgba(255,255,255,0.08);
    border: none; border-radius: 8px; color: #fff; font-size: 13px; width: calc(100% - 24px);
    cursor: pointer; outline: none;
  }
  .sidebar-selector option { color: #1a1a2e; background: #fff; }
`

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const { azienda, strutture, ristoranti, selectedStrutturaId, setSelectedStrutturaId, selectedRistoranteId, setSelectedRistoranteId, loading: aziendaLoading } = useAzienda()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [strutturaOpen, setStrutturaOpen] = useState(true)
  const [ristoranteOpen, setRistoranteOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Auto-expand section based on current path
  useEffect(() => {
    if (location.pathname.includes('/admin/struttura/') || location.pathname.includes('/admin/property/')) {
      setStrutturaOpen(true)
    }
    if (location.pathname.includes('/admin/ristoranti/')) {
      setRistoranteOpen(true)
    }
  }, [location.pathname])

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  const role = profile?.role
  const isSuperAdmin = role === 'super_admin'
  const isAdminAzienda = role === 'admin_azienda'
  const isLegacyStruttura = ['admin_struttura', 'staff', 'admin_gruppo'].includes(role)

  // Per admin_azienda: usa solo azienda.moduli (fonte di verità).
  // Aspetta che azienda sia caricata per evitare flash di stato parziale.
  const moduli = azienda?.moduli || {}
  const hasStruttura = isAdminAzienda ? (!!moduli.struttura && !aziendaLoading) : (moduli.struttura || strutture.length > 0)
  const hasRistorante = isAdminAzienda ? (!!moduli.ristorante && !aziendaLoading) : (moduli.ristorante || ristoranti.length > 0)
  const bothActive = hasStruttura && hasRistorante

  // Detect URL-based navigation (for super_admin sub-pages)
  const strutturaUrlMatch = location.pathname.match(/^\/admin\/struttura\/([^/]+)/)
  const ristoranteUrlMatch = location.pathname.match(/^\/admin\/ristoranti\/([^/]+)\//)
  const strutturaUrlId = strutturaUrlMatch?.[1]
  const ristoranteUrlId = ristoranteUrlMatch?.[1]

  const navLinkStyle = (isActive, sub = false) => ({
    display: 'block',
    padding: sub ? '7px 12px 7px 20px' : '10px 12px',
    marginBottom: 2,
    borderRadius: 8,
    color: isActive ? '#fff' : '#aaa',
    background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
    textDecoration: 'none',
    fontSize: sub ? 13 : 14,
  })

  function SectionHeader({ label }) {
    return (
      <div style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: 1, padding: '14px 12px 6px', textTransform: 'uppercase' }}>
        {label}
      </div>
    )
  }

  function CollapseSection({ label, isOpen, onToggle, children }) {
    return (
      <>
        <button className="sidebar-collapse-btn" onClick={onToggle}>
          <span>{label}</span>
          <span style={{ fontSize: 16, opacity: 0.6, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
        </button>
        <div className="collapse-body" style={{ maxHeight: isOpen ? 600 : 0 }}>
          {children}
        </div>
      </>
    )
  }

  function StrutturaSelector() {
    if (strutture.length <= 1) return null
    return (
      <select
        className="sidebar-selector"
        value={selectedStrutturaId || ''}
        onChange={e => {
          setSelectedStrutturaId(e.target.value)
          navigate(`/admin/struttura/${e.target.value}/info`)
        }}
      >
        {strutture.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    )
  }

  function RistoranteSelector() {
    if (ristoranti.length <= 1) return null
    return (
      <select
        className="sidebar-selector"
        value={selectedRistoranteId || ''}
        onChange={e => {
          setSelectedRistoranteId(e.target.value)
          navigate(`/admin/ristoranti/${e.target.value}/info`)
        }}
      >
        {ristoranti.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
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
    return STRUTTURA_SUBS.map(({ sub, label }) => {
      const to = `/admin/struttura/${baseId}/${sub}`
      return (
        <NavLink key={sub} to={to} style={({ isActive }) => navLinkStyle(isActive, true)}>
          {label}
        </NavLink>
      )
    })
  }

  function RistoranteSubLinks({ baseId }) {
    if (!baseId) return (
      <div style={{ padding: '6px 12px 10px 20px', fontSize: 12, color: '#666', fontStyle: 'italic' }}>
        Nessun ristorante creato.<br />
        <span style={{ color: '#888' }}>Aggiungilo dal pannello Aziende.</span>
      </div>
    )
    return RISTORANTE_SUBS.map(({ sub, label }) => {
      const to = `/admin/ristoranti/${baseId}/${sub}`
      return (
        <NavLink key={sub} to={to} style={({ isActive }) => navLinkStyle(isActive, true)}>
          {label}
        </NavLink>
      )
    })
  }

  const sidebarContent = (
    <>
      <div style={{ padding: '24px 20px 16px', fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>
        StayApp
      </div>

      <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>

        {/* ── Dashboard (tutti) ── */}
        <NavLink to="/admin" end style={({ isActive }) => navLinkStyle(isActive)}>Dashboard</NavLink>

        {/* ── Super Admin: gestione globale ── */}
        {isSuperAdmin && (
          <>
            <NavLink to="/admin/aziende"    style={({ isActive }) => navLinkStyle(isActive)}>Aziende</NavLink>
            <NavLink to="/admin/properties" style={({ isActive }) => navLinkStyle(isActive)}>Strutture</NavLink>
            <NavLink to="/admin/ristoranti" style={({ isActive }) => navLinkStyle(isActive)}>Ristoranti</NavLink>
            <NavLink to="/admin/users"      style={({ isActive }) => navLinkStyle(isActive)}>Utenti</NavLink>
            <NavLink to="/admin/requests"   style={({ isActive }) => navLinkStyle(isActive)}>Richieste</NavLink>
            {/* Sub-nav struttura quando super_admin gestisce una struttura via URL */}
            {strutturaUrlId && (
              <>
                <SectionHeader label="Struttura" />
                <StrutturaSubLinks baseId={strutturaUrlId} />
              </>
            )}
            {/* Sub-nav ristorante quando super_admin gestisce un ristorante via URL */}
            {ristoranteUrlId && !strutturaUrlId && (
              <>
                <SectionHeader label="Ristorante" />
                <RistoranteSubLinks baseId={ristoranteUrlId} />
              </>
            )}
          </>
        )}

        {/* ── Admin Azienda: sezioni dinamiche ── */}
        {isAdminAzienda && (
          <>
            <NavLink to="/admin/requests" style={({ isActive }) => navLinkStyle(isActive)}>Richieste</NavLink>

            {/* Solo struttura (no collapse) */}
            {hasStruttura && !bothActive && (
              <>
                <SectionHeader label={strutture.length === 1 ? strutture[0]?.name || 'La mia struttura' : 'Struttura'} />
                <StrutturaSelector />
                <StrutturaSubLinks baseId={selectedStrutturaId} />
              </>
            )}

            {/* Solo ristorante (no collapse) */}
            {hasRistorante && !bothActive && (
              <>
                <SectionHeader label={ristoranti.length === 1 ? ristoranti[0]?.name || 'Il mio ristorante' : 'Ristorante'} />
                <RistoranteSelector />
                <RistoranteSubLinks baseId={selectedRistoranteId} />
              </>
            )}

            {/* Entrambi i moduli: collapsible */}
            {bothActive && (
              <>
                <CollapseSection
                  label="Struttura"
                  isOpen={strutturaOpen}
                  onToggle={() => setStrutturaOpen(o => !o)}
                >
                  <StrutturaSelector />
                  <StrutturaSubLinks baseId={selectedStrutturaId} />
                </CollapseSection>

                <CollapseSection
                  label="Ristorante"
                  isOpen={ristoranteOpen}
                  onToggle={() => setRistoranteOpen(o => !o)}
                >
                  <RistoranteSelector />
                  <RistoranteSubLinks baseId={selectedRistoranteId} />
                </CollapseSection>
              </>
            )}
          </>
        )}

        {/* ── Admin Struttura / Staff: sidebar legacy ── */}
        {isLegacyStruttura && (
          <>
            <NavLink to="/admin/requests" style={({ isActive }) => navLinkStyle(isActive)}>Richieste</NavLink>
            <NavLink to="/admin/qrcode"   style={({ isActive }) => navLinkStyle(isActive)}>QR Code</NavLink>
            <SectionHeader label="La mia struttura" />
            {NAV_PROPERTY.map(({ to, label }) => (
              <NavLink key={to} to={to} style={({ isActive }) => navLinkStyle(isActive, true)}>{label}</NavLink>
            ))}
          </>
        )}

      </nav>

      <div style={{ padding: '16px 20px', fontSize: 12, color: '#888', flexShrink: 0 }}>
        <div>{profile?.full_name || profile?.email || profile?.role}</div>
        <button onClick={handleSignOut}
          style={{ marginTop: 8, background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0, fontSize: 12 }}>
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
          <Outlet />
        </main>
      </div>
    </>
  )
}
