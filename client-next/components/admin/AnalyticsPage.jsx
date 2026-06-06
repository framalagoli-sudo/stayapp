'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { TrendingUp, TrendingDown, Minus, Eye, MessageSquare, CalendarCheck, Mail, Users } from 'lucide-react'

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

function LineChart({ data, color = '#1a1a2e', height = 90 }) {
  if (!data?.length) return null
  const values = data.map(d => d.count)
  const max = Math.max(...values, 1)
  const W = 500, H = height, pad = 4
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = H - pad - (d.count / max) * (H - pad * 2)
    return [x, y]
  })
  const polyline = pts.map(p => p.join(',')).join(' ')
  const area = `M${pts[0][0]},${H} ` + pts.map(p => `L${p[0]},${p[1]}`).join(' ') + ` L${pts[pts.length - 1][0]},${H} Z`
  const gradId = `grad_${color.replace('#', '')}`

  // X-axis labels: show ~6 evenly spaced dates
  const step = Math.max(1, Math.floor(data.length / 6))
  const labels = data.filter((_, i) => i % step === 0 || i === data.length - 1)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: height, display: 'block' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradId})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([x, y], i) => values[i] > 0 && (
          <circle key={i} cx={x} cy={y} r="3" fill={color} opacity="0.7" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {labels.map(d => (
          <span key={d.date} style={{ fontSize: 10, color: '#bbb' }}>
            {new Date(d.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ rows }) {
  const max = Math.max(...rows.map(r => r.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map(({ label, value, color }) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: '#555' }}>{label}</span>
            <span style={{ fontWeight: 700, color: '#1a1a2e' }}>{value}</span>
          </div>
          <div style={{ height: 6, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, trend, color = '#1a1a2e' }) {
  const trendPct = trend != null ? Math.round(trend) : null
  const trendUp   = trendPct > 0
  const trendFlat = trendPct === 0 || trendPct == null

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        {trendPct != null && !trendFlat && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: trendUp ? '#38a169' : '#e53e3e' }}>
            {trendUp ? <TrendingUp size={13} strokeWidth={2} /> : <TrendingDown size={13} strokeWidth={2} />}
            {Math.abs(trendPct)}%
          </span>
        )}
        {trendFlat && trendPct != null && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#bbb' }}>
            <Minus size={12} strokeWidth={2} /> —
          </span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', lineHeight: 1, marginBottom: 4 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function Card({ title, children, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', ...style }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 20, r = 8 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: '#f0f0f0', animation: 'pulse 1.4s ease-in-out infinite' }} />
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData]       = useState(null)
  const [range, setRange]     = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiFetch(`/api/analytics?range=${range}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [range])

  function calcTrend(curr, prev) {
    if (!prev) return curr > 0 ? 100 : 0
    return ((curr - prev) / prev) * 100
  }

  const RANGES = [{ v: 7, l: '7 giorni' }, { v: 30, l: '30 giorni' }, { v: 90, l: '90 giorni' }]

  return (
    <div style={{ maxWidth: 1000 }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Analytics</h2>
        <div style={{ display: 'flex', gap: 4, background: '#f0f0f0', borderRadius: 10, padding: 4 }}>
          {RANGES.map(r => (
            <button key={r.v} onClick={() => setRange(r.v)} style={{
              padding: '6px 14px', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: range === r.v ? '#1a1a2e' : 'transparent',
              color: range === r.v ? '#fff' : '#888',
              transition: 'all 0.15s',
            }}>
              {r.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[0,1,2,3,4].map(i => <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}><Skeleton h={80} /></div>)}
          </div>
          <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 }}>
            <Skeleton h={12} w="30%" r={4} />
            <div style={{ marginTop: 16 }}><Skeleton h={100} r={8} /></div>
          </div>
        </>
      ) : !data ? (
        <p style={{ color: '#888' }}>Impossibile caricare i dati.</p>
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            <StatCard
              icon={<Eye size={18} strokeWidth={1.5} color="#6366f1" />}
              label="Visite sito"
              value={data.pageviews.total.toLocaleString('it-IT')}
              sub={`ultimi ${range} giorni`}
              trend={calcTrend(data.pageviews.total, data.pageviews.prev_total)}
              color="#6366f1"
            />
            <StatCard
              icon={<MessageSquare size={18} strokeWidth={1.5} color="#f59e0b" />}
              label="Richieste ospiti"
              value={data.requests.total}
              sub={data.requests.open ? `${data.requests.open} aperte` : 'tutte gestite'}
              color="#f59e0b"
            />
            <StatCard
              icon={<CalendarCheck size={18} strokeWidth={1.5} color="#10b981" />}
              label="Prenotazioni"
              value={data.bookings.total}
              sub={data.bookings.by_status.open ? `${data.bookings.by_status.open} da confermare` : null}
              color="#10b981"
            />
            <StatCard
              icon={<Mail size={18} strokeWidth={1.5} color="#ef4444" />}
              label="Iscritti newsletter"
              value={data.newsletter.subscribers.toLocaleString('it-IT')}
              sub={data.newsletter.sent_period ? `${data.newsletter.sent_period} inv. nel periodo` : null}
              color="#ef4444"
            />
            <StatCard
              icon={<Users size={18} strokeWidth={1.5} color="#8b5cf6" />}
              label="Contatti / Lead"
              value={data.contacts.total.toLocaleString('it-IT')}
              sub={data.contacts.new_period ? `+${data.contacts.new_period} nuovi` : null}
              color="#8b5cf6"
            />
          </div>

          {/* ── Visite line chart ── */}
          <Card title={`Visite sito — ultimi ${range} giorni`} style={{ marginBottom: 16 }}>
            {data.pageviews.total === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#bbb' }}>
                <Eye size={28} strokeWidth={1.5} color="#e0e0e0" style={{ display: 'block', margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontSize: 13 }}>Nessuna visita ancora. Il contatore parte non appena qualcuno apre il sito.</p>
              </div>
            ) : (
              <LineChart data={data.pageviews.daily} color="#6366f1" height={100} />
            )}
          </Card>

          {/* ── Richieste line chart ── */}
          {data.requests.total > 0 && (
            <Card title={`Richieste ospiti — ultimi ${range} giorni`} style={{ marginBottom: 16 }}>
              <LineChart data={data.requests.daily} color="#f59e0b" height={80} />
            </Card>
          )}

          {/* ── Bar charts ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
            <Card title="Richieste per tipo">
              {data.requests.total === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: '#bbb' }}>Nessuna richiesta nel periodo.</p>
              ) : (
                <BarChart rows={[
                  { label: 'Ricezione',    value: data.requests.by_type.reception    || 0, color: '#6366f1' },
                  { label: 'Manutenzione', value: data.requests.by_type.maintenance  || 0, color: '#f59e0b' },
                  { label: 'Housekeeping', value: data.requests.by_type.housekeeping || 0, color: '#10b981' },
                  { label: 'Altro',        value: data.requests.by_type.other        || 0, color: '#94a3b8' },
                ]} />
              )}
            </Card>

            <Card title="Prenotazioni per stato">
              {data.bookings.total === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: '#bbb' }}>Nessuna prenotazione nel periodo.</p>
              ) : (
                <BarChart rows={[
                  { label: 'Nuove',        value: data.bookings.by_status.open        || 0, color: '#e53e3e' },
                  { label: 'In gestione',  value: data.bookings.by_status.in_progress || 0, color: '#dd6b20' },
                  { label: 'Confermate',   value: data.bookings.by_status.resolved    || 0, color: '#38a169' },
                  { label: 'Annullate',    value: data.bookings.by_status.cancelled   || 0, color: '#d1d5db' },
                ]} />
              )}
            </Card>
          </div>

          <p style={{ fontSize: 11, color: '#ccc', textAlign: 'right', margin: 0 }}>
            Dati in tempo reale · Visite: 1 per sessione browser per entità
          </p>
        </>
      )}
    </div>
  )
}
