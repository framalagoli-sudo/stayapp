'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '../../../lib/api'
import { ShoppingBag, Plus, Trash2, Eye, EyeOff, Package, AlertCircle, ClipboardList, Users } from 'lucide-react'

const STATO_ORDINE = {
  in_attesa:      { label: 'In attesa',     color: '#b7791f', bg: '#fffbeb' },
  pagato:         { label: 'Pagato',         color: '#276749', bg: '#f0fff4' },
  in_lavorazione: { label: 'In lavorazione', color: '#2b6cb0', bg: '#ebf8ff' },
  spedito:        { label: 'Spedito',        color: '#6b46c1', bg: '#faf5ff' },
  consegnato:     { label: 'Consegnato',     color: '#276749', bg: '#f0fff4' },
  annullato:      { label: 'Annullato',      color: '#c53030', bg: '#fff5f5' },
}

// ⛔ Due domande, due risposte: **ho incassato?** e **è partito?**
//
// Un campo solo costringeva a scegliere quale delle due raccontare: scrivendo
// «spedito» si perdeva l'informazione sul pagamento, e un ordine in contrassegno
// non era rappresentabile affatto. È lo stesso motivo per cui Shopify tiene
// *Payment status* e *Fulfillment status* separati.
const PAGAMENTO = {
  non_pagato: { label: 'Non pagato', color: '#b7791f', bg: '#fffbeb' },
  pagato:     { label: 'Pagato',     color: '#276749', bg: '#f0fff4' },
  rimborsato: { label: 'Rimborsato', color: '#718096', bg: '#f7fafc' },
}
const EVASIONE = {
  da_evadere:     { label: 'Da evadere',     color: '#c05621', bg: '#fffaf0' },
  in_lavorazione: { label: 'In lavorazione', color: '#2b6cb0', bg: '#ebf8ff' },
  spedito:        { label: 'Spedito',        color: '#6b46c1', bg: '#faf5ff' },
  consegnato:     { label: 'Consegnato',     color: '#276749', bg: '#f0fff4' },
  annullato:      { label: 'Annullato',      color: '#c53030', bg: '#fff5f5' },
}

// ⚠️ Ripiego sul vecchio `stato` finché una risposta in cache non ha ancora le
// due colonne: meglio un'etichetta dedotta che una casella vuota.
const pagamentoDi = o => PAGAMENTO[o.pagamento_stato]
  || PAGAMENTO[['pagato', 'in_lavorazione', 'spedito', 'consegnato'].includes(o.stato) ? 'pagato' : 'non_pagato']
const evasioneDi = o => EVASIONE[o.evasione_stato]
  || EVASIONE[['in_lavorazione', 'spedito', 'consegnato', 'annullato'].includes(o.stato) ? o.stato : 'da_evadere']

const euro = n => `€${(Number(n) || 0).toFixed(2)}`

export default function ShopPage() {
  const router = useRouter()
  // Gli ordini per primi, come in Shopify: è la cosa che si guarda ogni
  // mattina. I prodotti si toccano una volta e restano lì.
  const [tab, setTab] = useState('ordini')
  const [prodotti, setProdotti] = useState([])
  const [ordini, setOrdini] = useState([])
  const [clienti, setClienti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroStato, setFiltroStato] = useState('')
  const [cerca, setCerca] = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch('/api/shop/prodotti'),
      apiFetch('/api/shop/ordini'),
      apiFetch('/api/shop/clienti'),
    ]).then(([p, o, c]) => { setProdotti(p); setOrdini(o); setClienti(Array.isArray(c) ? c : []); setLoading(false) })
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

  // La ricerca guarda numero, nome ed email: sono i tre modi in cui si cerca un
  // ordine quando il cliente telefona — «sono Rossi», «l'ordine 42», «vi ho
  // scritto da questa mail».
  const q = cerca.trim().toLowerCase()
  const ordiniFiltrati = ordini.filter(o => {
    if (filtroStato && evasioneDi(o) !== EVASIONE[filtroStato] && pagamentoDi(o) !== PAGAMENTO[filtroStato]) return false
    if (!q) return true
    return `#${o.numero}`.includes(q)
      || (o.nome_cliente || '').toLowerCase().includes(q)
      || (o.email_cliente || '').toLowerCase().includes(q)
  })

  const clientiFiltrati = clienti.filter(c => !q
    || (c.nome || '').toLowerCase().includes(q)
    || (c.email || '').toLowerCase().includes(q))

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
            {[
              { k: 'ordini', label: `Ordini${ordini.length ? ` (${ordini.length})` : ''}` },
              { k: 'prodotti', label: 'Prodotti' },
              { k: 'clienti', label: `Clienti${clienti.length ? ` (${clienti.length})` : ''}` },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)}
                style={{ padding: '5px 14px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: tab === t.k ? 600 : 400, background: tab === t.k ? '#fff' : 'transparent', color: tab === t.k ? '#1a1a2e' : '#888' }}>
                {t.label}
              </button>
            ))}
          </div>
          {/* ⚠️ I prodotti si caricano **in un posto solo**: i Prodotti. Qui c'era
              una seconda porta che scriveva nella vecchia tabella dello shop, e
              il risultato era che la stessa cosa poteva esistere due volte, in
              due posti che non si parlano. Lo shop mostra quello che è in
              vendita e raccoglie gli ordini; il catalogo sta altrove. */}
          {tab === 'prodotti' && (
            <button onClick={() => router.push('/admin/prodotti')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>
              <Plus size={16} strokeWidth={1.5} /> Aggiungi dai tuoi prodotti
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
                <p style={{ margin: 0, color: '#888' }}>Niente in vendita, per ora</p>
                <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                  I prodotti si caricano una volta sola nel tuo catalogo.<br />
                  Da lì accendi «Vendi» su quelli che vuoi mettere in vendita qui.
                </p>
                <button onClick={() => router.push('/admin/prodotti')}
                  style={{ marginTop: 16, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  Vai ai tuoi prodotti
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
              <input value={cerca} onChange={e => setCerca(e.target.value)}
                placeholder="Cerca per numero, nome o email…" aria-label="Cerca fra gli ordini"
                style={campoCerca} />

              {/* I filtri seguono le due domande, separate: prima «ho incassato?»,
                  poi «è partito?». Mescolarle in una fila sola è ciò che rendeva
                  impossibile chiedere «pagati ma ancora da spedire» — la
                  domanda che ci si fa ogni mattina. */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                <span style={etichettaFiltro}>Pagamento</span>
                <button onClick={() => setFiltroStato('')} style={pill(!filtroStato, { color: '#1a1a2e', bg: '#1a1a2e' }, !filtroStato)}>Tutti</button>
                {Object.entries(PAGAMENTO).map(([k, v]) => (
                  <button key={k} onClick={() => setFiltroStato(k)} style={pill(filtroStato === k, v)}>{v.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
                <span style={etichettaFiltro}>Evasione</span>
                {Object.entries(EVASIONE).map(([k, v]) => (
                  <button key={k} onClick={() => setFiltroStato(k)} style={pill(filtroStato === k, v)}>{v.label}</button>
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
                    const pag = pagamentoDi(o), eva = evasioneDi(o)
                    return (
                      <div key={o.id} onClick={() => router.push(`/admin/shop/ordini/${o.id}`)}
                        style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                        <div style={{ width: 46, textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>#{o.numero}</div>
                        </div>
                        {/* ⚠️ `minWidth: 0` e `overflowWrap`: nome ed email li scrive
                            chi compra, e una parola lunghissima allargherebbe la riga
                            oltre la scheda. */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{o.nome_cliente || o.email_cliente}</div>
                          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                            {new Date(o.created_at).toLocaleDateString('it-IT')} · {o.voci?.length || 0} {(o.voci?.length || 0) === 1 ? 'articolo' : 'articoli'}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                          {euro(o.totale)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, alignItems: 'flex-end' }}>
                          <span style={badge(pag)}>{pag.label}</span>
                          <span style={badge(eva)}>{eva.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Clienti ──────────────────────────────────────────────────────
              Chi ha comprato. Non è un'anagrafica da compilare: è la
              conseguenza degli ordini, come in Shopify. La persona esiste già
              nei Contatti, e da qui ci si arriva. */}
          {tab === 'clienti' && (
            <>
              <input value={cerca} onChange={e => setCerca(e.target.value)}
                placeholder="Cerca per nome o email…" aria-label="Cerca fra i clienti"
                style={campoCerca} />

              {clientiFiltrati.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>
                  <Users size={40} strokeWidth={1} style={{ marginBottom: 12 }} />
                  <p style={{ margin: 0 }}>{cerca ? 'Nessun cliente con questo nome' : 'Ancora nessun cliente'}</p>
                  {!cerca && <p style={{ margin: '6px 0 0', fontSize: 13 }}>Compariranno qui appena arriva il primo ordine.</p>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {clientiFiltrati.map(c => (
                    <div key={c.email}
                      style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{c.nome || c.email}</div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2, overflowWrap: 'anywhere' }}>
                          {c.email}{c.telefono ? ` · ${c.telefono}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', fontVariantNumeric: 'tabular-nums' }}>{euro(c.speso)}</div>
                        {/* «Speso» conta solo ciò che è stato incassato: è il numero
                            su cui si decide chi trattare bene, e dev'essere vero. */}
                        <div style={{ fontSize: 11.5, color: '#aaa' }}>
                          {c.ordini} {c.ordini === 1 ? 'ordine' : 'ordini'} · ultimo {new Date(c.ultimo_ordine).toLocaleDateString('it-IT')}
                        </div>
                      </div>
                      {c.contatto_id
                        ? <button onClick={() => router.push(`/admin/contatti?id=${c.contatto_id}`)} style={bottoneLink}>Scheda contatto →</button>
                        : <span style={{ fontSize: 11.5, color: '#bbb', flexShrink: 0 }}>non nei contatti</span>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── Stili ───────────────────────────────────────────────────────────────────
const campoCerca = {
  width: '100%', maxWidth: 380, padding: '9px 13px', border: '1px solid #ddd',
  borderRadius: 8, fontSize: 14, marginBottom: 14, boxSizing: 'border-box',
}
const etichettaFiltro = { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, width: 78, flexShrink: 0 }
const pill = (attivo, v) => ({
  padding: '5px 12px', border: '1px solid', borderColor: attivo ? v.color : '#ddd',
  borderRadius: 20, fontSize: 12, cursor: 'pointer',
  background: attivo ? (v.bg || '#1a1a2e') : '#fff',
  color: attivo ? v.color : '#555', fontWeight: attivo ? 700 : 400,
})
const badge = (v) => ({ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: v.bg, color: v.color, whiteSpace: 'nowrap' })
const bottoneLink = {
  padding: '6px 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff',
  cursor: 'pointer', fontSize: 12.5, color: '#1a1a2e', flexShrink: 0,
}
