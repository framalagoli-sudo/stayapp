'use client'
import { testiEvento } from './evento-testi'

// Quanti posti per ogni opzione di un evento (migration 148): una riga per
// opzione col suo prezzo e i pulsanti − e +, e sotto il totale.
//
// Garage 22: «1 cena + 2 ingresso con drink, solo cene o solo ingressi, e fare
// il totale — altrimenti diventa macchinoso». Il totale qui è solo da leggere:
// la cifra vera la calcola il server dal listino, nel riepilogo e alla cassa.
//
// Un'opzione esaurita non si può aumentare e, se l'evento tiene una lista
// d'attesa, offre «Mettimi in lista d'attesa» per QUELLA opzione.
//
// La usano la pagina dell'evento e l'app del QR, ognuna coi suoi colori.
export default function SceltaOpzioni({ opzioni = [], quante = {}, onCambia, lang = 'it', listaAttesa = false, onLista, colori = {} }) {
  const T = testiEvento(lang)
  const c = { testo: '#1a1a2e', tenue: '#777', bordo: '#e0e0e0', primario: '#00b5b5', sfondoScelto: '#00b5b510', ...colori }
  const euro = v => new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: Number.isInteger(Number(v)) ? 0 : 2 }).format(Number(v) || 0)
  const posti = opzioni.reduce((s, o) => s + (quante[o.id] || 0), 0)
  const totale = opzioni.reduce((s, o) => s + (quante[o.id] || 0) * (Number(o.price) || 0), 0)
  const tasto = attivo => ({
    width: 38, height: 38, borderRadius: '50%', border: `1.5px solid ${attivo ? c.primario : c.bordo}`,
    background: '#fff', color: attivo ? c.primario : '#bbb', fontSize: 20, fontWeight: 700, lineHeight: 1,
    cursor: attivo ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0,
  })

  return (
    <div data-scelta-opzioni style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: c.testo, marginBottom: 10 }}>{T.scegliQuanti}</div>
      {opzioni.map(o => {
        const n = quante[o.id] || 0
        const max = o.posti_online // null = senza limite
        const esaurita = max === 0
        const puoAumentare = !esaurita && (max == null || n < max)
        return (
          <div key={o.id} data-opzione={o.id}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${n > 0 ? c.primario : c.bordo}`, background: n > 0 ? c.sfondoScelto : 'transparent', marginBottom: 8, opacity: esaurita ? 0.75 : 1 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: c.testo, overflowWrap: 'anywhere' }}>{o.name}</div>
              {o.description && <div style={{ fontSize: 13, color: c.tenue, marginTop: 2, lineHeight: 1.45, overflowWrap: 'anywhere' }}>{o.description}</div>}
              <div style={{ fontSize: 14, fontWeight: 700, color: c.primario, marginTop: 4 }}>
                {Number(o.price) > 0 ? euro(o.price) : T.gratis}
                {esaurita
                  ? <span style={{ fontWeight: 600, color: '#b42318', marginLeft: 8, fontSize: 13 }}>{T.esaurita}</span>
                  : max != null && max <= 5 && <span style={{ fontWeight: 500, color: c.tenue, marginLeft: 8, fontSize: 12.5 }}>{T.restano(max)}</span>}
              </div>
              {esaurita && listaAttesa && onLista && (
                <button type="button" onClick={() => onLista(o.id)}
                  style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, color: c.primario, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                  {T.mettimiInLista}
                </button>
              )}
            </div>
            {!esaurita && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="button" aria-label={`${T.meno}: ${o.name}`} disabled={n === 0} onClick={() => onCambia(o.id, n - 1)} style={tasto(n > 0)}>−</button>
                <span aria-live="polite" style={{ minWidth: 20, textAlign: 'center', fontSize: 17, fontWeight: 700, color: c.testo }}>{n}</span>
                <button type="button" aria-label={`${T.piu}: ${o.name}`} disabled={!puoAumentare} onClick={() => onCambia(o.id, n + 1)} style={tasto(puoAumentare)}>+</button>
              </div>
            )}
          </div>
        )
      })}
      {posti > 0 && (
        <div data-totale-scelte style={{ textAlign: 'right', fontSize: 15.5, fontWeight: 700, color: c.testo, marginTop: 6 }}>
          {T.totaleScelte(posti, euro(totale))}
        </div>
      )}
    </div>
  )
}
