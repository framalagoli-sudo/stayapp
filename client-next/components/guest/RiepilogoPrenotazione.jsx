'use client'

// Quello che si legge PRIMA di andare a pagare un evento.
//
// Chi premeva «Prenota» arrivava alla cassa senza che nessuno gli avesse detto
// che c'era da pagare: la chiudeva, e i posti restavano tenuti mezz'ora per
// nessuno. Qui si dice cosa sta per succedere — quanti posti, per quale evento,
// quanto si paga adesso — e i posti si prendono solo premendo «Conferma».
//
// Le cifre arrivano dal server (`/api/guest/eventi/[id]/riepilogo`): questo
// componente le scrive, non le calcola. La usano la pagina dell'evento e l'app
// del QR, ognuna con i suoi colori.

const TESTI = {
  it: {
    titolo: 'Controlla prima di confermare',
    stai: (n, ev) => <>Stai prenotando <strong>{n} {n === 1 ? 'posto' : 'posti'}</strong> per <strong>«{ev}»</strong>.</>,
    posti: 'Posti', totale: 'Totale', paghiOra: 'Paghi adesso',
    acconto: p => `acconto ${p}%`, saldo: 'Da saldare sul posto',
    // Vale per l'acconto come per il pagamento intero: finché non si paga non si è prenotati.
    valida: tutto => `La prenotazione è valida solo dopo il pagamento${tutto ? '' : ' dell’acconto'}.`,
    poi: min => `Confermando vai alla pagina di pagamento. I posti restano tenuti per ${min} minuti: se il pagamento non viene completato tornano liberi e la prenotazione si annulla da sola.`,
    conferma: 'Conferma e vai al pagamento', modifica: 'Modifica', attesa: 'Un attimo…',
  },
  en: {
    titolo: 'Check before you confirm',
    stai: (n, ev) => <>You are booking <strong>{n} {n === 1 ? 'seat' : 'seats'}</strong> for <strong>“{ev}”</strong>.</>,
    posti: 'Seats', totale: 'Total', paghiOra: 'You pay now',
    acconto: p => `${p}% deposit`, saldo: 'Balance due on site',
    valida: tutto => `Your booking is valid only once the ${tutto ? 'payment' : 'deposit'} has been paid.`,
    poi: min => `By confirming you go to the payment page. Your seats are held for ${min} minutes: if the payment is not completed they are released and the booking is cancelled automatically.`,
    conferma: 'Confirm and go to payment', modifica: 'Edit', attesa: 'One moment…',
  },
}

export default function RiepilogoPrenotazione({
  riepilogo, titoloEvento, quando = null, lang = 'it', inCorso = false, errore = '',
  onConferma, onModifica,
  // Chi lo monta passa i suoi colori: la pagina dell'evento e l'app non si
  // vestono allo stesso modo.
  colori = {},
}) {
  const t = TESTI[lang === 'en' ? 'en' : 'it']
  const c = { testo: '#1a1a2e', tenue: '#555', bordo: '#e8e8ee', primario: '#00b5b5', suPrimario: '#fff', raggio: 12, ...colori }
  const euro = v => new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'it-IT', { style: 'currency', currency: 'EUR' }).format(Number(v) || 0)
  const riga = { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '9px 0', fontSize: 14.5, color: c.tenue }

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 16, color: c.testo, marginBottom: 10 }}>{t.titolo}</div>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: c.testo, margin: '0 0 4px', overflowWrap: 'anywhere' }}>
        {t.stai(riepilogo.posti, titoloEvento)}
      </p>
      {quando && <p style={{ fontSize: 13.5, color: c.tenue, margin: '0 0 14px' }}>{quando}</p>}

      <div style={{ borderTop: `1px solid ${c.bordo}`, borderBottom: `1px solid ${c.bordo}`, margin: '14px 0' }}>
        <div style={riga}><span>{t.posti}</span><span style={{ color: c.testo }}>{riepilogo.posti}</span></div>
        {!riepilogo.tutto && (
          <div style={riga}><span>{t.totale}</span><span style={{ color: c.testo }}>{euro(riepilogo.totale)}</span></div>
        )}
        <div style={{ ...riga, fontWeight: 700, fontSize: 16.5, color: c.testo }}>
          <span>{t.paghiOra}{!riepilogo.tutto && <span style={{ fontWeight: 400, fontSize: 13, color: c.tenue }}> ({t.acconto(riepilogo.perc)})</span>}</span>
          <span>{euro(riepilogo.da_pagare)}</span>
        </div>
        {!riepilogo.tutto && riepilogo.saldo > 0 && (
          <div style={riga}><span>{t.saldo}</span><span style={{ color: c.testo }}>{euro(riepilogo.saldo)}</span></div>
        )}
      </div>

      <p style={{ fontSize: 14.5, lineHeight: 1.5, fontWeight: 700, color: c.testo, margin: '0 0 6px' }}>{t.valida(riepilogo.tutto)}</p>
      <p style={{ fontSize: 13, lineHeight: 1.6, color: c.tenue, margin: '0 0 16px' }}>{t.poi(riepilogo.minuti)}</p>

      {errore && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 12px' }}>{errore}</p>}
      <button onClick={onConferma} disabled={inCorso}
        style={{ width: '100%', padding: 15, background: c.primario, color: c.suPrimario, border: 'none', borderRadius: c.raggio, fontSize: 15.5, fontWeight: 700, cursor: inCorso ? 'wait' : 'pointer', opacity: inCorso ? .7 : 1 }}>
        {inCorso ? t.attesa : t.conferma}
      </button>
      <button onClick={onModifica} disabled={inCorso}
        style={{ width: '100%', padding: 12, marginTop: 8, background: 'transparent', color: c.tenue, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
        {t.modifica}
      </button>
    </div>
  )
}
