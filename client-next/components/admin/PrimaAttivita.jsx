'use client'
import { useEffect, useState } from 'react'
import { Check, Store } from 'lucide-react'
import { apiFetch } from '@/lib/api'

// «Che attività hai?» — il primo passo di chi si è registrato da solo e non ha
// ancora un'attività (e quindi un sito). Le categorie sono le NOSTRE
// (`/api/onboarding/prima-attivita`): si sceglie, si scrive il nome, nasce
// l'attività con le funzioni di quella categoria. Dopo, «Inizia qui» mostra i
// passi di sempre.
export default function PrimaAttivita({ nomeProposto = '', onFatto }) {
  const [categorie, setCategorie] = useState(null)
  const [scelta, setScelta] = useState('')
  const [nome, setNome] = useState(nomeProposto)
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    apiFetch('/api/onboarding/prima-attivita')
      .then(d => { if (d.gia) onFatto?.(); else setCategorie(d.categorie || []) })
      .catch(e => setErrore(e.message))
  }, []) // eslint-disable-line

  async function crea() {
    if (!nome.trim()) { setErrore('Scrivi il nome della tua attività.'); return }
    if (!scelta) { setErrore('Scegli che attività hai.'); return }
    setSalvando(true); setErrore('')
    try {
      await apiFetch('/api/onboarding/prima-attivita', { method: 'POST', body: JSON.stringify({ nome: nome.trim(), categoria: scelta }) })
      onFatto?.()
    } catch (e) { setErrore(e.message); setSalvando(false) }
  }

  return (
    <div data-prima-attivita style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: '20px 22px', marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <Store size={22} strokeWidth={1.5} color="#1a1a2e" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>Che attività hai?</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 2, lineHeight: 1.5 }}>
            È il primo passo: da qui nasce il tuo sito, con gli strumenti adatti a quello che fai.
          </div>
        </div>
      </div>

      <label htmlFor="prima-attivita-nome" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>Come si chiama</label>
      <input id="prima-attivita-nome" value={nome} onChange={e => setNome(e.target.value)} maxLength={80} placeholder="Es. Trattoria da Mario"
        style={{ width: '100%', maxWidth: 420, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box', marginBottom: 18 }} />

      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>Cosa fai</div>
      {!categorie && !errore && <div style={{ fontSize: 13, color: '#888' }}>Carico…</div>}
      {categorie && (
        <div role="radiogroup" aria-label="Che attività hai" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 210px), 1fr))', gap: 8 }}>
          {categorie.map(c => {
            const attiva = scelta === c.chiave
            return (
              <button key={c.chiave} type="button" role="radio" aria-checked={attiva} data-categoria={c.chiave} onClick={() => setScelta(c.chiave)}
                style={{ position: 'relative', textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer', minWidth: 0,
                  border: `2px solid ${attiva ? '#1a1a2e' : '#e6e6ee'}`, background: attiva ? '#f6f7fb' : '#fff' }}>
                {attiva && <Check size={16} strokeWidth={2.5} color="#1a1a2e" style={{ position: 'absolute', top: 10, right: 10 }} />}
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1a1a2e', paddingRight: 20, overflowWrap: 'anywhere' }}>{c.nome}</span>
                {c.descrizione && <span style={{ display: 'block', fontSize: 12.5, color: '#666', marginTop: 3, lineHeight: 1.45 }}>{c.descrizione}</span>}
              </button>
            )
          })}
        </div>
      )}

      {errore && <p style={{ margin: '12px 0 0', fontSize: 13, color: '#c53030' }}>{errore}</p>}
      <button type="button" onClick={crea} disabled={salvando || !categorie}
        style={{ marginTop: 18, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 15, fontWeight: 600,
          cursor: salvando ? 'wait' : 'pointer', opacity: salvando || !categorie ? 0.6 : 1 }}>
        {salvando ? 'Preparo il tuo sito…' : 'Crea la mia attività'}
      </button>
    </div>
  )
}
