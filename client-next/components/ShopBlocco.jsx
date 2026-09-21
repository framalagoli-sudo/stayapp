'use client'
import { useEffect, useRef, useState } from 'react'
import { ShoppingCart, Plus, Minus, X, ArrowRight, Package, Gift } from 'lucide-react'
import { guestFetch } from '@/lib/api'
import { injectJsonLd, buildProductsSchema } from '@/lib/geoSchema'
import { formatoValido, rapportoDi, focalValido } from '@/lib/formati-foto'
import { TESTO_CONSENSO_ORDINE } from '@/lib/consenso-ordine'

// Il catalogo dello shop dentro un sito: schede, carrello, ordine.
//
// ⛔ Fino al 15/09/2026 non c'era: `ShopWidget` esisteva ma nessun blocco lo
// montava, quindi un cliente poteva caricare prodotti e collegare i pagamenti
// senza che un visitatore potesse mai comprare niente.
//
// Il blocco lo apre `LandingBlockRenderer` con la sua <section> e il titolo,
// come tutti gli altri — così eredita sfondo, spaziatura e animazioni scelte
// nell'editor. Qui dentro sta solo quello che ha bisogno del browser.
//
// ⚠️ Le schede sono volutamente IDENTICHE a quelle del blocco Offerte (raggio,
// ombra, spaziature, categoria, prezzo): è un sito, non un negozio incollato
// dentro un sito.
//
// Tre difetti del vecchio componente, corretti qui:
//   · il carrello stava sotto la chiave `oltrenova_cart`, uguale per TUTTI i
//     siti serviti da oltrenova.com: i prodotti di un cliente comparivano nel
//     carrello del sito di un altro. Ora la chiave è per azienda;
//   · il modulo raccoglieva nome, email, telefono e indirizzo senza chiedere il
//     consenso (il controllo vero sta nella route, qui c'è la spunta);
//   · il carrello si leggeva durante il render, cosa che sul server non esiste.
// `prodotti` li carica il renderer: così, se non c'è niente in vendita, il
// blocco sparisce del tutto invece di lasciare un titolo sopra il vuoto.
export default function ShopBlocco({ aziendaId, prodotti = [], primary, heading, categoria = '', formato = '', privacyUrl }) {
  const [voci, setVoci] = useState([])
  const [aperto, setAperto] = useState(false)
  const [passo, setPasso] = useState('carrello')   // carrello | dati | fatto
  const chiave = `oltrenova_carrello_${aziendaId}`
  const letto = useRef(false)

  // dati
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [tel, setTel] = useState('')
  const [via, setVia] = useState('')
  const [cap, setCap] = useState('')
  const [citta, setCitta] = useState('')
  const [note, setNote] = useState('')
  const [privacy, setPrivacy] = useState(false)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState('')

  // fedeltà e gift card (esistevano già nel vecchio componente)
  const [saldo, setSaldo] = useState(null)
  const [usaPunti, setUsaPunti] = useState(false)
  const [codiceGc, setCodiceGc] = useState('')
  const [gc, setGc] = useState(null)
  const [erroreGc, setErroreGc] = useState('')
  const timerSaldo = useRef(null)

  // I dati strutturati dei prodotti: servono ai motori per capire che qui si
  // vende qualcosa, e a che prezzo.
  useEffect(() => {
    if (prodotti.length) injectJsonLd('ld-products', buildProductsSchema(prodotti, document.title))
    return () => document.getElementById('ld-products')?.remove()
  }, [prodotti])

  // Il carrello si legge DOPO il primo render: il server non ha localStorage.
  useEffect(() => {
    try { setVoci(JSON.parse(localStorage.getItem(chiave) || '[]')) } catch { setVoci([]) }
    letto.current = true
  }, [chiave])
  useEffect(() => {
    if (!letto.current) return
    try { localStorage.setItem(chiave, JSON.stringify(voci)) } catch {}
  }, [voci, chiave])

  // ⛔ Col banner dei cookie aperto, il fondo del carrello — «Procedi
  // all'ordine», «Conferma ordine» — finiva SOTTO il banner: alla prima visita
  // non si poteva completare un ordine, e il pulsante sembrava rotto. Il banner
  // sta sopra a tutto di proposito, quindi è il carrello a lasciargli spazio,
  // finché c'è. Si ricontrolla mentre il carrello è aperto: il visitatore può
  // rispondere al banner in qualunque momento.
  const [spazioBanner, setSpazioBanner] = useState(0)
  useEffect(() => {
    if (!aperto) return
    const misura = () => setSpazioBanner(document.querySelector('[data-cookie-banner]')?.offsetHeight || 0)
    misura()
    const t = setInterval(misura, 500)
    return () => clearInterval(t)
  }, [aperto])

  useEffect(() => {
    clearTimeout(timerSaldo.current)
    if (!email.includes('@')) { setSaldo(null); setUsaPunti(false); return }
    timerSaldo.current = setTimeout(() => {
      guestFetch(`/api/loyalty/public/${aziendaId}/saldo?email=${encodeURIComponent(email)}`)
        .then(setSaldo).catch(() => setSaldo(null))
    }, 600)
  }, [email, aziendaId])

  const cat = categoria.trim().toLowerCase()
  const mostrati = cat ? prodotti.filter(p => (p.categoria || '').trim().toLowerCase() === cat) : prodotti
  if (!mostrati.length) return null

  const quanti = voci.reduce((n, v) => n + v.qty, 0)
  const totale = voci.reduce((n, v) => n + v.prezzo * v.qty, 0)
  const scontoPunti = usaPunti && saldo?.saldo_euro > 0 ? saldo.saldo_euro : 0
  const scontoGc = gc ? Math.min(gc.valore_residuo, Math.max(0, totale - scontoPunti)) : 0
  const totaleFinale = Math.max(0, totale - scontoPunti - scontoGc)

  const scorta = id => prodotti.find(p => p.id === id)?.stock ?? null
  function aggiungi(p) {
    setVoci(prev => {
      const i = prev.findIndex(v => v.prodotto_id === p.id)
      if (i >= 0) return prev.map((v, k) => k === i ? { ...v, qty: v.qty + 1 } : v)
      return [...prev, { prodotto_id: p.id, nome: p.nome, prezzo: Number(p.prezzo_scontato ?? p.prezzo) || 0, immagine: p.immagini?.[0] || '', qty: 1 }]
    })
  }
  function cambia(id, qty) {
    setVoci(prev => qty <= 0 ? prev.filter(v => v.prodotto_id !== id) : prev.map(v => v.prodotto_id === id ? { ...v, qty } : v))
  }

  async function verificaGc() {
    if (!codiceGc.trim()) return
    setErroreGc('')
    try { setGc(await guestFetch(`/api/loyalty/public/${aziendaId}/gift-card?codice=${encodeURIComponent(codiceGc)}`)) }
    catch { setErroreGc('Codice non valido'); setGc(null) }
  }

  async function ordina() {
    if (!email.trim()) { setErrore('Serve l’email: è lì che arriva la conferma dell’ordine.'); return }
    if (!privacy) { setErrore('Per ordinare serve accettare l’informativa sulla privacy.'); return }
    setInvio(true); setErrore('')
    try {
      // `fetch` e non `guestFetch`: qui il motivo del rifiuto va mostrato a chi
      // compra («ne restano solo 2»), e guestFetch restituirebbe solo il codice.
      const r = await fetch(`/api/shop/public/${aziendaId}/ordine`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_cliente: email, nome_cliente: nome, telefono_cliente: tel,
          indirizzo: { via, cap, citta }, voci, note_cliente: note,
          punti_da_usare: usaPunti ? (saldo?.saldo || 0) : 0,
          codice_gift_card: gc ? codiceGc.trim().toUpperCase() : '',
          privacy_accettata: privacy === true,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Non è stato possibile inviare l’ordine. Riprova.')
      if (d.checkout_url) { window.location.href = d.checkout_url; return }
      setVoci([]); setPasso('fatto')
    } catch (e) { setErrore(e.message) }
    setInvio(false)
  }

  const fmt = n => `€${Number(n).toFixed(2)}`
  const forma = formatoValido(formato)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 20 }}>
        {mostrati.map(p => {
          const nelCarrello = voci.find(v => v.prodotto_id === p.id)
          const esaurito = p.stock !== null && p.stock !== undefined && p.stock <= 0
          const pieno = nelCarrello && p.stock !== null && p.stock !== undefined && nelCarrello.qty >= p.stock
          const img = p.immagini?.[0]
          const stileFoto = forma
            ? { width: '100%', aspectRatio: rapportoDi(forma), objectFit: 'cover', display: 'block' }
            : { width: '100%', height: 170, objectFit: 'cover', display: 'block' }
          return (
            <div key={p.id} style={{ background: 'var(--sup, #fff)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', minWidth: 0, opacity: esaurito ? 0.6 : 1, display: 'flex', flexDirection: 'column' }}>
              {img
                ? <img src={img} alt={p.nome} loading="lazy" style={{ ...stileFoto, objectPosition: focalValido(p.immagine_focal) || 'center' }} />
                : <div style={{ ...stileFoto, background: `${primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={34} strokeWidth={1.5} color={`var(--icon-color, ${primary})`} />
                  </div>}
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {p.categoria && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: primary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, overflowWrap: 'anywhere' }}>{p.categoria}</div>
                )}
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', marginBottom: 6, overflowWrap: 'anywhere' }}>{p.nome}</div>
                {p.descrizione && <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, margin: '0 0 12px' }}>{p.descrizione}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 'auto', flexWrap: 'wrap' }}>
                  <span>
                    <span style={{ fontWeight: 700, color: primary, fontSize: 16 }}>{fmt(p.prezzo_scontato ?? p.prezzo)}</span>
                    {p.prezzo_scontato != null && <span style={{ fontSize: 12, color: '#aaa', textDecoration: 'line-through', marginLeft: 6 }}>{fmt(p.prezzo)}</span>}
                  </span>
                  {esaurito
                    ? <span style={{ fontSize: 12, fontWeight: 700, color: '#c53030' }}>Esaurito</span>
                    : nelCarrello
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button type="button" aria-label="Uno in meno" onClick={() => cambia(p.id, nelCarrello.qty - 1)} style={tondo('#fff', '#1a1a2e', '1px solid #ddd')}><Minus size={12} strokeWidth={2.5} /></button>
                          <span style={{ fontWeight: 700, fontSize: 14, minWidth: 16, textAlign: 'center' }}>{nelCarrello.qty}</span>
                          <button type="button" aria-label="Uno in più" disabled={pieno} onClick={() => aggiungi(p)} style={{ ...tondo(primary, '#fff', 'none'), opacity: pieno ? 0.35 : 1 }}><Plus size={12} strokeWidth={2.5} /></button>
                        </span>
                      : <button type="button" onClick={() => aggiungi(p)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, background: primary, color: '#fff', border: 'none', borderRadius: 50, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                          <Plus size={14} strokeWidth={2} /> Aggiungi
                        </button>}
                </div>
                {!esaurito && p.stock !== null && p.stock !== undefined && p.stock <= 5 && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>Restano {p.stock}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Il carrello si apre da DUE punti, di proposito:
          · sotto le schede, dentro il blocco, dove niente può coprirlo — il
            banner dei cookie occupa tutta la striscia in basso finché il
            visitatore non risponde, e alla prima visita il pulsante fisso
            restava sotto (visto provando il 15/09);
          · fisso in basso A SINISTRA, per chi scorre la pagina: a destra c'è già
            il pulsante del chatbot (24px dal bordo) e i due si sovrapponevano. */}
      {quanti > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
          <button type="button" onClick={() => { setAperto(true); setPasso('carrello') }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: primary, color: '#fff', border: 'none', borderRadius: 50, padding: '13px 26px', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
            <ShoppingCart size={18} strokeWidth={1.5} /> Vai al carrello ({quanti}) · {fmt(totale)}
          </button>
        </div>
      )}
      {quanti > 0 && !aperto && (
        <button type="button" aria-label={`Carrello: ${quanti} prodotti`} onClick={() => { setAperto(true); setPasso('carrello') }}
          style={{ position: 'fixed', left: 20, bottom: 20, zIndex: 8000, display: 'flex', alignItems: 'center', gap: 8, background: primary, color: '#fff', border: 'none', borderRadius: 50, padding: '12px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14, boxShadow: '0 6px 24px rgba(0,0,0,0.22)' }}>
          <ShoppingCart size={18} strokeWidth={1.5} /> {quanti}
        </button>
      )}

      {aperto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex' }}>
          <div onClick={() => setAperto(false)} style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} />
          <div role="dialog" aria-label="Carrello" style={{ width: '100%', maxWidth: 420, background: 'var(--sup, #fff)', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', paddingBottom: spazioBanner, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #eee' }}>
              <div style={{ fontFamily: heading, fontWeight: 700, fontSize: 20, color: '#1a1a2e' }}>
                {passo === 'dati' ? 'I tuoi dati' : passo === 'fatto' ? 'Ordine ricevuto' : `Il tuo carrello (${quanti})`}
              </div>
              <button type="button" aria-label="Chiudi" onClick={() => setAperto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={20} strokeWidth={1.5} color="#555" /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {passo === 'fatto' ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6 }}>Riceverai una conferma via email. Ti contatteremo per i dettagli del pagamento.</p>
                </div>
              ) : passo === 'carrello' ? (
                voci.length === 0
                  ? <p style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>Il carrello è vuoto</p>
                  : voci.map(v => {
                      const s = scorta(v.prodotto_id)
                      return (
                        <div key={v.prodotto_id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #f3f3f3' }}>
                          {v.immagine ? <img src={v.immagine} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10 }} /> : <div style={{ width: 56, height: 56, background: `${primary}12`, borderRadius: 10 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, overflowWrap: 'anywhere' }}>{v.nome}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button type="button" aria-label="Uno in meno" onClick={() => cambia(v.prodotto_id, v.qty - 1)} style={tondo('#fff', '#1a1a2e', '1px solid #ddd', 24)}><Minus size={10} strokeWidth={2.5} /></button>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{v.qty}</span>
                              <button type="button" aria-label="Uno in più" disabled={s !== null && v.qty >= s} onClick={() => cambia(v.prodotto_id, v.qty + 1)} style={{ ...tondo(primary, '#fff', 'none', 24), opacity: s !== null && v.qty >= s ? 0.35 : 1 }}><Plus size={10} strokeWidth={2.5} /></button>
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(v.prezzo * v.qty)}</div>
                          <button type="button" aria-label="Togli dal carrello" onClick={() => cambia(v.prodotto_id, 0)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', display: 'flex' }}><X size={14} strokeWidth={2} /></button>
                        </div>
                      )
                    })
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Campo label="Nome e cognome" value={nome} onChange={setNome} placeholder="Mario Rossi" />
                  <Campo label="Email *" value={email} onChange={setEmail} placeholder="mario@esempio.it" type="email" />
                  <Campo label="Telefono" value={tel} onChange={setTel} placeholder="+39 …" type="tel" />
                  <div style={{ fontWeight: 700, fontSize: 14, margin: '6px 0 0', color: '#1a1a2e' }}>Indirizzo di spedizione (se serve)</div>
                  <Campo label="Via e numero" value={via} onChange={setVia} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: 10 }}>
                    <Campo label="CAP" value={cap} onChange={setCap} />
                    <Campo label="Città" value={citta} onChange={setCitta} />
                  </div>
                  <div>
                    <label style={etichetta}>Note (facoltative)</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ ...campo, resize: 'none', fontFamily: 'inherit' }} />
                  </div>

                  {saldo?.programma && (
                    <div style={{ background: `${primary}0d`, borderRadius: 12, padding: '12px 14px', border: `1px solid ${primary}22` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#1a1a2e', marginBottom: 6 }}>
                        <Gift size={14} strokeWidth={1.5} color={primary} /> Programma fedeltà
                      </div>
                      {saldo.saldo > 0
                        ? (saldo.saldo_euro > 0
                            ? <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                <input type="checkbox" checked={usaPunti} onChange={e => setUsaPunti(e.target.checked)} />
                                Usa {saldo.saldo} punti (−{fmt(saldo.saldo_euro)})
                              </label>
                            : <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Hai {saldo.saldo} punti: ne servono {saldo.programma.soglia_riscatto} per usarli.</p>)
                        : <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Nessun punto con questa email.</p>}
                    </div>
                  )}

                  <div>
                    <label style={etichetta}>Codice gift card (facoltativo)</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={codiceGc} onChange={e => { setCodiceGc(e.target.value.toUpperCase()); setGc(null); setErroreGc('') }} style={{ ...campo, flex: 1 }} />
                      <button type="button" onClick={verificaGc} style={{ padding: '8px 14px', background: 'var(--sup-2, #f5f5f5)', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer', fontSize: 13 }}>Verifica</button>
                    </div>
                    {gc && <p style={{ fontSize: 12, color: '#2f855a', margin: '4px 0 0' }}>Saldo disponibile: {fmt(gc.valore_residuo)}</p>}
                    {erroreGc && <p style={{ fontSize: 12, color: '#c53030', margin: '4px 0 0' }}>{erroreGc}</p>}
                  </div>

                  {/* La spunta c'è, ma il controllo vero sta nella route: senza
                      `privacy_accettata === true` l'ordine non entra. */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: '#555', lineHeight: 1.5, cursor: 'pointer' }}>
                    <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} style={{ marginTop: 3 }} />
                    <span>{TESTO_CONSENSO_ORDINE}{privacyUrl && <> <a href={privacyUrl} target="_blank" rel="noopener noreferrer" style={{ color: primary }}>Leggi l’informativa</a></>}</span>
                  </label>
                </div>
              )}
              {errore && <p style={{ color: '#c53030', fontSize: 13, margin: '12px 0 0' }}>{errore}</p>}
            </div>

            {passo !== 'fatto' && voci.length > 0 && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid #eee' }}>
                {passo === 'dati' && (scontoPunti > 0 || scontoGc > 0) && (
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>
                    <Riga a="Subtotale" b={fmt(totale)} />
                    {scontoPunti > 0 && <Riga a="Sconto punti" b={`−${fmt(scontoPunti)}`} />}
                    {scontoGc > 0 && <Riga a="Gift card" b={`−${fmt(scontoGc)}`} />}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontWeight: 700, fontSize: 16 }}>
                  <span>Totale</span><span>{fmt(passo === 'dati' ? totaleFinale : totale)}</span>
                </div>
                {passo === 'carrello'
                  ? <button type="button" onClick={() => { setPasso('dati'); setErrore('') }} style={pulsante(primary)}>Procedi all’ordine <ArrowRight size={18} strokeWidth={2} /></button>
                  : <>
                      <button type="button" onClick={ordina} disabled={invio} style={{ ...pulsante(primary), opacity: invio ? 0.6 : 1 }}>{invio ? 'Invio…' : 'Conferma ordine'}</button>
                      <button type="button" onClick={() => { setPasso('carrello'); setErrore('') }} style={{ width: '100%', marginTop: 8, padding: '8px 0', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13 }}>← Torna al carrello</button>
                    </>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// Fuori dal componente: definiti dentro, React li smonterebbe a ogni tasto
// premuto e il campo perderebbe il cursore.
function Campo({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={etichetta}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={campo} />
    </div>
  )
}
function Riga({ a, b }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{a}</span><span>{b}</span></div>
}
const etichetta = { fontSize: 12, color: '#888', display: 'block', marginBottom: 3 }
const campo = { width: '100%', border: '1px solid #ddd', borderRadius: 10, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }
const tondo = (bg, color, border, size = 28) => ({ width: size, height: size, borderRadius: '50%', border, background: bg, color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 })
const pulsante = (primary) => ({ width: '100%', padding: '13px 0', background: primary, color: '#fff', border: 'none', borderRadius: 50, cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 })
