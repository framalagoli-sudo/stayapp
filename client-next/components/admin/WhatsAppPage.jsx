'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import {
  MessageCircle, CheckCircle, AlertCircle, Clock, Send, Users, Euro, Loader, Plus, X, Link2,
} from 'lucide-react'

const C = {
  testo: '#1a1a2e', tenue: '#888', bordo: '#eee',
  ok: '#2e7d32', okBg: '#f4fbf5', okBordo: '#c8e6c9',
  attesa: '#e65100', attesaBg: '#fffaf5', attesaBordo: '#ffe0b2',
  errore: '#c62828', erroreBg: '#fff5f5', erroreBordo: '#ffcdd2',
  info: '#1565c0', infoBg: '#f6f9ff', infoBordo: '#dde6ff',
}

export default function WhatsAppPage() {
  const { profile } = useAuth()
  const { azienda, activeAziendaId } = useAzienda() || {}
  const aziendaId = azienda?.id || profile?.azienda_id || activeAziendaId

  const [dati, setDati] = useState(null)
  const [campagne, setCampagne] = useState([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [nuova, setNuova] = useState(false)

  useEffect(() => { if (aziendaId) carica() }, [aziendaId]) // eslint-disable-line

  async function carica() {
    setLoading(true)
    try {
      const [d, c] = await Promise.all([
        apiFetch(`/api/whatsapp/connect?azienda_id=${aziendaId}`),
        apiFetch(`/api/whatsapp/campagne?azienda_id=${aziendaId}`),
      ])
      setDati(d); setCampagne(c || [])
    } catch (e) { setErrore(e.message) }
    setLoading(false)
  }

  const collegato = dati?.account?.stato === 'attivo'

  return (
    <div style={{ maxWidth: 780 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <MessageCircle size={22} strokeWidth={1.5} color={C.testo} />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>WhatsApp</h1>
      </div>
      <p style={{ margin: '0 0 26px', fontSize: 14, color: C.tenue, lineHeight: 1.5 }}>
        Manda messaggi ai tuoi clienti scegliendo una lista e un messaggio già pronto.
        Scrivono solo a chi ti ha dato il consenso.
      </p>

      {errore && (
        <div style={{ display: 'flex', gap: 8, background: C.erroreBg, color: C.errore, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          <AlertCircle size={16} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ overflowWrap: 'anywhere' }}>{errore}</span>
        </div>
      )}

      {loading ? (
        <Attesa testo="Carico…" />
      ) : (
        <>
          <Collegamento dati={dati} aziendaId={aziendaId} onCambio={carica} />
          {collegato && <Messaggi dati={dati} />}
          {collegato && (
            <Campagne
              campagne={campagne}
              catalogo={dati.catalogo}
              templates={dati.templates}
              aziendaId={aziendaId}
              aperta={nuova}
              onApri={() => setNuova(true)}
              onChiudi={() => setNuova(false)}
              onFatto={() => { setNuova(false); carica() }}
            />
          )}
        </>
      )}
    </div>
  )
}

function Attesa({ testo }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', fontSize: 13, padding: '10px 0' }}><Loader size={14} strokeWidth={1.5} /> {testo}</div>
}

function Scheda({ titolo, etichetta, colore, sfondo, descrizione, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.bordo}`, padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.testo }}>{titolo}</span>
        {etichetta && <span style={{ fontSize: 11, background: sfondo, color: colore, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{etichetta}</span>}
      </div>
      {descrizione && <p style={{ fontSize: 13, color: C.tenue, margin: '0 0 18px', lineHeight: 1.5 }}>{descrizione}</p>}
      {children}
    </div>
  )
}

// ── Collegamento del numero ───────────────────────────────────────────────────
function Collegamento({ dati, aziendaId, onCambio }) {
  const [attesa, setAttesa] = useState(false)
  const account = dati?.account

  async function scollega() {
    if (!confirm('Scollegare il numero WhatsApp?\n\nLe campagne già inviate restano nello storico, ma non potrai inviarne altre finché non ricolleghi.')) return
    setAttesa(true)
    try { await apiFetch(`/api/whatsapp/connect?azienda_id=${aziendaId}`, { method: 'DELETE' }); onCambio() } catch {}
    setAttesa(false)
  }

  if (account?.stato === 'attivo') {
    return (
      <Scheda titolo="Il tuo numero" etichetta="Collegato" colore={C.ok} sfondo={C.okBg}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.okBg, border: `1px solid ${C.okBordo}`, borderRadius: 10, padding: '14px 18px', flexWrap: 'wrap' }}>
          <CheckCircle size={16} strokeWidth={1.5} color={C.ok} style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 16, color: C.testo }}>{account.numero_visualizzato}</span>
          {account.quality_rating && (
            <span style={{ fontSize: 12, color: C.tenue }}>qualità: <strong>{traduciQualita(account.quality_rating)}</strong></span>
          )}
          <button onClick={scollega} disabled={attesa} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>
            Scollega
          </button>
        </div>
        {account.quality_rating === 'RED' && (
          <div style={{ display: 'flex', gap: 8, background: C.erroreBg, border: `1px solid ${C.erroreBordo}`, borderRadius: 8, padding: '10px 12px', marginTop: 12 }}>
            <AlertCircle size={16} strokeWidth={1.5} color={C.errore} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12, color: C.errore, lineHeight: 1.5 }}>
              WhatsApp ha abbassato la qualità del tuo numero: troppe persone hanno segnalato i messaggi.
              Sospendi le promozioni e scrivi solo a chi te l’ha chiesto, o il numero rischia il blocco.
            </p>
          </div>
        )}
      </Scheda>
    )
  }

  return (
    <Scheda
      titolo="Collega il tuo numero WhatsApp"
      etichetta="Da fare"
      colore={C.attesa}
      sfondo={C.attesaBg}
      descrizione="Serve un numero dedicato: non può essere lo stesso che usi su WhatsApp dal telefono."
    >
      <div style={{ background: C.infoBg, border: `1px solid ${C.infoBordo}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: C.testo }}>Prima di iniziare, tieni presente che:</p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#555', lineHeight: 1.7 }}>
          <li>i messaggi li fattura <strong>Meta direttamente a te</strong>, non noi: durante il collegamento ti chiederà una carta</li>
          <li>costano pochi centesimi l’uno — te lo diciamo sempre <strong>prima</strong> di ogni invio</li>
          <li>servono un account Meta Business e la verifica della tua attività</li>
        </ul>
      </div>
      {!dati?.configurato ? (
        <div style={{ display: 'flex', gap: 8, background: C.attesaBg, border: `1px solid ${C.attesaBordo}`, borderRadius: 8, padding: '12px 14px' }}>
          <Clock size={16} strokeWidth={1.5} color={C.attesa} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 13, color: '#7a4a00', lineHeight: 1.5 }}>
            Stiamo completando l’attivazione di WhatsApp sulla piattaforma. Ti avvisiamo appena puoi collegare il tuo numero.
          </p>
        </div>
      ) : (
        <button
          onClick={() => alert('Il collegamento guidato con Meta si aprirà qui.')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          <Link2 size={16} strokeWidth={2} /> Collega WhatsApp
        </button>
      )}
    </Scheda>
  )
}

const traduciQualita = q => ({ GREEN: 'buona', YELLOW: 'da tenere d’occhio', RED: 'a rischio' }[q] || q)

// ── I messaggi disponibili ────────────────────────────────────────────────────
function Messaggi({ dati }) {
  const stato = k => dati.templates.find(t => t.catalogo_key === k)
  const etichette = {
    approvato: { testo: 'Pronto', colore: C.ok, sfondo: C.okBg },
    in_attesa: { testo: 'In approvazione', colore: C.attesa, sfondo: C.attesaBg },
    rifiutato: { testo: 'Rifiutato', colore: C.errore, sfondo: C.erroreBg },
    disabilitato: { testo: 'Disattivato', colore: C.tenue, sfondo: '#f5f5f5' },
  }

  return (
    <Scheda
      titolo="I tuoi messaggi"
      descrizione="Testi già pronti e approvati da WhatsApp: tu scegli quale usare e riempi i campi. Non devi scriverne di nuovi."
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10 }}>
        {dati.catalogo.map(t => {
          const s = stato(t.key)
          const e = etichette[s?.stato] || etichette.in_attesa
          return (
            <div key={t.key} style={{ border: `1px solid ${C.bordo}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.testo }}>{t.titolo}</span>
                <span style={{ fontSize: 11, background: e.sfondo, color: e.colore, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{e.testo}</span>
                <span style={{ fontSize: 11, color: C.tenue, marginLeft: 'auto' }}>
                  {t.categoria === 'MARKETING' ? 'promozionale' : 'servizio'}
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: C.tenue, lineHeight: 1.5 }}>{t.descrizione}</p>
              {s?.stato === 'rifiutato' && s.motivo_rifiuto && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: C.errore }}>Motivo: {s.motivo_rifiuto}</p>
              )}
            </div>
          )
        })}
      </div>
    </Scheda>
  )
}

// ── Campagne ──────────────────────────────────────────────────────────────────
function Campagne({ campagne, catalogo, templates, aziendaId, aperta, onApri, onChiudi, onFatto }) {
  return (
    <Scheda titolo="Invii" descrizione="Scegli una lista, un messaggio, e vedi quanto costa prima di inviare.">
      {!aperta && (
        <button onClick={onApri} style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.testo, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: campagne.length ? 18 : 0 }}>
          <Plus size={15} strokeWidth={1.5} /> Nuovo invio
        </button>
      )}

      {aperta && (
        <NuovaCampagna catalogo={catalogo} templates={templates} aziendaId={aziendaId} onChiudi={onChiudi} onFatto={onFatto} />
      )}

      {campagne.map(c => (
        <div key={c.id} style={{ border: `1px solid ${C.bordo}`, borderRadius: 10, padding: '12px 14px', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>{c.nome}</span>
            <StatoCampagna stato={c.stato} />
            <span style={{ fontSize: 12, color: C.tenue, marginLeft: 'auto' }}>
              {new Date(c.created_at).toLocaleDateString('it-IT')}
            </span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: C.tenue }}>
            {c.destinatari_totali} destinatari · {c.inviati} inviati · {c.consegnati} consegnati · {c.letti} letti
            {c.falliti > 0 && ` · ${c.falliti} falliti`}
            {c.costo_stimato != null && ` · ${Number(c.costo_stimato).toFixed(2)} €`}
          </p>
          {c.errore && <p style={{ margin: '6px 0 0', fontSize: 12, color: C.errore }}>{c.errore}</p>}
        </div>
      ))}
    </Scheda>
  )
}

function StatoCampagna({ stato }) {
  const m = {
    bozza: ['Bozza', C.tenue, '#f5f5f5'],
    programmata: ['Programmata', C.info, C.infoBg],
    in_corso: ['In corso', C.attesa, C.attesaBg],
    completata: ['Inviata', C.ok, C.okBg],
    annullata: ['Annullata', C.tenue, '#f5f5f5'],
    errore: ['Errore', C.errore, C.erroreBg],
  }[stato] || [stato, C.tenue, '#f5f5f5']
  return <span style={{ fontSize: 11, background: m[2], color: m[1], padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{m[0]}</span>
}

function NuovaCampagna({ catalogo, templates, aziendaId, onChiudi, onFatto }) {
  const pronti = catalogo.filter(t => templates.find(x => x.catalogo_key === t.key)?.stato === 'approvato')
  const [key, setKey] = useState(pronti[0]?.key || '')
  const [lista, setLista] = useState('')
  const [variabili, setVariabili] = useState({})
  const [stima, setStima] = useState(null)
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState('')

  const t = catalogo.find(x => x.key === key)

  async function calcola() {
    setAttesa(true); setErrore('')
    try {
      const r = await apiFetch('/api/whatsapp/campagne', {
        method: 'POST',
        body: JSON.stringify({ azienda_id: aziendaId, catalogo_key: key, variabili, tag_filter: lista ? [lista.trim()] : null, solo_anteprima: true }),
      })
      setStima(r)
    } catch (e) { setErrore(e.message) }
    setAttesa(false)
  }

  async function invia() {
    if (!confirm(`Inviare a ${stima.destinatari} persone?\n\nCosto stimato: ${stima.costo_stimato.toFixed(2)} € — addebitati da Meta sulla tua carta.`)) return
    setAttesa(true); setErrore('')
    try {
      await apiFetch('/api/whatsapp/campagne', {
        method: 'POST',
        body: JSON.stringify({ azienda_id: aziendaId, catalogo_key: key, variabili, tag_filter: lista ? [lista.trim()] : null, invia_ora: true, nome: t?.titolo }),
      })
      onFatto()
    } catch (e) { setErrore(e.message) }
    setAttesa(false)
  }

  if (!pronti.length) {
    return (
      <div style={{ display: 'flex', gap: 8, background: C.attesaBg, border: `1px solid ${C.attesaBordo}`, borderRadius: 8, padding: '12px 14px' }}>
        <Clock size={16} strokeWidth={1.5} color={C.attesa} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 13, color: '#7a4a00', lineHeight: 1.5 }}>
          I tuoi messaggi sono ancora in approvazione da parte di WhatsApp. Di solito ci vogliono poche ore: ti avvisiamo appena sono pronti.
        </p>
      </div>
    )
  }

  const etichetta = { fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4, display: 'block' }
  const campo = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, marginBottom: 14, boxSizing: 'border-box' }

  return (
    <div style={{ border: `1px solid ${C.bordo}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Nuovo invio</span>
        <button onClick={onChiudi} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}><X size={18} /></button>
      </div>

      <label style={etichetta}>Messaggio</label>
      <select value={key} onChange={e => { setKey(e.target.value); setStima(null) }} style={campo}>
        {pronti.map(t => <option key={t.key} value={t.key}>{t.titolo}</option>)}
      </select>

      <label style={etichetta}>Lista (tag dei contatti) — vuoto = tutti quelli col consenso</label>
      <input value={lista} onChange={e => { setLista(e.target.value); setStima(null) }} placeholder="es. clienti-2026" style={campo} />

      {t?.variabili.filter(v => v.chiave !== 'nome').map(v => (
        <div key={v.chiave}>
          <label style={etichetta}>{v.etichetta}</label>
          <input
            value={variabili[v.chiave] || ''}
            onChange={e => { setVariabili(p => ({ ...p, [v.chiave]: e.target.value })); setStima(null) }}
            placeholder={v.esempio}
            style={campo}
          />
        </div>
      ))}

      {t && (
        <div style={{ background: '#f9f9f9', border: `1px solid ${C.bordo}`, borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, color: C.tenue, fontWeight: 600 }}>COME ARRIVA</p>
          <p style={{ margin: 0, fontSize: 13, color: C.testo, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {t.variabili.reduce((testo, v, i) =>
              testo.replaceAll(`{{${i + 1}}}`, v.chiave === 'nome' ? 'Mario' : (variabili[v.chiave] || `[${v.etichetta.toLowerCase()}]`)), t.corpo)}
          </p>
        </div>
      )}

      {errore && <p style={{ margin: '0 0 12px', fontSize: 13, color: C.errore }}>{errore}</p>}

      {stima && (
        <div style={{ background: C.infoBg, border: `1px solid ${C.infoBordo}`, borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Users size={15} strokeWidth={1.5} color={C.info} />
            <span style={{ fontSize: 14, fontWeight: 700, color: C.testo }}>{stima.destinatari} destinatari</span>
            <Euro size={15} strokeWidth={1.5} color={C.info} style={{ marginLeft: 8 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: C.testo }}>{stima.costo_stimato.toFixed(2)} €</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#555', lineHeight: 1.5 }}>
            Addebitati da Meta sulla tua carta.
            {stima.esclusi_senza_consenso > 0 && ` ${stima.esclusi_senza_consenso} contatti restano fuori perché non hanno dato il consenso WhatsApp.`}
            {stima.esclusi_numero_non_valido > 0 && ` ${stima.esclusi_numero_non_valido} hanno un numero non valido.`}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {!stima ? (
          <button onClick={calcola} disabled={attesa || !key} style={{ background: C.testo, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', flex: 1, opacity: attesa ? 0.6 : 1 }}>
            {attesa ? 'Calcolo…' : 'Quanti sono e quanto costa'}
          </button>
        ) : (
          <>
            <button onClick={() => setStima(null)} style={{ background: 'transparent', color: '#555', border: '1px solid #ddd', borderRadius: 8, padding: '11px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Modifica
            </button>
            <button onClick={invia} disabled={attesa || !stima.destinatari} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', flex: 1, opacity: attesa || !stima.destinatari ? 0.5 : 1 }}>
              <Send size={15} strokeWidth={1.5} /> {attesa ? 'Invio…' : 'Invia ora'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
