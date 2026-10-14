'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Compass, ChevronRight } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { TIPI } from '@/lib/club-regole'

// «Oggi per te» dal Club: una o due cose del giorno, uguali per chi fa lo stesso
// mestiere. Se il Club non ha niente da dire oggi, il riquadro non c'è.
export const COLORE_TIPO = { occasione: '#b45309', strategia: '#1d4ed8', focus: '#6b21a8' }

// Il primo paragrafo, senza formattazione: nella carta basta l'attacco.
export const attacco = testo => String(testo || '').split(/\n\s*\n/)[0].replace(/<[^>]*>/g, '').slice(0, 220)

export function segnaGesto(id, gesto) {
  const chiave = `club_${gesto}_${id}`
  try { if (sessionStorage.getItem(chiave)) return; sessionStorage.setItem(chiave, '1') } catch {}
  apiFetch(`/api/club/${id}/gesto`, { method: 'POST', body: JSON.stringify({ gesto }) }).catch(() => {})
}

export default function ClubOggi() {
  const router = useRouter()
  const { profile } = useAuth()
  const { azienda, activeAziendaId } = useAzienda()
  const superAdmin = profile?.role === 'super_admin'
  const aziendaId = superAdmin ? (azienda?.id || activeAziendaId) : profile?.azienda_id
  const [oggi, setOggi] = useState(null)

  useEffect(() => {
    if (!profile || !['admin_azienda', 'super_admin'].includes(profile.role)) return
    const q = superAdmin && aziendaId ? `?azienda_id=${aziendaId}` : ''
    apiFetch(`/api/club${q}`).then(d => setOggi(d.oggi || [])).catch(() => setOggi([]))
  }, [profile?.role, aziendaId]) // eslint-disable-line

  useEffect(() => { (oggi || []).forEach(c => segnaGesto(c.id, 'visto')) }, [oggi])

  if (!oggi) return null
  if (!oggi.length) {
    if (!superAdmin) return null
    return (
      <button type="button" data-club-regia onClick={() => router.push('/admin/club')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, background: '#fff', border: '1px dashed #ccc', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#1a1a2e', cursor: 'pointer' }}>
        <Compass size={16} strokeWidth={1.5} color="#1a1a2e" /> Club: oggi non c'è niente in vetrina. Apri la regia
      </button>
    )
  }

  return (
    <section data-club-oggi style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: '18px 20px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Compass size={20} strokeWidth={1.5} color="#1a1a2e" style={{ flexShrink: 0 }} />
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>Oggi per te, dal Club</h3>
            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>Occasioni e strategie scelte da OltreNova per la tua attività.</div>
          </div>
        </div>
        <button type="button" onClick={() => router.push('/admin/club')}
          style={{ background: 'none', border: 'none', color: '#1a1a2e', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
          Tutto il Club <ChevronRight size={15} strokeWidth={1.5} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        {oggi.map(c => (
          <article key={c.id} data-club-contenuto={c.id} style={{ border: '1px solid #eee', background: '#fafafa', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORE_TIPO[c.tipo], textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {TIPI[c.tipo]?.nome}{c.quando ? ` · ${c.quando}` : ''}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{c.titolo}</div>
            {c.testo && <p style={{ margin: 0, fontSize: 13.5, color: '#444', lineHeight: 1.5 }}>{attacco(c.testo)}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 6 }}>
              {c.azione && (
                <button type="button" data-azione onClick={() => { segnaGesto(c.id, 'clic'); router.push(c.azione.link) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {c.azione.testo} <ChevronRight size={15} strokeWidth={1.5} color="#fff" />
                </button>
              )}
              <button type="button" data-leggi onClick={() => router.push(`/admin/club?apri=${c.id}`)}
                style={{ background: 'none', border: 'none', color: '#1a1a2e', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                Leggi tutto
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
