'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Calendar, CalendarDays, Package, Wand2, QrCode, LayoutDashboard } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { FUNZIONI, FUNZIONI_AZIENDA } from '@/lib/funzioni'
import { TIPI_ENTITA } from '@/lib/profili-mestiere'
import { SEZIONI_ENTITA, VOCI, MENU_PER_RUOLO } from './menu-pannello'

// I profili di mestiere: cosa un cliente nuovo si troverà acceso il primo
// giorno (STRATEGIA.md §6.1, fase F2). Qui si scrivono e si guardano: NON si
// applicano a nessuno. L'applicazione alla nascita è la fase F3.
//
// Accanto a ogni funzione c'è quante aziende la usano davvero: un profilo si
// decide sull'uso, non sull'idea che ci facciamo di un mestiere.

const PRIMARIO = '#00b5b5'
const card = { background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #eee' }
const etichetta = { fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 5 }
const campo = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }
const NOME_TIPO = { struttura: 'Struttura (/s/…)', ristorante: 'Ristorante (/r/…)', attivita: 'Attività (/a/…)' }
const FUNZIONI_SCEGLIBILI = FUNZIONI.filter(f => !f.sempre)

// Il menu che vedrà il titolare di un'azienda nata da questo profilo. Legge le
// stesse definizioni della barra laterale vera (menu-pannello.js).
function righeMenu(profilo) {
  const accesaAz = (k) => !VOCI[k].funzione || !!profilo.funzioni_azienda?.[VOCI[k].funzione]
  const accesaEnt = (s) => !s.funzione || FUNZIONI.find(f => f.chiave === s.funzione)?.sempre || !!profilo.funzioni_entita?.[s.funzione]
  const voce = (key, Icon, label, sub) => (
    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: sub ? '4px 10px 4px 14px' : '6px 10px', color: '#bbb', fontSize: sub ? 12 : 13 }}>
      {Icon && <Icon size={sub ? 12 : 14} strokeWidth={1.5} />}{label}
    </div>
  )
  const titolo = (t) => <div key={`h-${t}`} style={{ fontSize: 9, fontWeight: 700, color: '#666', letterSpacing: 1, padding: '10px 10px 3px', textTransform: 'uppercase' }}>{t}</div>

  // Come nella barra vera: Dashboard in cima, e Booking è un gruppo che si apre
  // su Calendario e Risorse. Il conteggio deve dire lo stesso numero del menu
  // vero (tests/probe-menu-pannello.mjs), non uno suo.
  const righe = [voce('dashboard', LayoutDashboard, 'Dashboard')]
  for (const blocco of MENU_PER_RUOLO.admin_azienda) {
    if (blocco === 'entita') {
      let gruppo = null
      for (const s of SEZIONI_ENTITA.filter(accesaEnt)) {
        if (s.group !== gruppo) { righe.push(titolo(s.group)); gruppo = s.group }
        righe.push(voce(s.sub, s.icon, s.label, true))
        if (s.sub === 'sito') righe.push(voce('ai', Wand2, 'AI Site Builder', true))
        if (s.sub === 'domini') righe.push(voce('qr', QrCode, 'QR Code', true))
      }
      continue
    }
    const voci = blocco.voci.filter(accesaAz)
    if (!voci.length) continue
    righe.push(titolo(blocco.titolo))
    for (const k of voci) {
      if (k !== 'booking') { righe.push(voce(k, VOCI[k].icon, VOCI[k].label)); continue }
      righe.push(voce('h-booking', Calendar, 'Booking'))
      righe.push(voce('calendario', CalendarDays, 'Calendario', true), voce('risorse', Package, 'Risorse', true))
    }
  }
  return righe
}

const contaVoci = (righe) => righe.filter(r => !String(r.key).startsWith('h-')).length
// Tutto acceso: è il menu che vede oggi ogni titolare, qualunque mestiere faccia.
const MENU_DI_OGGI = contaVoci(righeMenu({
  funzioni_azienda: Object.fromEntries(FUNZIONI_AZIENDA.map(f => [f.chiave, true])),
  funzioni_entita: Object.fromEntries(FUNZIONI.map(f => [f.chiave, true])),
}))

function AnteprimaMenu({ profilo }) {
  const righe = righeMenu(profilo)
  return (
    <div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Il menu del titolare: <strong>{contaVoci(righe)} voci</strong> (oggi ne vede {MENU_DI_OGGI})</div>
      <div style={{ background: '#1a1a2e', borderRadius: 10, padding: '8px 6px', maxHeight: 560, overflowY: 'auto' }}>
        {righe}
      </div>
    </div>
  )
}

function Interruttori({ titolo, funzioni, accese, uso, totale, onCambia }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={etichetta}>{titolo}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 6 }}>
        {funzioni.map(f => {
          const n = uso?.[f.chiave]
          return (
            <label key={f.chiave} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', minWidth: 0,
              border: `1px solid ${accese[f.chiave] ? '#bfe9e9' : '#eee'}`, background: accese[f.chiave] ? '#f0fbfb' : '#fff',
            }}>
              <input type="checkbox" checked={!!accese[f.chiave]} onChange={e => onCambia(f.chiave, e.target.checked)} />
              <span style={{ fontSize: 13, color: '#1a1a2e', flex: 1, minWidth: 0 }}>{f.titolo}</span>
              {n !== undefined && (
                <span title="Aziende che la usano davvero" style={{ fontSize: 11, color: n ? '#00797a' : '#bbb', whiteSpace: 'nowrap' }}>{n}/{totale}</span>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}

export default function ProfiliMestiere({ usoPerFunzione, totaleAziende }) {
  const [profili, setProfili] = useState(null)
  const [scelto, setScelto] = useState(null)   // copia in modifica
  const [errore, setErrore] = useState('')
  const [salvataggio, setSalvataggio] = useState('')

  async function carica(idDaTenere) {
    try {
      const lista = await apiFetch('/api/admin/profili')
      setProfili(lista)
      const tenuto = lista.find(p => p.id === idDaTenere) || lista[0] || null
      setScelto(tenuto ? structuredClone(tenuto) : null)
    } catch (e) { setErrore(e?.message || 'Impossibile leggere i profili') }
  }
  useEffect(() => { carica() }, [])

  const originale = profili?.find(p => p.id === scelto?.id)
  const modificato = !!scelto && JSON.stringify(scelto) !== JSON.stringify(originale)

  function cambia(campoNome, valore) { setScelto(p => ({ ...p, [campoNome]: valore })); setSalvataggio('') }
  function interruttore(gruppo, chiave, acceso) {
    setScelto(p => {
      const f = { ...(p[gruppo] || {}) }
      if (acceso) f[chiave] = true; else delete f[chiave]
      return { ...p, [gruppo]: f }
    })
    setSalvataggio('')
  }

  async function salva() {
    setSalvataggio('corso')
    try {
      const { nome, descrizione, tipo_entita, funzioni_entita, funzioni_azienda } = scelto
      await apiFetch(`/api/admin/profili/${scelto.id}`, { method: 'PATCH', body: JSON.stringify({ nome, descrizione, tipo_entita, funzioni_entita, funzioni_azienda }) })
      await carica(scelto.id)
      setSalvataggio('ok')
    } catch (e) { setSalvataggio(e?.message || 'Salvataggio non riuscito') }
  }

  async function nuovo() {
    const nome = prompt('Come si chiama il nuovo profilo? (es. «Palestra»)')
    if (!nome?.trim()) return
    const chiave = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)
    try {
      const creato = await apiFetch('/api/admin/profili', { method: 'POST', body: JSON.stringify({
        chiave: chiave.length >= 2 ? chiave : `profilo_${Date.now()}`, nome: nome.trim(), tipo_entita: 'attivita',
        funzioni_entita: {}, funzioni_azienda: { contatti: true, analytics: true },
        ordine: (profili?.length || 0) * 10 + 10,
      }) })
      await carica(creato.id)
    } catch (e) { alert(e?.message || 'Creazione non riuscita') }
  }

  async function elimina() {
    if (!confirm(`Eliminare il profilo «${scelto.nome}»? Nessun cliente lo usa ancora: i profili non si applicano prima della fase F3.`)) return
    try {
      await apiFetch(`/api/admin/profili/${scelto.id}`, { method: 'DELETE' })
      await carica()
    } catch (e) { alert(e?.message || 'Eliminazione non riuscita') }
  }

  if (errore) return <div style={{ ...card, borderColor: '#f5c6cb', background: '#fff5f5', color: '#c0392b' }}>{errore}</div>
  if (!profili) return <div style={{ padding: 20, color: '#888' }}>Caricamento…</div>

  return (
    <div>
      <p style={{ fontSize: 13, color: '#888', margin: '0 0 16px', maxWidth: 760 }}>
        Il punto di partenza di un cliente nuovo: cosa si trova acceso il primo giorno. Qui si scrivono e si confrontano:
        <strong> non si applicano ancora a nessuno</strong>. Il numero accanto a ogni funzione è quante aziende la usano davvero.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {profili.map(p => (
          <button key={p.id} onClick={() => { if (!modificato || confirm('Ci sono modifiche non salvate. Cambiare profilo?')) { setScelto(structuredClone(p)); setSalvataggio('') } }}
            style={{
              padding: '8px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              border: `1px solid ${scelto?.id === p.id ? PRIMARIO : '#ddd'}`, background: scelto?.id === p.id ? '#e6f7f7' : '#fff',
              color: scelto?.id === p.id ? '#00797a' : '#444', fontWeight: scelto?.id === p.id ? 700 : 500,
            }}>{p.nome}</button>
        ))}
        <button onClick={nuovo} style={{ padding: '8px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer', border: '1px dashed #bbb', background: '#fafafa', color: '#666', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
          <Plus size={14} strokeWidth={1.5} color={PRIMARIO} />Nuovo profilo
        </button>
      </div>

      {scelto && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ ...card, flex: '2 1 480px', minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12, marginBottom: 14 }}>
              <label><span style={etichetta}>Nome</span>
                <input style={campo} value={scelto.nome} maxLength={60} onChange={e => cambia('nome', e.target.value)} /></label>
              <label><span style={etichetta}>Indirizzo della prima entità</span>
                <select style={campo} value={scelto.tipo_entita} onChange={e => cambia('tipo_entita', e.target.value)}>
                  {TIPI_ENTITA.map(t => <option key={t} value={t}>{NOME_TIPO[t]}</option>)}
                </select></label>
            </div>
            <label style={{ display: 'block', marginBottom: 18 }}><span style={etichetta}>Per chi è</span>
              <textarea style={{ ...campo, minHeight: 60, resize: 'vertical' }} value={scelto.descrizione} maxLength={300} onChange={e => cambia('descrizione', e.target.value)} /></label>

            <Interruttori titolo="Funzioni dell'azienda" funzioni={FUNZIONI_AZIENDA} accese={scelto.funzioni_azienda || {}}
              uso={usoPerFunzione} totale={totaleAziende} onCambia={(k, v) => interruttore('funzioni_azienda', k, v)} />
            <Interruttori titolo="Funzioni della prima entità (Informazioni, Sito e Assistente ci sono sempre)" funzioni={FUNZIONI_SCEGLIBILI}
              accese={scelto.funzioni_entita || {}} onCambia={(k, v) => interruttore('funzioni_entita', k, v)} />

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <button onClick={salva} disabled={!modificato || salvataggio === 'corso'} style={{
                padding: '9px 20px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                background: modificato ? PRIMARIO : '#ddd', color: '#fff', cursor: modificato ? 'pointer' : 'default',
              }}>{salvataggio === 'corso' ? 'Salvo…' : 'Salva il profilo'}</button>
              {salvataggio === 'ok' && <span style={{ fontSize: 13, color: '#2e7d32' }}>Salvato (versione {originale?.versione})</span>}
              {salvataggio && !['ok', 'corso'].includes(salvataggio) && <span style={{ fontSize: 13, color: '#c0392b' }}>{salvataggio}</span>}
              <button onClick={elimina} style={{ marginLeft: 'auto', padding: '8px 12px', borderRadius: 8, border: '1px solid #f3c1c1', background: '#fff5f5', color: '#c00', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                <Trash2 size={13} strokeWidth={1.5} color="#c00" />Elimina profilo
              </button>
            </div>
          </div>
          <div style={{ ...card, flex: '1 1 260px', minWidth: 0 }}>
            <AnteprimaMenu profilo={scelto} />
          </div>
        </div>
      )}
    </div>
  )
}
