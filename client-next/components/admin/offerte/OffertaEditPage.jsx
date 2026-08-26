'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAzienda } from '../../../context/AziendaContext'
import { apiFetch } from '../../../lib/api'
import { MODI, IMPEGNI, modoDi, impegnoDi } from '../../../lib/offerte-catalogo'
import { Trash2, ArrowLeft } from 'lucide-react'

// Le due tendine in cima non sono un dettaglio tecnico: decidono cosa vede chi
// arriva sul sito. Per questo hanno la spiegazione sotto, scritta per chi le
// legge la prima volta.

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }
const cardStyle = { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }
const aiuto = { margin: '6px 0 0', fontSize: 12, color: '#999' }

// Un `datetime-local` vuole `2026-08-26T20:30`, il database restituisce un ISO
// con fuso: senza questa conversione il campo resta vuoto e salvando si perde
// la data che c'era.
const perInput = iso => iso ? new Date(iso).toISOString().slice(0, 16) : ''

export default function OffertaEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const { strutture, ristoranti, attivita } = useAzienda()
  const [o, setO] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [salvato, setSalvato] = useState(false)
  const [errore, setErrore] = useState(null)

  useEffect(() => {
    apiFetch(`/api/offerte`).then(lista => {
      const trovata = (Array.isArray(lista) ? lista : []).find(x => x.id === id)
      if (!trovata) setErrore('Offerta non trovata')
      else setO(trovata)
    }).catch(e => setErrore(e.message))
  }, [id])

  const entita = [
    ...(strutture || []).map(e => ({ id: e.id, etichetta: `Struttura: ${e.name}` })),
    ...(ristoranti || []).map(e => ({ id: e.id, etichetta: `Ristorante: ${e.name}` })),
    ...(attivita || []).map(e => ({ id: e.id, etichetta: `Attività: ${e.name}` })),
  ]

  const set = (k, v) => setO(x => ({ ...x, [k]: v }))

  async function salva() {
    setSalvando(true); setErrore(null)
    try {
      const campi = ['entity_id', 'modo', 'impegno', 'titolo', 'descrizione', 'categoria', 'luogo',
        'prezzo', 'mostra_prezzo', 'prezzo_testo', 'data_inizio', 'data_fine', 'posti_totali',
        'cta_label', 'cta_condizioni', 'avvisa_titolare', 'conferma_ospite', 'attiva', 'pubblicata']
      const body = Object.fromEntries(campi.map(k => [k, o[k] ?? null]))
      const agg = await apiFetch(`/api/offerte/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
      setO(agg); setSalvato(true); setTimeout(() => setSalvato(false), 2000)
    } catch (e) { setErrore(e.message) }
    finally { setSalvando(false) }
  }

  async function elimina() {
    if (!confirm('Eliminare questa offerta?')) return
    try { await apiFetch(`/api/offerte/${id}`, { method: 'DELETE' }); router.push('/admin/offerte') }
    catch (e) { setErrore(e.message) }
  }

  if (errore && !o) return <p style={{ padding: 32, color: '#e53e3e' }}>{errore}</p>
  if (!o) return <p style={{ padding: 32, color: '#888' }}>Caricamento…</p>

  const modo = modoDi(o.modo)
  const impegno = impegnoDi(o.impegno)

  return (
    <div style={{ maxWidth: 700 }}>
      <button onClick={() => router.push('/admin/offerte')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#666', padding: 0, marginBottom: 16 }}>
        <ArrowLeft size={16} strokeWidth={1.5} /> Tutte le offerte
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, overflowWrap: 'anywhere' }}>{o.titolo || 'Offerta'}</h2>
        <button onClick={elimina}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff5f5', color: '#c53030', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          <Trash2 size={14} strokeWidth={1.5} /> Elimina
        </button>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Quando si fa</label>
            <select style={inputStyle} value={o.modo || 'richiesta'} onChange={e => set('modo', e.target.value)}>
              {MODI.map(m => <option key={m.chiave} value={m.chiave}>{m.titolo}</option>)}
            </select>
            <p style={aiuto}>{modo.spiega}</p>
          </div>
          <div>
            <label style={labelStyle}>Cosa succede quando cliccano</label>
            <select style={inputStyle} value={o.impegno || 'chiedi'} onChange={e => set('impegno', e.target.value)}>
              {IMPEGNI.map(i => <option key={i.chiave} value={i.chiave}>{i.titolo}</option>)}
            </select>
            <p style={aiuto}>{impegno.spiega}</p>
          </div>
        </div>
        {impegno.vuolePagamento && (
          <p style={{ margin: '14px 0 0', padding: '10px 12px', background: '#fff8e6', borderRadius: 8, fontSize: 12, color: '#856404' }}>
            Il pagamento online non è ancora collegato: per ora «Acquista ora» si comporta come «Prenota».
          </p>
        )}
      </div>

      <div style={cardStyle}>
        <label style={labelStyle}>Titolo</label>
        <input style={inputStyle} value={o.titolo || ''} onChange={e => set('titolo', e.target.value)} />

        <label style={{ ...labelStyle, marginTop: 16 }}>Su quale sito</label>
        <select style={inputStyle} value={o.entity_id || ''} onChange={e => set('entity_id', e.target.value || null)}>
          <option value="">Nessuno — vale per tutte le tue attività</option>
          {entita.map(e => <option key={e.id} value={e.id}>{e.etichetta}</option>)}
        </select>

        <label style={{ ...labelStyle, marginTop: 16 }}>Descrizione</label>
        <textarea style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }} value={o.descrizione || ''} onChange={e => set('descrizione', e.target.value)} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16, marginTop: 16 }}>
          <div>
            <label style={labelStyle}>Categoria</label>
            <input style={inputStyle} value={o.categoria || ''} onChange={e => set('categoria', e.target.value)} placeholder="Sport, Benessere…" />
            <p style={aiuto}>Raggruppa le offerte simili sul sito.</p>
          </div>
          <div>
            <label style={labelStyle}>Luogo</label>
            <input style={inputStyle} value={o.luogo || ''} onChange={e => set('luogo', e.target.value)} />
          </div>
        </div>
      </div>

      {modo.vuoleData && (
        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
            <div>
              <label style={labelStyle}>Inizio</label>
              <input type="datetime-local" style={inputStyle} value={perInput(o.data_inizio)} onChange={e => set('data_inizio', e.target.value || null)} />
            </div>
            <div>
              <label style={labelStyle}>Fine</label>
              <input type="datetime-local" style={inputStyle} value={perInput(o.data_fine)} onChange={e => set('data_fine', e.target.value || null)} />
            </div>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Prezzo</label>
            <input type="number" min="0" step="0.01" style={inputStyle} value={o.prezzo ?? ''} onChange={e => set('prezzo', e.target.value === '' ? null : Number(e.target.value))} />
            {/* ⚠️ Il totale di una prenotazione si calcola sempre da `prezzo`:
                quello sotto è solo ciò che si legge. Se divergono si addebita
                una cifra che il cliente non ha mai visto. */}
            <p style={aiuto}>Su questo si calcola il totale, anche se sotto scrivi altro.</p>
          </div>
          {modo.vuolePosti && (
            <div>
              <label style={labelStyle}>Posti totali</label>
              <input type="number" min="0" style={inputStyle} value={o.posti_totali ?? ''} onChange={e => set('posti_totali', e.target.value === '' ? null : Number(e.target.value))} />
              <p style={aiuto}>Vuoto = senza limite. {o.posti_occupati ? `Già presi: ${o.posti_occupati}.` : ''}</p>
            </div>
          )}
        </div>

        <label style={{ ...labelStyle, marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={o.mostra_prezzo !== false} onChange={e => set('mostra_prezzo', e.target.checked)} />
          Mostra il prezzo
        </label>
        <label style={{ ...labelStyle, marginTop: 12 }}>Oppure scrivilo a parole</label>
        <input style={inputStyle} value={o.prezzo_testo || ''} onChange={e => set('prezzo_testo', e.target.value)} placeholder="Alla carta, su preventivo…" />
        <p style={aiuto}>Se compilato, sul sito compare questo al posto della cifra.</p>
      </div>

      <div style={cardStyle}>
        <label style={labelStyle}>Testo del pulsante</label>
        <input style={inputStyle} value={o.cta_label || ''} onChange={e => set('cta_label', e.target.value)} placeholder={impegno.titolo} />
        <label style={{ ...labelStyle, marginTop: 16 }}>Condizioni</label>
        <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={o.cta_condizioni || ''} onChange={e => set('cta_condizioni', e.target.value)} />
        <p style={aiuto}>Compaiono sotto al pulsante. Puoi usare &lt;b&gt;, &lt;i&gt; e &lt;br&gt;.</p>
      </div>

      <div style={cardStyle}>
        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={o.avvisa_titolare !== false} onChange={e => set('avvisa_titolare', e.target.checked)} />
          Avvisami per email a ogni prenotazione
        </label>
        <label style={{ ...labelStyle, marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={!!o.conferma_ospite} onChange={e => set('conferma_ospite', e.target.checked)} />
          Manda una conferma a chi prenota
        </label>
        <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '18px 0' }} />
        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={!!o.attiva} onChange={e => set('attiva', e.target.checked)} />
          Attiva
        </label>
        <label style={{ ...labelStyle, marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={!!o.pubblicata} onChange={e => set('pubblicata', e.target.checked)} />
          Pubblicata sul sito
        </label>
        <p style={aiuto}>Finché non è pubblicata la vedi solo tu.</p>
      </div>

      {errore && <p style={{ color: '#e53e3e', fontSize: 13, marginBottom: 12 }}>{errore}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={salva} disabled={salvando}
          style={{ padding: '11px 22px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: salvando ? 'wait' : 'pointer' }}>
          {salvando ? 'Salvo…' : 'Salva'}
        </button>
        {salvato && <span style={{ fontSize: 13, color: '#155724' }}>Salvato</span>}
      </div>
    </div>
  )
}
