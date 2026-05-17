import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAzienda } from '../../context/AziendaContext'
import { apiFetch } from '../../lib/api'
import {
  Inbox, CalendarCheck, Users, Eye,
  AlertTriangle, ChevronRight, Settings, ExternalLink,
  Building2, Store, Zap,
  Phone, Wrench, Sparkles, HelpCircle,
  Clock, Mail, Globe, UserRound, BedDouble,
  Star, CalendarDays, FileEdit,
} from 'lucide-react'

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

function SectionCard({ title, icon: Icon, iconColor = '#1a1a2e', action, actionTo, navigate, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon size={16} strokeWidth={1.8} color={iconColor} />}
          {title}
        </h3>
        {action && (
          <button onClick={() => navigate(actionTo)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 3, padding: 0 }}>
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const { azienda, strutture, ristoranti, attivita, loading: aziLoading } = useAzienda()

  const [analytics,      setAnalytics]      = useState(null)
  const [requests,       setRequests]       = useState([])
  const [prenOggi,       setPrenOggi]       = useState([])
  const [contatti,       setContatti]       = useState([])
  const [eventiProssimi, setEventiProssimi] = useState([])
  const [recensioniKpi,  setRecensioniKpi]  = useState(null)
  const [pianoCount,     setPianoCount]     = useState(null)
  const [loading,        setLoading]        = useState(true)

  useEffect(() => {
    if (profile) load()
  }, [profile])  // eslint-disable-line

  async function load() {
    setLoading(true)
    const today = todayStr()
    const [ana, req, pre, cnt, ev, rec, pia] = await Promise.allSettled([
      apiFetch('/api/analytics?range=7'),
      apiFetch('/api/requests'),
      apiFetch(`/api/booking/prenotazioni?data_da=${today}&data_a=${today}`),
      apiFetch('/api/contatti'),
      apiFetch('/api/eventi'),
      apiFetch('/api/recensioni'),
      apiFetch('/api/piano-editoriale'),
    ])
    if (ana.status === 'fulfilled') setAnalytics(ana.value)
    if (req.status === 'fulfilled') {
      const all = req.value || []
      setRequests(
        all.filter(r =>
          r.status === 'open' &&
          !r.message?.startsWith('[Prenotazione') &&
          !r.message?.startsWith('[Interesse offerta')
        ).slice(0, 5)
      )
    }
    if (pre.status === 'fulfilled') setPrenOggi((pre.value || []).slice(0, 7))
    if (cnt.status === 'fulfilled') setContatti((cnt.value || []).slice(0, 6))
    if (ev.status === 'fulfilled') {
      const all = ev.value || []
      const upcoming = all
        .filter(e => e.date_start && e.date_start >= today)
        .sort((a, b) => a.date_start.localeCompare(b.date_start))
        .slice(0, 5)
      setEventiProssimi(upcoming)
    }
    if (rec.status === 'fulfilled') {
      const all = (rec.value || []).filter(r => r.stelle > 0)
      if (all.length > 0) {
        const media = all.reduce((s, r) => s + r.stelle, 0) / all.length
        setRecensioniKpi({ media: media.toFixed(1), count: all.length })
      }
    }
    if (pia.status === 'fulfilled') {
      const all = pia.value || []
      setPianoCount(all.filter(p => p.stato !== 'pubblicato').length)
    }
    setLoading(false)
  }

  const isAdminAzienda = profile?.role === 'admin_azienda'
  const allEntita = [
    ...strutture.map(s => ({ ...s, tipo: 'struttura' })),
    ...ristoranti.map(r => ({ ...r, tipo: 'ristorante' })),
    ...(attivita || []).map(a => ({ ...a, tipo: 'attivita' })),
  ]
  const missingEmail = allEntita.filter(e => !e.email)

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>
          {greeting(profile?.full_name)}
        </h2>
        <p style={{ margin: 0, color: '#999', fontSize: 14 }}>
          {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ── Alert email mancante ── */}
      {!aziLoading && missingEmail.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fffbeb', border: '1px solid #f6cc5c', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
          <AlertTriangle size={18} strokeWidth={2} color="#b7791f" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 14, color: '#7d5a00', lineHeight: 1.5 }}>
            <strong>Email mancante</strong> — {missingEmail.map(e => e.name).join(', ')} {missingEmail.length === 1 ? 'non ha' : 'non hanno'} un'email configurata. Le notifiche ospite non verranno inviate.
          </div>
        </div>
      )}

      {/* ── Entity cards (solo admin_azienda) ── */}
      {isAdminAzienda && !aziLoading && allEntita.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16, marginBottom: 28 }}>
          {allEntita.map(entita => {
            const cfg  = TIPO_CFG[entita.tipo]
            const Icon = cfg.icon
            const adminPath =
              entita.tipo === 'struttura'  ? `/admin/struttura/${entita.id}/info` :
              entita.tipo === 'ristorante' ? `/admin/ristoranti/${entita.id}/info` :
                                             `/admin/attivita/${entita.id}/info`
            return (
              <div key={`${entita.tipo}-${entita.id}`} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' }}>
                {/* Cover */}
                <div style={{ position: 'relative', height: 110, background: entita.cover_url ? 'none' : cfg.color + '18', overflow: 'hidden' }}>
                  {entita.cover_url
                    ? <img src={entita.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Icon size={36} color={cfg.color} strokeWidth={1} style={{ opacity: 0.25 }} /></div>
                  }
                  <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: entita.active ? '#38a16920' : '#e53e3e20', color: entita.active ? '#276749' : '#c53030', border: `1px solid ${entita.active ? '#38a16940' : '#e53e3e40'}` }}>
                    {entita.active ? 'Attivo' : 'Inattivo'}
                  </span>
                </div>
                {/* Body */}
                <div style={{ padding: '14px 16px', flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{cfg.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{entita.name}</div>
                  {entita.address && <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{entita.address}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => navigate(adminPath)} style={{ flex: 1, padding: '7px 10px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <Settings size={12} strokeWidth={2} color="#fff" /> Gestisci
                    </button>
                    <a href={cfg.pwaBase + entita.slug} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '7px 10px', background: '#f5f5f5', color: '#1a1a2e', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, textDecoration: 'none' }}>
                      <ExternalLink size={12} strokeWidth={2} /> Anteprima
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── KPI row ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiCard icon={Inbox}        label="Richieste aperte"  value={analytics?.requests?.open}       color="#e53e3e" sub="richieste ospiti"      onClick={() => navigate('/admin/requests')} />
        <KpiCard icon={CalendarCheck} label="Prenotazioni oggi" value={prenOggi.length}                 color="#2e7d32" sub={todayStr()}            onClick={() => navigate('/admin/booking')} />
        <KpiCard icon={Users}         label="Nuovi contatti"    value={analytics?.contacts?.new_period} color="#6b46c1" sub="ultimi 7 giorni"       onClick={() => navigate('/admin/contatti')} />
        <KpiCard icon={Eye}           label="Visite minisito"   value={analytics?.pageviews?.total}     color="#1a1a2e" sub="ultimi 7 giorni"       onClick={() => navigate('/admin/analytics')} />
        <KpiCard icon={Star}          label="Recensione media"  value={recensioniKpi ? `⭐ ${recensioniKpi.media}` : '—'} color="#f59e0b" sub={recensioniKpi ? `${recensioniKpi.count} recensioni` : 'nessuna ancora'} onClick={() => navigate('/admin/recensioni')} />
        <KpiCard icon={CalendarDays}  label="Prossimi eventi"   value={eventiProssimi.length}           color="#0284c7" sub="nei prossimi 30 giorni" onClick={() => navigate('/admin/eventi')} />
        <KpiCard icon={FileEdit}      label="Bozze piano"       value={pianoCount ?? '—'}               color="#7c3aed" sub="da pubblicare"          onClick={() => navigate('/admin/piano-editoriale')} />
      </div>

      {/* ── Richieste + Prenotazioni oggi ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>

        <SectionCard title="Richieste aperte" icon={Inbox} iconColor="#e53e3e" action="Vedi tutte" actionTo="/admin/requests" navigate={navigate}>
          {loading ? <Loading /> : requests.length === 0
            ? <Empty text="Nessuna richiesta aperta" />
            : requests.map(r => {
              const TypeIcon = TYPE_ICONS[r.type] || HelpCircle
              const color = TYPE_COLORS[r.type] || '#888'
              return (
                <div key={r.id} onClick={() => navigate('/admin/requests')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TypeIcon size={15} strokeWidth={1.8} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color }}>
                      {TYPE_LABELS[r.type] || r.type}
                    </div>
                    <div style={{ fontSize: 12, color: '#bbb', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {r.room && <><BedDouble size={11} strokeWidth={1.5} /> Camera {r.room} · </>}
                      <Clock size={11} strokeWidth={1.5} /> {timeAgo(r.created_at)}
                    </div>
                  </div>
                </div>
              )
            })
          }
        </SectionCard>

        <SectionCard title="Prenotazioni di oggi" icon={CalendarCheck} iconColor="#2e7d32" action="Vai a Booking" actionTo="/admin/booking" navigate={navigate}>
          {loading ? <Loading /> : prenOggi.length === 0
            ? <Empty text="Nessuna prenotazione oggi" />
            : prenOggi.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, width: 52 }}>
                  <Clock size={12} strokeWidth={1.5} color="#bbb" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
                    {p.ora_inizio ? p.ora_inizio.slice(0, 5) : p.servizio || '—'}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                    <UserRound size={12} strokeWidth={1.5} color="#aaa" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cliente_nome}</span>
                  </div>
                  {p.n_persone > 1 && (
                    <div style={{ fontSize: 12, color: '#bbb', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={11} strokeWidth={1.5} /> {p.n_persone} persone
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: (STATO_COLORS[p.stato] || '#888') + '18', color: STATO_COLORS[p.stato] || '#888', flexShrink: 0 }}>
                  {p.stato}
                </span>
              </div>
            ))
          }
        </SectionCard>

      </div>

      {/* ── Prossimi eventi ── */}
      {eventiProssimi.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionCard title="Prossimi eventi" icon={CalendarDays} iconColor="#0284c7" action="Tutti gli eventi" actionTo="/admin/eventi" navigate={navigate}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {eventiProssimi.map(e => {
                const data = e.date_start ? new Date(e.date_start) : null
                const giorno = data ? data.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '—'
                const ore    = data ? data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''
                return (
                  <div key={e.id} onClick={() => navigate(`/admin/eventi/${e.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                    <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#0284c7', lineHeight: 1 }}>
                        {data ? data.getDate() : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase' }}>
                        {data ? data.toLocaleDateString('it-IT', { month: 'short' }) : ''}
                      </div>
                    </div>
                    <div style={{ width: 1, height: 36, background: '#f0f0f0', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                      {ore && <div style={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                        <Clock size={11} strokeWidth={1.5} /> {ore}
                        {e.price ? <><span style={{ color: '#ddd' }}>·</span> €{e.price}</> : null}
                      </div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Contatti recenti ── */}
      <SectionCard title="Contatti recenti" icon={Users} iconColor="#6b46c1" action="Vedi tutti" actionTo="/admin/contatti" navigate={navigate}>
        {loading ? <Loading /> : contatti.length === 0
          ? <Empty text="Nessun contatto ancora" />
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {contatti.map(c => (
                <div key={c.id} onClick={() => navigate('/admin/contatti')} style={{ background: '#f8f8f8', borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6b46c115', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <UserRound size={14} strokeWidth={1.8} color="#6b46c1" />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome || '—'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#999', marginBottom: 8, overflow: 'hidden' }}>
                    <Mail size={11} strokeWidth={1.5} color="#bbb" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: '#1a1a2e12', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Globe size={10} strokeWidth={1.5} />{c.fonte || 'minisito'}
                    </span>
                    <span style={{ fontSize: 11, color: '#ccc', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} strokeWidth={1.5} />{timeAgo(c.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </SectionCard>

    </div>
  )
}
