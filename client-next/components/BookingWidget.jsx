'use client'
import { useState, useEffect } from 'react'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').trim()

async function publicFetch(path) {
  const res = await fetch(`${API_BASE}${path}`)
  const text = await res.text()
  try { return text ? JSON.parse(text) : {} } catch { return {} }
}

// ─── BookingWidget ────────────────────────────────────────────────────────────
// Props:
//   entityTipo: 'struttura' | 'ristorante' | 'attivita'
//   entityId:   uuid
//   primaryColor: string (ereditato dal tema)

export default function BookingWidget({ entityTipo, entityId, primaryColor = '#00b5b5', privacyUrl = null }) {
  const [risorse, setRisorse] = useState([])
  const [loading, setLoading] = useState(true)

  // Step wizard: 'risorsa' | 'periodo' | 'data' | 'slot' | 'form' | 'done'
  const [step, setStep] = useState('risorsa')
  const [selected, setSelected] = useState({ risorsa: null, data: '', data_fine: '', slot: null })
  const [periodo, setPeriodo] = useState(null)      // la risposta del server per le risorse a giornate
  const [verificando, setVerificando] = useState(false)
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', telefono: '', n_persone: 1, note: '', privacy: false })
  const [sending, setSending] = useState(false)
  const [errore, setErrore] = useState('')
  const [prenotazione, setPrenotazione] = useState(null)

  useEffect(() => {
    if (!entityId) return
    publicFetch(`/api/booking/public/risorse/${entityTipo}/${entityId}`)
      .then(data => {
        const elenco = Array.isArray(data) ? data : []
        setRisorse(elenco)
        // ⚠️ Con una cosa sola da prenotare, «Cosa vuoi prenotare?» è una domanda
        // con una risposta obbligata: un clic buttato prima ancora di iniziare.
        // Si entra dritti nelle date. La maggior parte dei clienti ha una sola
        // risorsa, quindi non è un caso limite — è il caso normale.
        if (elenco.length === 1) selectRisorsa(elenco[0])
      })
      .finally(() => setLoading(false))
  }, [entityTipo, entityId])

  // Quando cambia data o risorsa, ricarica disponibilità.
  // A giornate non serve: lì la domanda si fa con due date, e la risposta la
  // chiede `verificaPeriodo`. Senza questa condizione partiva una chiamata in
  // più a ogni scelta della data d'inizio, per una risposta che nessuno legge.
  useEffect(() => {
    if (selected.risorsa?.modalita === 'giornaliero') return
    if (!selected.risorsa || !selected.data) return
    setSlots([])
    setLoadingSlots(true)
    publicFetch(`/api/booking/public/disponibilita/${selected.risorsa.id}?data=${selected.data}`)
      .then(d => setSlots(d.slots || []))
      .finally(() => setLoadingSlots(false))
  }, [selected.risorsa, selected.data])

  // A giornate non si sceglie un orario ma un periodo: due date e via. Gli altri
  // due passi (data, poi slot) non hanno niente da chiedere.
  function selectRisorsa(r) {
    setSelected({ risorsa: r, data: '', data_fine: '', slot: null })
    setSlots([])
    setPeriodo(null)
    setStep(r.modalita === 'giornaliero' ? 'periodo' : 'data')
  }

  // Il preventivo lo fa il server: quello che si vede qui è la stessa risposta
  // che deciderà se la prenotazione passa, non un conto rifatto nel browser che
  // potrebbe non coincidere.
  async function verificaPeriodo(dal, al) {
    if (!dal || !al) { setPeriodo(null); return }
    setVerificando(true)
    try {
      setPeriodo(await publicFetch(`/api/booking/public/disponibilita/${selected.risorsa.id}?data=${dal}&data_fine=${al}`))
    } catch { setPeriodo(null) }
    finally { setVerificando(false) }
  }

  function selectData(data) {
    setSelected(s => ({ ...s, data, slot: null }))
    setStep('slot')
  }

  function selectSlot(slot) {
    setSelected(s => ({ ...s, slot }))
    setStep('form')
  }

  function patchForm(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.nome.trim()) { setErrore('Il nome è obbligatorio'); return }
    if (!form.email.trim()) { setErrore("L'email è obbligatoria"); return }
    setSending(true); setErrore('')
    try {
      const aGiornate = selected.risorsa.modalita === 'giornaliero'
      const body = {
        risorsa_id: selected.risorsa.id,
        data: selected.data,
        ...(aGiornate
          ? { data_fine: selected.data_fine }
          : selected.risorsa.modalita === 'slot'
            ? { ora_inizio: selected.slot.ora }
            : { servizio: selected.slot.servizio, ora_inizio: selected.slot.ora }),
        cliente_nome: form.nome.trim(),
        cliente_email: form.email.trim(),
        cliente_telefono: form.telefono.trim() || null,
        n_persone: form.n_persone,
        note_cliente: form.note.trim() || null,
        promozione_id: selected.slot?.promo?.id || null,
        privacy_accettata: form.privacy,
      }
      const res = await fetch(`${API_BASE}/api/booking/public/prenota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore')
      setPrenotazione(data)
      setStep('done')
    } catch (e) { setErrore(e.message) }
    finally { setSending(false) }
  }

  function reset() {
    setSelected({ risorsa: null, data: '', data_fine: '', slot: null }); setPeriodo(null)
    setSlots([]); setForm({ nome: '', email: '', telefono: '', n_persone: 1, note: '', privacy: false })
    setPrenotazione(null); setErrore('')
    // ⚠️ Con una sola risorsa il primo passo non esiste: rimandarci dopo
    // «Nuova prenotazione» mostrerebbe una scelta con un'opzione sola — proprio
    // quella che all'inizio abbiamo tolto. Si rientra da dove si era entrati.
    if (risorse.length === 1) selectRisorsa(risorse[0])
    else setStep('risorsa')
  }

  const today = new Date().toISOString().slice(0, 10)

  if (loading) return <div style={wrapStyle}>Caricamento...</div>
  if (risorse.length === 0) return null

  // ── STEP: DONE ──────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div style={wrapStyle}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: primaryColor, marginBottom: 8 }}>Prenotazione confermata!</div>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
          Hai prenotato <strong>{selected.risorsa.nome}</strong>
        </div>
        {/* ⚠️ Senza il ramo a giornate qui si leggeva `selected.slot.ora` su uno
            slot che non esiste: schermata bianca proprio sulla conferma, dopo
            che la prenotazione è già andata a buon fine. */}
        <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
          {selected.risorsa.modalita === 'giornaliero'
            ? `dal ${formatData(selected.data)} al ${formatData(selected.data_fine)}`
            : <>{formatData(selected.data)} {selected.slot?.servizio ? `— ${selected.slot.servizio}` : ''} ore {selected.slot?.ora}</>}
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
          Riceverai una conferma a <strong>{form.email}</strong>
        </div>
        <button onClick={reset} style={{ ...btnStyle(primaryColor), marginTop: 8 }}>Nuova prenotazione</button>
      </div>
    </div>
  )

  return (
    <div style={wrapStyle}>
      {/* Breadcrumb */}
      <Breadcrumb step={step} risorsa={selected.risorsa} data={selected.data} quante={risorse.length} primaryColor={primaryColor}
        onStep={(s) => { if (['risorsa','periodo','data','slot'].includes(s) && step !== 'done') setStep(s) }} />

      {/* ⚠️ Le foto **dopo** la scelta, non solo prima.
          Con una sola risorsa il primo passo si salta, e le foto caricate dal
          cliente non si vedrebbero mai: proprio nel caso più comune, quello di
          chi ha un furgone solo o una camera sola. Qui invece si vedono sempre,
          accanto alle date che si stanno scegliendo. */}
      {selected.risorsa && step !== 'risorsa' && (
        <TestataRisorsa risorsa={selected.risorsa} primaryColor={primaryColor} />
      )}

      {/* ── STEP: SCEGLI RISORSA ─────────────────────────────────────────────── */}
      {step === 'risorsa' && (
        <div>
          <div style={titleStyle}>Cosa vuoi prenotare?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {risorse.map(r => (
              <button key={r.id} onClick={() => selectRisorsa(r)} style={cardBtnStyle(primaryColor)}>
                {/* La foto se c'è, altrimenti una barra del colore della
                    risorsa: un furgone o una camera si scelgono guardandoli, e
                    dove la foto manca la scheda non deve sembrare rotta. */}
                {(r.galleria || [])[0]
                  ? <img src={(r.galleria || [])[0]} alt="" loading="lazy"
                      style={{ width: 76, height: 60, objectFit: 'cover', borderRadius: 9, flexShrink: 0 }} />
                  : <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: r.colore || primaryColor, flexShrink: 0 }} />}
                <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                  {/* ⚠️ `minWidth: 0` e `overflowWrap`: il nome lo scrive il
                      cliente, e una parola lunghissima senza spazi allargherebbe
                      la riga oltre la scheda. */}
                  <div style={{ fontWeight: 700, fontSize: 15.5, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{r.nome}</div>
                  {r.descrizione && <div style={{ fontSize: 13, color: '#777', marginTop: 3, overflowWrap: 'anywhere' }}>{r.descrizione}</div>}
                  <div style={{ fontSize: 13, color: '#999', marginTop: 5 }}>{dettaglioRisorsa(r)}</div>
                </div>
                {/* Il prezzo è la seconda cosa che si guarda dopo il nome: sta
                    dove lo si cerca, non annegato nella riga dei dettagli. */}
                {r.prezzo > 0 && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: primaryColor, whiteSpace: 'nowrap' }}>
                      {simboloValuta(r.valuta)}{r.prezzo}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#aaa', whiteSpace: 'nowrap' }}>{unitaPrezzo(r)}</div>
                  </div>
                )}
                <span aria-hidden="true" style={{ color: primaryColor, fontSize: 20, flexShrink: 0, marginLeft: 2 }}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP: SCEGLI IL PERIODO (risorse a giornate) ─────────────────────── */}
      {step === 'periodo' && (
        <div>
          <div style={titleStyle}>
            {!selected.data ? 'Quando arrivi?' : !selected.data_fine ? 'E quando riparti?' : 'Il tuo periodo'}
          </div>

          {/* Il calendario al posto di due campi data: chi prenota vuole vedere
              quali giorni sono liberi, non scoprirlo provando. */}
          <CalendarioPubblico
            risorsaId={selected.risorsa.id}
            primaryColor={primaryColor}
            dal={selected.data} al={selected.data_fine}
            onScegli={(giorno) => {
              // Primo clic sceglie l'arrivo; il secondo la partenza. Cliccando
              // una data prima dell'arrivo si ricomincia da lì, che è quello che
              // uno intende — non un errore da segnalare.
              if (!selected.data || selected.data_fine || giorno <= selected.data) {
                setSelected(s => ({ ...s, data: giorno, data_fine: '' }))
                setPeriodo(null)
              } else {
                setSelected(s => ({ ...s, data_fine: giorno }))
                verificaPeriodo(selected.data, giorno)
              }
            }}
          />

          {selected.data && (
            <div style={{ fontSize: 13, color: '#666', marginTop: 12 }}>
              Arrivo <strong>{formatData(selected.data)}</strong>
              {selected.data_fine && <> · partenza <strong>{formatData(selected.data_fine)}</strong></>}
              {' '}
              <button onClick={() => { setSelected(s => ({ ...s, data: '', data_fine: '' })); setPeriodo(null) }}
                style={{ background: 'none', border: 'none', color: primaryColor, cursor: 'pointer', fontSize: 13, textDecoration: 'underline', padding: 0 }}>
                cambia
              </button>
            </div>
          )}

          {verificando && <div style={{ color: '#999', fontSize: 13, marginTop: 14 }}>Verifica disponibilità…</div>}

          {!verificando && periodo && !periodo.disponibile && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: '#fff5f5', borderRadius: 10, fontSize: 14, color: '#c53030' }}>
              {periodo.motivo || 'Non disponibile in questo periodo.'}
            </div>
          )}

          {!verificando && periodo?.disponibile && (
            <>
              <div style={{ marginTop: 14, padding: '14px 16px', background: '#f7f9fc', borderRadius: 10 }}>
                {/* ⚠️ Quante unità e come si chiamano lo dice il **server**, che
                    è lo stesso che calcola il totale. Quando il numero lo
                    indovinava il browser, un noleggio che conta il giorno della
                    riconsegna mostrava «2 notti · €90 a notte» sopra un totale
                    di €270: il conto era giusto e il testo no. */}
                <div style={{ fontSize: 14, color: '#555' }}>
                  {unitaLeggibili(periodo)}
                  {periodo.prezzo > 0 && <> · {simboloValuta(selected.risorsa?.valuta)}{periodo.prezzo} {aUnita(periodo)}</>}
                </div>
                {periodo.totale > 0 && (
                  <div style={{ fontSize: 20, fontWeight: 700, color: primaryColor, marginTop: 4 }}>€{periodo.totale}</div>
                )}
                {periodo.libere > 1 && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Ne restano {periodo.libere} disponibili.</div>
                )}
              </div>
              <button onClick={() => setStep('form')} style={{ ...btnStyle(primaryColor), marginTop: 14 }}>
                Continua
              </button>
            </>
          )}

          {risorse.length > 1 && <button onClick={() => setStep('risorsa')} style={backBtnStyle}>← Indietro</button>}
        </div>
      )}

      {/* ── STEP: SCEGLI DATA ────────────────────────────────────────────────── */}
      {step === 'data' && (
        <div>
          <div style={titleStyle}>Scegli la data</div>
          <input
            type="date"
            min={today}
            value={selected.data}
            onChange={e => selectData(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', border: `2px solid ${primaryColor}`, borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
          />
          {risorse.length > 1 && <button onClick={() => setStep('risorsa')} style={backBtnStyle}>← Indietro</button>}
        </div>
      )}

      {/* ── STEP: SCEGLI SLOT ────────────────────────────────────────────────── */}
      {step === 'slot' && (
        <div>
          <div style={titleStyle}>
            {selected.risorsa.modalita === 'coperti' ? 'Scegli servizio e orario' : 'Scegli orario'}
          </div>

          {loadingSlots ? (
            <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>Verifica disponibilità...</div>
          ) : slots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>😔</div>
              <div>Nessuna disponibilità per questa data.</div>
              <button onClick={() => setStep('data')} style={{ ...backBtnStyle, marginTop: 12 }}>← Scegli un'altra data</button>
            </div>
          ) : (
            <>
              {selected.risorsa.modalita === 'coperti' ? (
                // Coperti: raggruppa per servizio
                Object.entries(
                  slots.reduce((acc, s) => { acc[s.servizio] = [...(acc[s.servizio] || []), s]; return acc }, {})
                ).map(([servizio, orari]) => (
                  <div key={servizio} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{servizio}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {orari.map(slot => (
                        <button key={slot.ora} onClick={() => selectSlot(slot)} style={slotBtnStyle(primaryColor, false)}>
                          <div style={{ fontWeight: 700 }}>{slot.ora}</div>
                          <div style={{ fontSize: 11, color: '#888' }}>{slot.disponibili} posti</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                // Slot orari: griglia
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {slots.map(slot => (
                    <button key={slot.ora} onClick={() => selectSlot(slot)}
                      style={slotBtnStyle(primaryColor, !!slot.promo)}>
                      {slot.promo && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: slot.promo.colore, borderRadius: 4, padding: '2px 5px', marginBottom: 2 }}>
                          {slot.promo.badge}
                        </div>
                      )}
                      <div style={{ fontWeight: 700 }}>{slot.ora}</div>
                      <div style={{ fontSize: 11, color: slot.promo ? primaryColor : '#888' }}>
                        {slot.promo ? `€${slot.promo.prezzo}` : (slot.prezzo > 0 ? `€${slot.prezzo}` : 'Libero')}
                      </div>
                      {slot.totale > 1 && (
                        <div style={{ fontSize: 10, color: '#aaa' }}>{slot.disponibili}/{slot.totale}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setStep('data')} style={backBtnStyle}>← Cambia data</button>
            </>
          )}
        </div>
      )}

      {/* ── STEP: FORM CONTATTI ──────────────────────────────────────────────── */}
      {step === 'form' && (
        <div>
          <div style={titleStyle}>I tuoi dati</div>

          {/* Riepilogo */}
          <div style={{ background: '#f8f8f8', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 14 }}>
            <div style={{ fontWeight: 600 }}>{selected.risorsa.nome}</div>
            <div style={{ color: '#666', marginTop: 2 }}>
              {selected.risorsa.modalita === 'giornaliero' ? (
                <>
                  dal {formatData(selected.data)} al {formatData(selected.data_fine)}
                  {(periodo?.unita ?? periodo?.notti) > 0 && <> · {unitaLeggibili(periodo)}</>}
                  {periodo?.totale > 0 && <span style={{ fontWeight: 600 }}> · {simboloValuta(selected.risorsa?.valuta)}{periodo.totale}</span>}
                </>
              ) : (
                <>
                  {formatData(selected.data)} — {selected.slot?.servizio ? `${selected.slot.servizio} ` : ''}{selected.slot?.ora}
                  {selected.slot?.promo
                    ? <span style={{ color: selected.slot.promo.colore, fontWeight: 600 }}> · €{selected.slot.promo.prezzo} ({selected.slot.promo.badge})</span>
                    : selected.slot?.prezzo > 0 ? <span> · €{selected.slot.prezzo}</span> : ''}
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input placeholder="Nome e cognome *" value={form.nome} onChange={e => patchForm('nome', e.target.value)} style={inputStyle(primaryColor)} />
            <input type="email" placeholder="Email *" value={form.email} onChange={e => patchForm('email', e.target.value)} style={inputStyle(primaryColor)} />
            <input type="tel" placeholder="Telefono" value={form.telefono} onChange={e => patchForm('telefono', e.target.value)} style={inputStyle(primaryColor)} />

            {(selected.risorsa.modalita === 'coperti' || selected.risorsa.quantita > 1) && (
              <div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Numero persone</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => patchForm('n_persone', Math.max(1, form.n_persone - 1))} style={counterBtn}>−</button>
                  <span style={{ fontSize: 18, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{form.n_persone}</span>
                  <button onClick={() => patchForm('n_persone', Math.min(selected.slot.disponibili || 20, form.n_persone + 1))} style={counterBtn}>+</button>
                  <span style={{ fontSize: 13, color: '#888' }}>(max {selected.slot.disponibili})</span>
                </div>
              </div>
            )}

            <textarea placeholder="Note (opzionale)" value={form.note} onChange={e => patchForm('note', e.target.value)}
              rows={2} style={{ ...inputStyle(primaryColor), resize: 'vertical' }} />

            {/* ⚠️ Qui si raccolgono nome, email e telefono di una persona: senza
                consenso non si possono chiedere. Mancava — corretto sulle
                escursioni il 26/08, sulle attività il 28, e mai qui: il terzo
                posto dove si ripeteva lo stesso difetto.
                La spunta è solo quello che si vede: il controllo vero sta nella
                route, perché una casella nel browser si toglie con due clic. */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#666', cursor: 'pointer', lineHeight: 1.5 }}>
              <input type="checkbox" checked={form.privacy} onChange={e => patchForm('privacy', e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0 }} />
              <span>
                Ho letto e accetto {privacyUrl
                  ? <a href={privacyUrl} target="_blank" rel="noopener noreferrer" style={{ color: primaryColor }}>l'informativa sulla privacy</a>
                  : "l'informativa sulla privacy"}. I miei dati saranno usati per gestire questa prenotazione.
              </span>
            </label>
          </div>

          {errore && <div style={{ marginTop: 10, color: '#c0392b', fontSize: 13 }}>{errore}</div>}

          <button onClick={submit} disabled={sending || !form.privacy}
            style={{ ...btnStyle(primaryColor), marginTop: 16, width: '100%', padding: '14px', opacity: form.privacy ? 1 : 0.5, cursor: form.privacy ? 'pointer' : 'not-allowed' }}>
            {sending ? 'Invio in corso...' : 'Conferma prenotazione'}
          </button>
          <button onClick={() => setStep('slot')} style={backBtnStyle}>← Indietro</button>
        </div>
      )}
    </div>
  )
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
// Cosa si sta prenotando, con le sue foto.
//
// La prima grande, le altre in una striscia che scorre e si può toccare per
// portarle in primo piano: per una camera servono il letto, il bagno e la
// vista, e mostrarne una sola vorrebbe dire chiedere al cliente di scegliere
// quale sacrificare.
function TestataRisorsa({ risorsa, primaryColor }) {
  const foto = Array.isArray(risorsa.galleria) ? risorsa.galleria.filter(Boolean) : []
  const [attiva, setAttiva] = useState(0)
  // ⚠️ Cambiando risorsa si riparte dalla prima: senza, restava selezionato
  // l'indice della precedente e si vedeva la foto sbagliata — o nessuna.
  useEffect(() => { setAttiva(0) }, [risorsa.id])
  if (!foto.length) return null
  const i = Math.min(attiva, foto.length - 1)
  return (
    <div style={{ marginBottom: 18 }}>
      <img src={foto[i]} alt={risorsa.nome || ''} style={{ width: '100%', height: 168, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
      {foto.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto' }}>
          {foto.map((url, k) => (
            <button key={url + k} type="button" onClick={() => setAttiva(k)}
              aria-label={`Foto ${k + 1} di ${foto.length}`}
              style={{ padding: 0, border: `2px solid ${k === i ? primaryColor : 'transparent'}`, borderRadius: 8, cursor: 'pointer', background: 'none', flexShrink: 0, lineHeight: 0 }}>
              <img src={url} alt="" loading="lazy" style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// I passi che questa prenotazione farà davvero.
//
// ⚠️ Prima erano quattro fissi — «Servizio › Data › Orario › Dati» — e mentivano
// due volte. Su un noleggio a giornate il passo «Orario» **non viene mai
// raggiunto**: il flusso è periodo → dati. Chi guardava vedeva promessi quattro
// passi e ne faceva tre, con uno che non arrivava mai.
//
// E «Servizio» era una parola nostra: chi noleggia un furgone non sta comprando
// un servizio. Finché non ha scelto si dice «Cosa», che descrive la domanda e
// non il mestiere di nessuno; appena sceglie, il passo prende il nome della cosa.
function passiDi(risorsa, quante, data) {
  const scelta = quante > 1 ? [{ key: 'risorsa', label: risorsa ? risorsa.nome : 'Cosa' }] : []
  if (risorsa?.modalita === 'giornaliero') {
    return [...scelta, { key: 'periodo', label: data ? formatData(data, true) : 'Date' }, { key: 'form', label: 'Dati' }]
  }
  return [
    ...scelta,
    { key: 'data', label: data ? formatData(data, true) : 'Data' },
    { key: 'slot', label: 'Orario' },
    { key: 'form', label: 'Dati' },
  ]
}

function Breadcrumb({ step, risorsa, data, quante, primaryColor, onStep }) {
  const steps = passiDi(risorsa, quante, data)
  const currentIdx = steps.findIndex(s => s.key === step)
  if (step === 'done') return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
      {steps.map((s, i) => (
        <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span onClick={() => i < currentIdx && onStep(s.key)} style={{
            fontSize: 12, padding: '3px 8px', borderRadius: 20,
            background: i === currentIdx ? primaryColor : i < currentIdx ? '#e8f0fe' : '#f0f0f0',
            color: i === currentIdx ? '#fff' : i < currentIdx ? primaryColor : '#aaa',
            cursor: i < currentIdx ? 'pointer' : 'default',
            fontWeight: i <= currentIdx ? 600 : 400,
          }}>
            {s.label}
          </span>
          {i < steps.length - 1 && <span style={{ color: '#ccc', fontSize: 12 }}>›</span>}
        </span>
      ))}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Cosa dire sotto il nome, senza il prezzo — che ha un posto suo.
//
// ⚠️ «A giornate» era gergo nostro: descriveva come funziona il nostro
// calendario, non cosa compra chi legge. Qui si dice quello che il visitatore
// deve sapere per decidere, e niente altro.
function dettaglioRisorsa(r) {
  if (r.modalita === 'giornaliero') {
    const minimo = Number(r.disponibilita?.minimo_notti) || 0
    return minimo > 1 ? `Minimo ${minimo} notti` : 'Scegli le date'
  }
  if (r.modalita === 'coperti') return r.max_coperti ? `Fino a ${r.max_coperti} posti` : 'Scegli l’orario'
  return r.durata_minuti ? `${r.durata_minuti} minuti` : 'Scegli l’orario'
}

// A cosa si riferisce il prezzo. Non è un dettaglio estetico: «€90» senza unità
// è ambiguo fra tutto il periodo e una notte sola, e l'ambiguità sul prezzo è
// quella che genera contestazioni.
//
// ⚠️ Chi affitta una casa conta le notti, chi noleggia un furgone conta i giorni
// — e lo decide il cliente con `conta_giorno_uscita`. Dire «a notte» a chi paga
// a giorni fa quadrare male il conto sotto gli occhi di chi prenota.
function unitaPrezzo(r) {
  if (r.modalita === 'giornaliero') return r.disponibilita?.conta_giorno_uscita ? 'al giorno' : 'a notte'
  if (r.modalita === 'coperti') return 'a persona'
  return 'a prenotazione'
}

// «3 giorni», «2 notti»: il numero e il nome arrivano **insieme** dal server.
// Il ripiego sulle notti serve solo se una versione vecchia della risposta è
// ancora in cache — non deve far sparire la riga.
function unitaLeggibili(p) {
  const n = p?.unita ?? p?.notti ?? 0
  const nome = p?.unita_nome === 'giorni' ? 'giorn' : 'nott'
  const suffisso = p?.unita_nome === 'giorni' ? (n === 1 ? 'o' : 'i') : (n === 1 ? 'e' : 'i')
  return `${n} ${nome}${suffisso}`
}

function aUnita(p) { return p?.unita_nome === 'giorni' ? 'al giorno' : 'a notte' }

// ⚠️ Catalogo chiuso: la valuta arriva dai dati e non finisce mai grezza in ciò
// che si mostra. In mancanza, l'euro.
const VALUTE = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF ' }
function simboloValuta(v) { return VALUTE[v] || '€' }

function formatData(iso, breve = false) {
  if (!iso) return ''
  // ⚠️ Mezzogiorno, non mezzanotte: `new Date('2026-08-30')` viene letta come
  // UTC e in Italia diventa il giorno prima.
  return new Date(iso + 'T12:00:00').toLocaleDateString('it-IT',
    breve ? { day: 'numeric', month: 'short' }
          : { weekday: 'long', day: 'numeric', month: 'long' })
}

// ─── Stili ────────────────────────────────────────────────────────────────────
const wrapStyle   = { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', maxWidth: 520 }
const titleStyle  = { fontSize: 17, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' }
// Il calendario che vede chi prenota: i giorni liberi si cliccano, gli occupati
// no. Un mese alla volta, avanti e indietro.
//
// ⚠️ Riceve dal server **solo le date occupate**, mai chi le occupa: qui davanti
// c'è un visitatore qualsiasi, e l'elenco dei clienti di un'attività non lo
// riguarda.
const NOMI_MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const SIGLE_GIORNI = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

function CalendarioPubblico({ risorsaId, primaryColor, dal, al, onScegli }) {
  const adesso = new Date()
  const [anno, setAnno] = useState(adesso.getFullYear())
  const [mese, setMese] = useState(adesso.getMonth())
  const [occupati, setOccupati] = useState([])
  const [carico, setCarico] = useState(true)

  // ⚠️ Le date si compongono dai campi locali: `toISOString()` passa per UTC e a
  // est di Greenwich sposta il giorno indietro di uno.
  const iso = (a, m, g) => `${a}-${String(m + 1).padStart(2, '0')}-${String(g).padStart(2, '0')}`
  const oggiIso = iso(adesso.getFullYear(), adesso.getMonth(), adesso.getDate())

  useEffect(() => {
    let vivo = true
    setCarico(true)
    publicFetch(`/api/booking/public/disponibilita/${risorsaId}?mese=${anno}-${String(mese + 1).padStart(2, '0')}`)
      .then(d => { if (vivo) setOccupati(d.occupati || []) })
      .finally(() => { if (vivo) setCarico(false) })
    return () => { vivo = false }
  }, [risorsaId, anno, mese])

  const primo = new Date(anno, mese, 1).getDay()
  const quanti = new Date(anno, mese + 1, 0).getDate()
  const celle = [...Array(primo === 0 ? 6 : primo - 1).fill(null), ...Array.from({ length: quanti }, (_, i) => i + 1)]

  // Non si può tornare prima del mese corrente: i giorni passati non si prenotano.
  const puoIndietro = anno > adesso.getFullYear() || (anno === adesso.getFullYear() && mese > adesso.getMonth())
  const indietro = () => { if (mese === 0) { setAnno(a => a - 1); setMese(11) } else setMese(m => m - 1) }
  const avanti = () => { if (mese === 11) { setAnno(a => a + 1); setMese(0) } else setMese(m => m + 1) }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={indietro} disabled={!puoIndietro} aria-label="Mese precedente"
          style={{ ...frecciaStyle, opacity: puoIndietro ? 1 : 0.3, cursor: puoIndietro ? 'pointer' : 'default' }}>‹</button>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{NOMI_MESI[mese]} {anno}</div>
        <button onClick={avanti} aria-label="Mese successivo" style={frecciaStyle}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 3, marginBottom: 4 }}>
        {SIGLE_GIORNI.map((s, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#bbb' }}>{s}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 3, opacity: carico ? 0.5 : 1 }}>
        {celle.map((g, i) => {
          if (!g) return <div key={`v${i}`} />
          const giorno = iso(anno, mese, g)
          const passato = giorno < oggiIso
          const preso = occupati.includes(giorno)
          const bloccato = passato || preso
          const eInizio = giorno === dal
          const eFine = giorno === al
          const dentro = dal && al && giorno > dal && giorno < al
          const scelto = eInizio || eFine
          return (
            <button key={giorno} data-giorno={giorno} disabled={bloccato}
              onClick={() => onScegli(giorno)}
              title={preso ? 'Non disponibile' : undefined}
              style={{
                aspectRatio: '1', border: 'none', borderRadius: 8, fontSize: 13, padding: 0,
                cursor: bloccato ? 'not-allowed' : 'pointer',
                fontWeight: scelto ? 700 : 500,
                background: scelto ? primaryColor : dentro ? `${primaryColor}22` : bloccato ? '#f4f4f5' : '#eefaf1',
                color: scelto ? '#fff' : bloccato ? '#c8c8cc' : '#2f6b45',
                // Il giorno occupato si distingue anche senza colore: uno su
                // dodici uomini non separa il verde dal rosso.
                textDecoration: preso ? 'line-through' : 'none',
              }}>
              {g}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 11, color: '#888', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#eefaf1' }} /> libero
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f4f4f5' }} /> non disponibile
        </span>
      </div>
    </div>
  )
}

const frecciaStyle = {
  background: '#f2f2f4', border: 'none', borderRadius: 8, width: 32, height: 32,
  fontSize: 18, cursor: 'pointer', color: '#444', lineHeight: 1,
}

const dateInputStyle = (color) => ({
  width: '100%', padding: '12px 14px', border: `2px solid ${color}`, borderRadius: 10,
  fontSize: 16, outline: 'none', boxSizing: 'border-box', background: '#fff',
})

const backBtnStyle = { marginTop: 14, background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', padding: 0 }
const counterBtn  = { width: 32, height: 32, borderRadius: '50%', border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }

const btnStyle = (color) => ({
  background: color, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px',
  fontSize: 15, fontWeight: 600, cursor: 'pointer',
})

const inputStyle = (color) => ({
  width: '100%', padding: '11px 14px', border: '1px solid #e0e0e0', borderRadius: 10,
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
  onFocus: `border-color: ${color}`,
})

// La scheda di una cosa prenotabile.
//
// ⚠️ Prima era grigia su grigio, con il testo centrato e una freccina piccola:
// sembrava una riga d'elenco, non un pulsante. Chi arriva qui deve capire in un
// colpo d'occhio che si clicca — fondo bianco che stacca, un po' di rilievo,
// e i contenuti allineati a sinistra come si leggono.
const cardBtnStyle = (color) => ({
  display: 'flex', alignItems: 'center', gap: 14,
  width: '100%', padding: '15px 16px', background: '#fff',
  border: '1px solid #e6e6e6', borderRadius: 14, cursor: 'pointer',
  textAlign: 'left', transition: 'border-color .15s, box-shadow .15s, transform .15s',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
})

const slotBtnStyle = (color, isPromo) => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '10px 14px', borderRadius: 10, border: `2px solid ${isPromo ? color : '#e0e0e0'}`,
  background: isPromo ? color + '0d' : '#fff', cursor: 'pointer', minWidth: 72,
})
