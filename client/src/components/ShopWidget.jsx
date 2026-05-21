import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../lib/api'
import { useCarrello } from '../context/CarrelloContext'
import { injectJsonLd, buildProductsSchema } from '../lib/geoSchema'
import { ShoppingCart, Plus, Minus, X, ArrowRight, Package, Gift } from 'lucide-react'

export default function ShopWidget({ aziendaId, primaryColor = '#1a1a2e' }) {
  const [prodotti, setProdotti] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoriaAttiva, setCat] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [checkout, setCheckout] = useState(false)

  // form checkout
  const [nome, setNome]     = useState('')
  const [email, setEmail]   = useState('')
  const [tel, setTel]       = useState('')
  const [via, setVia]       = useState('')
  const [cap, setCap]       = useState('')
  const [citta, setCitta]   = useState('')
  const [note, setNote]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]     = useState(false)
  const [errore, setErrore] = useState('')

  // loyalty
  const [loyaltySaldo, setLoyaltySaldo] = useState(null)
  const [usaPunti, setUsaPunti]         = useState(false)
  const [giftCard, setGiftCard]         = useState('')
  const [gcInfo, setGcInfo]             = useState(null)
  const [gcErrore, setGcErrore]         = useState('')
  const loyaltyTimer = useRef(null)

  const { voci, totale, count, aggiungi, rimuovi, aggiorna, svuota } = useCarrello()

  useEffect(() => {
    if (!aziendaId) return
    apiFetch(`/api/shop/public/${aziendaId}/prodotti`)
      .then(data => {
        setProdotti(data)
        if (Array.isArray(data) && data.length) {
          injectJsonLd('ld-products', buildProductsSchema(data, document.title))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => document.getElementById('ld-products')?.remove()
  }, [aziendaId])

  // Fetch loyalty saldo when email changes (debounced 600ms)
  useEffect(() => {
    clearTimeout(loyaltyTimer.current)
    if (!email || !email.includes('@')) { setLoyaltySaldo(null); setUsaPunti(false); return }
    loyaltyTimer.current = setTimeout(() => {
      apiFetch(`/api/loyalty/public/${aziendaId}/saldo?email=${encodeURIComponent(email)}`)
        .then(d => setLoyaltySaldo(d))
        .catch(() => setLoyaltySaldo(null))
    }, 600)
  }, [email, aziendaId])

  async function verificaGiftCard() {
    if (!giftCard.trim()) return
    setGcErrore('')
    try {
      const d = await apiFetch(`/api/loyalty/public/${aziendaId}/gift-card?codice=${encodeURIComponent(giftCard)}`)
      setGcInfo(d)
    } catch (e) { setGcErrore(e.message || 'Codice non valido'); setGcInfo(null) }
  }

  const scontoLoyalty = usaPunti && loyaltySaldo?.saldo_euro > 0 ? loyaltySaldo.saldo_euro : 0
  const scontoGc      = gcInfo ? Math.min(gcInfo.valore_residuo, Math.max(0, totale - scontoLoyalty)) : 0
  const totaleFinale  = Math.max(0, totale - scontoLoyalty - scontoGc)

  const categorie = [...new Set(prodotti.map(p => p.categoria).filter(Boolean))]
  const filtrati = categoriaAttiva ? prodotti.filter(p => p.categoria === categoriaAttiva) : prodotti

  async function handleCheckout() {
    if (!email.trim()) { setErrore('Email obbligatoria'); return }
    setSubmitting(true); setErrore('')
    try {
      const data = await apiFetch(`/api/shop/public/${aziendaId}/ordine`, {
        method: 'POST',
        body: JSON.stringify({
          email_cliente: email, nome_cliente: nome, telefono_cliente: tel,
          indirizzo: { via, cap, citta }, voci, note_cliente: note,
          punti_da_usare: usaPunti ? (loyaltySaldo?.saldo || 0) : 0,
          codice_gift_card: gcInfo ? giftCard.trim().toUpperCase() : '',
        }),
      })
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        svuota(); setDone(true)
      }
    } catch (e) { setErrore(e.message) }
    setSubmitting(false)
  }

  if (loading) return null
  if (!prodotti.length) return null

  return (
    <div style={{ padding: '48px 0' }}>
      {/* Sezione header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#1a1a2e' }}>Shop</h2>
        {count > 0 && (
          <button onClick={() => setCartOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: primaryColor, color: '#fff', border: 'none', borderRadius: 24, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
            <ShoppingCart size={18} strokeWidth={1.5} />
            Carrello ({count}) — €{totale.toFixed(2)}
          </button>
        )}
      </div>

      {/* Filtri categoria */}
      {categorie.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          <button onClick={() => setCat('')}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', borderColor: !categoriaAttiva ? primaryColor : '#ddd', background: !categoriaAttiva ? primaryColor : '#fff', color: !categoriaAttiva ? '#fff' : '#555', fontSize: 13, cursor: 'pointer' }}>
            Tutti
          </button>
          {categorie.map(c => (
            <button key={c} onClick={() => setCat(c)}
              style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid', borderColor: categoriaAttiva === c ? primaryColor : '#ddd', background: categoriaAttiva === c ? primaryColor : '#fff', color: categoriaAttiva === c ? '#fff' : '#555', fontSize: 13, cursor: 'pointer' }}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Grid prodotti */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
        {filtrati.map(p => {
          const inCart = voci.find(v => v.prodotto_id === p.id)
          const prezzoMostrato = p.prezzo_scontato ?? p.prezzo
          return (
            <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {p.immagini?.[0] ? (
                <img src={p.immagini[0]} alt={p.nome} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: 180, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={40} strokeWidth={1} color="#ccc" />
                </div>
              )}
              <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 6 }}>{p.nome}</div>
                {p.descrizione && <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5, marginBottom: 10, flex: 1 }}>{p.descrizione}</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <div>
                    <span style={{ fontSize: 17, fontWeight: 700, color: primaryColor }}>€{Number(prezzoMostrato).toFixed(2)}</span>
                    {p.prezzo_scontato && (
                      <span style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through', marginLeft: 6 }}>€{Number(p.prezzo).toFixed(2)}</span>
                    )}
                  </div>
                  {p.stock === 0 ? (
                    <span style={{ fontSize: 12, color: '#aaa' }}>Esaurito</span>
                  ) : inCart ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => aggiorna(p.id, inCart.qty - 1)}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Minus size={12} strokeWidth={2.5} />
                      </button>
                      <span style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: 'center' }}>{inCart.qty}</span>
                      <button onClick={() => aggiungi(p, 1)}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: primaryColor, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => aggiungi(p, 1)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: primaryColor, color: '#fff', border: 'none', borderRadius: 20, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      <Plus size={14} strokeWidth={2} /> Aggiungi
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Drawer carrello */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex' }}>
          <div onClick={() => setCartOpen(false)} style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ width: '100%', maxWidth: 420, background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)' }}>
            {/* Header carrello */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #eee' }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Il tuo carrello ({count})</div>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} strokeWidth={1.5} color="#555" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {!checkout ? (
                // Lista voci
                voci.length === 0 ? (
                  <p style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>Carrello vuoto</p>
                ) : (
                  voci.map(v => (
                    <div key={v.prodotto_id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f5f5f5' }}>
                      {v.immagine ? <img src={v.immagine} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} /> : <div style={{ width: 56, height: 56, background: '#f5f5f5', borderRadius: 8 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{v.nome}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => aggiorna(v.prodotto_id, v.qty - 1)} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Minus size={10} strokeWidth={2.5} />
                          </button>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{v.qty}</span>
                          <button onClick={() => aggiorna(v.prodotto_id, v.qty + 1)} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: primaryColor, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Plus size={10} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>€{(v.prezzo * v.qty).toFixed(2)}</div>
                      <button onClick={() => rimuovi(v.prodotto_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc' }}>
                        <X size={14} strokeWidth={2} />
                      </button>
                    </div>
                  ))
                )
              ) : done ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Ordine ricevuto!</div>
                  <p style={{ color: '#666', fontSize: 14 }}>Riceverai una conferma via email. Ti contatteremo per i dettagli del pagamento.</p>
                  <button onClick={() => { setCartOpen(false); setCheckout(false); setDone(false) }}
                    style={{ marginTop: 16, background: primaryColor, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 600 }}>
                    Chiudi
                  </button>
                </div>
              ) : (
                // Form checkout
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>I tuoi dati</div>
                  {[
                    { label: 'Nome e cognome', val: nome, set: setNome, placeholder: 'Mario Rossi' },
                    { label: 'Email *', val: email, set: setEmail, placeholder: 'mario@esempio.it', type: 'email' },
                    { label: 'Telefono', val: tel, set: setTel, placeholder: '+39 …', type: 'tel' },
                  ].map(f => (
                    <div key={f.label}>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 3 }}>{f.label}</label>
                      <input type={f.type || 'text'} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                        style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                  ))}
                  <div style={{ fontWeight: 700, fontSize: 15, margin: '8px 0 4px' }}>Indirizzo di spedizione (opzionale)</div>
                  {[
                    { label: 'Via e numero', val: via, set: setVia },
                    { label: 'CAP', val: cap, set: setCap },
                    { label: 'Città', val: citta, set: setCitta },
                  ].map(f => (
                    <div key={f.label}>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 3 }}>{f.label}</label>
                      <input value={f.val} onChange={e => f.set(e.target.value)}
                        style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 3 }}>Note (opzionale)</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                      style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  </div>

                  {/* Loyalty block — shown only if programme is active */}
                  {loyaltySaldo?.programma && (
                    <div style={{ background: '#f9f5ff', borderRadius: 10, padding: '12px 14px', border: '1px solid #e9d8fd' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#553c9a', marginBottom: 8 }}>
                        <Gift size={14} strokeWidth={1.5} color="#553c9a" /> Programma fedeltà
                      </div>
                      {loyaltySaldo.saldo > 0 ? (
                        loyaltySaldo.saldo_euro > 0 ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                            <input type="checkbox" checked={usaPunti} onChange={e => setUsaPunti(e.target.checked)} />
                            Usa {loyaltySaldo.saldo} punti (−€{loyaltySaldo.saldo_euro.toFixed(2)})
                          </label>
                        ) : (
                          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                            Hai {loyaltySaldo.saldo} punti — servono {loyaltySaldo.programma.soglia_riscatto} per riscattare
                          </p>
                        )
                      ) : (
                        <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Nessun punto accumulato con questa email</p>
                      )}
                    </div>
                  )}

                  {/* Gift card */}
                  <div>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 3 }}>Codice gift card (opzionale)</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={giftCard} onChange={e => { setGiftCard(e.target.value.toUpperCase()); setGcInfo(null); setGcErrore('') }}
                        placeholder="ES: WELCOME50"
                        style={{ flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} />
                      <button type="button" onClick={verificaGiftCard}
                        style={{ padding: '8px 14px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                        Verifica
                      </button>
                    </div>
                    {gcInfo && <p style={{ fontSize: 12, color: '#2f855a', margin: '4px 0 0' }}>Saldo disponibile: €{Number(gcInfo.valore_residuo).toFixed(2)}</p>}
                    {gcErrore && <p style={{ fontSize: 12, color: '#c53030', margin: '4px 0 0' }}>{gcErrore}</p>}
                  </div>

                  {errore && <p style={{ color: '#c53030', fontSize: 13, margin: 0 }}>{errore}</p>}
                </div>
              )}
            </div>

            {/* Footer carrello */}
            {!done && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid #eee' }}>
                {!checkout ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontWeight: 700, fontSize: 16 }}>
                      <span>Totale</span><span>€{totale.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setCheckout(true)} disabled={voci.length === 0}
                      style={{ width: '100%', padding: '12px 0', background: voci.length ? primaryColor : '#ccc', color: '#fff', border: 'none', borderRadius: 10, cursor: voci.length ? 'pointer' : 'default', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      Procedi all'ordine <ArrowRight size={18} strokeWidth={2} />
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Subtotale</span><span>€{totale.toFixed(2)}</span>
                      </div>
                      {scontoLoyalty > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#553c9a' }}>
                          <span>Sconto punti</span><span>−€{scontoLoyalty.toFixed(2)}</span>
                        </div>
                      )}
                      {scontoGc > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2f855a' }}>
                          <span>Gift card</span><span>−€{scontoGc.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontWeight: 700, fontSize: 16 }}>
                      <span>Totale</span><span>€{totaleFinale.toFixed(2)}</span>
                    </div>
                    <button onClick={handleCheckout} disabled={submitting}
                      style={{ width: '100%', padding: '12px 0', background: submitting ? '#ccc' : primaryColor, color: '#fff', border: 'none', borderRadius: 10, cursor: submitting ? 'default' : 'pointer', fontWeight: 700, fontSize: 15 }}>
                      {submitting ? 'Invio…' : 'Conferma ordine'}
                    </button>
                    <button onClick={() => { setCheckout(false); setErrore('') }}
                      style={{ width: '100%', marginTop: 8, padding: '10px 0', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13 }}>
                      ← Torna al carrello
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
