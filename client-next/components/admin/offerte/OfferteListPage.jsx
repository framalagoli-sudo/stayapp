'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../context/AuthContext'
import { useAzienda } from '../../../context/AziendaContext'
import { apiFetch } from '../../../lib/api'
import { impegnoDi, postiRimasti } from '../../../lib/offerte-catalogo'
import { Tag, MapPin, Users, Plus, Calendar } from 'lucide-react'

// Tutto ciò che un cliente propone e che qualcuno può prendere. Come si chiama
// lo decide lui: qui non c'è un elenco di tipi da cui scegliere, ci sono campi
// liberi. Gli eventi restano una cosa a parte, con la loro voce di menu.

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
  const [creando, setCreando] = useState(false)
  const [sceltaAperta, setSceltaAperta] = useState(false)
  const [prodotti, setProdotti] = useState(null)   // null = non ancora chiesti

  // Per un super_admin è l'azienda scelta nella barra: senza filtro la GET
  // restituirebbe le offerte di tutte le aziende.
  const aziendaId = azienda?.id || profile?.azienda_id || activeAziendaId

  const entita = [
    ...(strutture || []).map(e => ({ ...e, tipo: 'struttura', etichetta: `Struttura: ${e.name}` })),
    ...(ristoranti || []).map(e => ({ ...e, tipo: 'ristorante', etichetta: `Ristorante: ${e.name}` })),
    ...(attivita || []).map(e => ({ ...e, tipo: 'attivita', etichetta: `Attività: ${e.name}` })),
  ]
  const nomeEntita = id => entita.find(e => e.id === id)?.name || null

  useEffect(() => {
    if (aziLoading) return
    apiFetch(`/api/offerte${aziendaId ? `?azienda_id=${aziendaId}` : ''}`)
      .then(d => setOfferte(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [aziendaId, aziLoading])

  // Un'offerta amplifica qualcosa. La prima domanda è quindi **cosa**: una cosa
  // che hai già, o una nuova? Senza questa domanda l'offerta nasceva staccata e
  // il legame col catalogo restava un campo sepolto nell'editor — due percorsi
  // separati invece di uno. Vedi `CATALOGO.md`.
  async function crea(prodotto = null) {
    if (creando) return
    setCreando(true)
    try {
      const nuova = await apiFetch('/api/offerte', {
        method: 'POST',
        body: JSON.stringify({
          titolo: prodotto?.titolo || 'Nuova offerta',
          prodotto_id: prodotto?.id || null,
          cover_url: prodotto?.copertina_url || null,
          prezzo: prodotto ? (Number(prodotto.valore_primario) || null) : null,
          azienda_id: aziendaId,
          // Con una sola entità si associa da sola: un'offerta «aziendale» per
          // distrazione comparirebbe sui siti di tutte.
          entity_id: prodotto?.entity_id || (entita.length === 1 ? entita[0].id : null),
          attiva: true, pubblicata: false,
        }),
      })
      router.push(`/admin/offerte/${nuova.id}`)
    } catch (e) {
      alert(e.message || 'Non sono riuscito a creare l\'offerta')
      setCreando(false)
    }
  }

  // Il catalogo, per la scelta «parti da un prodotto che hai già».
  async function apriScelta() {
    setSceltaAperta(true)
    if (prodotti !== null) return
    try {
      // I cataloghi sono appesi alle entità, non all'azienda: si passa di lì.
      const perEntita = await Promise.all(entita.map(async e => {
        const vetrine = await apiFetch(`/api/vetrine?entity_tipo=${e.tipo}&entity_id=${e.id}`).catch(() => [])
        const dentro = await Promise.all(
          (Array.isArray(vetrine) ? vetrine : []).map(async v => {
            const el = await apiFetch(`/api/vetrina-elementi?vetrina_id=${v.id}`).catch(() => [])
            return (Array.isArray(el) ? el : []).map(x => ({ ...x, vetrina: v.titolo, entity_id: e.id }))
          })
        )
        return dentro.flat()
      }))
      setProdotti(perEntita.flat())
    } catch { setProdotti([]) }
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
        <button onClick={apriScelta} disabled={creando}
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

      {/* La prima domanda: parti da qualcosa che hai già, o da zero.
          Senza, l'offerta nasceva staccata dal catalogo e sembravano due
          percorsi diversi per la stessa cosa. */}
      {sceltaAperta && (
        <div onClick={() => !creando && setSceltaAperta(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 620, width: '100%', maxHeight: '86vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 19 }}>Che cosa vuoi mettere in offerta?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>
              Un'offerta dura un periodo. Quello che promuovi resta nel tuo catalogo anche dopo.
            </p>

            {prodotti === null ? (
              <p style={{ color: '#888', fontSize: 14 }}>Carico il tuo catalogo…</p>
            ) : prodotti.length > 0 ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
                  Dai tuoi prodotti
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8, marginBottom: 22 }}>
                  {prodotti.map(p => (
                    <button key={p.id} disabled={creando} onClick={() => crea(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: '#f7f8fb', border: '1px solid #eceef4', borderRadius: 12, padding: '12px 14px', cursor: creando ? 'wait' : 'pointer', minWidth: 0 }}>
                      {p.copertina_url
                        ? <img src={p.copertina_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 44, height: 44, borderRadius: 8, background: '#e8ecf6', flexShrink: 0 }} />}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{p.titolo || 'Senza nome'}</div>
                        {p.vetrina && <div style={{ fontSize: 12, color: '#888', overflowWrap: 'anywhere' }}>{p.vetrina}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
                Non hai ancora prodotti in catalogo.{' '}
                <a href="/admin/prodotti" style={{ color: '#1a1a2e', fontWeight: 600 }}>Caricane uno →</a>
              </p>
            )}

            <div style={{ borderTop: '1px solid #eee', paddingTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button disabled={creando} onClick={() => crea(null)}
                style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: creando ? 'wait' : 'pointer' }}>
                {creando ? 'Creo…' : 'Crea qualcosa di nuovo'}
              </button>
              <button onClick={() => setSceltaAperta(false)}
                style={{ background: '#eee', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, cursor: 'pointer' }}>
                Annulla
              </button>
            </div>
          </div>
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
                    {impegnoDi(o.impegno).titolo}
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

    </div>
  )
}
