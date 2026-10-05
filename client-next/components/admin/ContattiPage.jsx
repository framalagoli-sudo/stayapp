'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useAzienda } from '@/context/AziendaContext'
import { apiFetch } from '@/lib/api'
import { Search, Plus, X, Pencil, Trash2, Users, Mail, Phone, Tag, List, LayoutGrid, GripVertical, ChevronDown, ChevronUp, Star, Copy, Check, Download, Upload, Repeat, MessageCircle } from 'lucide-react'
import { costruisciListe, nomeFonte, fraseAttivita, canaliContattabili, contattabile, emailDaCorreggere, etichetteAMano } from '@/lib/contatti-liste'
import { STADI_TRATTATIVA_ELENCO } from '@/lib/contatti-regole'
import ContattiImportModal from './ContattiImportModal'
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'

// Gli stadi di una trattativa: in `lib/contatti-regole.js`, gli stessi che la route accetta.
const STAGES = STADI_TRATTATIVA_ELENCO
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

// ─── Tag helpers ──────────────────────────────────────────────────────────────
const TAG_COLORS = ['#00b5b5','#e63946','#2b6cb0','#276749','#b7791f','#6b46c1','#c05621','#2c7a7b','#702459']
function tagColor(tag) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h + tag.charCodeAt(i)) % TAG_COLORS.length
  return TAG_COLORS[h]
}

function TagChip({ tag, onRemove, small }) {
  const color = tagColor(tag)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: small ? '2px 8px' : '4px 10px', borderRadius: 20, background: color + '18', color, fontSize: small ? 11 : 12, fontWeight: 700 }}>
      {tag}
      {onRemove && <button onClick={() => onRemove(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 0, lineHeight: 1, display: 'flex' }}><X size={10} /></button>}
    </span>
  )
}

function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('')
  function add() {
    const t = input.trim().toLowerCase()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, minHeight: 42, alignItems: 'center' }}>
      {tags.map(t => <TagChip key={t} tag={t} onRemove={tag => onChange(tags.filter(x => x !== tag))} small />)}
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { e.preventDefault(); add() } }}
        onBlur={add}
        placeholder={tags.length ? '' : 'Aggiungi tag…'}
        style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, minWidth: 120, background: 'transparent' }} />
    </div>
  )
}

// ─── Export CSV ────────────────────────────────────────────────────────────────
// Separatore ';' (Excel IT/EU non spezza in colonne) + BOM UTF-8 (accenti corretti).
function csvCell(v) {
  const s = v == null ? '' : String(v)
  return `"${s.replace(/"/g, '""')}"`
}

function downloadContattiCSV(contatti, nomeLista = '') {
  const headers = ['Nome', 'Email', 'Telefono', 'Da dove arriva', 'Attività', 'Ultima attività', 'Quando', 'Email promozionali', 'WhatsApp', 'Trattativa', 'Etichette', 'Note', 'Arrivato il']
  const rows = contatti.map(c => [
    c.nome,
    c.email,
    c.telefono,
    nomeFonte(c.fonte),
    c.attivita_numero || 0,
    c.ultima_attivita_tipo ? fraseAttivita({ tipo: c.ultima_attivita_tipo, titolo: c.ultima_attivita_titolo }) : '',
    c.ultima_attivita_il ? new Date(c.ultima_attivita_il).toLocaleDateString('it-IT') : '',
    canaliContattabili(c).email ? 'Sì' : 'No',
    canaliContattabili(c).whatsapp ? 'Sì' : 'No',
    STAGE_MAP[c.pipeline_stage]?.label || '',
    (c.tags || []).join(', '),
    c.note,
    c.created_at ? new Date(c.created_at).toLocaleDateString('it-IT') : '',
  ])
  const csv = [headers, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const lista = nomeLista ? '-' + nomeLista.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) : ''
  a.download = `contatti${lista}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ─── Contact modal ────────────────────────────────────────────────────────────
// La scheda di una persona.
//
// ⛔ Era un modulo di otto campi più alto della finestra, con la storia scritta
// tre volte — nel registro, nei tag automatici e nelle note («[03/10] Ha
// prenotato…») — e due pulsanti rossi uguali in fondo, uno dei quali si
// chiamava «Anonimizza dati (GDPR Art. 17)». Francesco: «serve l'origine del
// contatto e categorizzarlo in una lista».
// Ora in cima c'è chi è e da dove arriva, con i recapiti che si toccano; poi la
// storia; poi quello che il titolare può cambiare. Il salvataggio resta sempre
// a vista, e le due azioni che non si disfano stanno a parte, spiegate.
const EMPTY = { nome: '', email: '', telefono: '', tags: [], note: '', iscritto_newsletter: false, whatsapp_optin: false, pipeline_stage: null }
const quando = iso => iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

function ContactModal({ contact, aziendaId, onSave, onClose, storia = [], entita = [], onElimina = null, automatici = null, altri = [], simili = [] }) {
  const isNew = !contact?.id
  // Nel campo si modificano solo le etichette scritte a mano. Quelle messe dal
  // sistema restano nei dati (la newsletter le usa ancora) e si riattaccano al
  // salvataggio: non si vedono e non si perdono.
  const delSistema = isNew ? [] : (contact.tags || []).filter(t => !etichetteAMano({ tags: [t] }, automatici).length)
  const [form, setForm] = useState({ ...EMPTY, ...(contact || {}), tags: isNew ? [] : etichetteAMano(contact, automatici) })
  const [saving, setSaving] = useState(false)
  const [altro, setAltro] = useState(false)

  // Esc chiude, come ogni finestra.
  useEffect(() => {
    const giu = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', giu)
    return () => window.removeEventListener('keydown', giu)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const corpo = { nome: form.nome, email: form.email, telefono: form.telefono, note: form.note,
        tags: [...delSistema, ...(form.tags || [])], iscritto_newsletter: !!form.iscritto_newsletter,
        whatsapp_optin: !!form.whatsapp_optin, pipeline_stage: form.pipeline_stage || null }
      if (isNew) await apiFetch('/api/contatti', { method: 'POST', body: JSON.stringify({ ...corpo, azienda_id: aziendaId }) })
      else await apiFetch(`/api/contatti/${contact.id}`, { method: 'PATCH', body: JSON.stringify(corpo) })
      onSave()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  async function handleErasure() {
    if (!window.confirm(`Rendere anonimo ${contact.nome}?\n\nNome, email e telefono vengono cancellati dalla scheda, dalle sue prenotazioni e dai moduli che ha compilato. Non si possono recuperare. Restano righe senza nome, così i conteggi delle serate non cambiano.`)) return
    setSaving(true)
    try {
      const esito = await apiFetch(`/api/contatti/${contact.id}/erasure`, { method: 'POST' })
      // Si dice dove sono stati tolti i dati: la scheda era solo uno dei posti.
      const s = esito?.svuotate || {}
      const dove = [s.eventi && `${s.eventi} prenotazioni di eventi`, s.prenotazioni && `${s.prenotazioni} altre prenotazioni`, s.moduli && `${s.moduli} moduli compilati`].filter(Boolean)
      alert(`Reso anonimo.${dove.length ? ` I suoi dati sono stati tolti anche da: ${dove.join(', ')}.` : ''}\n\nGli ordini del negozio, se ce ne sono, restano: sono documenti di vendita e vanno conservati.`)
      onSave()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  // Unire due schede della stessa persona. Lo decide chi guarda, mai il sistema.
  const [conChi, setConChi] = useState(simili[0]?.id || '')
  const [cercaAltro, setCercaAltro] = useState('')
  const candidati = cercaAltro.trim()
    ? altri.filter(c => [c.nome, c.email, c.telefono].some(x => (x || '').toLowerCase().includes(cercaAltro.trim().toLowerCase()))).slice(0, 8)
    : simili
  async function unisci() {
    const altro = altri.find(c => c.id === conChi)
    if (!altro) return
    if (!window.confirm(`Unire «${altro.nome}» a «${contact.nome}»?\n\nTutta la storia di «${altro.nome}» passa a questa scheda e la sua sparisce. Restano i dati di questa scheda; dell'altra si prende solo ciò che qui manca, e i suoi recapiti diversi finiscono nelle note.\n\nNon si può annullare.`)) return
    setSaving(true)
    try {
      await apiFetch(`/api/contatti/${contact.id}/unisci`, { method: 'POST', body: JSON.stringify({ altro_id: altro.id }) })
      onSave()
    } catch (e) { alert(`Non è riuscito: ${e.message}`) }
    setSaving(false)
  }

  // Il link per chiedere una recensione: prima stava su ogni riga dell'elenco.
  const [entitaRec, setEntitaRec] = useState(entita[0]?.key || '')
  const [recCopiata, setRecCopiata] = useState(false)
  async function linkRecensione() {
    const e = entita.find(x => x.key === entitaRec) || entita[0]
    if (!e) return
    try {
      const data = await apiFetch('/api/recensioni/genera-link', { method: 'POST', body: JSON.stringify({ entity_tipo: e.tipo, entity_id: e.id, autore: contact.nome }) })
      await navigator.clipboard.writeText(data.link)
      setRecCopiata(true); setTimeout(() => setRecCopiata(false), 2500)
    } catch (err) { alert(`Non è riuscito: ${err.message}`) }
  }

  const field = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }
  const label = { fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4, display: 'block' }
  const sezione = { fontSize: 12, fontWeight: 700, color: '#666', margin: '4px 0 8px' }
  const recapito = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#2b6cb0', textDecoration: 'none', fontWeight: 600, minWidth: 0 }
  const numero = contact?.telefono_e164 ? contact.telefono_e164.replace(/\D/g, '') : null

  return (
    // Si chiude anche cliccando fuori: `onMouseDown` sullo sfondo, non sul contenuto.
    <div onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
      <form onSubmit={handleSubmit} data-scheda role="dialog" aria-modal="true" aria-label={isNew ? 'Nuovo contatto' : contact.nome}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Chi è, e come si raggiunge */}
        <div style={{ padding: '20px 22px 14px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 18, overflowWrap: 'anywhere' }}>{isNew ? 'Nuovo contatto' : contact.nome}</h3>
            <button type="button" onClick={onClose} aria-label="Chiudi" style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0 }}><X size={20} strokeWidth={1.5} /></button>
          </div>
          {!isNew && (
            <>
              <div data-recapiti style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
                {contact.email && <a href={`mailto:${contact.email}`} style={{ ...recapito, overflowWrap: 'anywhere' }}><Mail size={13} strokeWidth={1.5} /> {contact.email}</a>}
                {contact.telefono && <a href={`tel:${contact.telefono_e164 || contact.telefono}`} style={recapito}><Phone size={13} strokeWidth={1.5} /> {contact.telefono}</a>}
                {numero && <a href={`https://wa.me/${numero}`} target="_blank" rel="noopener noreferrer" style={{ ...recapito, color: '#0b6b5c' }}><MessageCircle size={13} strokeWidth={1.5} /> WhatsApp</a>}
              </div>
              <div data-origine style={{ fontSize: 12.5, color: '#888', marginTop: 7 }}>
                Arrivato da: <strong style={{ color: '#555' }}>{nomeFonte(contact.fonte)}</strong> · {quando(contact.created_at)}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '16px 22px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {/* La storia, letta dal registro: una riga per ogni cosa fatta. */}
          {!isNew && (
            <div data-storia style={{ marginBottom: 18 }}>
              <div style={sezione}>Cosa ha fatto {storia.length > 0 && <span style={{ fontWeight: 400, color: '#999' }}>· {storia.length} attività</span>}</div>
              {storia.length === 0 ? (
                <div style={{ fontSize: 13, color: '#999', background: '#fafafa', borderRadius: 8, padding: '10px 12px' }}>Ancora niente: è fra i contatti ma non ha prenotato, comprato o scritto.</div>
              ) : (
                <div style={{ border: '1px solid #eee', borderRadius: 8, maxHeight: 168, overflowY: 'auto' }}>
                  {storia.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', borderBottom: i < storia.length - 1 ? '1px solid #f3f3f3' : 'none', fontSize: 13 }}>
                      <span style={{ color: '#999', flexShrink: 0, width: 78 }}>{new Date(a.avvenuta_il).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                      <span style={{ color: '#333', overflowWrap: 'anywhere' }}>{fraseAttivita(a)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <label style={label}>Nome *</label>
          <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required style={field} placeholder="Nome e cognome" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', columnGap: 10 }}>
            <div>
              <label style={label}>Email</label>
              <input value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" style={field} placeholder="email@esempio.it" />
            </div>
            <div>
              <label style={label}>Telefono</label>
              <input value={form.telefono || ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} style={field} placeholder="+39 333 1234567" />
            </div>
          </div>

          <label style={label}>Etichette <span style={{ fontWeight: 400, color: '#aaa' }}>— le tue: ognuna diventa una lista</span></label>
          <div style={{ marginBottom: 12 }}>
            <TagInput tags={form.tags || []} onChange={tags => setForm(f => ({ ...f, tags }))} />
          </div>

          <label style={label}>Le tue note</label>
          <textarea value={form.note || ''} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={3} style={{ ...field, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Quello che vuoi ricordarti di questa persona" />

          {/* Qualunque contatto si può seguire come trattativa: chi prenota o
              compra non ci entra da solo, ma la possibilità resta. */}
          <label style={label}>Trattativa</label>
          <select data-trattativa value={form.pipeline_stage || ''} onChange={e => setForm(f => ({ ...f, pipeline_stage: e.target.value || null }))} style={{ ...field, background: '#fff' }}>
            <option value="">Non in trattativa</option>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>

          <div style={sezione}>Può ricevere promozioni</div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
            <input type="checkbox" checked={!!form.iscritto_newsletter} onChange={e => setForm(f => ({ ...f, iscritto_newsletter: e.target.checked }))} style={{ marginTop: 3 }} />
            <span style={{ fontSize: 14 }}>Per email
              {contact?.iscritto_newsletter && contact?.marketing_consenso_il && <span style={{ fontSize: 12, color: '#999' }}> · consenso del {quando(contact.marketing_consenso_il)}{contact.marketing_consenso_fonte ? ` (${contact.marketing_consenso_fonte})` : ''}</span>}
              {!contact?.iscritto_newsletter && contact?.marketing_revoca_il && <span data-revoca style={{ fontSize: 12, color: '#999' }}> · si è tolto il {quando(contact.marketing_revoca_il)}{contact.marketing_revoca_fonte ? ` (${contact.marketing_revoca_fonte})` : ''}</span>}
            </span>
          </label>
          {/* Il consenso WhatsApp e' l'unica spunta che puo' far bloccare il numero
              del cliente da Meta: va messa solo se il consenso c'e' davvero, e chi
              la mette deve saperlo nel momento in cui clicca, non dopo. */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
            <input type="checkbox" checked={!!form.whatsapp_optin} onChange={e => setForm(f => ({ ...f, whatsapp_optin: e.target.checked }))} style={{ marginTop: 3 }} />
            <span style={{ fontSize: 14 }}>Su WhatsApp
              {contact?.whatsapp_optin && contact?.whatsapp_optin_il && <span style={{ fontSize: 12, color: '#999' }}> · consenso del {quando(contact.whatsapp_optin_il)}{contact.whatsapp_optin_fonte ? ` (${contact.whatsapp_optin_fonte})` : ''}</span>}
            </span>
          </label>
          {(form.iscritto_newsletter && !contact?.iscritto_newsletter || form.whatsapp_optin && !contact?.whatsapp_optin) && (
            <div style={{ background: '#fffaf5', border: '1px solid #ffe0b2', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#7a4a00', lineHeight: 1.5 }}>
                Spunta solo se questa persona ti ha detto di sì. Registriamo che il consenso l’hai segnato tu, oggi.
                {form.whatsapp_optin && !contact?.whatsapp_optin && <> Scrivere su WhatsApp a chi non l’ha dato <strong>può farti bloccare il numero da Meta</strong>.</>}
              </p>
            </div>
          )}

          {!isNew && entita.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
              {entita.length > 1 && (
                <select value={entitaRec} onChange={e => setEntitaRec(e.target.value)} style={{ flex: 1, minWidth: 0, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff' }}>
                  {entita.map(e => <option key={e.key} value={e.key}>{e.name}</option>)}
                </select>
              )}
              <button type="button" onClick={linkRecensione}
                style={{ flex: entita.length > 1 ? '0 0 auto' : 1, padding: '9px 12px', background: recCopiata ? '#f0fff4' : '#fffbeb', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: recCopiata ? '#276749' : '#b7791f', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {recCopiata ? <><Check size={13} strokeWidth={1.5} /> Link copiato</> : <><Star size={13} strokeWidth={1.5} /> Copia il link per la recensione</>}
              </button>
            </div>
          )}

          {/* ⛔ Due schede per la stessa persona non si potevano unire: chi
              prenota una volta con un'email e una volta con un'altra restava
              due contatti, ognuno con metà della storia. Se un altro contatto
              ha lo stesso numero o lo stesso nome viene proposto qui; altrimenti
              lo si cerca. */}
          {!isNew && altri.length > 0 && (
            <div data-unisci style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 12, background: simili.length ? '#fffaf0' : 'transparent', borderRadius: simili.length ? 8 : 0, padding: simili.length ? '12px' : '12px 0 0' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: simili.length ? '#8a6d1f' : '#666', marginBottom: 6 }}>
                {simili.length ? 'Potrebbe essere la stessa persona di un altro contatto' : 'È la stessa persona di un altro contatto?'}
              </div>
              <input value={cercaAltro} onChange={e => { setCercaAltro(e.target.value); setConChi('') }} placeholder="Cerca l’altro contatto per nome, email o telefono"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', marginBottom: 6 }} />
              {candidati.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 4, marginBottom: 8 }}>
                  {candidati.map(c => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', minWidth: 0 }}>
                      <input type="radio" name="unisci" checked={conChi === c.id} onChange={() => setConChi(c.id)} />
                      <span style={{ ...unaRiga }}><strong>{c.nome}</strong> <span style={{ color: '#888' }}>· {[c.email, c.telefono].filter(Boolean).join(' · ') || 'senza recapiti'}</span></span>
                    </label>
                  ))}
                </div>
              )}
              <button type="button" onClick={unisci} disabled={saving || !conChi}
                style={{ padding: '8px 14px', background: conChi ? '#1a1a2e' : '#ddd', border: 'none', color: '#fff', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: conChi ? 'pointer' : 'not-allowed' }}>
                Unisci a questa scheda
              </button>
            </div>
          )}

          {/* Le due cose che non si disfano stanno a parte, chiuse, e ognuna
              dice cosa fa: prima erano due pulsanti rossi uguali. */}
          {!isNew && (
            <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
              <button type="button" onClick={() => setAltro(v => !v)} aria-expanded={altro} data-togliere
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#888', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {altro ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />} Togliere questa persona
              </button>
              {altro && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10, marginTop: 10 }}>
                  {onElimina && (
                    <div>
                      <button type="button" onClick={() => onElimina(contact)} disabled={saving}
                        style={{ padding: '8px 14px', background: '#fff0f0', border: 'none', color: '#c00', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Elimina contatto</button>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 4, lineHeight: 1.5 }}>Sparisce dall’elenco insieme alla sua storia. Le sue prenotazioni restano dove sono.</div>
                    </div>
                  )}
                  <div>
                    <button type="button" onClick={handleErasure} disabled={saving}
                      style={{ padding: '8px 14px', background: 'none', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Rendi anonimo</button>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4, lineHeight: 1.5 }}>Per chi chiede la cancellazione dei suoi dati: via nome, email e telefono dalla scheda, dalle sue prenotazioni e dai moduli. Restano righe senza nome, così i conteggi non cambiano.</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Il salvataggio resta sempre a vista: prima era in fondo a un modulo
            più alto della finestra. */}
        <div style={{ padding: '12px 22px 16px', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '12px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Salvataggio…' : isNew ? 'Aggiungi contatto' : 'Salva modifiche'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Trattative: la scheda di una persona e la colonna ───────────────────────
// ⚠️ A livello di modulo, non dentro la pagina: un componente dichiarato dentro
// un altro cambia identità a ogni render e il trascinamento si interrompe.
//
// ⛔ Le schede erano alte duecento pixel per via dei tag automatici (il titolo
// dell'evento spezzato su quattro righe): con ventotto persone la colonna
// misurava 5.528 px. Ora sono due righe — chi è, e l'ultima cosa che ha fatto.
function KanbanCard({ contact, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: contact.id })
  const ultima = contact.ultima_attivita_tipo ? fraseAttivita({ tipo: contact.ultima_attivita_tipo, titolo: contact.ultima_attivita_titolo }) : nomeFonte(contact.fonte)
  return (
    <div ref={setNodeRef} {...attributes} data-trattativa-scheda={contact.id}
      style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 9, padding: '8px 8px 8px 4px', marginBottom: 6, border: '1px solid #f0f0f0',
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.05)', opacity: isDragging ? 0.85 : 1,
        transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined, position: 'relative', zIndex: isDragging ? 999 : 'auto' }}>
      <div {...listeners} title="Trascina per spostare" style={{ cursor: 'grab', color: '#ccc', flexShrink: 0, touchAction: 'none', display: 'flex' }}>
        <GripVertical size={14} strokeWidth={1.5} />
      </div>
      <button type="button" onClick={() => onEdit(contact)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
        <div title={contact.nome} style={{ ...unaRiga, fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>{contact.nome}</div>
        <div title={ultima} style={{ ...unaRiga, fontSize: 11.5, color: '#888', marginTop: 1 }}>{ultima}</div>
      </button>
    </div>
  )
}

function KanbanColumn({ stage, contacts, onEdit, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key })
  // Dieci per colonna: una trattativa si lavora dall'alto, non si scorre.
  const [tutte, setTutte] = useState(false)
  const mostrate = tutte ? contacts : contacts.slice(0, IN_COLONNA)
  return (
    <div data-colonna={stage.key} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
        <span style={{ ...unaRiga, fontSize: 13, fontWeight: 700, color: '#333', flex: 1 }}>{stage.label}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: '1px 8px', borderRadius: 20, background: stage.light, color: stage.color }}>{contacts.length}</span>
      </div>
      <div ref={setNodeRef} style={{ flex: 1, minHeight: 90, borderRadius: 10, padding: 6, background: isOver ? stage.light : '#f8f8f8', border: `2px dashed ${isOver ? stage.color : 'transparent'}`, transition: 'background .15s, border-color .15s' }}>
        {mostrate.map(c => <KanbanCard key={c.id} contact={c} onEdit={onEdit} />)}
        {contacts.length === 0 && <div style={{ textAlign: 'center', padding: '18px 0', color: '#ccc', fontSize: 12 }}>Trascina qui</div>}
        {contacts.length > IN_COLONNA && (
          <button type="button" onClick={() => setTutte(v => !v)} style={{ width: '100%', padding: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#2b6cb0' }}>
            {tutte ? 'Mostra meno' : `Mostra altre ${contacts.length - IN_COLONNA}`}
          </button>
        )}
      </div>
      <button type="button" onClick={() => onAdd(stage.key)}
        style={{ marginTop: 6, padding: '6px', background: 'none', border: '1px dashed #ddd', borderRadius: 8, cursor: 'pointer', color: '#aaa', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Plus size={12} strokeWidth={1.5} /> Aggiungi
      </button>
    </div>
  )
}

// Quante persone si mostrano per volta, e quante liste per gruppo prima di «Mostra altre».
const PER_VOLTA = 25
// Quante schede per colonna nelle trattative, prima di «Mostra altre».
const IN_COLONNA = 10
const LISTE_A_VISTA = 5
// Un testo su una riga sola, tagliato con i puntini: è così che un titolo lungo
// — un dato del cliente — non alza la riga e non allarga la tabella.
const unaRiga = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }
const azioneBlocco = { padding: '6px 12px', borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }
const tendina = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff', color: '#1a1a2e', minWidth: 0 }

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ContattiPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { azienda, strutture, ristoranti, attivita, activeAziendaId } = useAzienda()
  const [contatti,  setContatti]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  // Il registro di quello che hanno fatto i contatti (`attivita` qui è già l'elenco delle attività dell'azienda).
  const [registro,  setRegistro]  = useState([])
  const [lista,     setLista]     = useState('tutti')   // quale lista si sta guardando
  const [ordine,    setOrdine]    = useState({ per: 'ultima', verso: 'desc' })
  const [quanti,    setQuanti]    = useState(PER_VOLTA)   // quante persone a schermo
  const [gruppiAperti, setGruppiAperti] = useState({})    // i gruppi di liste mostrati per intero
  const [scelti,    setScelti]    = useState(() => new Set())   // i contatti spuntati nella tabella
  const [nuovaEtichetta, setNuovaEtichetta] = useState('')
  const [inBlocco,  setInBlocco]  = useState(false)
  const [scrivendo, setScrivendo] = useState(false)
  const [view,      setView]      = useState('lista') // 'lista' | 'kanban' (= Trattative)
  const [stadioTel, setStadioTel] = useState('lead')  // lo stadio che si guarda su telefono
  const [modal,     setModal]     = useState(null)    // null | 'new' | contact obj
  const [importOpen, setImportOpen] = useState(false)
  const [newStage,  setNewStage]  = useState(null)    // stadio di chi si aggiunge da una colonna; dalla lista, nessuno

  const aziendaId = azienda?.id || profile?.azienda_id || activeAziendaId
    || strutture?.[0]?.azienda_id || ristoranti?.[0]?.azienda_id

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function load() {
    setLoading(true)
    try {
      // I contatti e il registro di quello che hanno fatto. La ricerca e le
      // liste si applicano qui nel browser: così ordinare e cambiare lista non
      // richiede di riscaricare tutto.
      const dove = aziendaId ? `?azienda_id=${aziendaId}` : ''
      const [data, storia] = await Promise.all([
        apiFetch(`/api/contatti${dove}`),
        apiFetch(`/api/contatti/attivita${dove}`).catch(() => []),
      ])
      setContatti(Array.isArray(data) ? data : [])
      setRegistro(Array.isArray(storia) ? storia : [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [aziendaId]) // eslint-disable-line
  // Cambiando lista, ricerca o ordine si riparte dalle prime: restare a «pagina
  // tre» di un'altra lista mostrerebbe un elenco che non si capisce.
  useEffect(() => { setQuanti(PER_VOLTA) }, [lista, search, ordine.per, ordine.verso])
  // Cambiando lista la selezione si svuota: agire su persone che non si vedono
  // più è il modo di eliminare qualcuno senza accorgersene.
  useEffect(() => { setScelti(new Set()); setNuovaEtichetta('') }, [lista, aziendaId])

  const allEntities = [
    ...(strutture || []).map(e => ({ id: e.id, name: e.name, tipo: 'struttura', key: `struttura:${e.id}` })),
    ...(ristoranti || []).map(e => ({ id: e.id, name: e.name, tipo: 'ristorante', key: `ristorante:${e.id}` })),
    ...(attivita || []).map(e => ({ id: e.id, name: e.name, tipo: 'attivita', key: `attivita:${e.id}` })),
  ]

  async function handleDelete(id, nome) {
    if (!confirm(`Eliminare "${nome}"?`)) return
    await apiFetch(`/api/contatti/${id}`, { method: 'DELETE' })
    setContatti(c => c.filter(x => x.id !== id))
    setModal(null)
  }

  async function moveStage(contactId, newStageKey) {
    setContatti(cs => cs.map(c => c.id === contactId ? { ...c, pipeline_stage: newStageKey } : c))
    try { await apiFetch(`/api/contatti/${contactId}`, { method: 'PATCH', body: JSON.stringify({ pipeline_stage: newStageKey }) }) }
    catch { load() }
  }

  function handleDragEnd({ active, over }) {
    if (!over) return
    const contact = contatti.find(c => c.id === active.id)
    if (contact && contact.pipeline_stage !== over.id && STAGE_MAP[over.id]) moveStage(active.id, over.id)
  }

  function openNewContact(stage = null) {
    setNewStage(stage)
    setModal('new')
  }

  const total      = contatti.length
  const newsletter = contatti.filter(c => c.iscritto_newsletter).length

  // Le liste si calcolano dai fatti: chi prenota entra da solo.
  const { liste, perContatto, automatici, simili } = costruisciListe(contatti, registro)
  // In trattativa = ha uno stadio. Vuoto = no, ed è il caso normale.
  const inTrattativa = contatti.filter(c => STAGE_MAP[c.pipeline_stage])
  const fuoriTrattativa = contatti.length - inTrattativa.length
  const listaScelta = liste.find(l => l.chiave === lista) || liste[0]
  const cercato = search.trim().toLowerCase()
  const COLONNE = {
    nome:     c => (c.nome || '').toLowerCase(),
    fonte:    c => nomeFonte(c.fonte).toLowerCase(),
    volte:    c => c.attivita_numero || 0,
    ultima:   c => c.ultima_attivita_il || '',
    contatto: c => (canaliContattabili(c).email ? 1 : 0) + (canaliContattabili(c).whatsapp ? 1 : 0),
    dal:      c => c.created_at || '',
  }
  const visibili = contatti
    .filter(c => !listaScelta.ids || listaScelta.ids.has(c.id))
    .filter(c => !cercato || [c.nome, c.email, c.telefono].some(x => (x || '').toLowerCase().includes(cercato)))
    .sort((x, y) => {
      const a = COLONNE[ordine.per](x), b = COLONNE[ordine.per](y)
      const d = typeof a === 'number' ? a - b : String(a).localeCompare(String(b), 'it')
      // A parità, il nome: l'ordine non deve cambiare da un caricamento all'altro.
      return (ordine.verso === 'asc' ? d : -d) || (x.nome || '').localeCompare(y.nome || '', 'it')
    })
  const contattabiliQui = visibili.filter(contattabile).length
  // Quanti di questa lista hanno detto sì alle EMAIL: è a loro che arriva una newsletter.
  const perEmailQui = contatti.filter(c => (!listaScelta.ids || listaScelta.ids.has(c.id)) && canaliContattabili(c).email).length
  // «Scrivi a questa lista»: nasce una bozza di newsletter destinata alla lista.
  // La lista si salva per CHIAVE, non per elenco di persone: chi ci entra dopo la riceve.
  async function scriviAllaLista() {
    setScrivendo(true)
    try {
      const prima = allEntities[0]
      const nl = await apiFetch('/api/newsletter', { method: 'POST', body: JSON.stringify({
        azienda_id: aziendaId, entity_tipo: prima?.tipo || 'struttura', entity_id: prima?.id || null,
        lista: listaScelta.chiave === 'tutti' ? null : { chiave: listaScelta.chiave, titolo: listaScelta.titoloLungo || listaScelta.titolo },
      }) })
      router.push(`/admin/newsletter/${nl.id}`)
    } catch (e) { alert(`Non è riuscito: ${e.message}`); setScrivendo(false) }
  }
  const dellaLista = contatti.filter(c => !listaScelta.ids || listaScelta.ids.has(c.id))
  const aSchermo = visibili.slice(0, quanti)

  // ── La stessa cosa su più persone insieme ──────────────────────────────────
  // Solo chi è spuntato E ancora nella lista che si guarda: la ricerca può
  // nascondere qualcuno dopo che è stato scelto, e non deve restare dentro.
  const selezionati = visibili.filter(c => scelti.has(c.id))
  const tuttiScelti = visibili.length > 0 && selezionati.length === visibili.length
  const spunta = id => setScelti(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const spuntaTutti = () => setScelti(tuttiScelti ? new Set() : new Set(visibili.map(c => c.id)))
  async function inBloccoFai(azione, extra = {}) {
    setInBlocco(true)
    try {
      const r = await apiFetch('/api/contatti/blocco', { method: 'POST', body: JSON.stringify({ azienda_id: aziendaId, azione, ids: selezionati.map(c => c.id), ...extra }) })
      setScelti(new Set()); setNuovaEtichetta('')
      await load()
      return r
    } catch (e) { alert(`Non è riuscito: ${e.message}`) }
    finally { setInBlocco(false) }
  }
  function eliminaScelti() {
    const n = selezionati.length
    if (!confirm(`Eliminare ${n} ${n === 1 ? 'contatto' : 'contatti'}?\n\n${n === 1 ? 'Sparisce' : 'Spariscono'} dall'elenco insieme alla ${n === 1 ? 'sua' : 'loro'} storia. Le prenotazioni restano dove sono.\n\nNon si può annullare.`)) return
    inBloccoFai('elimina')
  }
  // Le liste raccolte per intestazione, nell'ordine in cui arrivano.
  const gruppiDiListe = []
  for (const l of liste) {
    const ultimo = gruppiDiListe[gruppiDiListe.length - 1]
    if (ultimo && ultimo.nome === l.gruppo) ultimo.liste.push(l)
    else gruppiDiListe.push({ nome: l.gruppo, liste: [l] })
  }
  // Le pastiglie dei canali su cui si può scrivere. Funzione normale chiamata
  // `{renderCanali(…)}`, non un componente definito qui dentro (nota 22).
  function renderCanali(canali, stretto = false) {
    if (!canali.email && !canali.whatsapp) return stretto ? null : <span style={{ color: '#bbb' }}>No</span>
    const pillola = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: stretto ? '3px 6px' : '2px 8px', borderRadius: 20, flexShrink: 0 }
    return (
      <span style={{ display: 'inline-flex', gap: 5, flexShrink: 0 }}>
        {canali.email && <span title="Si può scrivere per email" style={{ ...pillola, background: '#f0fff4', color: '#276749' }}><Mail size={11} strokeWidth={1.5} />{!stretto && ' Email'}</span>}
        {canali.whatsapp && <span title="Si può scrivere su WhatsApp" style={{ ...pillola, background: '#ebf8f4', color: '#0b6b5c' }}><MessageCircle size={11} strokeWidth={1.5} />{!stretto && ' WhatsApp'}</span>}
      </span>
    )
  }
  // Cliccando un'intestazione si ordina per quella; ricliccando si inverte.
  // I testi partono dalla A, numeri e date dal più alto.
  const ordinaPer = per => setOrdine(o => o.per === per ? { per, verso: o.verso === 'asc' ? 'desc' : 'asc' } : { per, verso: per === 'nome' || per === 'fonte' ? 'asc' : 'desc' })

  return (
    <div>
      {/* Schermo stretto e schermo largo mostrano due forme della stessa cosa:
          come nel resto del pannello (`AdminLayout`), il confine è a 767px. */}
      <style>{`
        .ct-solo-telefono { display: none; }
        @media (max-width: 767px) {
          .ct-solo-computer { display: none !important; }
          .ct-solo-telefono { display: block; }
        }
      `}</style>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Contatti</h2>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>{total} contatti · {newsletter} iscritti newsletter</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: 8, padding: 3, gap: 2 }}>
            {[{ key: 'lista', Icon: List }, { key: 'kanban', Icon: LayoutGrid }].map(({ key, Icon }) => (
              <button key={key} onClick={() => setView(key)}
                style={{ padding: '6px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', background: view === key ? '#fff' : 'transparent', boxShadow: view === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: view === key ? '#1a1a2e' : '#888', transition: 'all .15s' }}>
                <Icon size={14} strokeWidth={1.8} />
                {key === 'lista' ? 'Lista' : 'Trattative'}
              </button>
            ))}
          </div>
          <button onClick={() => setImportOpen(true)}
            title="Importa contatti da un file CSV"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', color: '#1a1a2e', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={15} strokeWidth={2} /> Importa
          </button>
          <button onClick={() => view === 'lista' ? downloadContattiCSV(visibili, listaScelta.chiave === 'tutti' ? '' : listaScelta.titolo) : downloadContattiCSV(contatti)} disabled={contatti.length === 0}
            title={contatti.length === 0 ? 'Nessun contatto da esportare' : 'Esporta in CSV i contatti che stai guardando'}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', color: contatti.length === 0 ? '#bbb' : '#1a1a2e', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: contatti.length === 0 ? 'not-allowed' : 'pointer' }}>
            <Download size={15} strokeWidth={2} /> Esporta
          </button>
          <button onClick={() => openNewContact(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={15} strokeWidth={2} /> Aggiungi
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="ct-solo-computer" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          // ⚠️ Contano la lista che si sta guardando: prima dicevano sempre il
          // totale, anche con una lista di otto persone sotto.
          { label: view === 'lista' && listaScelta.chiave !== 'tutti' ? 'In questa lista' : 'Contatti', value: (view === 'lista' ? dellaLista : contatti).length, Icon: Users, color: '#2b6cb0' },
          { label: 'Contattabili',      value: (view === 'lista' ? dellaLista : contatti).filter(contattabile).length, Icon: Mail, color: '#276749' },
          { label: 'Tornati più volte', value: (view === 'lista' ? dellaLista : contatti).filter(c => liste.find(l => l.chiave === 'tornati')?.ids.has(c.id)).length, Icon: Repeat, color: '#6b46c1' },
          { label: 'In trattativa',     value: (view === 'lista' ? dellaLista : contatti).filter(c => ['lead', 'contattato', 'proposta'].includes(c.pipeline_stage)).length, Icon: LayoutGrid, color: '#b7791f' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Icon size={16} strokeWidth={1.5} color={color} />
              <span style={{ fontSize: 12, color: '#888' }}>{label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Lista: le liste a sinistra, la tabella a destra ──
          ⛔ Era un elenco di schede con quattro comandi per riga, la pastiglia
          «Lead» su tutti e da due a cinque tag ciascuno — titoli interi di
          eventi, parole nostre come «lead» e «struttura». Francesco, guardando
          Garage 22: «trovo grande caos anche qui».
          Ora: a sinistra le LISTE, calcolate da quello che le persone hanno
          fatto (chi ha prenotato quella serata, chi è tornato, chi si può
          contattare); a destra una tabella che si ordina cliccando le
          intestazioni. I comandi stanno nella scheda, che si apre dalla riga.
          La pipeline resta nella sua vista.

          ⛔ La prima versione su un telefono era alta sei schermate: tutte le
          liste in colonna prima del primo contatto, e una tabella da scorrere
          di lato (Francesco: «la lista è infinita e da smartphone è
          innavigabile»). Ora su schermo stretto le liste sono un menu a
          tendina, i contatti sono schede di due righe, e in ogni caso se ne
          mostrano venticinque per volta. */}
      {view === 'lista' && (
        loading ? <p style={{ color: '#aaa', fontSize: 14 }}>Caricamento…</p>
        : contatti.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#aaa' }}>
            Nessun contatto ancora. Chi prenota, ordina o compila un modulo entra qui da solo; puoi anche aggiungerne uno a mano o importare un file.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Le liste, su computer: una colonna che resta a vista scorrendo. */}
            <nav data-liste aria-label="Liste di contatti" className="ct-solo-computer"
              style={{ flex: '0 0 230px', maxWidth: '100%', background: '#fff', borderRadius: 12, padding: '10px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'sticky', top: 16, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
              {gruppiDiListe.map(g => {
                // Un gruppo lungo (venti eventi) non deve spingere via gli altri:
                // se ne vedono cinque, più quella che si sta guardando.
                const aperto = !!gruppiAperti[g.nome]
                const mostrate = aperto ? g.liste : g.liste.filter((l, i) => i < LISTE_A_VISTA || l.chiave === listaScelta.chiave)
                return (
                  <div key={g.nome || 'principali'}>
                    {g.nome && <div style={{ fontSize: 10.5, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, padding: '12px 10px 4px' }}>{g.nome}</div>}
                    {mostrate.map(l => {
                      const attiva = l.chiave === listaScelta.chiave
                      return (
                        <button key={l.chiave} onClick={() => setLista(l.chiave)} data-lista={l.chiave} title={l.titoloLungo || l.titolo}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '7px 10px', border: 'none', borderRadius: 8, cursor: 'pointer', background: attiva ? '#1a1a2e' : 'transparent', color: attiva ? '#fff' : '#333', fontSize: 13, fontWeight: attiva ? 700 : 500 }}>
                          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.titolo}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: attiva ? 'rgba(255,255,255,0.75)' : '#999', flexShrink: 0 }}>{l.n}</span>
                        </button>
                      )
                    })}
                    {g.liste.length > mostrate.length && (
                      <button onClick={() => setGruppiAperti(a => ({ ...a, [g.nome]: true }))} data-altre={g.nome}
                        style={{ width: '100%', textAlign: 'left', padding: '6px 10px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#2b6cb0' }}>
                        Mostra altre {g.liste.length - mostrate.length}
                      </button>
                    )}
                    {aperto && g.liste.length > LISTE_A_VISTA && (
                      <button onClick={() => setGruppiAperti(a => ({ ...a, [g.nome]: false }))}
                        style={{ width: '100%', textAlign: 'left', padding: '6px 10px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#888' }}>
                        Mostra meno
                      </button>
                    )}
                  </div>
                )
              })}
            </nav>

            <div style={{ flex: '1 1 520px', minWidth: 0 }}>
              {/* Le liste e l'ordine, su telefono: due menu a tendina. */}
              <div className="ct-solo-telefono" style={{ marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: 8 }}>
                  <select value={listaScelta.chiave} onChange={e => setLista(e.target.value)} data-lista-tendina aria-label="Lista di contatti" style={tendina}>
                    {gruppiDiListe.map(g => g.nome
                      ? <optgroup key={g.nome} label={g.nome}>{g.liste.map(l => <option key={l.chiave} value={l.chiave}>{l.titolo} ({l.n})</option>)}</optgroup>
                      : g.liste.map(l => <option key={l.chiave} value={l.chiave}>{l.titolo} ({l.n})</option>))}
                  </select>
                  <select value={`${ordine.per}:${ordine.verso}`} onChange={e => { const [per, verso] = e.target.value.split(':'); setOrdine({ per, verso }) }} data-ordine-tendina aria-label="Ordina i contatti" style={tendina}>
                    <option value="ultima:desc">Visti di recente</option>
                    <option value="volte:desc">Più attività</option>
                    <option value="nome:asc">Nome, dalla A</option>
                    <option value="dal:desc">Arrivati di recente</option>
                    <option value="contatto:desc">Contattabili prima</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div data-titolo-lista style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', overflowWrap: 'anywhere' }}>{listaScelta.titoloLungo || listaScelta.titolo}</div>
                  {/* ⚠️ Avere il contatto di qualcuno non è poterlo invitare: va
                      detto qui, dove si decide se quella lista serve a qualcosa. */}
                  <div data-conto-lista style={{ fontSize: 13, color: '#777', marginTop: 2 }}>
                    {visibili.length} {visibili.length === 1 ? 'persona' : 'persone'}
                    {visibili.length > 0 && <> · {contattabiliQui === 0 ? 'nessuna ha dato il consenso a ricevere promozioni' : `${contattabiliQui} ${contattabiliQui === 1 ? 'si può' : 'si possono'} contattare per promozione`}</>}
                  </div>
                  {listaScelta.spiega && <div style={{ fontSize: 12.5, color: '#999', marginTop: 2 }}>{listaScelta.spiega}</div>}
                </div>
                {/* ⛔ Le liste si guardavano e basta: per scrivere a chi era venuto a
                    una serata bisognava ricordarsi il tag giusto nella newsletter.
                    Il pulsante dice a quanti arriverà DAVVERO: solo a chi ha dato
                    il consenso alle email. Con zero non si preme, e si legge perché. */}
                <button type="button" onClick={scriviAllaLista} disabled={scrivendo || perEmailQui === 0} data-scrivi-lista
                  title={perEmailQui === 0 ? 'Nessuno in questa lista ha dato il consenso a ricevere email' : `Prepara una newsletter per i ${perEmailQui} che hanno dato il consenso`}
                  style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: perEmailQui === 0 ? 'not-allowed' : 'pointer', background: perEmailQui === 0 ? '#eee' : '#1a1a2e', color: perEmailQui === 0 ? '#999' : '#fff' }}>
                  <Mail size={14} strokeWidth={1.5} /> {scrivendo ? 'Un attimo…' : `Scrivi a questa lista${perEmailQui ? ` (${perEmailQui})` : ''}`}
                </button>
                <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320, minWidth: 0 }}>
                  <Search size={15} strokeWidth={1.5} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Cerca nome, email, telefono…"
                    style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* ⛔ Ogni cosa si faceva una persona alla volta: per dare la stessa
                  etichetta a venti contatti servivano venti schede. Spuntando
                  qualcuno compare questa barra; vale per chi è spuntato, non
                  per tutta la lista. Solo su computer: su telefono le righe
                  sono pulsanti, e una spunta accanto si sbaglierebbe col dito. */}
              {selezionati.length > 0 && (
                <div data-barra-blocco className="ct-solo-computer" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#1a1a2e', color: '#fff', borderRadius: 10, padding: '9px 14px', marginBottom: 10 }}>
                  <strong style={{ fontSize: 13.5 }}>{selezionati.length} {selezionati.length === 1 ? 'selezionato' : 'selezionati'}</strong>
                  <form onSubmit={e => { e.preventDefault(); if (nuovaEtichetta.trim()) inBloccoFai('etichetta', { etichetta: nuovaEtichetta }) }} style={{ display: 'flex', gap: 6, marginLeft: 6 }}>
                    <input value={nuovaEtichetta} onChange={e => setNuovaEtichetta(e.target.value)} placeholder="Etichetta da aggiungere" maxLength={60} aria-label="Etichetta da aggiungere"
                      style={{ padding: '6px 10px', borderRadius: 7, border: 'none', fontSize: 13, width: 190 }} />
                    <button type="submit" disabled={inBlocco || !nuovaEtichetta.trim()} style={{ ...azioneBlocco, opacity: nuovaEtichetta.trim() ? 1 : 0.5 }}>Aggiungi etichetta</button>
                  </form>
                  <button type="button" onClick={() => downloadContattiCSV(selezionati, 'selezionati')} style={azioneBlocco}>Esporta</button>
                  <button type="button" onClick={eliminaScelti} disabled={inBlocco} style={{ ...azioneBlocco, background: '#c53030' }}>Elimina</button>
                  <button type="button" onClick={() => setScelti(new Set())} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline' }}>Annulla selezione</button>
                </div>
              )}

              {visibili.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 12, padding: 36, textAlign: 'center', color: '#aaa' }}>
                  {cercato ? 'Nessuno con questo nome in questa lista.' : 'Nessuno in questa lista.'}
                </div>
              ) : (
                <>
                  {/* Su computer: la tabella. Larghezze fisse e testi su una
                      riga, tagliati con i puntini: un titolo lungo — che è un
                      dato del cliente — non deve alzare la riga né allargarla. */}
                  <div className="ct-solo-computer" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
                    <table data-tabella-contatti style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 13.5, tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: 40 }} /><col style={{ width: '25%' }} /><col style={{ width: '13%' }} /><col style={{ width: '9%' }} /><col style={{ width: '27%' }} /><col style={{ width: '13%' }} /><col style={{ width: '11%' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={{ padding: '0 0 0 14px', borderBottom: '1px solid #eee', textAlign: 'left' }}>
                            <input type="checkbox" data-spunta-tutti checked={tuttiScelti} onChange={spuntaTutti} aria-label={`Seleziona tutte le ${visibili.length} persone di questa lista`} title={`Seleziona tutte le ${visibili.length} persone di questa lista`} />
                          </th>
                          {[['nome', 'Nome'], ['fonte', 'Da dove arriva'], ['volte', 'Attività'], ['ultima', 'Ultima attività'], ['contatto', 'Contattabile'], ['dal', 'Dal']].map(([k, etichetta]) => (
                            <th key={k} aria-sort={ordine.per === k ? (ordine.verso === 'asc' ? 'ascending' : 'descending') : 'none'}
                              style={{ textAlign: k === 'volte' ? 'right' : 'left', padding: 0, borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>
                              <button onClick={() => ordinaPer(k)} data-ordina={k}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, width: '100%', justifyContent: k === 'volte' ? 'flex-end' : 'flex-start', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: ordine.per === k ? '#1a1a2e' : '#888' }}>
                                {etichetta}
                                {ordine.per === k && (ordine.verso === 'asc' ? <ChevronUp size={13} strokeWidth={1.5} /> : <ChevronDown size={13} strokeWidth={1.5} />)}
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {aSchermo.map(c => {
                          const canali = canaliContattabili(c)
                          const recapiti = [c.email, c.telefono].filter(Boolean).join(' · ') || '—'
                          const ultima = c.ultima_attivita_tipo ? fraseAttivita({ tipo: c.ultima_attivita_tipo, titolo: c.ultima_attivita_titolo }) : null
                          return (
                            <tr key={c.id} onClick={() => setModal(c)} data-contatto={c.id} tabIndex={0}
                              onKeyDown={e => { if (e.key === 'Enter') setModal(c) }}
                              style={{ cursor: 'pointer', borderBottom: '1px solid #f5f5f5', background: scelti.has(c.id) ? '#f5f7ff' : 'transparent' }}>
                              {/* La spunta non deve aprire la scheda: il clic si ferma qui. */}
                              <td onClick={e => e.stopPropagation()} style={{ padding: '9px 0 9px 14px' }}>
                                <input type="checkbox" data-spunta={c.id} checked={scelti.has(c.id)} onChange={() => spunta(c.id)} aria-label={`Seleziona ${c.nome}`} />
                              </td>
                              <td style={{ padding: '9px 14px' }}>
                                <div data-nome title={c.nome} style={{ ...unaRiga, fontWeight: 600, color: '#1a1a2e' }}>{c.nome}</div>
                                <div title={recapiti} style={{ ...unaRiga, fontSize: 12, color: emailDaCorreggere(c) ? '#c53030' : '#888', marginTop: 2 }}>
                                  {emailDaCorreggere(c) && 'Email da correggere · '}{recapiti}
                                </div>
                              </td>
                              <td style={{ padding: '9px 14px', color: '#555' }}><div style={unaRiga}>{nomeFonte(c.fonte)}</div></td>
                              <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: (c.attivita_numero || 0) > 1 ? '#1a1a2e' : '#999' }}>{c.attivita_numero || 0}</td>
                              <td style={{ padding: '9px 14px' }}>
                                {ultima ? (
                                  <>
                                    <div title={ultima} style={{ ...unaRiga, color: '#333' }}>{ultima}</div>
                                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{new Date(c.ultima_attivita_il).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                  </>
                                ) : <span style={{ color: '#bbb' }}>—</span>}
                              </td>
                              <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>{renderCanali(canali)}</td>
                              <td style={{ padding: '9px 14px', color: '#888', whiteSpace: 'nowrap' }}>{new Date(c.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Su telefono: una scheda di due righe a persona. */}
                  <div className="ct-solo-telefono" data-schede-contatti style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {aSchermo.map((c, i) => {
                      const ultima = c.ultima_attivita_tipo ? fraseAttivita({ tipo: c.ultima_attivita_tipo, titolo: c.ultima_attivita_titolo }) : null
                      return (
                        <button key={c.id} onClick={() => setModal(c)} data-contatto-scheda={c.id}
                          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: i < aSchermo.length - 1 ? '1px solid #f3f3f3' : 'none', padding: '11px 14px', cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ ...unaRiga, flex: 1, fontWeight: 600, fontSize: 14.5, color: '#1a1a2e' }}>{c.nome}</span>
                            {(c.attivita_numero || 0) > 1 && <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#f0f0f5', color: '#555' }}>{c.attivita_numero} attività</span>}
                            {renderCanali(canaliContattabili(c), true)}
                          </div>
                          <div style={{ ...unaRiga, fontSize: 12.5, color: '#777', marginTop: 3 }}>
                            {ultima ? <>{ultima} · {new Date(c.ultima_attivita_il).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</> : nomeFonte(c.fonte)}
                          </div>
                          {emailDaCorreggere(c) && <div style={{ fontSize: 12, color: '#c53030', marginTop: 2 }}>Email da correggere</div>}
                        </button>
                      )
                    })}
                  </div>

                  {/* Venticinque per volta: un elenco di trecento persone non si
                      scorre, si cerca o si ordina. */}
                  {visibili.length > aSchermo.length && (
                    <button onClick={() => setQuanti(q => q + PER_VOLTA)} data-mostra-altri
                      style={{ display: 'block', width: '100%', marginTop: 10, padding: '11px', background: '#fff', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: '#1a1a2e' }}>
                      Mostra altri {Math.min(PER_VOLTA, visibili.length - aSchermo.length)} · ne restano {visibili.length - aSchermo.length}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )
      )}

      {/* ── Trattative ──
          ⛔ Si chiamava «Pipeline» e conteneva TUTTI i contatti: chi aveva
          prenotato una serata nasceva «Nuovo lead», e 114 persone su 116 erano
          ferme lì. Con ventotto schede la prima colonna era alta 5.528 px, e su
          telefono si vedeva una colonna e un pezzo.
          Ora qui c'è solo chi è in trattativa: chi ha chiesto qualcosa (dal
          sito, da un modulo, su WhatsApp) o chi ci ha messo il titolare dalla
          scheda. Su computer le cinque colonne stanno nello schermo; su
          telefono se ne vede una alla volta, scelta dalle linguette. */}
      {view === 'kanban' && (
        loading ? <p style={{ color: '#aaa', fontSize: 14 }}>Caricamento…</p>
        : (
          <div data-trattative>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#777', lineHeight: 1.6, maxWidth: 760 }}>
              Qui c’è chi ha chiesto qualcosa e aspetta una risposta, e chi hai deciso di seguire.
              {fuoriTrattativa > 0 && <> Gli altri <strong>{fuoriTrattativa}</strong> contatti non sono in trattativa: per seguirne uno, aprilo dalla lista e scegli uno stadio.</>}
            </p>

            {inTrattativa.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, padding: 36, textAlign: 'center', color: '#999', fontSize: 14 }}>
                Nessuna trattativa aperta. Ci entra da solo chi ti scrive dal sito, compila un modulo o ti scrive su WhatsApp.
              </div>
            ) : (
              <>
                {/* Su computer: le colonne, tutte nello schermo. */}
                <div className="ct-solo-computer">
                  <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      {STAGES.map(stage => (
                        <KanbanColumn key={stage.key} stage={stage}
                          contacts={inTrattativa.filter(c => c.pipeline_stage === stage.key)}
                          onEdit={setModal} onAdd={openNewContact} />
                      ))}
                    </div>
                  </DndContext>
                </div>

                {/* Su telefono: uno stadio alla volta. Per spostare qualcuno si
                    apre la sua scheda: trascinare di lato fuori dallo schermo
                    non è un gesto che riesce. */}
                <div className="ct-solo-telefono">
                  <div role="tablist" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 6 }}>
                    {STAGES.map(s => {
                      const n = inTrattativa.filter(c => c.pipeline_stage === s.key).length
                      const attivo = s.key === stadioTel
                      return (
                        <button key={s.key} role="tab" aria-selected={attivo} onClick={() => setStadioTel(s.key)} data-linguetta={s.key}
                          style={{ flexShrink: 0, padding: '7px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: attivo ? s.color : s.light, color: attivo ? '#fff' : s.color }}>
                          {s.label} · {n}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {inTrattativa.filter(c => c.pipeline_stage === stadioTel).length === 0 && (
                      <div style={{ padding: 26, textAlign: 'center', color: '#bbb', fontSize: 13 }}>Nessuno in questo stadio.</div>
                    )}
                    {inTrattativa.filter(c => c.pipeline_stage === stadioTel).map((c, i, tutti) => (
                      <button key={c.id} onClick={() => setModal(c)} data-trattativa-riga={c.id}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: i < tutti.length - 1 ? '1px solid #f3f3f3' : 'none', padding: '11px 14px', cursor: 'pointer' }}>
                        <div style={{ ...unaRiga, fontWeight: 600, fontSize: 14.5, color: '#1a1a2e' }}>{c.nome}</div>
                        <div style={{ ...unaRiga, fontSize: 12.5, color: '#777', marginTop: 3 }}>
                          {c.ultima_attivita_tipo ? fraseAttivita({ tipo: c.ultima_attivita_tipo, titolo: c.ultima_attivita_titolo }) : nomeFonte(c.fonte)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )
      )}

      {/* ── Modal ── */}
      {importOpen && (
        <ContattiImportModal
          aziendaId={aziendaId}
          onFatto={load}
          onClose={() => setImportOpen(false)}
        />
      )}

      {modal && (
        <ContactModal
          key={modal === 'new' ? 'nuovo' : modal.id}
          contact={modal === 'new' ? { pipeline_stage: newStage } : modal}
          automatici={automatici}
          altri={modal !== 'new' ? contatti.filter(c => c.id !== modal.id) : []}
          simili={modal !== 'new' ? contatti.filter(c => simili.get(modal.id)?.has(c.id)) : []}
          storia={modal !== 'new' ? (perContatto.get(modal.id) || []) : []}
          entita={allEntities}
          onElimina={modal !== 'new' ? (c => handleDelete(c.id, c.nome)) : null}
          aziendaId={aziendaId}
          onSave={() => { setModal(null); load() }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
