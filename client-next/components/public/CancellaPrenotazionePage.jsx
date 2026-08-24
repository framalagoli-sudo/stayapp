'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim()

// Aprire il link mostra cosa si sta per disdire; a cancellare è il pulsante.
// Prima bastava aprirlo: i client di posta seguono i link in anteprima e una
// prenotazione vera poteva sparire senza che nessuno avesse cliccato.
export default function CancellaPrenotazionePage() {
  const params = useSearchParams()
  const token = params.get('token')

  const [stato, setStato] = useState('loading') // loading | conferma | ok | error | invalid
  const [messaggio, setMessaggio] = useState('')
  const [dettagli, setDettagli] = useState(null)
  const [inCorso, setInCorso] = useState(false)

  useEffect(() => {
    if (!token) { setStato('invalid'); return }
    fetch(`${API_BASE}/api/booking/public/cancella?token=${token}`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) { setStato('error'); setMessaggio(data.error || 'Link non valido.'); return }
        setDettagli(data.prenotazione)
        if (data.cancellabile) setStato('conferma')
        else { setStato('error'); setMessaggio(data.motivo || 'Questa prenotazione non può essere cancellata.') }
      })
      .catch(() => { setStato('error'); setMessaggio('Impossibile raggiungere il server.') })
  }, [token])

  async function conferma() {
    setInCorso(true)
    try {
      const res = await fetch(`${API_BASE}/api/booking/public/cancella?token=${token}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) { setStato('ok'); setMessaggio(data.messaggio || 'Prenotazione cancellata.') }
      else { setStato('error'); setMessaggio(data.error || 'Errore durante la cancellazione.') }
    } catch {
      setStato('error'); setMessaggio('Impossibile raggiungere il server.')
    } finally { setInCorso(false) }
  }

  const icons = { loading: '⏳', conferma: '📅', ok: '✓', error: '✕', invalid: '⚠️' }
  const colors = { loading: '#888', conferma: '#1a1a2e', ok: '#2e7d32', error: '#c0392b', invalid: '#e65100' }

  const riga = (etichetta, valore) => valore ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 14 }}>
      <span style={{ color: '#888' }}>{etichetta}</span>
      <span style={{ color: '#1a1a2e', fontWeight: 600, textAlign: 'right', overflowWrap: 'anywhere' }}>{valore}</span>
    </div>
  ) : null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', maxWidth: 440, width: '90%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{icons[stato]}</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: colors[stato], marginBottom: 12 }}>
          {stato === 'loading'  && 'Un attimo…'}
          {stato === 'conferma' && 'Vuoi cancellare la prenotazione?'}
          {stato === 'ok'       && 'Prenotazione cancellata'}
          {stato === 'error'    && 'Impossibile cancellare'}
          {stato === 'invalid'  && 'Link non valido'}
        </h1>

        {stato === 'conferma' && dettagli && (
          <>
            <div style={{ textAlign: 'left', margin: '20px 0 28px' }}>
              {riga('Servizio', dettagli.risorsa)}
              {riga('Data', dettagli.data)}
              {riga('Orario', dettagli.ora?.slice(0, 5))}
              {riga('Intestata a', dettagli.cliente)}
              {riga('Persone', dettagli.persone)}
            </div>
            <button onClick={conferma} disabled={inCorso}
              style={{ width: '100%', background: inCorso ? '#ccc' : '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 24px', fontSize: 15, fontWeight: 700, cursor: inCorso ? 'default' : 'pointer' }}>
              {inCorso ? 'Cancellazione in corso…' : 'Sì, cancella la prenotazione'}
            </button>
            <p style={{ fontSize: 13, color: '#888', marginTop: 14 }}>
              Se hai aperto questo link per sbaglio, chiudi la pagina: non verrà cancellato nulla.
            </p>
          </>
        )}

        {messaggio && stato !== 'conferma' && (
          <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6 }}>{messaggio}</p>
        )}
        {stato === 'invalid' && (
          <p style={{ fontSize: 14, color: '#888' }}>Il link di cancellazione non è valido o è già stato utilizzato.</p>
        )}
        {stato === 'ok' && (
          <p style={{ fontSize: 14, color: '#888', marginTop: 8 }}>
            Se hai bisogno di assistenza puoi contattarci direttamente.
          </p>
        )}
      </div>
    </div>
  )
}
