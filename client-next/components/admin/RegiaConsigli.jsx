'use client'
import { useEffect, useState } from 'react'
import { Sparkles, Trash2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'

// I consigli personali nella regia del Club (solo super_admin). Ogni consiglio
// = un segnale del catalogo (quando scatta) + le sue soglie + titolo e perché
// con i segnaposti + il pulsante. L'anteprima dice su quali clienti
// scatterebbe oggi, prima di attivarlo.
const VUOTO = { segnale: '', parametri: {}, mestieri: [], titolo: '', perche: '', azione: '', stato: 'bozza', ordine: 100 }
const campo = { width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 8, padding: '9px 11px', fontSize: 14, fontFamily: 'inherit' }
const etichetta = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#444', margin: '12px 0 5px' }
const pillola = su => ({ border: '1px solid #ddd', borderRadius: 20, padding: '6px 13px', fontSize: 13, cursor: 'pointer', background: su ? '#1a1a2e' : '#fff', color: su ? '#fff' : '#1a1a2e' })

export default function RegiaConsigli() {
  const [dati, setDati] = useState(null)
  const [mestieri, setMestieri] = useState([])
  const [modulo, setModulo] = useState(null)
  const [nota, setNota] = useState('')
  const [prova, setProva] = useState(null)
  const [lavoro, setLavoro] = useState('')
  const [errore, setErrore] = useState('')

  const carica = () => Promise.all([apiFetch('/api/club/regia/consigli'), apiFetch('/api/club/regia')])
    .then(([c, r]) => { setDati(c); setMestieri(r.mestieri || []) }).catch(e => setErrore(e.message))
  useEffect(() => { carica() }, [])

  const segnale = modulo && dati?.segnali.find(s => s.chiave === modulo.segnale)
  const cambia = (k, v) => { setProva(null); setModulo(m => ({ ...m, [k]: v })) }
  function apri(c = {}) {
    setErrore(''); setNota(''); setProva(null)
    setModulo({ ...VUOTO, ...c, mestieri: c.mestieri || [], azione: c.azione || '' })
  }
  function scegliSegnale(chiave) {
    const s = dati.segnali.find(x => x.chiave === chiave)
    setProva(null)
    setModulo(m => ({ ...m, segnale: chiave, parametri: Object.fromEntries((s?.parametri || []).map(p => [p.chiave, m.parametri?.[p.chiave] ?? p.predefinito])) }))
  }
  const corpo = stato => JSON.stringify({ ...modulo, ...(stato ? { stato } : {}), mestieri: modulo.mestieri.length ? modulo.mestieri : null })

  async function conAI() {
    setErrore(''); setLavoro('ai')
    try {
      const r = await apiFetch('/api/club/regia/consigli/bozza', { method: 'POST', body: JSON.stringify({ segnale: modulo.segnale, nota }) })
      setModulo(m => ({ ...m, titolo: r.titolo || m.titolo, perche: r.perche || m.perche, azione: r.azione || m.azione }))
      if (r.avviso) setErrore(r.avviso)
    } catch (e) { setErrore(e.message) } finally { setLavoro('') }
  }
  async function anteprima() {
    setErrore(''); setLavoro('prova')
    try { setProva(await apiFetch('/api/club/regia/consigli/anteprima', { method: 'POST', body: corpo() })) }
    catch (e) { setErrore(e.message) } finally { setLavoro('') }
  }
  async function salva(stato) {
    setErrore(''); setLavoro('salva')
    try {
      if (modulo.id) await apiFetch(`/api/club/regia/consigli/${modulo.id}`, { method: 'PATCH', body: corpo(stato) })
      else await apiFetch('/api/club/regia/consigli', { method: 'POST', body: corpo(stato) })
      setModulo(null); await carica()
    } catch (e) { setErrore(e.message) } finally { setLavoro('') }
  }
  async function elimina() {
    if (!window.confirm(`Eliminare il consiglio «${modulo.titolo}»?`)) return
    setLavoro('salva')
    try { await apiFetch(`/api/club/regia/consigli/${modulo.id}`, { method: 'DELETE' }); setModulo(null); await carica() }
    catch (e) { setErrore(e.message) } finally { setLavoro('') }
  }

  if (!dati) return <p style={{ color: errore ? '#c53030' : '#888' }}>{errore || 'Carico i consigli…'}</p>

  if (modulo) return (
    <div data-consiglio-modulo style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '18px 20px' }}>
      <button type="button" onClick={() => setModulo(null)} style={{ background: 'none', border: 'none', color: '#1a1a2e', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 8 }}>← Torna all'elenco</button>

      <label style={etichetta}>Quando scatta</label>
      <select data-campo="segnale" value={modulo.segnale} onChange={e => scegliSegnale(e.target.value)} style={campo}>
        <option value="">Scegli il segnale…</option>
        {dati.segnali.map(s => <option key={s.chiave} value={s.chiave}>{s.nome}</option>)}
      </select>
      {segnale && <div style={{ fontSize: 12.5, color: '#666', marginTop: 5 }}>{segnale.descrizione}</div>}

      {segnale && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 12px' }}>
          {segnale.parametri.map(p => (
            <div key={p.chiave}><label style={etichetta}>{p.nome}</label>
              <input type="number" data-parametro={p.chiave} min={p.min} max={p.max} value={modulo.parametri?.[p.chiave] ?? p.predefinito}
                onChange={e => cambia('parametri', { ...modulo.parametri, [p.chiave]: e.target.value })} style={campo} /></div>
          ))}
        </div>
      )}

      <label style={etichetta}>Per chi</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => cambia('mestieri', [])} style={pillola(!modulo.mestieri.length)}>Tutti</button>
        {mestieri.map(m => {
          const su = modulo.mestieri.includes(m.chiave)
          return <button key={m.chiave} type="button" onClick={() => cambia('mestieri', su ? modulo.mestieri.filter(x => x !== m.chiave) : [...modulo.mestieri, m.chiave])} style={pillola(su)}>{m.nome}</button>
        })}
      </div>

      {segnale && (
        <div style={{ background: '#f6f7fb', borderRadius: 10, padding: '12px 14px', marginTop: 16 }}>
          <label style={{ ...etichetta, marginTop: 0 }}>Indicazioni per l'AI (facoltative)</label>
          <textarea data-nota value={nota} onChange={e => setNota(e.target.value)} rows={2} style={campo} placeholder="Es. tono diretto, suggerisci di scrivere entro domani" />
          <button type="button" data-scrivi-ai onClick={conAI} disabled={!!lavoro}
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, background: '#6b21a8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: lavoro ? 0.6 : 1 }}>
            <Sparkles size={15} strokeWidth={1.5} color="#fff" /> {lavoro === 'ai' ? 'Sto scrivendo…' : 'Scrivi titolo e perché con l’AI'}
          </button>
        </div>
      )}

      <label style={etichetta}>Titolo</label>
      <input data-campo="titolo" value={modulo.titolo} onChange={e => cambia('titolo', e.target.value)} maxLength={200} style={campo} />
      {segnale && (
        <div style={{ fontSize: 12, color: '#666', marginTop: 4, lineHeight: 1.8 }}>
          Numeri che puoi usare: {segnale.segnaposti.map(k => <code key={k} style={{ background: '#f2f2f4', borderRadius: 4, padding: '1px 5px', marginRight: 4 }}>{`{${k}}`}</code>)}
        </div>
      )}
      <label style={etichetta}>Perché conta e cosa fare</label>
      <textarea data-campo="perche" value={modulo.perche} onChange={e => cambia('perche', e.target.value)} rows={4} style={{ ...campo, lineHeight: 1.5 }} />
      <label style={etichetta}>Pulsante</label>
      <select data-campo="azione" value={modulo.azione || ''} onChange={e => cambia('azione', e.target.value)} style={campo}>
        <option value="">Nessun pulsante</option>
        {dati.azioni.map(a => <option key={a.chiave} value={a.chiave}>{a.testo}</option>)}
      </select>
      <label style={etichetta}>Priorità (più basso = mostrato prima)</label>
      <input type="number" data-campo="ordine" value={modulo.ordine} min={0} max={1000} onChange={e => cambia('ordine', e.target.value)} style={{ ...campo, maxWidth: 140 }} />

      {segnale && (
        <div style={{ marginTop: 18 }}>
          <button type="button" data-anteprima onClick={anteprima} disabled={!!lavoro || !modulo.titolo}
            style={{ background: '#fff', color: '#1a1a2e', border: '1px solid #1a1a2e', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {lavoro === 'prova' ? 'Guardo i clienti…' : 'Su chi scatterebbe oggi?'}
          </button>
          {prova && (
            <div data-esito-anteprima style={{ marginTop: 10, fontSize: 13.5, color: '#333' }}>
              {prova.scatta.length
                ? <>Oggi scatterebbe su <b>{prova.scatta.length}</b> clienti su {prova.aziende}:
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{prova.scatta.map(x => <li key={x.azienda}><b>{x.azienda}</b>: {x.titolo}</li>)}</ul></>
                : `Oggi non scatterebbe su nessuno dei ${prova.aziende} clienti.`}
            </div>
          )}
        </div>
      )}

      {errore && <div style={{ color: '#c53030', fontSize: 13, marginTop: 12 }}>{errore}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
        <button type="button" data-attiva onClick={() => salva('attivo')} disabled={!!lavoro}
          style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Attiva</button>
        <button type="button" data-salva-bozza onClick={() => salva('bozza')} disabled={!!lavoro}
          style={{ background: '#fff', color: '#1a1a2e', border: '1px solid #ccc', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Salva come bozza</button>
        {modulo.id && (
          <button type="button" onClick={elimina} disabled={!!lavoro}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'none', color: '#c53030', border: 'none', fontSize: 13, cursor: 'pointer' }}>
            <Trash2 size={14} strokeWidth={1.5} color="#c53030" /> Elimina
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>«Attiva»: lo vedono i clienti su cui scatta. Una bozza la vedi solo tu, nella Dashboard delle aziende.</div>
    </div>
  )

  const nomeSegnale = k => dati.segnali.find(s => s.chiave === k)?.nome || k
  return (
    <div>
      <p style={{ fontSize: 14, color: '#555', margin: '0 0 14px' }}>I consigli scattano da soli sui numeri di ogni cliente. Qui scegli quando, cosa dicono e dove portano.</p>
      <button type="button" data-nuovo-consiglio onClick={() => apri()}
        style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 18 }}>+ Nuovo consiglio</button>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
        {dati.consigli.map(c => (
          <button key={c.id} type="button" data-regia-consiglio={c.id} onClick={() => apri(c)}
            style={{ textAlign: 'left', background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '11px 14px', cursor: 'pointer' }}>
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: c.stato === 'attivo' ? '#2e7d32' : '#92400e', textTransform: 'uppercase' }}>
              {c.stato === 'attivo' ? 'Attivo' : 'Bozza'} · {nomeSegnale(c.segnale)}
            </span>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{c.titolo}</span>
            <span style={{ display: 'block', fontSize: 12, color: '#666' }}>
              {c.mestieri?.length ? mestieri.filter(m => c.mestieri.includes(m.chiave)).map(m => m.nome).join(', ') : 'Per tutti'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
