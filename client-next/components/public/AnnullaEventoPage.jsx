'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim()

// «Non posso più venire»: dal link nella conferma di un evento.
// Aprire il link mostra cosa si sta per annullare; ad annullare è il pulsante.
// I programmi di posta aprono i link da soli per controllarli: se bastasse
// aprirlo, una prenotazione vera sparirebbe senza che nessuno abbia cliccato.
export default function AnnullaEventoPage() {
  const token = useSearchParams().get('t')
  const [info, setInfo] = useState(null)
  const [fase, setFase] = useState('carico') // carico | pronto | fatto | errore
  const [esito, setEsito] = useState(null)
  const [errore, setErrore] = useState('')
  const [inCorso, setInCorso] = useState(false)

  useEffect(() => {
    if (!token) { setFase('pronto'); setInfo({ stato: 'non_valido' }); return }
    fetch(`${API_BASE}/api/guest/eventi/annulla?t=${encodeURIComponent(token)}`)
      .then(r => r.json()).then(d => { setInfo(d); setFase('pronto') })
      .catch(() => { setErrore('Impossibile raggiungere il server.'); setFase('errore') })
  }, [token])

  async function annulla() {
    setInCorso(true); setErrore('')
    try {
      const r = await fetch(`${API_BASE}/api/guest/eventi/annulla`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token }),
      })
      const d = await r.json()
      if (!r.ok) { setErrore(d.error || 'Non è stato possibile annullare.'); return }
      setEsito(d); setFase('fatto')
    } catch { setErrore('Impossibile raggiungere il server.') }
    finally { setInCorso(false) }
  }

  const s = info?.stato
  const lista = s === 'lista'
  const euro = n => `€${Number(n).toFixed(2)}`
  const riga = (etichetta, valore) => valore ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 14 }}>
      <span style={{ color: '#767676' }}>{etichetta}</span>
      <span style={{ color: '#1a1a2e', fontWeight: 600, textAlign: 'right', overflowWrap: 'anywhere' }}>{valore}</span>
    </div>
  ) : null
  const contatto = info?.contatto && (info.contatto.telefono || info.contatto.email) && (
    <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginTop: 14 }}>
      Contatta {info.contatto.nome}
      {info.contatto.telefono && <> al <a href={`tel:${info.contatto.telefono}`} style={{ color: '#1a1a2e', fontWeight: 600 }}>{info.contatto.telefono}</a></>}
      {info.contatto.telefono && info.contatto.email && ' oppure '}
      {info.contatto.email && <>a <a href={`mailto:${info.contatto.email}`} style={{ color: '#1a1a2e', fontWeight: 600, overflowWrap: 'anywhere' }}>{info.contatto.email}</a></>}.
    </p>
  )

  const titolo = fase === 'carico' ? 'Un attimo…'
    : fase === 'errore' ? 'Qualcosa non va'
    : fase === 'fatto' ? (esito?.era_in_lista ? 'Ti abbiamo tolto dalla lista' : 'Prenotazione annullata')
    : s === 'annullabile' ? 'Vuoi annullare la prenotazione?'
    : lista ? 'Vuoi uscire dalla lista d’attesa?'
    : s === 'gia_annullata' ? 'Già annullata'
    : s === 'oltre_termine' ? 'Il termine per annullare è passato'
    : s === 'non_annullabile' ? 'Per annullare contatta chi organizza'
    : s === 'in_pagamento' ? 'Pagamento in corso'
    : s === 'concluso' ? 'L’evento si è già concluso'
    : 'Link non valido'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: 'system-ui, sans-serif', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 28px', maxWidth: 460, width: '100%', boxSizing: 'border-box', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: '0 0 12px', lineHeight: 1.3 }}>{titolo}</h1>

        {fase === 'pronto' && info?.evento && (
          <div style={{ textAlign: 'left', margin: '20px 0 22px' }}>
            {riga('Evento', info.evento.titolo)}
            {riga('Quando', info.evento.quando)}
            {riga('Dove', info.evento.luogo)}
            {riga('Intestata a', info.intestata_a)}
            {riga(lista ? 'Posti che chiedevi' : 'Posti', String(info.posti))}
            {info.pagato_online > 0 && riga('Pagato online', euro(info.pagato_online))}
          </div>
        )}

        {fase === 'pronto' && (s === 'annullabile' || lista) && (
          <>
            {info.pagato_online > 0 && (
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, margin: '0 0 18px', textAlign: 'left' }}>
                Il rimborso di {euro(info.pagato_online)} lo fa {info.contatto?.nome}, sulla carta con cui hai pagato.
              </p>
            )}
            <button onClick={annulla} disabled={inCorso}
              style={{ width: '100%', background: inCorso ? '#ccc' : '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 24px', fontSize: 15, fontWeight: 700, cursor: inCorso ? 'default' : 'pointer' }}>
              {inCorso ? 'Un attimo…' : lista ? 'Sì, toglimi dalla lista' : 'Sì, annulla la prenotazione'}
            </button>
            <p style={{ fontSize: 13, color: '#767676', marginTop: 14, lineHeight: 1.6 }}>
              Se hai aperto questo link per sbaglio chiudi la pagina: non cambia niente.
            </p>
          </>
        )}

        {fase === 'pronto' && s === 'oltre_termine' && (
          <>
            <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>
              Questa prenotazione si poteva annullare dal link fino a {info.termine}. Adesso non si annulla più da qui.
            </p>
            {contatto}
          </>
        )}
        {fase === 'pronto' && s === 'non_annullabile' && (
          <>
            <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>Per questo evento l’annullamento non si fa dal link.</p>
            {contatto}
          </>
        )}
        {fase === 'pronto' && s === 'in_pagamento' && (
          <>
            <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>
              Il pagamento di questa prenotazione è ancora aperto. Se non lo completi, entro mezz’ora la prenotazione si annulla da sola.
            </p>
            {contatto}
          </>
        )}
        {fase === 'pronto' && s === 'gia_annullata' && (
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>Questa prenotazione è già stata annullata: non devi fare altro.</p>
        )}
        {fase === 'pronto' && s === 'non_valido' && (
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>Il link non è valido. Controlla di averlo aperto per intero dall’email.</p>
        )}

        {fase === 'fatto' && (
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>
            {esito?.era_in_lista
              ? 'Non riceverai altri inviti per questo evento.'
              : esito?.pagato_online > 0
                ? `Ti abbiamo mandato un’email di conferma. Il rimborso di ${euro(esito.pagato_online)} lo fa ${info?.contatto?.nome}.`
                : 'Ti abbiamo mandato un’email di conferma. Grazie di averci avvisato: il posto passa a qualcun altro.'}
          </p>
        )}

        {errore && <p style={{ fontSize: 14, color: '#c0392b', lineHeight: 1.6, marginTop: 14 }}>{errore}</p>}
      </div>
    </div>
  )
}
