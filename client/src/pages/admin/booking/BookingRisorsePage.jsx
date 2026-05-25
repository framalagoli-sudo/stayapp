import { useState, useEffect } from 'react'
import { apiFetch } from '../../../lib/api'

const GIORNI = [
  { key: 'lun', label: 'Lunedì' },
  { key: 'mar', label: 'Martedì' },
  { key: 'mer', label: 'Mercoledì' },
  { key: 'gio', label: 'Giovedì' },
  { key: 'ven', label: 'Venerdì' },
  { key: 'sab', label: 'Sabato' },
  { key: 'dom', label: 'Domenica' },
]

// Giorni JS (getDay): 0=dom, 1=lun..6=sab
const GIORNI_COPERTI = [
  { val: 1, label: 'Lunedì' }, { val: 2, label: 'Martedì' }, { val: 3, label: 'Mercoledì' },
  { val: 4, label: 'Giovedì' }, { val: 5, label: 'Venerdì' }, { val: 6, label: 'Sabato' }, { val: 0, label: 'Domenica' },
]

function emptyRisorsa() {
  return {
    nome: '', descrizione: '', modalita: 'slot',
    durata_minuti: 60, quantita: 1, max_coperti: 40,
    prezzo: 0, valuta: 'EUR', colore: '#00b5b5',
    disponibilita: {}, blocchi: [],
    anticipo_ore: 1, cancellazione_ore: 24, conferma_auto: true,
    attiva: true, visibile_minisito: true,
  }
}

function emptyDisponibilitaSlot() {
  return { lun: [{ start: '09:00', end: '18:00' }], mar: [{ start: '09:00', end: '18:00' }], mer: [{ start: '09:00', end: '18:00' }], gio: [{ start: '09:00', end: '18:00' }], ven: [{ start: '09:00', end: '18:00' }], sab: [], dom: [] }
}

function emptyDisponibilitaCoperti() {
  return {
    servizi: [
      { nome: 'Pranzo', orari: ['12:00', '12:30', '13:00'] },
      { nome: 'Cena',   orari: ['19:30', '20:00', '20:30'] },
    ],
    giorni_chiusura: [0], // domenica default
  }
}

export default function BookingRisorsePage() {
  const [risorse, setRisorse] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | risorsa object
  const [form, setForm] = useState(emptyRisorsa())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Promozioni
  const [showPromo, setShowPromo] = useState(null) // risorsa_id
  const [promozioni, setPromozioni] = useState([])
  const [promoForm, setPromoForm] = useState(null) // null | 'new' | promo object
  const [promoData, setPromoData] = useState({
    nome: '', descrizione: '', data_inizio: '', data_fine: '',
    ora_inizio: '', ora_fine: '', giorni_settimana: null,
    prezzo_speciale: '', badge_label: 'Offerta', colore: '#e53e3e', attiva: true,
  })

  useEffect(() => { loadRisorse() }, [])

  async function loadRisorse() {
    setLoading(true)
    try { setRisorse(await apiFetch('/api/booking/risorse')) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function openNew() {
    setForm(emptyRisorsa())
    setEditing('new')
    setError('')
  }

  function openEdit(r) {
    setForm({ ...r })
    setEditing(r)
    setError('')
  }

  function patch(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function patchDisp(key, val) {
    setForm(f => ({ ...f, disponibilita: { ...f.disponibilita, [key]: val } }))
  }

  function initDisp() {
    if (form.modalita === 'slot') {
      setForm(f => ({ ...f, disponibilita: emptyDisponibilitaSlot() }))
    } else {
      setForm(f => ({ ...f, disponibilita: emptyDisponibilitaCoperti() }))
    }
  }

  async function save() {
    if (!form.nome.trim()) { setError('Il nome è obbligatorio'); return }
    setSaving(true); setError('')
    try {
      if (editing === 'new') {
        await apiFetch('/api/booking/risorse', { method: 'POST', body: JSON.stringify(form) })
      } else {
        await apiFetch(`/api/booking/risorse/${editing.id}`, { method: 'PATCH', body: JSON.stringify(form) })
      }
      setEditing(null)
      loadRisorse()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function toggleAttiva(r) {
    await apiFetch(`/api/booking/risorse/${r.id}`, { method: 'PATCH', body: JSON.stringify({ attiva: !r.attiva }) })
    loadRisorse()
  }

  async function deleteRisorsa(r) {
    if (!confirm(`Eliminare "${r.nome}"? Le prenotazioni esistenti resteranno.`)) return
    await apiFetch(`/api/booking/risorse/${r.id}`, { method: 'DELETE' })
    loadRisorse()
  }

  // ─── Promozioni ──────────────────────────────────────────────────────────────

  async function openPromo(risorsa_id) {
    setShowPromo(risorsa_id)
    const data = await apiFetch(`/api/booking/promozioni?risorsa_id=${risorsa_id}`)
    setPromozioni(data)
  }

  async function savePromo() {
    if (!promoData.nome.trim()) return
    const body = { ...promoData, risorsa_id: showPromo }
    if (promoForm === 'new') {
      await apiFetch('/api/booking/promozioni', { method: 'POST', body: JSON.stringify(body) })
    } else {
      await apiFetch(`/api/booking/promozioni/${promoForm.id}`, { method: 'PATCH', body: JSON.stringify(body) })
    }
    setPromoForm(null)
    openPromo(showPromo)
  }

  async function deletePromo(id) {
    if (!confirm('Eliminare questa promozione?')) return
    await apiFetch(`/api/booking/promozioni/${id}`, { method: 'DELETE' })
    openPromo(showPromo)
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (editing) return <RisorseForm
    form={form} patch={patch} patchDisp={patchDisp} initDisp={initDisp}
    onSave={save} onCancel={() => setEditing(null)} saving={saving} error={error} isNew={editing === 'new'}
  />

  if (showPromo) return <PromoPanel
    risorsa={risorse.find(r => r.id === showPromo)}
    promozioni={promozioni}
    promoForm={promoForm} setPromoForm={setPromoForm}
    promoData={promoData} setPromoData={setPromoData}
    onSave={savePromo} onDelete={deletePromo}
    onBack={() => setShowPromo(null)}
  />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Risorse prenotabili</h1>
        <button onClick={openNew} style={primaryBtn}>+ Nuova risorsa</button>
      </div>

      {loading ? <div style={{ color: '#999' }}>Caricamento...</div> :
        risorse.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🗂️</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nessuna risorsa</div>
            <div style={{ fontSize: 14, marginBottom: 20 }}>Crea la prima risorsa prenotabile: un campo sportivo, una sala trattamenti, un medico...</div>
            <button onClick={openNew} style={primaryBtn}>Crea risorsa</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {risorse.map(r => (
              <div key={r.id} style={{
                background: '#fff', borderRadius: 12, padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                opacity: r.attiva ? 1 : 0.55,
              }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: r.colore, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{r.nome}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>
                      {r.modalita === 'slot'
                        ? `Slot · ${r.durata_minuti}min${r.quantita > 1 ? ` × ${r.quantita}` : ''} · €${r.prezzo}`
                        : `Coperti · max ${r.max_coperti} posti`
                      }
                      {r.descrizione ? ` · ${r.descrizione}` : ''}
                    </span>
                    {r.visibile_minisito === false && (
                      <span style={{ fontSize: 11, background: '#fff3cd', color: '#856404', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                        Solo admin
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => openPromo(r.id)} style={ghostBtn}>Offerte</button>
                  <button onClick={() => openEdit(r)} style={ghostBtn}>Modifica</button>
                  <button onClick={() => toggleAttiva(r)} style={ghostBtn}>{r.attiva ? 'Disattiva' : 'Attiva'}</button>
                  <button onClick={() => deleteRisorsa(r)} style={{ ...ghostBtn, color: '#c0392b' }}>Elimina</button>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

// ─── Form crea/modifica risorsa ───────────────────────────────────────────────

function RisorseForm({ form, patch, patchDisp, initDisp, onSave, onCancel, saving, error, isNew }) {
  const dispSlot = form.disponibilita
  const dispCop  = form.disponibilita

  function toggleGiornoChiusura(val) {
    const curr = dispCop.giorni_chiusura || []
    const next  = curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val]
    patchDisp('giorni_chiusura', next)
  }

  function updateServizioNome(i, nome) {
    const servizi = [...(dispCop.servizi || [])]
    servizi[i] = { ...servizi[i], nome }
    patchDisp('servizi', servizi)
  }

  function updateServizioOrari(i, raw) {
    const orari = raw.split(',').map(s => s.trim()).filter(Boolean)
    const servizi = [...(dispCop.servizi || [])]
    servizi[i] = { ...servizi[i], orari }
    patchDisp('servizi', servizi)
  }

  function addServizio() {
    patchDisp('servizi', [...(dispCop.servizi || []), { nome: '', orari: [] }])
  }

  function removeServizio(i) {
    patchDisp('servizi', (dispCop.servizi || []).filter((_, idx) => idx !== i))
  }

  const hasDispo = form.modalita === 'slot'
    ? Object.keys(dispSlot).some(k => (dispSlot[k] || []).length > 0)
    : (dispCop.servizi || []).length > 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onCancel} style={ghostBtn}>← Indietro</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{isNew ? 'Nuova risorsa' : `Modifica: ${form.nome}`}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, maxWidth: 900 }}>

        {/* Colonna sinistra */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Informazioni base">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={e => patch('nome', e.target.value)} placeholder="es. Campo Padel 1, Sala Massaggi, Dr. Rossi" />

            <Label>Descrizione</Label>
            <Input value={form.descrizione || ''} onChange={e => patch('descrizione', e.target.value)} placeholder="Descrizione breve (opzionale)" />

            <Label>Modalità</Label>
            <select value={form.modalita} onChange={e => { patch('modalita', e.target.value); patch('disponibilita', {}) }} style={selectStyle}>
              <option value="slot">Slot orari (campi, medici, trattamenti, ecc.)</option>
              <option value="coperti">Coperti (ristoranti)</option>
            </select>

            <Label>Colore calendario</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={form.colore} onChange={e => patch('colore', e.target.value)} style={{ width: 40, height: 32, border: 'none', cursor: 'pointer', borderRadius: 6 }} />
              <span style={{ fontSize: 13, color: '#666' }}>{form.colore}</span>
            </div>
          </Card>

          {form.modalita === 'slot' && (
            <Card title="Configurazione slot">
              <Label>Durata slot (minuti)</Label>
              <Input type="number" min={5} max={480} value={form.durata_minuti} onChange={e => patch('durata_minuti', parseInt(e.target.value) || 60)} />

              <Label>Quantità risorse identiche</Label>
              <Input type="number" min={1} max={100} value={form.quantita} onChange={e => patch('quantita', parseInt(e.target.value) || 1)} />
              <div style={{ fontSize: 12, color: '#888' }}>
                Es. 3 campi padel identici → inserisci 3. Il sistema assegna automaticamente.
              </div>
            </Card>
          )}

          {form.modalita === 'coperti' && (
            <Card title="Configurazione coperti">
              <Label>Coperti massimi per servizio</Label>
              <Input type="number" min={1} max={1000} value={form.max_coperti} onChange={e => patch('max_coperti', parseInt(e.target.value) || 40)} />
            </Card>
          )}

          <Card title="Prezzo">
            <Label>Prezzo per slot / persona (€)</Label>
            <Input type="number" min={0} step={0.5} value={form.prezzo} onChange={e => patch('prezzo', parseFloat(e.target.value) || 0)} />
            <div style={{ fontSize: 12, color: '#888' }}>Inserisci 0 per servizio gratuito.</div>
          </Card>

          <Card title="Regole prenotazione">
            <Label>Anticipo minimo (ore)</Label>
            <Input type="number" min={0} max={720} value={form.anticipo_ore} onChange={e => patch('anticipo_ore', parseInt(e.target.value) || 1)} />

            <Label>Cancellazione consentita fino a (ore prima)</Label>
            <Input type="number" min={0} max={720} value={form.cancellazione_ore} onChange={e => patch('cancellazione_ore', parseInt(e.target.value) || 24)} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <input type="checkbox" id="conferma_auto" checked={form.conferma_auto} onChange={e => patch('conferma_auto', e.target.checked)} />
              <label htmlFor="conferma_auto" style={{ fontSize: 14, cursor: 'pointer' }}>Conferma automatica</label>
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>Se disattivato, le prenotazioni restano in attesa di approvazione manuale.</div>

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="visibile_minisito" checked={form.visibile_minisito ?? true} onChange={e => patch('visibile_minisito', e.target.checked)} />
                <label htmlFor="visibile_minisito" style={{ fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>Visibile nel sito pubblico</label>
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                Se disattivato, la risorsa è gestibile in admin ma non appare nel widget di prenotazione del sito. Utile per risorse ad uso interno o prenotabili solo su richiesta.
              </div>
            </div>
          </Card>
        </div>

        {/* Colonna destra: disponibilità */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {form.modalita === 'slot' ? (
            <Card title="Orari di apertura">
              {!hasDispo ? (
                <button onClick={initDisp} style={ghostBtn}>Inizializza orari standard (lun-ven 9-18)</button>
              ) : (
                GIORNI.map(({ key, label }) => {
                  const windows = dispSlot[key] || []
                  const active = windows.length > 0
                  return (
                    <div key={key} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <input type="checkbox" id={`g_${key}`} checked={active}
                          onChange={e => patchDisp(key, e.target.checked ? [{ start: '09:00', end: '18:00' }] : [])} />
                        <label htmlFor={`g_${key}`} style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer', minWidth: 80 }}>{label}</label>
                        {active && windows.map((w, i) => (
                          <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <input type="time" value={w.start}
                              onChange={e => { const ws = [...windows]; ws[i] = { ...ws[i], start: e.target.value }; patchDisp(key, ws) }}
                              style={{ ...inputStyle, width: 100, padding: '4px 8px' }} />
                            <span style={{ fontSize: 12, color: '#888' }}>→</span>
                            <input type="time" value={w.end}
                              onChange={e => { const ws = [...windows]; ws[i] = { ...ws[i], end: e.target.value }; patchDisp(key, ws) }}
                              style={{ ...inputStyle, width: 100, padding: '4px 8px' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </Card>
          ) : (
            <Card title="Servizi e orari">
              <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
                Definisci i servizi (es. Pranzo, Cena) e gli orari disponibili per ogni servizio.
              </div>

              <Label>Giorni di chiusura</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {GIORNI_COPERTI.map(({ val, label }) => {
                  const chiuso = (dispCop.giorni_chiusura || []).includes(val)
                  return (
                    <button key={val} onClick={() => toggleGiornoChiusura(val)}
                      style={{ ...ghostBtn, background: chiuso ? '#fce4e4' : '#f0f0f0', color: chiuso ? '#c0392b' : '#333', fontSize: 12 }}>
                      {label}
                    </button>
                  )
                })}
              </div>

              {(dispCop.servizi || []).map((srv, i) => (
                <div key={i} style={{ background: '#f8f8f8', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <Input value={srv.nome} onChange={e => updateServizioNome(i, e.target.value)} placeholder="Nome servizio (es. Pranzo)" />
                    <button onClick={() => removeServizio(i)} style={{ ...ghostBtn, color: '#c0392b', padding: '6px 10px' }}>✕</button>
                  </div>
                  <Label>Orari (separati da virgola)</Label>
                  <Input value={(srv.orari || []).join(', ')}
                    onChange={e => updateServizioOrari(i, e.target.value)}
                    placeholder="12:00, 12:30, 13:00" />
                </div>
              ))}
              <button onClick={addServizio} style={ghostBtn}>+ Aggiungi servizio</button>

              {!hasDispo && (
                <button onClick={initDisp} style={{ ...ghostBtn, marginTop: 8 }}>
                  Inizializza con Pranzo + Cena standard
                </button>
              )}
            </Card>
          )}

          <Card title="Chiusure e blocchi">
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
              Date o periodi in cui la risorsa non è disponibile (festivi, manutenzione, ferie).
            </div>
            {(form.blocchi || []).map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                {b.data ? (
                  <>
                    <input type="date" value={b.data}
                      onChange={e => { const bl = [...form.blocchi]; bl[i] = { ...bl[i], data: e.target.value }; patch('blocchi', bl) }}
                      style={{ ...inputStyle, flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#888' }}>giorno singolo</span>
                  </>
                ) : (
                  <>
                    <input type="date" value={b.data_inizio}
                      onChange={e => { const bl = [...form.blocchi]; bl[i] = { ...bl[i], data_inizio: e.target.value }; patch('blocchi', bl) }}
                      style={{ ...inputStyle, flex: 1 }} />
                    <span style={{ fontSize: 12 }}>→</span>
                    <input type="date" value={b.data_fine}
                      onChange={e => { const bl = [...form.blocchi]; bl[i] = { ...bl[i], data_fine: e.target.value }; patch('blocchi', bl) }}
                      style={{ ...inputStyle, flex: 1 }} />
                  </>
                )}
                <Input value={b.motivo || ''} onChange={e => { const bl = [...form.blocchi]; bl[i] = { ...bl[i], motivo: e.target.value }; patch('blocchi', bl) }} placeholder="Motivo" />
                <button onClick={() => patch('blocchi', form.blocchi.filter((_, idx) => idx !== i))} style={{ ...ghostBtn, color: '#c0392b' }}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => patch('blocchi', [...(form.blocchi || []), { data: new Date().toISOString().slice(0,10), motivo: '' }])} style={ghostBtn}>+ Giorno singolo</button>
              <button onClick={() => patch('blocchi', [...(form.blocchi || []), { data_inizio: '', data_fine: '', motivo: '' }])} style={ghostBtn}>+ Periodo</button>
            </div>
          </Card>
        </div>
      </div>

      {error && <div style={{ marginTop: 16, color: '#c0392b', fontSize: 14 }}>{error}</div>}

      <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <button onClick={onSave} disabled={saving} style={primaryBtn}>{saving ? 'Salvataggio...' : 'Salva risorsa'}</button>
        <button onClick={onCancel} style={ghostBtn}>Annulla</button>
      </div>
    </div>
  )
}

// ─── Pannello promozioni ──────────────────────────────────────────────────────

function PromoPanel({ risorsa, promozioni, promoForm, setPromoForm, promoData, setPromoData, onSave, onDelete, onBack }) {
  function patchP(key, val) { setPromoData(p => ({ ...p, [key]: val })) }

  function openNewPromo() {
    setPromoData({ nome: '', descrizione: '', data_inizio: '', data_fine: '', ora_inizio: '', ora_fine: '', giorni_settimana: null, prezzo_speciale: '', badge_label: 'Offerta', colore: '#e53e3e', attiva: true })
    setPromoForm('new')
  }

  function openEditPromo(p) {
    setPromoData({ ...p })
    setPromoForm(p)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={ghostBtn}>← Indietro</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Offerte — {risorsa?.nome}</h1>
        <button onClick={openNewPromo} style={primaryBtn}>+ Nuova offerta</button>
      </div>

      {promoForm && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 16px' }}>{promoForm === 'new' ? 'Nuova offerta' : 'Modifica offerta'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <Label>Nome offerta *</Label>
              <Input value={promoData.nome} onChange={e => patchP('nome', e.target.value)} placeholder="Es. Happy Hour, Prima visita" />
            </div>
            <div>
              <Label>Prezzo speciale (€) *</Label>
              <Input type="number" min={0} step={0.5} value={promoData.prezzo_speciale} onChange={e => patchP('prezzo_speciale', parseFloat(e.target.value) || '')} />
            </div>
            <div>
              <Label>Badge</Label>
              <Input value={promoData.badge_label} onChange={e => patchP('badge_label', e.target.value)} placeholder="Offerta" />
            </div>
            <div>
              <Label>Colore badge</Label>
              <input type="color" value={promoData.colore} onChange={e => patchP('colore', e.target.value)} style={{ width: 40, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
            </div>
            <div>
              <Label>Valida dal</Label>
              <Input type="date" value={promoData.data_inizio || ''} onChange={e => patchP('data_inizio', e.target.value || null)} />
            </div>
            <div>
              <Label>Valida fino al</Label>
              <Input type="date" value={promoData.data_fine || ''} onChange={e => patchP('data_fine', e.target.value || null)} />
            </div>
            <div>
              <Label>Ore dalle</Label>
              <Input type="time" value={promoData.ora_inizio || ''} onChange={e => patchP('ora_inizio', e.target.value || null)} />
            </div>
            <div>
              <Label>Ore alle</Label>
              <Input type="time" value={promoData.ora_fine || ''} onChange={e => patchP('ora_fine', e.target.value || null)} />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button onClick={onSave} style={primaryBtn}>Salva offerta</button>
            <button onClick={() => setPromoForm(null)} style={ghostBtn}>Annulla</button>
          </div>
        </div>
      )}

      {promozioni.length === 0 && !promoForm ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', color: '#999' }}>
          Nessuna offerta configurata. Crea offerte a tempo (Happy Hour, prima visita, ecc.) per attirare clienti.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {promozioni.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', opacity: p.attiva ? 1 : 0.55 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.colore, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  €{p.prezzo_speciale}
                  {p.data_inizio ? ` · dal ${p.data_inizio}` : ''}
                  {p.data_fine ? ` al ${p.data_fine}` : ''}
                  {p.ora_inizio ? ` · ${p.ora_inizio}–${p.ora_fine}` : ''}
                </div>
              </div>
              <button onClick={() => openEditPromo(p)} style={ghostBtn}>Modifica</button>
              <button onClick={() => onDelete(p.id)} style={{ ...ghostBtn, color: '#c0392b' }}>Elimina</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Componenti UI ────────────────────────────────────────────────────────────

function Card({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#1a1a2e' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 2 }}>{children}</div>
}

function Input({ ...props }) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />
}

const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' }
const selectStyle = { ...inputStyle, cursor: 'pointer' }
const primaryBtn  = { background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer', fontWeight: 500 }
const ghostBtn    = { background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }
