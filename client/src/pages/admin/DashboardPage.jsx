import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAzienda } from '../../context/AziendaContext'
import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/api'
import { ExternalLink, Settings, Store, Building2, Eye, AlertTriangle } from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0 })
  const [properties, setProperties] = useState([])
  const [loadingProps, setLoadingProps] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (['super_admin', 'admin', 'editor', 'admin_gruppo', 'admin_struttura', 'staff'].includes(profile.role)) {
      if (profile.property_id) fetchStats()
      fetchProperties()
    }
  }, [profile])

  async function fetchStats() {
    const { data } = await supabase
      .from('requests')
      .select('status')
      .eq('property_id', profile.property_id)

    if (!data) return
    setStats({
      open: data.filter(r => r.status === 'open').length,
      inProgress: data.filter(r => r.status === 'in_progress').length,
      resolved: data.filter(r => r.status === 'resolved').length,
    })
  }

  async function fetchProperties() {
    setLoadingProps(true)
    try {
      const data = await apiFetch('/api/properties')
      setProperties(data)
    } catch (_) {
      // non critico, la dashboard rimane usabile
    } finally {
      setLoadingProps(false)
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Eliminare la struttura "${name}"?\nL'operazione è irreversibile.`)) return
    try {
      await apiFetch(`/api/properties/${id}`, { method: 'DELETE' })
      setProperties(ps => ps.filter(p => p.id !== id))
    } catch (e) {
      alert(e.message)
    }
  }

  const statCards = [
    { label: 'Richieste aperte', value: stats.open, color: '#e53e3e' },
    { label: 'In gestione', value: stats.inProgress, color: '#dd6b20' },
    { label: 'Risolte oggi', value: stats.resolved, color: '#38a169' },
  ]

  const canManage = profile && ['super_admin', 'admin_gruppo'].includes(profile.role)

  if (profile?.role === 'admin_azienda') {
    return <AziendaDashboard profile={profile} />
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <p style={{ color: '#666', marginBottom: 24 }}>Benvenuto, {profile?.full_name || 'Admin'}.</p>

      {properties.some(p => !p.email) && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fffbeb', border: '1px solid #f6cc5c', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
          <AlertTriangle size={18} strokeWidth={2} color="#b7791f" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 14, color: '#7d5a00', lineHeight: 1.5 }}>
            <strong>Email mancante</strong> — alcune strutture non hanno un'email configurata.
            Le notifiche di nuove richieste non verranno inviate.{' '}
            <button onClick={() => navigate('/admin/property/info')}
              style={{ background: 'none', border: 'none', color: '#b7791f', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: 14 }}>
              Vai in Informazioni
            </button> per aggiungerla.
          </div>
        </div>
      )}

      {profile?.property_id && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 40 }}>
          {statCards.map(({ label, value, color }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '24px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Strutture</h3>
        {canManage && (
          <button
            onClick={() => navigate('/admin/properties')}
            style={{ padding: '6px 14px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            + Nuova struttura
          </button>
        )}
      </div>

      {loadingProps ? (
        <p style={{ color: '#888', fontSize: 14 }}>Caricamento strutture…</p>
      ) : properties.length === 0 ? (
        <p style={{ color: '#888', fontSize: 14 }}>Nessuna struttura trovata.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {properties.map(p => (
            <div key={p.id} style={{
              background: '#fff', borderRadius: 12, padding: '16px 20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  <code style={{ background: '#f5f5f5', padding: '1px 5px', borderRadius: 4 }}>{p.slug}</code>
                  {' · '}
                  <span style={{ color: p.active ? '#38a169' : '#e53e3e' }}>
                    {p.active ? 'Attiva' : 'Inattiva'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => navigate('/admin/properties')}
                  style={{ padding: '6px 14px', background: '#f0f4ff', color: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Modifica
                </button>
                {canManage && (
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    style={{ padding: '6px 14px', background: '#fff0f0', color: '#c00', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Elimina
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AziendaDashboard({ profile }) {
  const navigate = useNavigate()
  const { azienda, strutture, ristoranti, attivita, loading } = useAzienda()

  const allEntita = [
    ...strutture.map(s => ({ ...s, tipo: 'struttura' })),
    ...ristoranti.map(r => ({ ...r, tipo: 'ristorante' })),
    ...(attivita || []).map(a => ({ ...a, tipo: 'attivita' })),
  ]

  const TIPO_CONFIG = {
    struttura: { label: 'Struttura', color: '#1a1a2e', bg: '#1a1a2e18', icon: Building2, pwaBase: '/s/' },
    ristorante: { label: 'Ristorante', color: '#e63946', bg: '#e6394618', icon: Store, pwaBase: '/r/' },
    attivita:   { label: 'Attività',   color: '#6b46c1', bg: '#6b46c118', icon: Eye,     pwaBase: '/a/' },
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>
          {azienda?.ragione_sociale || 'Dashboard'}
        </h2>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>
          Benvenuto, {profile?.full_name || 'Admin'}. Gestisci le tue entità e visualizza le anteprime.
        </p>
      </div>

      {!loading && allEntita.some(e => !e.email) && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fffbeb', border: '1px solid #f6cc5c', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
          <AlertTriangle size={18} strokeWidth={2} color="#b7791f" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 14, color: '#7d5a00', lineHeight: 1.5 }}>
            <strong>Email mancante</strong> —{' '}
            {allEntita.filter(e => !e.email).map(e => e.name).join(', ')}{' '}
            {allEntita.filter(e => !e.email).length === 1 ? 'non ha' : 'non hanno'} un'email configurata.
            Le notifiche di nuove richieste ospite non verranno inviate. Vai in <em>Gestisci → Informazioni</em> per aggiungerla.
          </div>
        </div>
      )}

      {loading && <p style={{ color: '#aaa', fontSize: 14 }}>Caricamento…</p>}

      {!loading && allEntita.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p style={{ color: '#aaa', margin: 0 }}>Nessuna struttura o ristorante ancora creato.</p>
          <p style={{ color: '#bbb', fontSize: 13, margin: '8px 0 0' }}>
            Contatta il tuo amministratore per attivare i moduli.
          </p>
        </div>
      )}

      {!loading && allEntita.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {allEntita.map(entita => {
            const cfg = TIPO_CONFIG[entita.tipo]
            const Icon = cfg.icon
            const adminPath = entita.tipo === 'struttura'
              ? `/admin/struttura/${entita.id}/info`
              : entita.tipo === 'ristorante'
              ? `/admin/ristoranti/${entita.id}/info`
              : `/admin/attivita/${entita.id}/info`
            const pwaUrl = cfg.pwaBase + entita.slug

            return (
              <div key={`${entita.tipo}-${entita.id}`} style={{
                background: '#fff',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'box-shadow 0.2s',
              }}>
                {/* Cover image */}
                <div style={{
                  position: 'relative',
                  height: 160,
                  background: entita.cover_url ? 'none' : `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}44)`,
                  overflow: 'hidden',
                }}>
                  {entita.cover_url && (
                    <img src={entita.cover_url} alt="cover"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  )}
                  {!entita.cover_url && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Icon size={48} color={cfg.color} strokeWidth={1} style={{ opacity: 0.3 }} />
                    </div>
                  )}

                  {/* Status badge */}
                  <span style={{
                    position: 'absolute', top: 10, right: 10,
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                    background: entita.active ? '#38a16920' : '#e53e3e20',
                    color: entita.active ? '#276749' : '#c53030',
                    backdropFilter: 'blur(4px)',
                    border: `1px solid ${entita.active ? '#38a16940' : '#e53e3e40'}`,
                  }}>
                    {entita.active ? 'Attivo' : 'Inattivo'}
                  </span>

                  {/* Logo */}
                  {entita.logo_url && (
                    <div style={{
                      position: 'absolute', bottom: -20, left: 16,
                      width: 44, height: 44, borderRadius: 10,
                      background: '#fff', padding: 4,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      overflow: 'hidden',
                    }}>
                      <img src={entita.logo_url} alt="logo"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div style={{ padding: entita.logo_url ? '28px 16px 16px' : '16px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                      background: cfg.bg, color: cfg.color,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      {cfg.label}
                    </span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{entita.name}</div>
                  {entita.address && (
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>{entita.address}</div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button
                      onClick={() => navigate(adminPath)}
                      style={{
                        flex: 1, padding: '8px 12px', background: '#1a1a2e', color: '#fff',
                        border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}
                    >
                      <Settings size={13} strokeWidth={2} color="#fff" />
                      Gestisci
                    </button>
                    <a
                      href={pwaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1, padding: '8px 12px', background: '#f5f5f5', color: '#1a1a2e',
                        border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        textDecoration: 'none',
                      }}
                    >
                      <Eye size={13} strokeWidth={2} color="#1a1a2e" />
                      Anteprima
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
