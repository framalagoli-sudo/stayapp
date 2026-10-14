'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lightbulb, ChevronRight } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'

// «Cosa fare adesso»: i consigli che scattano dai dati (lib/consigli.js). Ne
// mostra pochi, perché un consiglio al giorno diventa rumore e smette di essere
// letto. «Non ora» lo toglie per due settimane, a chi lo preme.
const MASSIMO = 3
const PAUSA_GIORNI = 14

export default function Consigli() {
  const router = useRouter()
  const { profile } = useAuth()
  const { azienda, activeAziendaId } = useAzienda()
  const aziendaId = profile?.role === 'super_admin' ? (azienda?.id || activeAziendaId) : profile?.azienda_id
  const [consigli, setConsigli] = useState(null)
  const [pausa, setPausa] = useState({})
  const chiavePausa = `consigli_pausa_${aziendaId}`

  useEffect(() => {
    if (!aziendaId) return
    try { setPausa(JSON.parse(localStorage.getItem(chiavePausa) || '{}')) } catch {}
    const q = profile?.role === 'super_admin' ? `?azienda_id=${aziendaId}` : ''
    apiFetch(`/api/consigli${q}`).then(d => setConsigli(d.consigli || [])).catch(() => setConsigli([]))
  }, [aziendaId]) // eslint-disable-line

  if (!profile || !['admin_azienda', 'super_admin'].includes(profile.role) || !aziendaId || !consigli) return null
  const adesso = Date.now()
  const visibili = consigli.filter(c => !(pausa[c.chiave] > adesso)).slice(0, MASSIMO)
  if (!visibili.length) return null

  function nonOra(chiave) {
    const nuova = { ...pausa, [chiave]: adesso + PAUSA_GIORNI * 864e5 }
    setPausa(nuova)
    try { localStorage.setItem(chiavePausa, JSON.stringify(nuova)) } catch {}
  }

  return (
    <section data-consigli style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: '18px 20px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <Lightbulb size={20} strokeWidth={1.5} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>Cosa fare adesso</h3>
          <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>I consigli di Francesco, sui numeri della tua attività.</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10 }}>
        {visibili.map(c => (
          <article key={c.chiave} data-consiglio={c.chiave} style={{ border: '1px solid #eee', background: '#fafafa', borderRadius: 12, padding: '14px 16px' }}>
            {c.bozza && (
              <div data-bozza style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fef3c7', borderRadius: 6, padding: '2px 8px', marginBottom: 8 }}>
                Bozza: la vedi solo tu, il cliente no
              </div>
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{c.titolo}</div>
            <p style={{ fontSize: 13.5, color: '#444', lineHeight: 1.5, margin: '6px 0 12px' }}>{c.perche}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" data-azione onClick={() => router.push(c.azione.link)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {c.azione.testo} <ChevronRight size={15} strokeWidth={1.5} color="#fff" />
              </button>
              <a href={`mailto:info@oltrenova.com?subject=${encodeURIComponent(`Un consiglio: ${c.titolo}`)}`}
                style={{ fontSize: 13, color: '#1a1a2e', fontWeight: 600 }}>
                Ne parliamo?
              </a>
              <button type="button" data-non-ora onClick={() => nonOra(c.chiave)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#666', fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline' }}>
                Non ora
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
