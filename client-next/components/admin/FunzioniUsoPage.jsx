'use client'
import { useEffect, useState } from 'react'
import { SlidersHorizontal, AlertTriangle } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import ProfiliMestiere from './ProfiliMestiere'
import AssegnaCategorie from './AssegnaCategorie'

// Chi usa cosa, azienda per azienda. Solo per il super_admin.
//
// È la fotografia da cui partono i profili di mestiere (STRATEGIA.md §6.1):
// prima di decidere quali funzioni un profilo accende, si guarda quali vengono
// usate davvero. Qui non si accende e non si spegne niente — si guarda.
//
// «Usata» vuol dire che nel database c'è almeno una riga di quell'azienda per
// quella funzione. Non dice se la usa bene né se la usa ancora: dice che l'ha
// usata almeno una volta.

const card = { background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #eee', marginBottom: 20 }
const titoletto = { fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }
const nota = { fontSize: 13, color: '#888', margin: '0 0 16px' }
const PRIMARIO = '#00b5b5'
const TIPO = { struttura: 'Struttura', ristorante: 'Ristorante', attivita: 'Attività' }

function Pastiglia({ accesa, children, title }) {
  return (
    <span title={title} style={{
      display: 'inline-block', fontSize: 12, padding: '3px 9px', borderRadius: 999, margin: '0 6px 6px 0',
      background: accesa ? '#e6f7f7' : '#f3f3f3', color: accesa ? '#00797a' : '#999',
      border: `1px solid ${accesa ? '#bfe9e9' : '#e6e6e6'}`,
    }}>{children}</span>
  )
}

export default function FunzioniUsoPage() {
  const [dati, setDati] = useState(null)
  const [errore, setErrore] = useState('')
  const [scheda, setScheda] = useState('uso')

  const carica = () => apiFetch('/api/admin/funzioni-uso')
    .then(setDati)
    .catch(e => setErrore(e?.message || 'Impossibile leggere l\'uso delle funzioni'))
  useEffect(() => { carica() }, [])

  if (errore) return <div style={{ padding: 40 }}><div style={{ ...card, borderColor: '#f5c6cb', background: '#fff5f5', color: '#c0392b' }}>{errore}</div></div>
  if (!dati) return <div style={{ padding: 40, color: '#888' }}>Caricamento…</div>

  const { aziende, funzioniAzienda, funzioniEntita, nonMisurate } = dati
  const totale = aziende.length

  // Le funzioni ordinate da quella usata da più aziende a quella da nessuna.
  const perFunzione = funzioniAzienda.map(f => {
    const chi = aziende.filter(a => a.uso[f.chiave] > 0)
    return { ...f, chi, righe: chi.reduce((s, a) => s + a.uso[f.chiave], 0) }
  }).sort((a, b) => b.chi.length - a.chi.length || b.righe - a.righe)
  const maiUsate = perFunzione.filter(f => f.chi.length === 0)

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <SlidersHorizontal size={26} strokeWidth={1.5} color={PRIMARIO} />
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Funzioni e profili</h1>
      </div>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 20, maxWidth: 720 }}>
        Chi usa cosa, azienda per azienda; i profili di mestiere; e la categoria di ogni entità.
        Solo la scheda «Categorie» cambia cosa vede un cliente.
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 22, borderBottom: '1px solid #e6e6e6' }}>
        {[['uso', 'Uso'], ['profili', 'Profili di mestiere'], ['categorie', 'Categorie']].map(([k, t]) => (
          <button key={k} onClick={() => setScheda(k)} style={{
            padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
            fontWeight: scheda === k ? 700 : 500, color: scheda === k ? '#1a1a2e' : '#888',
            borderBottom: `2px solid ${scheda === k ? PRIMARIO : 'transparent'}`, marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {scheda === 'categorie' && <AssegnaCategorie aziende={aziende} onCambiato={carica} />}

      {scheda === 'profili' && (
        <ProfiliMestiere
          entitaPerProfilo={aziende.flatMap(a => a.entita).reduce((m, e) => (e.profilo ? { ...m, [e.profilo]: (m[e.profilo] || 0) + 1 } : m), {})}
          totaleAziende={totale}
          usoPerFunzione={Object.fromEntries(perFunzione.map(f => [f.chiave, f.chi.length]))} />
      )}

      {scheda === 'uso' && <>
      {nonMisurate?.length > 0 && (
        <div style={{ ...card, borderColor: '#fde2b3', background: '#fffaf0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={18} strokeWidth={1.5} color="#b7791f" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 13, color: '#8a5a00' }}>
            Non misurate (tabella illeggibile): {nonMisurate.join(', ')}. Per queste «zero» non vuol dire «mai usata».
          </span>
        </div>
      )}

      {/* ── Il catalogo ─────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={titoletto}>Funzioni dell'azienda</div>
        <p style={nota}>
          Un'azienda senza categoria le vede tutte; con la categoria, solo quelle dei profili delle sue entità. «Usata» = almeno una riga nel database.
          {maiUsate.length > 0 && <> Mai usate da nessuno: <strong>{maiUsate.map(f => f.titolo).join(', ')}</strong>.</>}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
          {perFunzione.map(f => (
            <div key={f.chiave}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14, marginBottom: 5 }}>
                <span style={{ fontWeight: 600, color: f.chi.length ? '#1a1a2e' : '#aaa' }}>{f.titolo}</span>
                <span style={{ color: '#888', whiteSpace: 'nowrap' }}>{f.chi.length} su {totale}</span>
              </div>
              <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, marginBottom: 7 }}>
                <div style={{ height: 6, borderRadius: 3, background: PRIMARIO, width: `${totale ? (f.chi.length / totale) * 100 : 0}%` }} />
              </div>
              {f.chi.map(a => (
                <Pastiglia key={a.id} accesa title={`${a.uso[f.chiave]} righe`}>
                  <span style={{ overflowWrap: 'anywhere' }}>{a.nome}</span> · {a.uso[f.chiave]}
                </Pastiglia>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── La matrice ──────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={titoletto}>Matrice aziende × funzioni</div>
        <p style={nota}>Il numero è quante righe ha quell'azienda per quella funzione. Il punto vuol dire nessuna.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 10px', position: 'sticky', left: 0, background: '#fff', borderBottom: '1px solid #eee' }}>Azienda</th>
                {perFunzione.map(f => (
                  <th key={f.chiave} style={{ padding: '6px 6px', borderBottom: '1px solid #eee', color: '#666', fontWeight: 600, whiteSpace: 'nowrap' }}>{f.titolo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aziende.map(a => (
                <tr key={a.id}>
                  <td style={{ padding: '6px 10px', position: 'sticky', left: 0, background: '#fff', borderBottom: '1px solid #f5f5f5', fontWeight: 600, minWidth: 160, maxWidth: 220, overflowWrap: 'anywhere' }}>{a.nome}</td>
                  {perFunzione.map(f => {
                    const n = a.uso[f.chiave] || 0
                    return (
                      <td key={f.chiave} style={{ textAlign: 'center', padding: '6px', borderBottom: '1px solid #f5f5f5', color: n ? '#00797a' : '#ccc', fontWeight: n ? 700 : 400 }}>
                        {n || '·'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Le entità ───────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={titoletto}>Funzioni delle entità</div>
        <p style={nota}>
          Queste hanno già un interruttore (pagina Funzioni di ogni entità). In colore quelle accese: accesa non vuol dire usata.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
          {aziende.filter(a => a.entita.length).map(a => (
            <div key={a.id}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 8, overflowWrap: 'anywhere' }}>{a.nome}</div>
              {a.entita.map(e => (
                <div key={e.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8, marginBottom: 6, paddingLeft: 12 }}>
                  <span style={{ fontSize: 13, color: '#444', minWidth: 0, overflowWrap: 'anywhere' }}>
                    {e.nome} <span style={{ color: '#aaa' }}>· {TIPO[e.tipo] || e.tipo}</span>
                  </span>
                  <span>
                    {funzioniEntita.filter(f => !f.sempre).map(f => (
                      <Pastiglia key={f.chiave} accesa={e.accese.includes(f.chiave)}>{f.titolo}</Pastiglia>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      </>}
    </div>
  )
}
