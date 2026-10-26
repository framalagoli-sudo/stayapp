'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').trim()

// «Si è liberato un posto»: dal link mandato a chi era in lista d'attesa.
// Il posto è tenuto per lui fino all'ora scritta. Prenderlo è un pulsante, non
// l'apertura del link (i programmi di posta aprono i link da soli).
export default function PostoEventoPage() {
  const token = useSearchParams().get('t')
  const [info, setInfo] = useState(null)
  const [fase, setFase] = useState('carico') // carico | pronto | preso | rinunciato | errore
  const [errore, setErrore] = useState('')
  const [inCorso, setInCorso] = useState(false)

  useEffect(() => {
    if (!token) { setInfo({ stato: 'non_valido' }); setFase('pronto'); return }
    fetch(`${API_BASE}/api/guest/eventi/posto?t=${encodeURIComponent(token)}`)
      .then(r => r.json()).then(d => { setInfo(d); setFase('pronto') })
      .catch(() => { setErrore('Impossibile raggiungere il server.'); setFase('errore') })
  }, [token])

  async function manda(azione) {
    setInCorso(true); setErrore('')
    try {
      const r = await fetch(`${API_BASE}/api/guest/eventi/posto`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, azione }),
      })
      const d = await r.json()
      if (!r.ok) { setErrore(d.error || 'Non è stato possibile.'); return }
      if (d.pagamento?.url) { window.location.href = d.pagamento.url; return }
      setFase(azione === 'rinuncia' ? 'rinunciato' : 'preso')
    } catch { setErrore('Impossibile raggiungere il server.') }
    finally { setInCorso(false) }
  }

  const s = info?.stato
  const euro = n => `€${Number(n).toFixed(2)}`
  const riga = (etichetta, valore) => valore ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 14 }}>
      <span style={{ color: '#767676' }}>{etichetta}</span>
      <span style={{ color: '#1a1a2e', fontWeight: 600, textAlign: 'right', overflowWrap: 'anywhere' }}>{valore}</span>
    </div>
  ) : null

  const titolo = fase === 'carico' ? 'Un attimo…'
    : fase === 'errore' ? 'Qualcosa non va'
    : fase === 'preso' ? 'Il posto è tuo'
    : fase === 'rinunciato' ? 'Grazie di averci avvisato'
    : s === 'valida' ? 'Si è liberato un posto per te'
    : s === 'presa' ? 'Il posto è già tuo'
    : s === 'scaduta' ? 'Il tempo per prenderlo è scaduto'
    : s === 'rinunciato' ? 'Hai rinunciato a questo posto'
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
            {riga('Posti', String(info.posti))}
            {s === 'valida' && info.da_pagare > 0 && riga('Da pagare adesso', euro(info.da_pagare))}
            {s === 'valida' && riga('Tenuto per te fino alle', info.scade_alle)}
          </div>
        )}

        {fase === 'pronto' && s === 'valida' && (
          <>
            <button onClick={() => manda('prendi')} disabled={inCorso}
              style={{ width: '100%', background: inCorso ? '#ccc' : '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 24px', fontSize: 15, fontWeight: 700, cursor: inCorso ? 'default' : 'pointer' }}>
              {inCorso ? 'Un attimo…' : info.da_pagare > 0 ? `Prendi il posto e paga ${euro(info.da_pagare)}` : 'Prendi il posto'}
            </button>
            {info.da_pagare > 0 && (
              <p style={{ fontSize: 13, color: '#767676', marginTop: 12, lineHeight: 1.6 }}>
                Vai alla pagina di pagamento: hai mezz’ora per completarlo, poi il posto passa al prossimo in lista.
              </p>
            )}
            <button onClick={() => manda('rinuncia')} disabled={inCorso}
              style={{ marginTop: 14, background: 'none', border: 'none', color: '#555', fontSize: 14, textDecoration: 'underline', cursor: inCorso ? 'default' : 'pointer' }}>
              Non mi interessa più: passalo a un altro
            </button>
          </>
        )}

        {fase === 'pronto' && s === 'scaduta' && (
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>
            Il posto è passato alla persona successiva in lista. Se se ne libera un altro, {info.organizzatore} ti può ancora chiamare.
          </p>
        )}
        {fase === 'pronto' && s === 'presa' && (
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>Hai già preso questo posto: trovi la conferma nella tua email.</p>
        )}
        {fase === 'pronto' && s === 'non_valido' && (
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>Il link non è valido. Controlla di averlo aperto per intero dall’email.</p>
        )}

        {fase === 'preso' && (
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>Ti abbiamo mandato la conferma per email. Ti aspettiamo!</p>
        )}
        {fase === 'rinunciato' && (
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>Il posto passa alla persona successiva in lista.</p>
        )}

        {errore && <p style={{ fontSize: 14, color: '#c0392b', lineHeight: 1.6, marginTop: 14 }}>{errore}</p>}
      </div>
    </div>
  )
}
