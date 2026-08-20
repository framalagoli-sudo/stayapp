'use client'
import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { X, Upload, AlertCircle, CheckCircle, FileText } from 'lucide-react'

// Import di una rubrica, in due tempi: prima si vede cosa succederebbe, poi si
// conferma. Un import sbagliato su migliaia di numeri non si annulla con un tasto,
// quindi l'anteprima non è un vezzo ma la difesa principale.
export default function ContattiImportModal({ aziendaId, onFatto, onClose }) {
  const [testo, setTesto] = useState('')
  const [nomeFile, setNomeFile] = useState('')
  const [lista, setLista] = useState('')
  const [anteprima, setAnteprima] = useState(null)
  const [esito, setEsito] = useState(null)
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)

  function leggiFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrore(''); setAnteprima(null); setEsito(null)
    setNomeFile(file.name)
    const r = new FileReader()
    r.onload = () => setTesto(String(r.result || ''))
    r.onerror = () => setErrore('Non riesco a leggere il file.')
    r.readAsText(file, 'UTF-8')
  }

  async function chiedi(conferma) {
    setAttesa(true); setErrore('')
    try {
      const res = await apiFetch('/api/contatti/import', {
        method: 'POST',
        body: JSON.stringify({ csv: testo, lista: lista.trim(), azienda_id: aziendaId, conferma }),
      })
      if (conferma) { setEsito(res); onFatto?.() } else setAnteprima(res)
    } catch (e) { setErrore(e.message) }
    setAttesa(false)
  }

  const box = { background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }
  const btn = { padding: '11px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={box}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Importa contatti</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {!esito && (
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#666', lineHeight: 1.5 }}>
            Carica un file CSV esportato dalla rubrica del telefono (Contatti Google, iCloud)
            o dal tuo gestionale. Riconosciamo da soli le colonne di nome, email e telefono.
          </p>
        )}

        {esito ? (
          <>
            <div style={{ display: 'flex', gap: 10, background: '#f4fbf5', border: '1px solid #c8e6c9', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <CheckCircle size={18} strokeWidth={1.5} color="#2e7d32" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Import completato</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>
                  {esito.creati} nuovi contatti · {esito.aggiornati} già presenti aggiornati
                  {esito.scartati ? ` · ${esito.scartati} righe scartate` : ''}
                  {esito.lista ? ` · lista "${esito.lista}"` : ''}
                </p>
              </div>
            </div>
            <NotaConsenso />
            <button onClick={onClose} style={{ ...btn, background: '#1a1a2e', color: '#fff', width: '100%' }}>Chiudi</button>
          </>
        ) : (
          <>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '2px dashed #ddd', borderRadius: 10, padding: '20px 16px', cursor: 'pointer', marginBottom: 14 }}>
              <FileText size={18} strokeWidth={1.5} color="#888" />
              <span style={{ fontSize: 14, color: nomeFile ? '#1a1a2e' : '#888', fontWeight: nomeFile ? 600 : 400, overflowWrap: 'anywhere' }}>
                {nomeFile || 'Scegli un file CSV…'}
              </span>
              <input type="file" accept=".csv,text/csv,text/plain" onChange={leggiFile} style={{ display: 'none' }} />
            </label>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4, display: 'block' }}>
              Aggiungi tutti a una lista (facoltativo)
            </label>
            <input
              value={lista}
              onChange={e => setLista(e.target.value)}
              placeholder="es. clienti-2026"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
            />

            {errore && (
              <div style={{ display: 'flex', gap: 8, background: '#fff5f5', border: '1px solid #ffcdd2', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                <AlertCircle size={16} strokeWidth={1.5} color="#c62828" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, color: '#c62828', overflowWrap: 'anywhere' }}>{errore}</span>
              </div>
            )}

            {anteprima && (
              <div style={{ border: '1px solid #eee', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700 }}>Cosa succederà</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 4, fontSize: 13, color: '#555' }}>
                  <span><strong>{anteprima.nuovi}</strong> contatti nuovi</span>
                  <span><strong>{anteprima.gia_presenti}</strong> già presenti — verranno solo aggiunti alla lista, senza sovrascrivere i dati</span>
                  {anteprima.scartati > 0 && <span><strong>{anteprima.scartati}</strong> righe scartate (né email né telefono validi, o doppioni)</span>}
                </div>
                {anteprima.esempio?.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 12, color: '#888' }}>Esempio di come li leggiamo:</p>
                    {anteprima.esempio.map((c, i) => (
                      <p key={i} style={{ margin: '2px 0', fontSize: 12, color: '#555', overflowWrap: 'anywhere' }}>
                        {c.nome} · {c.email || '—'} · {c.telefono || '—'}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <NotaConsenso />

            <div style={{ display: 'flex', gap: 8 }}>
              {!anteprima ? (
                <button onClick={() => chiedi(false)} disabled={!testo || attesa} style={{ ...btn, background: '#1a1a2e', color: '#fff', flex: 1, opacity: !testo || attesa ? 0.5 : 1 }}>
                  {attesa ? 'Controllo…' : 'Controlla il file'}
                </button>
              ) : (
                <>
                  <button onClick={() => setAnteprima(null)} disabled={attesa} style={{ ...btn, background: 'transparent', color: '#555', border: '1px solid #ddd' }}>
                    Indietro
                  </button>
                  <button onClick={() => chiedi(true)} disabled={attesa} style={{ ...btn, background: '#2e7d32', color: '#fff', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: attesa ? 0.6 : 1 }}>
                    <Upload size={15} strokeWidth={1.5} /> {attesa ? 'Importo…' : `Importa ${anteprima.nuovi + anteprima.gia_presenti} contatti`}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Compare sempre, prima e dopo l'import: nessuno deve credere di aver importato
// anche il permesso di scrivere su WhatsApp.
function NotaConsenso() {
  return (
    <div style={{ display: 'flex', gap: 8, background: '#fffaf5', border: '1px solid #ffe0b2', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
      <span style={{ fontSize: 15, lineHeight: 1.2 }}>⚠️</span>
      <p style={{ margin: 0, fontSize: 12, color: '#7a4a00', lineHeight: 1.5 }}>
        <strong>Nota bene:</strong> i contatti importati <strong>non</strong> risultano autorizzati a ricevere
        messaggi su WhatsApp. Il consenso va raccolto a parte — dai tuoi form, oppure segnandolo
        sul singolo contatto se te l’hanno dato di persona. Scrivere a chi non l’ha dato porta a
        segnalazioni e <strong>può farti bloccare il numero da Meta</strong>.
      </p>
    </div>
  )
}
