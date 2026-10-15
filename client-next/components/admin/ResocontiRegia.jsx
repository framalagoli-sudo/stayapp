'use client'
import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { ToggleLeft, ToggleRight, Mail } from 'lucide-react'

// I resoconti per email ai titolari, dal lato di chi amministra la piattaforma:
// l'interruttore generale, e prima di accenderlo l'email vera di un'azienda a
// scelta — vista qui, o mandata alla propria casella. Mai al titolare: lui la
// riceve col giro vero, quando l'interruttore è acceso. (lib/resoconti.js)
export default function ResocontiRegia({ attivi, onToggle, saving }) {
  const [aziende, setAziende] = useState([])
  const [aziendaId, setAziendaId] = useState('')
  const [tipo, setTipo] = useState('settimanale')
  const [anteprima, setAnteprima] = useState(null)
  const [stato, setStato] = useState('')
  const [errore, setErrore] = useState('')

  useEffect(() => {
    apiFetch('/api/aziende')
      .then(a => {
        const vere = (a || []).filter(x => !/^ZZ/i.test(x.ragione_sociale || ''))
        setAziende(vere)
        if (vere[0]) setAziendaId(vere[0].id)
      })
      .catch(e => setErrore(e.message))
  }, [])

  // Chi lo riceverebbe al prossimo lunedì e al prossimo 1° del mese, sui numeri di oggi.
  const [chi, setChi] = useState(null)
  useEffect(() => { apiFetch('/api/resoconti/destinatari').then(setChi).catch(() => setChi(null)) }, [])

  useEffect(() => {
    if (!aziendaId) return
    let vivo = true
    setAnteprima(null); setErrore(''); setStato('')
    apiFetch(`/api/resoconti/anteprima?azienda_id=${aziendaId}&tipo=${tipo}`)
      .then(r => { if (vivo) setAnteprima(r) })
      .catch(e => { if (vivo) setErrore(e.message) })
    return () => { vivo = false }
  }, [aziendaId, tipo])

  async function mandaAMe() {
    setStato('invio'); setErrore('')
    try {
      const r = await apiFetch('/api/resoconti/anteprima', { method: 'POST', body: JSON.stringify({ azienda_id: aziendaId, tipo }) })
      setStato(`Mandata a ${r.inviata_a}`)
    } catch (e) { setErrore(e.message); setStato('') }
  }

  const campo = { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13.5, background: '#fff', minWidth: 0 }

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>
            <Mail size={16} strokeWidth={1.5} color="#1a1a2e" /> Resoconti per email ai titolari
          </div>
          <div style={{ fontSize: 13, color: '#6b6b76', lineHeight: 1.6 }}>
            Il lunedì la settimana prima, il 1° del mese il mese prima, dalle 8 nel fuso di ogni azienda.
            Una settimana senza nessuna novità non parte. Ogni quanto lo riceve un cliente — ogni settimana,
            ogni mese (il predefinito) o mai — lo scegli tu dalla Dashboard dell'azienda, sotto «Cosa succede».
          </div>
        </div>
        <button onClick={onToggle} aria-label={attivi ? 'Spegni i resoconti' : 'Accendi i resoconti'}
          style={{ background: 'none', border: 'none', cursor: saving ? 'wait' : 'pointer', flexShrink: 0, padding: 0, opacity: saving ? 0.6 : 1 }}>
          {attivi ? <ToggleRight size={40} strokeWidth={1.5} color="#276749" /> : <ToggleLeft size={40} strokeWidth={1.5} color="#bbb" />}
        </button>
      </div>
      <div style={{
        marginTop: 14, fontSize: 12, padding: '8px 12px', borderRadius: 8, fontWeight: 600,
        background: attivi ? '#f0fff4' : '#f6f6f8', color: attivi ? '#276749' : '#6b6b76',
      }}>
        {attivi ? '✓ Accesi — partono al prossimo lunedì o al prossimo 1° del mese' : '✕ Spenti — non parte niente e i titolari non vedono la scelta'}
      </div>

      {chi && (
        <div data-chi-riceve style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>Chi lo riceverebbe</div>
          {[['settimanale', 'La settimana, lunedì'], ['mensile', 'Il mese, il']].map(([tipo, cosa]) => {
            const g = chi[tipo]
            const quando = new Date(`${g.giorno}T12:00:00Z`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' })
            const partono = g.elenco.filter(e => e.parte)
            const fermi = g.elenco.filter(e => !e.parte)
            return (
              <div key={tipo} style={{ marginTop: 6, fontSize: 13, color: '#555', lineHeight: 1.6, overflowWrap: 'anywhere' }}>
                <strong>{cosa} {quando}:</strong>{' '}
                {partono.length
                  ? partono.map(e => `${e.azienda} (${e.persone === 1 ? '1 persona' : `${e.persone} persone`})`).join(', ')
                  : 'nessuno'}
                {fermi.length > 0 && <span style={{ color: '#8a5a12' }}> · senza novità finora, non partirebbe: {fermi.map(e => e.azienda).join(', ')}</span>}
              </div>
            )
          })}
          <div style={{ marginTop: 4, fontSize: 12, color: '#6b6b76' }}>Calcolato sui numeri di oggi: chi è «senza novità» può averne prima di lunedì.</div>
        </div>
      )}

      <div style={{ marginTop: 18, fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>Come arriva</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <select value={aziendaId} onChange={e => setAziendaId(e.target.value)} style={{ ...campo, flex: '1 1 200px' }}>
          {aziende.map(a => <option key={a.id} value={a.id}>{a.ragione_sociale}</option>)}
        </select>
        <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ ...campo, flex: '0 1 160px' }}>
          <option value="settimanale">La settimana</option>
          <option value="mensile">Il mese</option>
        </select>
        <button onClick={mandaAMe} disabled={!anteprima || stato === 'invio'}
          style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !anteprima || stato === 'invio' ? 0.6 : 1 }}>
          {stato === 'invio' ? 'Invio…' : 'Mandala a me'}
        </button>
      </div>
      {stato && stato !== 'invio' && <div style={{ marginTop: 8, fontSize: 13, color: '#276749' }}>{stato}</div>}
      {errore && <div style={{ marginTop: 8, fontSize: 13, color: '#c53030' }}>{errore}</div>}

      {anteprima && <>
        <div style={{ marginTop: 12, fontSize: 13, color: '#555', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
          <strong>Oggetto:</strong> {anteprima.oggetto}
        </div>
        {anteprima.saltato && (
          <div style={{ marginTop: 8, fontSize: 12.5, color: '#8a5a12', background: '#fffbeb', borderRadius: 8, padding: '8px 12px' }}>
            Per questa azienda la settimana {anteprima.periodo} non ha avuto novità: col giro vero non partirebbe.
          </div>
        )}
        {anteprima.senza_entita && (
          <div style={{ marginTop: 8, fontSize: 12.5, color: '#8a5a12', background: '#fffbeb', borderRadius: 8, padding: '8px 12px' }}>
            Questa azienda non ha ancora un'attività: non riceverebbe niente.
          </div>
        )}
        <iframe title="Anteprima del resoconto" sandbox="" srcDoc={anteprima.html}
          style={{ marginTop: 10, width: '100%', height: 620, border: '1px solid #eee', borderRadius: 10, background: '#f5f5f5' }} />
      </>}
    </div>
  )
}
