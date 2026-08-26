'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../context/AuthContext'
import { useAzienda } from '../../../context/AziendaContext'
import { apiFetch } from '../../../lib/api'
import { PRESET_PRONTI, modoDi, impegnoDi, postiRimasti } from '../../../lib/offerte-catalogo'
import { Tag, MapPin, Users, Plus, Calendar, X } from 'lucide-react'

// Tutto ciò che un cliente propone e che qualcuno può prendere: una serata, un
// tavolo, un corso, un'escursione, una cena da pagare in anticipo. Sono la
// stessa cosa configurata in modo diverso — vedi `lib/offerte-catalogo.js`.

function fmtData(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function stato(o) {
  if (!o.attiva) return { label: 'Disattiva', bg: '#f0f0f0', color: '#888' }
  if (!o.pubblicata) return { label: 'Bozza', bg: '#fff3cd', color: '#856404' }
  if (o.data_inizio && new Date(o.data_inizio) < new Date()) return { label: 'Conclusa', bg: '#f0f0f0', color: '#888' }
  return { label: 'Pubblicata', bg: '#d4edda', color: '#155724' }
}

export default function OfferteListPage() {
  const { profile } = useAuth()
  const { azienda, activeAziendaId, loading: aziLoading, strutture, ristoranti, attivita } = useAzienda()
  const router = useRouter()
  const [offerte, setOfferte] = useState([])
  const [loading, setLoading] = useState(true)
  const [sceltaAperta, setSceltaAperta] = useState(false)
  const [creando, setCreando] = useState(false)

  // Per un super_admin è l'azienda scelta nella barra: senza filtro la GET
  // restituirebbe le offerte di tutte le aziende.
  const aziendaId = azienda?.id || profile?.azienda_id || activeAziendaId

  const entita = [
    ...(strutture || []).map(e => ({ ...e, etichetta: `Struttura: ${e.name}` })),
    ...(ristoranti || []).map(e => ({ ...e, etichetta: `Ristorante: ${e.name}` })),
    ...(attivita || []).map(e => ({ ...e, etichetta: `Attività: ${e.name}` })),
  ]
  const nomeEntita = id => entita.find(e => e.id === id)?.name || null

  useEffect(() => {
    if (aziLoading) return
    apiFetch(`/api/offerte${aziendaId ? `?azienda_id=${aziendaId}` : ''}`)
      .then(d => setOfferte(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [aziendaId, aziLoading])

  // Il pannello manda solo la chiave del punto di partenza: modo, impegno e
  // soprattutto `origine` — che decide dove l'offerta compare sul sito — li
  // scrive il server leggendo il catalogo.
  async function creaDa(preset) {
    if (creando) return
    setCreando(true)
    try {
      const nuova = await apiFetch('/api/offerte', {
        method: 'POST',
        body: JSON.stringify({
          preset: preset.chiave, titolo: preset.titolo,
          azienda_id: aziendaId,
          // Con una sola entità si associa da sola: un'offerta «aziendale» per
          // distrazione comparirebbe sui siti di tutte.
          entity_id: entita.length === 1 ? entita[0].id : null,
          attiva: true, pubblicata: false,
        }),
      })
      router.push(`/admin/offerte/${nuova.id}`)
    } catch (e) {
      alert(e.message || 'Non sono riuscito a creare l\'offerta')
      setCreando(false)
    }
  }

  if (loading) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Offerte</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#888' }}>
            Tutto ciò che i tuoi clienti possono prenotare, richiedere o acquistare.
          </p>
        </div>
        <button onClick={() => setSceltaAperta(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          <Plus size={16} strokeWidth={2.5} /> Nuova offerta
        </button>
      </div>

      {offerte.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Tag size={40} strokeWidth={1} color="#ddd" style={{ marginBottom: 16 }} />
          <p style={{ margin: 0, color: '#888', fontSize: 15 }}>Nessuna offerta ancora. Creane una!</p>
        </div>
      )}

      {/* ⚠️ `minmax(0, 1fr)`: senza, la colonna si dimensiona sul contenuto e un
          titolo lungo — che è un dato del cliente — spinge i pulsanti fuori dalla
          scheda. Vale anche per `1fr`, che conserva il minimo automatico. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10 }}>
        {offerte.map(o => {
          const badge = stato(o)
          const rimasti = postiRimasti(o)
          const dove = nomeEntita(o.entity_id)
          return (
            <div key={o.id} onClick={() => router.push(`/admin/offerte/${o.id}`)}
              style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}>
              {o.cover_url
                ? <img src={o.cover_url} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 64, height: 64, borderRadius: 10, background: '#f0f4ff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Tag size={24} strokeWidth={1.5} color="#1a1a2e" />
                  </div>}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{o.titolo}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.color, flexShrink: 0 }}>{badge.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#888' }}>
                    {modoDi(o.modo).titolo} · {impegnoDi(o.impegno).titolo}
                  </span>
                  {o.data_inizio && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}>
                      <Calendar size={11} strokeWidth={1.5} /> {fmtData(o.data_inizio)}
                    </span>
                  )}
                  {o.luogo && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888', overflowWrap: 'anywhere' }}>
                      <MapPin size={11} strokeWidth={1.5} /> {o.luogo}
                    </span>
                  )}
                  {rimasti !== null && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#888' }}>
                      <Users size={11} strokeWidth={1.5} /> {rimasti} posti rimasti
                    </span>
                  )}
                </div>
                {dove && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4, overflowWrap: 'anywhere' }}>su {dove}</div>}
              </div>

              <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', flexShrink: 0 }}>
                {o.mostra_prezzo === false ? '—' : (o.prezzo_testo || (o.prezzo > 0 ? `€${o.prezzo}` : 'Gratis'))}
              </span>
            </div>
          )
        })}
      </div>

      {sceltaAperta && (
        <div onClick={() => !creando && setSceltaAperta(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 640, width: '100%', maxHeight: '86vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 19 }}>Che cosa vuoi proporre?</h3>
              <button onClick={() => setSceltaAperta(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} strokeWidth={1.5} color="#888" />
              </button>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>
              Scegli il punto di partenza. Potrai cambiare tutto dopo.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 190px), 1fr))', gap: 10 }}>
              {PRESET_PRONTI.map(p => (
                <button key={p.chiave} disabled={creando} onClick={() => creaDa(p)}
                  style={{ textAlign: 'left', background: '#f7f8fb', border: '1px solid #eceef4', borderRadius: 12, padding: '14px 16px', cursor: creando ? 'wait' : 'pointer', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 3, overflowWrap: 'anywhere' }}>{p.titolo}</div>
                  <div style={{ fontSize: 12, color: '#888', overflowWrap: 'anywhere' }}>{p.sotto}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
