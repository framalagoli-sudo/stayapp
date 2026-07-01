'use client'
import { useState } from 'react'
import { Eye } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { SITE_TEMPLATES } from '@/lib/siteTemplates'

// Fase C — wizard: settore + obiettivo filtrano/ordinano i template. I `match`
// intersecano i `settori` di ogni template (lib/siteTemplates.js).
const WIZARD_SECTORS = [
  { key: 'ospitalita',     label: 'Ospitalità',            match: ['hotel', 'b&b', 'agriturismo', 'resort'] },
  { key: 'ristorazione',   label: 'Ristorazione',          match: ['ristorante', 'trattoria', 'pizzeria', 'bistrot'] },
  { key: 'prodotti',       label: 'Prodotti',              match: ['produzione', 'artigianato', 'negozio', 'e-commerce'] },
  { key: 'servizi',        label: 'Servizi',               match: ['servizi', 'agenzia', 'impresa', 'consulenza'] },
  { key: 'esperienze',     label: 'Attività & Esperienze', match: ['tour', 'guida', 'escursioni', 'eventi'] },
  { key: 'beauty',         label: 'Beauty & Wellness',     match: ['parrucchiere', 'estetista', 'spa', 'benessere'] },
  { key: 'fitness',        label: 'Palestra & Fitness',    match: ['palestra', 'fitness', 'personal trainer', 'crossfit'] },
  { key: 'professionista', label: 'Studio professionale',  match: ['avvocato', 'commercialista', 'consulente', 'studio'] },
]
const WIZARD_GOALS = [
  { key: 'vetrina',      label: 'Farmi conoscere' },
  { key: 'lead_gen',     label: 'Ricevere contatti' },
  { key: 'prenotazioni', label: 'Ricevere prenotazioni' },
]
const chipStyle = (active) => ({
  padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
  border: `1.5px solid ${active ? '#1a1a2e' : '#ddd'}`,
  background: active ? '#1a1a2e' : '#fff', color: active ? '#fff' : '#555', fontWeight: active ? 700 : 500,
})

// Galleria template di sito. Card con ANTEPRIMA REALE (render del template in iframe
// scalato) + "Applica" → crea la home dal template, poi si modifica nell'editor.

// L'iframe è una THUMBNAIL del sito vero (hero, sezioni, colori, font), non un'astrazione.
// Cliccandola si apre il template a tutto schermo e navigabile in una nuova scheda
// (stile Elementor: "clic → vedi davvero"), perché l'iframe scalato non è navigabile.
function Preview({ tpl }) {
  const [hover, setHover] = useState(false)
  const W = 1180          // larghezza logica del render
  const scale = 0.235     // riduzione → ~277px, ritagliata dal contenitore
  return (
    <a
      href={`/template-preview/${tpl.id}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`Anteprima a tutto schermo — ${tpl.nome}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'block', position: 'relative', width: '100%', height: 190, overflow: 'hidden', borderRadius: 10, border: '1px solid #eee', background: '#fff', cursor: 'pointer', textDecoration: 'none' }}
    >
      <iframe
        src={`/template-preview/${tpl.id}`}
        title={tpl.nome}
        loading="lazy"
        scrolling="no"
        style={{ width: W, height: W * 1.3, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}
      />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? 'rgba(26,26,46,0.45)' : 'transparent', transition: 'background 0.15s',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20,
          background: '#fff', color: '#1a1a2e', fontWeight: 700, fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          opacity: hover ? 1 : 0, transform: hover ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 0.15s, transform 0.15s',
        }}>
          <Eye size={16} strokeWidth={1.5} /> Anteprima
        </span>
      </div>
    </a>
  )
}

export default function SiteTemplateGallery({ entityTipo, entityId, onApplied }) {
  const [busy, setBusy]       = useState(false)   // true mentre crea (AI o struttura)
  const [busyMsg, setBusyMsg] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [brief, setBrief]     = useState('')
  const [error, setError]     = useState('')
  const [sector, setSector]   = useState(null)   // Fase C: filtro settore
  const [goal, setGoal]       = useState(null)   // Fase C: obiettivo (ordina)

  // Solo struttura: testi-esempio del template, niente AI.
  async function apply(id) {
    setBusy(true); setBusyMsg('Applico il template…'); setError('')
    try {
      await apiFetch('/api/site-templates/apply', {
        method: 'POST',
        body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, template_id: id }),
      })
      setConfirmId(null); setBrief('')
      onApplied?.()
    } catch (e) {
      setError(e.message || 'Errore applicazione template')
    } finally { setBusy(false); setBusyMsg('') }
  }

  // L'AI riempie il template coi dati del business. modalita: 'uguale' | 'traccia'.
  async function aiFill(id, modalita) {
    setBusy(true); setBusyMsg('L’AI sta scrivendo il tuo sito… (qualche secondo)'); setError('')
    try {
      await apiFetch('/api/site-templates/ai-fill', {
        method: 'POST',
        body: JSON.stringify({ entity_tipo: entityTipo, entity_id: entityId, template_id: id, modalita, brief }),
      })
      setConfirmId(null); setBrief('')
      onApplied?.()
    } catch (e) {
      setError(e.message || 'Errore creazione con AI')
    } finally { setBusy(false); setBusyMsg('') }
  }

  function openConfirm(id) { setConfirmId(id); setBrief(''); setError('') }

  // Fase C — filtra per settore e ordina mettendo prima chi centra l'obiettivo.
  const sectorDef = WIZARD_SECTORS.find(s => s.key === sector)
  let visible = SITE_TEMPLATES
  if (sectorDef) {
    const m = SITE_TEMPLATES.filter(t => (t.settori || []).some(x => sectorDef.match.includes(x)))
    visible = m.length ? m : SITE_TEMPLATES
    if (goal) visible = [...visible].sort((a, b) => (b.obiettivi?.includes(goal) ? 1 : 0) - (a.obiettivi?.includes(goal) ? 1 : 0))
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>Parti da un template</h3>
      <p style={{ color: '#666', fontSize: 13, marginTop: 0, marginBottom: 12 }}>
        Scegli un layout pronto: l'AI lo riempie coi testi del tuo business, poi modifichi tutto nell'editor. ⚠️ Sostituisce la home attuale.
      </p>

      {/* Wizard: settore → obiettivo */}
      <div style={{ background: '#fafafd', border: '1px solid #eee', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>1. Di cosa ti occupi?</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {WIZARD_SECTORS.map(s => (
            <button key={s.key} onClick={() => { setSector(sector === s.key ? null : s.key); if (sector === s.key) setGoal(null) }} style={chipStyle(sector === s.key)}>{s.label}</button>
          ))}
        </div>
        {sector && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>2. Qual è l'obiettivo? <span style={{ fontWeight: 400, color: '#999' }}>(opzionale)</span></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {WIZARD_GOALS.map(g => (
                <button key={g.key} onClick={() => setGoal(goal === g.key ? null : g.key)} style={chipStyle(goal === g.key)}>{g.label}</button>
              ))}
            </div>
          </div>
        )}
        {(sector || goal) && (
          <button onClick={() => { setSector(null); setGoal(null) }}
            style={{ marginTop: 14, background: 'none', border: 'none', color: '#5b6af8', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            Sfoglia tutti i template
          </button>
        )}
      </div>

      <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
        {sector ? `Consigliati per te (${visible.length})` : `Tutti i template (${visible.length})`}
      </div>

      {error && <p style={{ color: '#c53030', fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16, marginTop: 4 }}>
        {visible.map(tpl => (
          <div key={tpl.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12, background: '#fff', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Preview tpl={tpl} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{tpl.nome}</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4, marginTop: 2 }}>{tpl.descrizione}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {tpl.settori.slice(0, 3).map(s => (
                <span key={s} style={{ fontSize: 10, color: '#666', background: '#f3f3f6', padding: '2px 8px', borderRadius: 20 }}>{s}</span>
              ))}
            </div>
            {confirmId === tpl.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
                {busy ? (
                  <div style={{ fontSize: 13, color: '#1a1a2e', textAlign: 'center', padding: '8px 0' }}>{busyMsg}</div>
                ) : (
                  <>
                    <textarea value={brief} onChange={e => setBrief(e.target.value)}
                      placeholder="Racconta in breve cosa fai (es. ristorante di pesce a Bari, menù di mare e pizza). Opzionale ma migliora i testi."
                      rows={3}
                      style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: 8, border: '1px solid #ddd', borderRadius: 8, resize: 'vertical', fontFamily: 'inherit' }} />
                    <button onClick={() => aiFill(tpl.id, 'uguale')}
                      style={{ padding: '9px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      ✨ Lo voglio così — riempi con l'AI
                    </button>
                    <button onClick={() => aiFill(tpl.id, 'traccia')}
                      style={{ padding: '9px', background: '#fff', color: '#1a1a2e', border: '1.5px solid #1a1a2e', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      ✨ Usalo come traccia
                    </button>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => apply(tpl.id)}
                        style={{ flex: 1, padding: '8px', background: '#f5f5f5', color: '#555', border: '1px solid #ddd', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                        Solo struttura
                      </button>
                      <button onClick={() => { setConfirmId(null); setBrief('') }}
                        style={{ padding: '8px 12px', background: '#fff', color: '#888', border: '1px solid #eee', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                        Annulla
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button onClick={() => openConfirm(tpl.id)} disabled={busy}
                style={{ padding: '9px', background: '#fff', color: '#1a1a2e', border: '1.5px solid #1a1a2e', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1 }}>
                Usa questo template
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
