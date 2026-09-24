'use client'
import { Fragment, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { apiFetch } from '@/lib/api'
import Breadcrumb from './Breadcrumb'
import { VOCI, costruisciMenu } from './menu-pannello'
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

  function renderBookingSection(titolo = VOCI.booking.label) {
    return (
      <CollapseSection label={titolo} icon={Calendar} isOpen={bookingOpen} onToggle={() => setBookingOpen(o => !o)}>
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
            Nessuna attività registrata.
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
          {isSuperAdmin ? 'Attività' : 'La tua attività'}
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

  // ─── Quale menu, per chi ──────────────────────────────────────────────────
  // L'entità su cui si lavora: il sito e i contenuti del menu sono i SUOI.
  const elencoAttivo = { struttura: strutture, ristorante: ristoranti, attivita }[activeEntityType] || []
  const entAttiva = elencoAttivo.find(e => e.id === activeSitoId)
  // `modules` per strutture e ristoranti, `pwa` per le attività: sono i nomi
  // storici che le route restituiscono ancora. Se l'entità non è fra quelle
  // caricate (il super_admin che apre l'indirizzo di un'altra azienda) valgono
  // gli interruttori predefiniti del suo tipo.
  const entitaMenu = activeSitoId && activeEntityType
    ? { ...(entAttiva || {}), id: activeSitoId, tipo: activeEntityType, moduli: entAttiva?.moduli || entAttiva?.modules || entAttiva?.pwa }
    : null

  // Le voci dell'entità compaiono a condizioni diverse per ruolo: il
  // super_admin quando sta guardando un'entità, l'azienda quando ne ha, lo
  // staff quando ha anche il permesso di gestirle.
  const haEntita = hasStruttura || hasRistorante || hasAttivita
  const mostraEntita = isSuperAdmin
    ? !!(strutturaUrlId || ristoranteUrlId || attivitaUrlId || (activeAziendaId && activeSitoId))
    : isStaff
      ? !!((perm.struttura || perm.ristorante || perm.attivita_gestione) && haEntita)
      : !!haEntita

  const menu = costruisciMenu({
    ruolo: isSuperAdmin ? 'super_admin' : isAdminAzienda ? 'admin_azienda' : isStaff ? 'staff' : null,
    permessi: perm,
    // null finché la categoria non è assegnata: allora si vede tutto, come prima.
    funzioniAzienda: azienda?.funzioni ?? null,
    entita: entitaMenu,
    conEntita: mostraEntita,
  })

  // Il pallino segna ciò che il cliente NON vede: il super_admin lo apre lo
  // stesso, ma sa che per lui è spento — senza doverlo andare a controllare.
  const etichetta = (v) => v.spenta
    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        {v.label}
        <span title="Spenta per il cliente: la vedi perché sei super_admin"
          style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9a227', flexShrink: 0 }} />
      </span>
    : v.label

  // Il vecchio menu dei profili senza azienda (admin_struttura, admin_gruppo,
  // staff orfani): oggi nessuno di loro può più entrare, ma il ramo resta
  // finché non si decide di toglierlo.
  function MenuStorico() {
    return (
      <>
        {[['Operativo', ['richieste', 'prenotazioni', 'booking', 'chat', 'eventi', 'offerte']], ['Marketing', ['blog', 'newsletter', 'contatti']]].map(([titolo, voci]) => (
          <Fragment key={titolo}>
            <Divider />
            <SectionHeader label={titolo} />
            {voci.map(k => k === 'booking'
              ? <Fragment key={k}>{renderBookingSection()}</Fragment>
              : <NavItem key={k} to={VOCI[k].to} icon={VOCI[k].icon} label={VOCI[k].label} />)}
          </Fragment>
        ))}
        <Divider />
        <SectionHeader label="Sito & App" />
        {NAV_PROPERTY.map(({ to, label, icon }) => (
          <NavItem key={to} to={to} icon={icon} label={label} sub />
        ))}
        <NavItem to="/admin/qrcode" icon={QrCode} label="Codice QR" />
        <Divider />
        <SectionHeader label="Account" />
        <NavItem to={VOCI.sicurezza.to} icon={VOCI.sicurezza.icon} label={VOCI.sicurezza.label} />
      </>
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

        {isLegacyStruttura ? <MenuStorico /> : menu.map(g => (
          <Fragment key={g.titolo}>
            <Divider />
            <SectionHeader label={g.titolo} />
            {g.voci.map(v => v.gruppo
              ? <Fragment key={v.key}>{renderBookingSection(v.label)}</Fragment>
              : <NavItem key={v.key} to={v.to} icon={v.icon} label={etichetta(v)} />)}
          </Fragment>
        ))}

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
