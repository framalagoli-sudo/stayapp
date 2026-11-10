'use client'
import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { X } from 'lucide-react'
import { contaGiorni } from '@/lib/booking-giornaliero'

// «Modifica» su una prenotazione di una risorsa: date (solo a giornate), dati
// del cliente, totale. Le regole stanno nel server (`lib/modifica-prenotazione.js`);
// qui si scrive, si guarda il conto e si salva.
//
// Chiesto da Automax il 10/11/2026: una prenotazione si poteva solo confermare,
// annullare o eliminare. Montato una volta sola dalla pagina (nota 22).

const campo = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box', fontFamily: 'inherit' }
const etichetta = { display: 'block', fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }
const pulsante = (pieno = true) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  background: pieno ? '#1a1a2e' : '#fff', color: pieno ? '#fff' : '#1a1a2e', border: pieno ? 'none' : '1px solid #ccc' })
const euro = n => `€${(Number(n) || 0).toFixed(2)}`

export default function ModificaPrenotazione({ prenotazione: p, onChiudi, onSalvata }) {
  const risorsa = p.risorse || null
  const aGiornate = risorsa?.modalita === 'giornaliero'
  const giorni = contaGiorni({ disponibilita: risorsa?.disponibilita })
  const pagata = ['pagato', 'rimborsato'].includes(p.pagamento_stato)

  const [f, setF] = useState({
    cliente_nome: p.cliente_nome || '', cliente_email: p.cliente_email || '',
    cliente_telefono: p.cliente_telefono || '', note_cliente: p.note_cliente || '',
    data: p.data || '', data_fine: p.data_fine || '',
  })
  const [totale, setTotale] = useState('')          // '' = decide il listino
  const [conto, setConto] = useState(null)          // la risposta dell'anteprima
  const [avvisa, setAvvisa] = useState(false)
  const [errore, setErrore] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [esito, setEsito] = useState(null)
  const giro = useRef(0)

  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') onChiudi() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onChiudi])

  const cambiaDate = aGiornate && (f.data !== p.data || f.data_fine !== p.data_fine)

  // Il conto delle date nuove lo fa il server, lo stesso che salverà: chiedere
  // a lui evita un totale letto qui e un altro scritto nel database.
  useEffect(() => {
    if (!cambiaDate || !f.data || !f.data_fine) { setConto(null); return }
    const mio = ++giro.current
    const t = setTimeout(async () => {
      try {
        const r = await apiFetch(`/api/booking/prenotazioni/${p.id}/modifica`, { method: 'POST', body: JSON.stringify({ anteprima: true, data: f.data, data_fine: f.data_fine }) })
        if (mio === giro.current) { setConto(r); setErrore('') }
      } catch (e) { if (mio === giro.current) { setConto(null); setErrore(e.message || 'Quelle date non vanno bene') } }
    }, 350)
    return () => clearTimeout(t)
  }, [cambiaDate, f.data, f.data_fine, p.id])

  const scrivi = k => e => setF(x => ({ ...x, [k]: e.target.value }))

  async function salvaModifica() {
    setSalvando(true); setErrore('')
    try {
      const body = { ...f, avvisa }
      if (!aGiornate) { delete body.data; delete body.data_fine }
      if (totale.trim() !== '') body.importo_totale = Number(totale.replace(',', '.'))
      const r = await apiFetch(`/api/booking/prenotazioni/${p.id}/modifica`, { method: 'POST', body: JSON.stringify(body) })
      setEsito(r)
      onSalvata?.(r.prenotazione)
    } catch (e) { setErrore(e.message || 'Non sono riuscito a salvare') }
    finally { setSalvando(false) }
  }

  const totaleCheVa = totale.trim() !== '' ? Number(totale.replace(',', '.')) : (conto?.totale ?? (Number(p.importo_totale) || 0))

  return (
    <div onClick={onChiudi} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '6vh 16px', overflowY: 'auto' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="titolo-modifica" data-modifica-prenotazione onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, padding: '22px 22px 20px', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div id="titolo-modifica" style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e' }}>Modifica prenotazione</div>
            <div style={{ fontSize: 13, color: '#777', marginTop: 2, overflowWrap: 'anywhere' }}>{risorsa?.nome || p.offerte?.titolo || 'Prenotazione'}</div>
          </div>
          <button onClick={onChiudi} aria-label="Chiudi" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} strokeWidth={1.5} color="#666" /></button>
        </div>

        {esito ? (
          <div data-modifica-fatta>
            <p style={{ fontSize: 15, color: '#137a4a', fontWeight: 700, margin: '0 0 8px' }}>Prenotazione aggiornata.</p>
            {esito.email === 'inviata' && <p style={{ fontSize: 14, color: '#444', margin: '0 0 6px' }}>Il cliente ha ricevuto un’email con i dati nuovi.</p>}
            {esito.email === 'senza_indirizzo' && <p style={{ fontSize: 14, color: '#8a5a00', margin: '0 0 6px' }}>Non c’è un’email del cliente: avvisalo tu al telefono.</p>}
            {esito.email === 'non_partita' && <p style={{ fontSize: 14, color: '#c53030', margin: '0 0 6px' }}>L’email al cliente non è partita: avvisalo tu al telefono.</p>}
            {(esito.avvisi || []).map((a, i) => <p key={i} style={{ fontSize: 13.5, color: '#8a5a00', margin: '0 0 6px', lineHeight: 1.5 }}>{a}</p>)}
            <button onClick={onChiudi} style={{ ...pulsante(), marginTop: 10 }}>Chiudi</button>
          </div>
        ) : (
          <>
            {aGiornate && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
                <label><span style={etichetta}>{giorni ? 'Ritiro' : 'Arrivo'}</span>
                  <input type="date" value={f.data} onChange={scrivi('data')} style={campo} /></label>
                <label><span style={etichetta}>{giorni ? 'Riconsegna' : 'Partenza'}</span>
                  <input type="date" value={f.data_fine} min={f.data || undefined} onChange={scrivi('data_fine')} style={campo} /></label>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              <label><span style={etichetta}>Nome</span><input value={f.cliente_nome} onChange={scrivi('cliente_nome')} style={campo} /></label>
              <label><span style={etichetta}>Telefono</span><input value={f.cliente_telefono} onChange={scrivi('cliente_telefono')} style={campo} /></label>
            </div>
            <label style={{ display: 'block', marginTop: 10 }}><span style={etichetta}>Email</span>
              <input type="email" value={f.cliente_email} onChange={scrivi('cliente_email')} style={campo} /></label>
            <label style={{ display: 'block', marginTop: 10 }}><span style={etichetta}>Note</span>
              <input value={f.note_cliente} onChange={scrivi('note_cliente')} style={campo} /></label>

            <div style={{ marginTop: 14, padding: '12px 14px', background: '#f7f9fc', borderRadius: 10 }}>
              <span style={etichetta}>Totale</span>
              {pagata ? (
                <div data-totale-bloccato style={{ fontSize: 14, color: '#444', lineHeight: 1.5 }}>
                  <strong>{euro(p.importo_totale)}</strong> — già pagata online: il totale non si cambia da qui. Per una differenza usa «Chiedi il pagamento»; un rimborso si fa da Stripe.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <input inputMode="decimal" value={totale} placeholder={String(conto?.totale ?? p.importo_totale ?? '')}
                      onChange={e => setTotale(e.target.value)} style={{ ...campo, maxWidth: 140 }} aria-label="Totale" />
                    {totale.trim() !== '' && (
                      <button type="button" onClick={() => setTotale('')} style={{ ...pulsante(false), padding: '8px 12px', fontSize: 13 }}>
                        {cambiaDate ? 'Usa il listino' : 'Lascia com’era'}
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#666', marginTop: 6, lineHeight: 1.5 }}>
                    {cambiaDate && conto
                      ? <>Col listino le date nuove costano <strong>{euro(conto.listino)}</strong>{conto.giorni ? ` (${conto.giorni} ${giorni ? (conto.giorni === 1 ? 'giorno' : 'giorni') : (conto.giorni === 1 ? 'notte' : 'notti')})` : ''}{conto.offerta ? `, con l’offerta «${conto.offerta}»` : ''}. Scrivi un’altra cifra solo se vuoi fare un prezzo diverso.</>
                      : <>Era {euro(p.importo_totale)}. Lascia vuoto per non cambiarlo.</>}
                  </div>
                </>
              )}
              {(conto?.avvisi || []).map((a, i) => <div key={i} style={{ fontSize: 12.5, color: '#8a5a00', marginTop: 6, lineHeight: 1.5 }}>{a}</div>)}
            </div>

            {risorsa && (
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 14, fontSize: 14, color: '#333', cursor: 'pointer' }}>
                <input type="checkbox" checked={avvisa} onChange={e => setAvvisa(e.target.checked)} style={{ marginTop: 3 }} />
                <span>Avvisa il cliente via email con i dati nuovi{f.cliente_email ? '' : ' (serve la sua email)'}</span>
              </label>
            )}

            {errore && <p data-errore-modifica style={{ color: '#c53030', fontSize: 14, margin: '12px 0 0', lineHeight: 1.5 }}>{errore}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={salvaModifica} disabled={salvando || !f.cliente_nome.trim() || (cambiaDate && !conto)}
                style={{ ...pulsante(), opacity: salvando || !f.cliente_nome.trim() || (cambiaDate && !conto) ? 0.5 : 1 }}>
                {salvando ? 'Salvo…' : `Salva${!pagata && totaleCheVa !== Number(p.importo_totale) ? ` · ${euro(totaleCheVa)}` : ''}`}
              </button>
              <button onClick={onChiudi} style={pulsante(false)}>Annulla</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
