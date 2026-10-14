'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { apiFetch } from '@/lib/api'
import {
  Inbox, CalendarCheck, Users, Eye,
  AlertTriangle, ChevronRight, Settings, ExternalLink,
  Building2, Store, Zap,
  Phone, Wrench, Sparkles, HelpCircle,
  Clock, Mail, Globe, UserRound, BedDouble,
  Star, CalendarDays, FileEdit,
  Repeat, Layers, FileText, LayoutList, ShoppingBag, Award, ClipboardList,
} from 'lucide-react'
import StatoSitoBreve from '@/components/admin/StatoSitoBreve'
import IniziaQui from '@/components/admin/IniziaQui'
import Cruscotto from '@/components/admin/Cruscotto'
import Consigli from '@/components/admin/Consigli'
import ClubOggi from '@/components/admin/ClubOggi'
import { postiEvento } from '@/lib/posti-evento'

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS  = { reception: 'Reception', maintenance: 'Manutenzione', housekeeping: 'Pulizie', other: 'Altro' }
const TYPE_COLORS  = { reception: '#1a1a2e', maintenance: '#e53e3e', housekeeping: '#38a169', other: '#888' }
const TYPE_ICONS   = { reception: Phone, maintenance: Wrench, housekeeping: Sparkles, other: HelpCircle }
const STATO_COLORS = { confermata: '#2e7d32', in_attesa: '#e65100', completata: '#1565c0', cancellata: '#999', no_show: '#b71c1c' }
const TIPO_CFG = {
  struttura: { label: 'Struttura', color: '#1a1a2e', icon: Building2, pwaBase: '/s/' },
  ristorante: { label: 'Ristorante', color: '#e63946', icon: Store,    pwaBase: '/r/' },
  attivita:   { label: 'Attività',   color: '#6b46c1', icon: Zap,      pwaBase: '/a/' },
}

// «Mercoledì 14 ottobre»: maiuscola solo all'inizio, come si scrive in italiano.
function oggiInLettere() {
  const s = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function greeting(name) {
  const h = new Date().getHours()
  const s = h < 12 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera'
  return name ? `${s}, ${name.split(' ')[0]}` : s
}

function timeAgo(ts) {
  const d = (Date.now() - new Date(ts)) / 1000
  if (d < 3600)   return `${Math.floor(d / 60)} min fa`
  if (d < 86400)  return `${Math.floor(d / 3600)} ore fa`
  if (d < 172800) return 'ieri'
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

// ─── Sub-components (module level) ───────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color, sub, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 14, padding: '20px 22px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      cursor: onClick ? 'pointer' : 'default',
      flex: '1 1 160px', minWidth: 0, transition: 'box-shadow .15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} strokeWidth={1.8} color={color} />
        </div>
        <span style={{ fontSize: 13, color: '#888' }}>{label}</span>
      </div>
      <div style={{ fontSize: 34, fontWeight: 700, color, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function SectionCard({ title, icon: Icon, iconColor = '#1a1a2e', action, actionTo, children }) {
  const router = useRouter()
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 10px rgba(16,24,40,0.07)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon size={16} strokeWidth={1.8} color={iconColor} />}
          {title}
        </h3>
        {action && (
          <button onClick={() => router.push(actionTo)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 3, padding: 0 }}>
            {action} <ChevronRight size={13} strokeWidth={1.5} />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ color: '#bbb', fontSize: 14, textAlign: 'center', padding: '18px 0' }}>{text}</div>
}

function Loading() {
  return <div style={{ color: '#ccc', fontSize: 14 }}>Caricamento…</div>
}

// ─── Staff dashboard (collaboratori) ─────────────────────────────────────────
const STAFF_LINKS = [
  { key: 'richieste',        label: 'Richieste',        icon: Inbox,         to: '/admin/requests',          color: '#1a1a2e' },
  { key: 'prenotazioni',     label: 'Prenotazioni',     icon: CalendarCheck, to: '/admin/prenotazioni',      color: '#2563eb' },
  { key: 'booking',          label: 'Booking',          icon: BedDouble,     to: '/admin/booking',           color: '#059669' },
  { key: 'eventi',           label: 'Eventi',           icon: CalendarDays,  to: '/admin/eventi',            color: '#d97706' },
  { key: 'recensioni',       label: 'Recensioni',       icon: Star,          to: '/admin/recensioni',        color: '#f59e0b' },
  { key: 'survey',           label: 'Survey & NPS',     icon: ClipboardList, to: '/admin/survey',            color: '#06b6d4' },
  { key: 'contatti',         label: 'Contatti',         icon: Users,         to: '/admin/contatti',          color: '#7c3aed' },
  { key: 'newsletter',       label: 'Newsletter',       icon: Mail,          to: '/admin/newsletter',        color: '#db2777' },
  { key: 'blog',             label: 'Blog & News',      icon: FileEdit,      to: '/admin/blog',              color: '#0891b2' },
  { key: 'automazioni',      label: 'Automazioni',      icon: Repeat,        to: '/admin/automazioni',       color: '#64748b' },
  { key: 'piano_editoriale', label: 'Piano Editoriale', icon: CalendarDays,  to: '/admin/piano-editoriale',  color: '#6366f1' },
  { key: 'content_studio',   label: 'Content Studio',   icon: Layers,        to: '/admin/content-studio',    color: '#8b5cf6' },
  { key: 'preventivi',       label: 'Preventivi',       icon: FileText,      to: '/admin/preventivi',        color: '#0369a1' },
  { key: 'form_builder',     label: 'Form Builder',     icon: LayoutList,    to: '/admin/form-builder',      color: '#0d9488' },
  { key: 'shop',             label: 'Shop',             icon: ShoppingBag,   to: '/admin/shop',              color: '#b45309' },
  { key: 'loyalty',          label: 'Loyalty',          icon: Award,         to: '/admin/loyalty',           color: '#c026d3' },
  { key: 'analytics',        label: 'Analytics',        icon: Eye,           to: '/admin/analytics',         color: '#10b981' },
]

function StaffDashboard({ profile, strutture, ristoranti, attivita }) {
  const router = useRouter()
  const perm = profile?.permissions || {}

  const links = [
    ...STAFF_LINKS.filter(l => perm[l.key]),
  ]

  // Entità Sito & App
  if (perm.struttura) {
    const ids = perm.struttura_ids?.length ? perm.struttura_ids : strutture?.map(s => s.id) || []
    const targets = strutture?.filter(s => ids.includes(s.id)) || strutture || []
    targets.forEach(s => links.push({ key: `s_${s.id}`, label: s.name, icon: Building2, to: `/admin/struttura/${s.id}/info`, color: '#1a1a2e' }))
  }
  if (perm.ristorante) {
    const ids = perm.ristorante_ids?.length ? perm.ristorante_ids : ristoranti?.map(r => r.id) || []
    const targets = ristoranti?.filter(r => ids.includes(r.id)) || ristoranti || []
    targets.forEach(r => links.push({ key: `r_${r.id}`, label: r.name, icon: Store, to: `/admin/ristoranti/${r.id}/info`, color: '#e63946' }))
  }
  if (perm.attivita_gestione) {
    const ids = perm.attivita_ids?.length ? perm.attivita_ids : attivita?.map(a => a.id) || []
    const targets = attivita?.filter(a => ids.includes(a.id)) || attivita || []
    targets.forEach(a => links.push({ key: `a_${a.id}`, label: a.name, icon: Zap, to: `/admin/attivita/${a.id}/info`, color: '#6b46c1' }))
  }

  links.push({ key: 'help', label: 'Aiuto', icon: HelpCircle, to: '/admin/help', color: '#64748b' })

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>
        {greeting(profile?.full_name)}
      </h1>
      <p style={{ color: '#888', fontSize: 14, margin: '0 0 32px' }}>
        Ecco le sezioni a cui hai accesso.
      </p>

      {links.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, textAlign: 'center', color: '#aaa', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Settings size={32} strokeWidth={1} style={{ marginBottom: 12, color: '#ddd' }} />
          <p style={{ margin: 0, fontWeight: 600 }}>Nessuna sezione configurata</p>
          <p style={{ margin: '6px 0 0', fontSize: 13 }}>Contatta l'amministratore per ricevere i permessi.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
          {links.map(({ key, label, icon: Icon, to, color }) => (
            <div
              key={key}
              onClick={() => router.push(to)}
              style={{ background: '#fff', borderRadius: 14, padding: '20px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} strokeWidth={1.8} color={color} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.3 }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
// L'ordine è quello delle domande di chi apre il pannello: com'è andata (Cosa
// succede), cosa devo fare (Inizia qui, consigli, Club), cosa c'è oggi e cosa
// arriva (Oggi · In programma), i miei siti, chi mi ha cercato. Ogni numero
// compare in un posto solo.
export default function DashboardPage() {
  const { profile } = useAuth()
  const router      = useRouter()
  const { azienda, strutture, ristoranti, attivita, activeAziendaId, loading: aziLoading } = useAzienda()
  const aziendaId = azienda?.id || profile?.azienda_id || activeAziendaId
    || strutture?.[0]?.azienda_id || ristoranti?.[0]?.azienda_id || attivita?.[0]?.azienda_id

  const [requests,       setRequests]       = useState([])
  const [prenOggi,       setPrenOggi]       = useState([])
  const [contatti,       setContatti]       = useState([])
  const [eventiProssimi, setEventiProssimi] = useState([])
  const [pianoCount,     setPianoCount]     = useState(0)
  const [loading,        setLoading]        = useState(true)

  useEffect(() => {
    if (profile?.role === 'staff') return
    if (profile) load()
  }, [aziendaId])  // eslint-disable-line

  if (profile?.role === 'staff') {
    return <StaffDashboard profile={profile} strutture={strutture} ristoranti={ristoranti} attivita={attivita} />
  }

  async function load() {
    setLoading(true)
    const today = todayStr()
    const az = aziendaId ? `&azienda_id=${aziendaId}` : ''
    const q = aziendaId ? `?azienda_id=${aziendaId}` : ''
    const [req, pre, cnt, ev, pia] = await Promise.allSettled([
      apiFetch(`/api/requests${q}`),
      apiFetch(`/api/booking/prenotazioni?data_da=${today}&data_a=${today}${az}`),
      apiFetch(`/api/contatti${q}`),
      apiFetch(`/api/eventi${q}`),
      apiFetch(`/api/piano-editoriale${q}`),
    ])
    if (req.status === 'fulfilled') {
      setRequests((req.value || []).filter(r =>
        r.status === 'open' &&
        !r.message?.startsWith('[Prenotazione') &&
        !r.message?.startsWith('[Interesse offerta')
      ))
    }
    if (pre.status === 'fulfilled') setPrenOggi(pre.value || [])
    if (cnt.status === 'fulfilled') setContatti((cnt.value || []).slice(0, 5))
    if (ev.status === 'fulfilled') {
      const adesso = new Date().toISOString()
      setEventiProssimi((ev.value || [])
        .filter(e => e.published !== false && e.date_start && (e.date_start >= adesso || (e.date_end && e.date_end >= adesso)))
        .sort((a, b) => a.date_start.localeCompare(b.date_start))
        .slice(0, 5))
    }
    if (pia.status === 'fulfilled') setPianoCount((pia.value || []).filter(p => p.stato !== 'pubblicato').length)
    setLoading(false)
  }

  const isAdminAzienda = profile?.role === 'admin_azienda'
  const allEntita = [
    ...strutture.map(s => ({ ...s, tipo: 'struttura' })),
    ...ristoranti.map(r => ({ ...r, tipo: 'ristorante' })),
    ...(attivita || []).map(a => ({ ...a, tipo: 'attivita' })),
  ]
  const missingEmail = allEntita.filter(e => !e.email)
  const sitoDi = e => `/admin/${e.tipo === 'struttura' ? 'struttura' : e.tipo === 'ristorante' ? 'ristoranti' : 'attivita'}/${e.id}/sito`
  const scorciatoie = [
    allEntita.length > 0 && { testo: 'Il tuo sito', icona: Globe, link: sitoDi(allEntita[0]) },
    { testo: 'Contatti', icona: Users, link: '/admin/contatti' },
    eventiProssimi.length > 0 && { testo: 'Eventi', icona: CalendarDays, link: '/admin/eventi' },
    { testo: 'Newsletter', icona: Mail, link: '/admin/newsletter' },
  ].filter(Boolean)

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Testata: chi sei, che giorno è, dove vai di solito ── */}
      <div data-testata style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, padding: '24px 24px 20px', marginBottom: 24, color: '#fff',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #23395b 55%, #0f766e 100%)' }}>
        <div aria-hidden style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            {oggiInLettere()}
            {azienda?.ragione_sociale ? <span> · {azienda.ragione_sociale}</span> : null}
          </div>
          <h2 style={{ margin: '4px 0 14px', fontSize: 26, fontWeight: 800, letterSpacing: -0.4, overflowWrap: 'anywhere' }}>{greeting(profile?.full_name)}</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {scorciatoie.map(s => (
              <button key={s.testo} type="button" data-scorciatoia onClick={() => router.push(s.link)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)',
                  borderRadius: 20, padding: '7px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                <s.icona size={14} strokeWidth={1.5} color="#fff" /> {s.testo}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Email mancante: senza, le notifiche ai clienti non partono ── */}
      {!aziLoading && missingEmail.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fffbeb', border: '1px solid #f6cc5c', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
          <AlertTriangle size={18} strokeWidth={1.5} color="#b7791f" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 14, color: '#7d5a00', lineHeight: 1.5 }}>
            <strong>Email mancante</strong> — {missingEmail.map(e => e.name).join(', ')} {missingEmail.length === 1 ? 'non ha' : 'non hanno'} un'email configurata. Le notifiche ai tuoi clienti non verranno inviate.
          </div>
        </div>
      )}

      {/* ── Cosa succede: i numeri, una volta sola ── */}
      <Cruscotto />

      {/* ── Cosa fare: i passi che mancano (solo al titolare), i consigli
          personali, e il Club. Ognuno sparisce quando non ha niente da dire. ── */}
      {isAdminAzienda && <IniziaQui />}
      <Consigli />
      <ClubOggi />

      {/* ── Oggi · In programma ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
        <SectionCard title="Oggi" icon={Inbox} iconColor="#e53e3e">
          <div data-oggi>
            {loading ? <Loading /> : (requests.length === 0 && prenOggi.length === 0 && pianoCount === 0)
              ? <Empty text="Niente in sospeso per oggi" />
              : (
                <>
                  {requests.length > 0 && (
                    <RigaOggi testo={`${requests.length} ${requests.length === 1 ? 'richiesta aperta' : 'richieste aperte'}`} colore="#e53e3e" onClick={() => router.push('/admin/requests')}>
                      {requests.slice(0, 3).map(r => (
                        <div key={r.id} style={{ fontSize: 12.5, color: '#555', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Clock size={11} strokeWidth={1.5} /> {TYPE_LABELS[r.type] || r.type}{r.room ? ` · camera ${r.room}` : ''} · {timeAgo(r.created_at)}
                        </div>
                      ))}
                    </RigaOggi>
                  )}
                  {prenOggi.length > 0 && (
                    <RigaOggi testo={`${prenOggi.length} ${prenOggi.length === 1 ? 'prenotazione' : 'prenotazioni'} oggi`} colore="#2e7d32" onClick={() => router.push('/admin/booking')}>
                      {prenOggi.slice(0, 4).map(p => (
                        <div key={p.id} style={{ fontSize: 12.5, color: '#555', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <b style={{ color: '#1a1a2e', flexShrink: 0 }}>{p.ora_inizio ? p.ora_inizio.slice(0, 5) : (p.servizio || '—')}</b>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cliente_nome}{p.n_persone > 1 ? ` · ${p.n_persone} persone` : ''}</span>
                          <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 11, fontWeight: 600, color: STATO_COLORS[p.stato] || '#666' }}>{p.stato}</span>
                        </div>
                      ))}
                    </RigaOggi>
                  )}
                  {pianoCount > 0 && (
                    <RigaOggi testo={`${pianoCount} ${pianoCount === 1 ? 'bozza' : 'bozze'} nel piano editoriale`} colore="#7c3aed" onClick={() => router.push('/admin/piano-editoriale')} />
                  )}
                </>
              )}
          </div>
        </SectionCard>

        <SectionCard title="In programma" icon={CalendarDays} iconColor="#0284c7" action={eventiProssimi.length ? 'Tutti gli eventi' : null} actionTo="/admin/eventi">
          <div data-in-programma>
            {loading ? <Loading /> : eventiProssimi.length === 0
              ? <Empty text="Nessun evento in programma" />
              : eventiProssimi.map(e => <RigaEvento key={e.id} e={e} onClick={() => router.push(`/admin/eventi/${e.id}`)} />)}
          </div>
        </SectionCard>
      </div>

      {/* ── I tuoi siti (titolare) ── */}
      {isAdminAzienda && !aziLoading && allEntita.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionCard title={allEntita.length === 1 ? 'Il tuo sito' : 'I tuoi siti'} icon={Globe} iconColor="#0284c7">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {allEntita.map(entita => {
                const cfg  = TIPO_CFG[entita.tipo]
                const Icon = cfg.icon
                return (
                  <div key={`${entita.tipo}-${entita.id}`} data-sito style={{ border: '1px solid #eee', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: cfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {entita.cover_url
                          ? <img src={entita.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Icon size={22} color={cfg.color} strokeWidth={1.5} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{entita.name}</div>
                        {entita.address && <div style={{ fontSize: 12, color: '#777', overflowWrap: 'anywhere' }}>{entita.address}</div>}
                      </div>
                    </div>
                    <div style={{ padding: '0 12px' }}>
                      {/* Lo stato del sito si vede da qui: se manca qualcosa lo dice,
                          e il clic porta dove si risolve. */}
                      <StatoSitoBreve entityId={entita.id} entityTipo={entita.tipo} onApri={() => router.push(sitoDi(entita))} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, padding: 12, marginTop: 'auto' }}>
                      <button onClick={() => router.push(sitoDi(entita))} style={{ flex: 1, padding: '8px 10px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <Globe size={13} strokeWidth={1.5} color="#fff" /> Modifica il sito
                      </button>
                      <a href={cfg.pwaBase + entita.slug} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '8px 10px', background: '#f2f2f4', color: '#1a1a2e', borderRadius: 9, fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, textDecoration: 'none' }}>
                        <ExternalLink size={13} strokeWidth={1.5} /> Guardalo
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Stato dei siti (super_admin) ──────────────────────────────────────
          Le schede qui sopra le vede solo l'admin dell'azienda: chi guarda da
          super_admin deve comunque accorgersi se un sito resta da pubblicare. */}
      {!isAdminAzienda && !aziLoading && allEntita.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionCard title="Stato dei siti" icon={Globe} iconColor="#0284c7">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 4 }}>
              {allEntita.slice(0, 12).map(entita => (
                <div key={`stato-${entita.tipo}-${entita.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', flexWrap: 'wrap' }}>
                  <div style={{ width: 190, minWidth: 140, fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflowWrap: 'anywhere' }}>
                    {entita.name}
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <StatoSitoBreve entityId={entita.id} entityTipo={entita.tipo} onApri={() => router.push(sitoDi(entita))} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Chi ti ha cercato ── */}
      <SectionCard title="Contatti recenti" icon={Users} iconColor="#6b46c1" action="Vedi tutti" actionTo="/admin/contatti">
        <div data-contatti-recenti>
          {loading ? <Loading /> : contatti.length === 0
            ? <Empty text="Nessun contatto ancora" />
            : contatti.map(c => (
              <div key={c.id} onClick={() => router.push('/admin/contatti')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f3f3f3', cursor: 'pointer', minWidth: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#6b46c115', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#6b46c1' }}>
                  {(c.nome || c.email || '?').trim().charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome || c.email || '—'}</div>
                  <div style={{ fontSize: 12, color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.fonte || 'sito'}</div>
                </div>
                <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>{timeAgo(c.created_at)}</span>
              </div>
            ))}
        </div>
      </SectionCard>

    </div>
  )
}

// Una riga di «Oggi»: cosa c'è, quanto, e un clic per andarci.
function RigaOggi({ testo, colore, onClick, children }) {
  return (
    <div onClick={onClick} style={{ padding: '10px 0', borderBottom: '1px solid #f3f3f3', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: colore, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', flex: 1 }}>{testo}</span>
        <ChevronRight size={15} strokeWidth={1.5} color="#999" />
      </div>
      {children && <div style={{ display: 'grid', gap: 3, marginTop: 6, paddingLeft: 16 }}>{children}</div>}
    </div>
  )
}

// Un evento in arrivo, con quanto è pieno.
function RigaEvento({ e, onClick }) {
  const data = new Date(e.date_start)
  const p = postiEvento(e)
  const pieno = p.illimitato ? null : Math.min(100, Math.round(p.prenotati / p.capienza * 100))
  return (
    <div data-evento={e.id} onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f3f3', cursor: 'pointer' }}>
      <div style={{ width: 44, textAlign: 'center', flexShrink: 0, background: '#f0f7fb', borderRadius: 10, padding: '5px 0' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#0284c7', lineHeight: 1 }}>{data.getDate()}</div>
        <div style={{ fontSize: 10.5, color: '#555', textTransform: 'uppercase' }}>{data.toLocaleDateString('it-IT', { month: 'short' })}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
        <div style={{ fontSize: 12, color: '#666' }}>
          {data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} · {p.illimitato ? `${p.prenotati} prenotati` : `${p.prenotati} su ${p.capienza} posti`}
        </div>
        {pieno != null && (
          <div style={{ height: 5, borderRadius: 3, background: '#e9e9ee', overflow: 'hidden', marginTop: 5 }}>
            <div style={{ width: `${pieno}%`, height: '100%', background: pieno >= 90 ? '#b45309' : '#0284c7' }} />
          </div>
        )}
      </div>
    </div>
  )
}
