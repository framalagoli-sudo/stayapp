'use client'
import { useEffect, useState } from 'react'
import { Activity, Bell, BellOff, RefreshCw, Send, CheckCircle2, AlertTriangle } from 'lucide-react'
import { apiFetch } from '@/lib/api'

// Stato di salute della piattaforma.
//
// Nasce da due guasti rimasti invisibili per settimane — il webhook dei rimbalzi
// morto 45 giorni, il chatbot muto su due verticali su tre. Serviva un posto in
// cui *vedere* se le cose funzionano, invece di scoprirlo per caso.

const card = { background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #eee' }
const titoletto = { fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 14 }

export default function DiagnosticaPage() {
  const [dati, setDati] = useState(null)
  const [errore, setErrore] = useState('')
  const [caricando, setCaricando] = useState(true)
  const [invio, setInvio] = useState(null) // null | 'corso' | {ok, messaggio}

  async function carica() {
    setCaricando(true); setErrore('')
    try {
      setDati(await apiFetch('/api/admin/diagnostica'))
    } catch (e) {
      setErrore(e?.message || 'Impossibile leggere lo stato della piattaforma')
    } finally { setCaricando(false) }
  }
  useEffect(() => { carica() }, [])

  async function provaAvviso() {
    setInvio('corso')
    try {
      const r = await apiFetch('/api/admin/diagnostica', { method: 'POST' })
      setInvio(r)
    } catch (e) { setInvio({ ok: false, messaggio: e?.message || 'Invio fallito' }) }
  }

  if (caricando) return <div style={{ padding: 40, color: '#888' }}>Caricamento…</div>
  if (errore) return (
    <div style={{ padding: 40 }}>
      <div style={{ ...card, borderColor: '#f5c6cb', background: '#fff5f5', color: '#c0392b' }}>{errore}</div>
    </div>
  )

  const { avvisi, moduli, errori } = dati
  const inRitardo = (dati.processi || []).filter(p => p.inRitardo)
  const usati = moduli.filter(m => m.righe > 0).sort((a, b) => b.righe - a.righe)
  const fermi = moduli.filter(m => m.righe === 0)
  const massimo = Math.max(...usati.map(m => m.righe), 1)

  return (
    <div style={{ padding: 32, maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <Activity size={26} strokeWidth={1.5} color="#00b5b5" />
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Stato della piattaforma</h1>
      </div>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>
        Cosa funziona, cosa è fermo e dove arrivano gli allarmi.
      </p>

      {/* ── Avvisi ─────────────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 20, borderColor: avvisi.attivi ? '#d4edda' : '#f5c6cb' }}>
        <div style={titoletto}>Allarmi</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {avvisi.attivi
            ? <Bell size={22} strokeWidth={1.5} color="#2e7d32" />
            : <BellOff size={22} strokeWidth={1.5} color="#c0392b" />}
          <div style={{ flex: 1, minWidth: 0 }}>
            {avvisi.attivi ? (
              <>
                <div style={{ fontSize: 15, color: '#1a1a2e', overflowWrap: 'anywhere' }}>
                  Gli allarmi arrivano a <strong>{avvisi.destinatario}</strong>
                </div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                  Configurato in <code>{avvisi.sorgente}</code>. Ogni punto critico avvisa al massimo una volta all’ora.
                </div>
              </>
            ) : (
              <div style={{ fontSize: 15, color: '#c0392b' }}>{avvisi.nota}</div>
            )}

            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={provaAvviso} disabled={invio === 'corso' || !avvisi.attivi}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: avvisi.attivi ? '#1a1a2e' : '#ddd', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: avvisi.attivi ? 'pointer' : 'default' }}>
                <Send size={15} strokeWidth={1.5} color="#fff" />
                {invio === 'corso' ? 'Invio…' : 'Manda un avviso di prova'}
              </button>
              {invio && invio !== 'corso' && (
                <span style={{ fontSize: 13, color: invio.ok ? '#2e7d32' : '#c0392b' }}>
                  {invio.ok ? '✓ ' : '✕ '}{invio.messaggio || invio.motivo}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Processi automatici ────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 20, borderColor: inRitardo.length ? '#f5c6cb' : '#eee' }}>
        <div style={titoletto}>Processi automatici</div>
        {!dati.processi ? (
          <div style={{ fontSize: 14, color: '#e65100' }}>
            Il controllo non è attivo: manca la migration <code>077_cron_battiti.sql</code>.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 14 }}>
              Un processo che <em>fallisce</em> manda un errore. Uno che <em>smette di girare</em> non dice niente:
              qui si vede quando ognuno ha lavorato l’ultima volta.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
              {dati.processi.map(p => (
                <div key={p.nome} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                  {p.inRitardo
                    ? <AlertTriangle size={17} strokeWidth={1.5} color="#c0392b" />
                    : <CheckCircle2 size={17} strokeWidth={1.5} color="#2e7d32" />}
                  <div style={{ width: 130, flexShrink: 0, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{p.nome}</div>
                  <div style={{ flex: 1, minWidth: 0, color: p.inRitardo ? '#c0392b' : '#888', fontSize: 13 }}>
                    {p.inRitardo
                      ? `fermo da ${p.fermoDaMinuti} min (soglia ${p.sogliaMinuti})`
                      : `ultimo giro ${p.fermoDaMinuti < 1 ? 'poco fa' : `${p.fermoDaMinuti} min fa`}`}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#aaa' }}>{p.esecuzioni} giri</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Uso reale dei moduli ───────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={titoletto}>Quanto sono usati i moduli</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 9 }}>
          {usati.map(m => (
            <div key={m.nome} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 160, flexShrink: 0, fontSize: 14, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{m.nome}</div>
              <div style={{ flex: 1, minWidth: 0, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(2, (m.righe / massimo) * 100)}%`, height: '100%', background: '#00b5b5' }} />
              </div>
              <div style={{ width: 46, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#555' }}>{m.righe}</div>
            </div>
          ))}
        </div>

        {fermi.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
              Nessuno li ha mai usati — non è un guasto, è superficie che costa manutenzione:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {fermi.map(m => (
                <span key={m.nome} style={{ fontSize: 12.5, background: '#f7f7f7', color: '#777', border: '1px solid #eee', borderRadius: 999, padding: '4px 11px' }}>
                  {m.nome}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Errori ─────────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={titoletto}>Errori recenti</div>
        {!errori.registrati ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <AlertTriangle size={20} strokeWidth={1.5} color="#e65100" />
            <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{errori.nota}</div>
          </div>
        ) : errori.recenti.length === 0 ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: '#2e7d32' }}>
            <CheckCircle2 size={20} strokeWidth={1.5} color="#2e7d32" /> Nessun errore registrato di recente.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
            {errori.recenti.map((e, i) => (
              <div key={i} style={{ fontSize: 13, color: '#555', overflowWrap: 'anywhere' }}>
                <strong>{e.source}</strong> — {e.message}
                <span style={{ color: '#aaa' }}> · {new Date(e.created_at).toLocaleString('it-IT')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={carica}
        style={{ marginTop: 22, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '9px 16px', fontSize: 13.5, color: '#555', cursor: 'pointer' }}>
        <RefreshCw size={15} strokeWidth={1.5} color="#555" /> Aggiorna
      </button>
    </div>
  )
}
