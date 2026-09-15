'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '../../../lib/api'
import { ArrowLeft, Save, Trash2, Plus, AlertCircle, ShoppingBag, Share2 } from 'lucide-react'
import GalleriaFoto from '../GalleriaFoto'
import { FocalPointPicker } from '../FocalPointPicker'
import AiButton from '../../../components/admin/AiButton'
import { useAzienda } from '../../../context/AziendaContext'
import PostSocialModal from '../../../components/admin/PostSocialModal'

export default function ProdottoEditorPage() {
  const { id } = useParams()
  const router = useRouter()
  const { azienda } = useAzienda()
  const isNew = id === 'nuovo'
  const [showPostModal, setShowPostModal] = useState(false)

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [nome, setNome]           = useState('')
  const [descrizione, setDesc]    = useState('')
  const [prezzo, setPrezzo]       = useState('')
  const [prezzoScontato, setPrezzoScontato] = useState('')
  const [stock, setStock]         = useState('')
  const [categoria, setCat]       = useState('')
  const [attivo, setAttivo]       = useState(true)
  const [immagini, setImmagini]   = useState([])
  // Quale parte della PRIMA foto resta visibile nella scheda del blocco Shop.
  const [immagineFocal, setImmagineFocal] = useState('')

  useEffect(() => {
    if (isNew) return
    apiFetch(`/api/shop/prodotti/${id}`)
      .then(p => {
        setNome(p.nome || ''); setDesc(p.descrizione || '')
        setPrezzo(p.prezzo ?? ''); setPrezzoScontato(p.prezzo_scontato ?? '')
        setStock(p.stock ?? ''); setCat(p.categoria || '')
        setAttivo(p.attivo !== false); setImmagini(p.immagini || []); setImmagineFocal(p.immagine_focal || '')
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [id, isNew])

  async function save() {
    if (!nome.trim()) { setError('Il nome è obbligatorio'); return }
    setSaving(true); setError('')
    const body = {
      nome, descrizione, prezzo: parseFloat(prezzo) || 0,
      prezzo_scontato: prezzoScontato !== '' ? parseFloat(prezzoScontato) : null,
      stock: stock !== '' ? parseInt(stock) : null,
      categoria, attivo, immagini, immagine_focal: immagineFocal || null,
    }
    try {
      if (isNew) {
        const created = await apiFetch('/api/shop/prodotti', { method: 'POST', body: JSON.stringify(body) })
        router.push(`/admin/shop/${created.id}`, { replace: true })
      } else {
        await apiFetch(`/api/shop/prodotti/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
      }
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Eliminare questo prodotto?')) return
    try {
      await apiFetch(`/api/shop/prodotti/${id}`, { method: 'DELETE' })
      router.push('/admin/shop')
    } catch (e) { setError(e.message) }
  }

  if (loading) return <p style={{ color: '#888' }}>Caricamento…</p>

  const pct = prezzoScontato && prezzo && parseFloat(prezzo) > parseFloat(prezzoScontato)
    ? Math.round((1 - parseFloat(prezzoScontato) / parseFloat(prezzo)) * 100) : null

  return (
    <>
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.push('/admin/shop')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ArrowLeft size={20} strokeWidth={1.5} color="#555" />
        </button>
        <ShoppingBag size={22} strokeWidth={1.5} color="#1a1a2e" />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, flex: 1 }}>
          {isNew ? 'Nuovo prodotto' : (nome || 'Modifica prodotto')}
        </h1>
        {!isNew && (
          <>
            <button onClick={() => setShowPostModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f5f0ff', color: '#6b21a8', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <Share2 size={14} strokeWidth={1.5} /> Post
            </button>
            <button onClick={handleDelete} style={{ background: 'none', border: '1px solid #eee', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: '#c53030' }}>
              <Trash2 size={15} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', color: '#c53030', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle size={16} strokeWidth={1.5} /> {error}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: 24, marginBottom: 16 }}>
        {/* Nome */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Nome prodotto *</label>
          <input value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Es. Marmellata artigianale, Corso online, Pack benvenuto…"
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
        </div>

        {/* Descrizione */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: 12, color: '#888' }}>Descrizione</label>
            <AiButton
              tipo="minisito_about"
              nomeBusiness={azienda?.ragione_sociale || ''}
              contesto={nome ? `Prodotto: "${nome}"` : ''}
              temaSuggerito={nome || ''}
              label="✨ Genera"
              showTono={false}
              placeholder="Es: marmellata fatta a mano, senza conservanti, con frutta di stagione…"
              onInsert={t => setDesc(t)}
            />
          </div>
          <textarea value={descrizione} onChange={e => setDesc(e.target.value)} rows={4}
            placeholder="Descrivi il prodotto: caratteristiche, materiali, cosa include…"
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>

        {/* Prezzi + stock + categoria */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Prezzo (€) *</label>
            <input type="number" min="0" step="0.01" value={prezzo} onChange={e => setPrezzo(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>
              Prezzo scontato (€){pct ? <span style={{ color: '#c53030', fontWeight: 700, marginLeft: 6 }}>−{pct}%</span> : ''}
            </label>
            <input type="number" min="0" step="0.01" value={prezzoScontato} onChange={e => setPrezzoScontato(e.target.value)}
              placeholder="— nessuno —"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Stock (vuoto = illimitato)</label>
            <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)}
              placeholder="∞"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Categoria</label>
            <input value={categoria} onChange={e => setCat(e.target.value)}
              placeholder="Es. Alimentari, Abbigliamento…"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Attivo */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20, fontSize: 14 }}>
          <input type="checkbox" checked={attivo} onChange={e => setAttivo(e.target.checked)} />
          Prodotto visibile nello shop pubblico
        </label>

        {/* Immagini */}
        <div>
          <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 8 }}>Immagini prodotto</label>
          {/* Prima si caricava una foto per volta e senza poterle riordinare:
              per cambiare quella che il catalogo mostra bisognava cancellarle
              tutte e ricaricarle nell'ordine giusto. */}
          <GalleriaFoto
            foto={immagini}
            onChange={setImmagini}
            endpoint="/api/upload/minisito-image?entity_type=prodotto&entity_id=shop"
            unsplashQuery={nome || ''}
            primaEtichetta="nel sito"
            nota="La prima foto è quella che si vede nel blocco Shop del sito. Ricordati di salvare."
            incollaIndirizzo
          />
          {immagini[0] && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 2 }}>Punto da tenere visibile nella scheda</div>
              <div style={{ fontSize: 11.5, color: '#888', lineHeight: 1.5 }}>
                Nel blocco Shop la prima foto viene ritagliata: clicca sul prodotto e resterà lui al centro.
              </div>
              {/* Vale per la foto che è PRIMA adesso: se si riordinano le foto,
                  va riscelto guardando quella nuova. */}
              <FocalPointPicker src={typeof immagini[0] === 'string' ? immagini[0] : immagini[0]?.url} value={immagineFocal} onChange={setImmagineFocal} hint={false} intera />
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          <Save size={15} strokeWidth={1.5} /> {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>

    <PostSocialModal
      isOpen={showPostModal}
      onClose={() => setShowPostModal(false)}
      titolo={nome}
      sottotitolo={prezzoScontato ? `€${prezzoScontato} (scontato da €${prezzo})` : prezzo ? `€${prezzo}` : ''}
      immagine={immagini[0] || ''}
      tipo="prodotto shop"
      nomeBusiness={azienda?.ragione_sociale || ''}
    />
    </>
  )
}
