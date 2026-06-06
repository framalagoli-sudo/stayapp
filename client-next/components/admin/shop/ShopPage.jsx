'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '../../../lib/api'
import { ShoppingBag, Plus, Trash2, Eye, EyeOff, Package, AlertCircle, ClipboardList } from 'lucide-react'

const STATO_ORDINE = {
  in_attesa:      { label: 'In attesa',     color: '#b7791f', bg: '#fffbeb' },
  pagato:         { label: 'Pagato',         color: '#276749', bg: '#f0fff4' },
  in_lavorazione: { label: 'In lavorazione', color: '#2b6cb0', bg: '#ebf8ff' },
  spedito:        { label: 'Spedito',        color: '#6b46c1', bg: '#faf5ff' },
  consegnato:     { label: 'Consegnato',     color: '#276749', bg: '#f0fff4' },
  annullato:      { label: 'Annullato',      color: '#c53030', bg: '#fff5f5' },
}

export default function ShopPage() {
  const router = useRouter()
  const [tab, setTab] = useState('prodotti')
  const [prodotti, setProdotti] = useState([])
  const [ordini, setOrdini] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroStato, setFiltroStato] = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch('/api/shop/prodotti'),
      apiFetch('/api/shop/ordini'),
    ]).then(([p, o]) => { setProdotti(p); setOrdini(o); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  async function toggleAttivo(p) {
    try {
      const updated = await apiFetch(`/api/shop/prodotti/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ attivo: !p.attivo }),
      })
      setProdotti(prev => prev.map(x => x.id === updated.id ? updated : x))
    } catch (e) { setError(e.message) }
  }

  async function deleteProdotto(id) {
    if (!confirm('Eliminare questo prodotto?')) return
    try {
      await apiFetch(`/api/shop/prodotti/${id}`, { method: 'DELETE' })
      setProdotti(prev => prev.filter(p => p.id !== id))
    } catch (e) { setError(e.message) }
  }

  const ordiniFiltrati = filtroStato ? ordini.filter(o => o.stato === filtroStato) : ordini

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShoppingBag size={22} strokeWidth={1.5} color="#1a1a2e" />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Shop</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 8, padding: 2 }}>
            {[{ k: 'prodotti', label: 'Prodotti' }, { k: 'ordini', label: `Ordini${ordini.length ? ` (${ordini.length})` : ''}` }].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)}
                style={{ padding: '5px 14px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: tab === t.k ? 600 : 400, background: tab === t.k ? '#fff' : 'transparent', color: tab === t.k ? '#1a1a2e' : '#888' }}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'prodotti' && (
            <button onClick={() => router.push('/admin/shop/nuovo')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>
              <Plus size={16} strokeWidth={1.5} /> Nuovo prodotto
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle size={16} strokeWidth={1.5} /> {error}
        </div>
      )}

      {loading ? <p style={{ color: '#888' }}>Caricamento…</p> : (
        <>
          {/* ── Tab Prodotti ── */}
          {tab === 'prodotti' && (
            prodotti.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>
                <Package size={40} strokeWidth={1} style={{ marginBottom: 12 }} />
                <p style={{ margin: 0 }}>Nessun prodotto ancora</p>
                <button onClick={() => router.push('/admin/shop/nuovo')}
                  style={{ marginTop: 16, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  Crea il primo prodotto
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {prodotti.map(p => (
                  <div key={p.id} onClick={() => router.push(`/admin/shop/${p.id}`)}
                    style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                    {/* Miniatura */}
                    {p.immagini?.[0] ? (
                      <img src={p.immagini[0]} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, background: '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Package size={20} strokeWidth={1.5} color="#ccc" />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{p.nome || '(senza nome)'}</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                        {p.categoria && <span style={{ marginRight: 8 }}>{p.categoria}</span>}
                        {p.stock !== null && <span>Stock: {p.stock}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {p.prezzo_scontato ? (
                        <>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>€{Number(p.prezzo_scontato).toFixed(2)}</div>
                          <div style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through' }}>€{Number(p.prezzo).toFixed(2)}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>€{Number(p.prezzo).toFixed(2)}</div>
                      )}
                    </div>
                    <button onClick={e => { e.stopPropagation(); toggleAttivo(p) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: p.attivo ? '#276749' : '#aaa' }}>
                      {p.attivo ? <Eye size={15} strokeWidth={1.5} /> : <EyeOff size={15} strokeWidth={1.5} />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteProdotto(p.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#ddd' }}>
                      <Trash2 size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Tab Ordini ── */}
          {tab === 'ordini' && (
            <>
              {/* Filtro stato */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                <button onClick={() => setFiltroStato('')}
                  style={{ padding: '5px 12px', border: '1px solid', borderColor: !filtroStato ? '#1a1a2e' : '#ddd', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: !filtroStato ? '#1a1a2e' : '#fff', color: !filtroStato ? '#fff' : '#555' }}>
                  Tutti
                </button>
                {Object.entries(STATO_ORDINE).map(([k, v]) => (
                  <button key={k} onClick={() => setFiltroStato(k)}
                    style={{ padding: '5px 12px', border: '1px solid', borderColor: filtroStato === k ? v.color : '#ddd', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: filtroStato === k ? v.bg : '#fff', color: filtroStato === k ? v.color : '#555', fontWeight: filtroStato === k ? 700 : 400 }}>
                    {v.label}
                  </button>
                ))}
              </div>

              {ordiniFiltrati.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>
                  <ClipboardList size={40} strokeWidth={1} style={{ marginBottom: 12 }} />
                  <p style={{ margin: 0 }}>Nessun ordine{filtroStato ? ' con questo stato' : ''}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ordiniFiltrati.map(o => {
                    const st = STATO_ORDINE[o.stato] || { label: o.stato, color: '#666', bg: '#f5f5f5' }
                    return (
                      <div key={o.id} onClick={() => router.push(`/admin/shop/ordini/${o.id}`)}
                        style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                        <div style={{ width: 40, textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>#{o.numero}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{o.nome_cliente || o.email_cliente}</div>
                          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                            {new Date(o.created_at).toLocaleDateString('it-IT')} · {o.voci?.length || 0} prodotti
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', flexShrink: 0 }}>
                          €{Number(o.totale).toFixed(2)}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: st.bg, color: st.color, flexShrink: 0 }}>
                          {st.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
