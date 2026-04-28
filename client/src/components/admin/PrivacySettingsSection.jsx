import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'

const DEFAULT = {
  titolare_nome: '',
  titolare_forma_giuridica: '',
  titolare_piva: '',
  titolare_cf: '',
  titolare_indirizzo: '',
  titolare_citta: '',
  titolare_cap: '',
  titolare_provincia: '',
  titolare_email: '',
  titolare_telefono: '',
  dpo_nome: '',
  dpo_email: '',
  usa_form_contatti: true,
  usa_newsletter: false,
  usa_richieste_ospiti: false,
  usa_prenotazioni: false,
  hosting_provider: 'Supabase (EU - Frankfurt)',
  email_provider: 'Resend (Cloudflare, USA) — dati pseudonimizzati',
  cookie_extra: [],
}

const FIELDS_TITOLARE = [
  { key: 'titolare_nome',              label: 'Ragione sociale / Nome *',     required: true },
  { key: 'titolare_forma_giuridica',   label: 'Forma giuridica',              placeholder: 'es. S.r.l., S.n.c., Ditta Individuale' },
  { key: 'titolare_piva',              label: 'Partita IVA' },
  { key: 'titolare_cf',                label: 'Codice Fiscale' },
  { key: 'titolare_indirizzo',         label: 'Indirizzo (via e numero)' },
  { key: 'titolare_citta',             label: 'Città' },
  { key: 'titolare_cap',               label: 'CAP' },
  { key: 'titolare_provincia',         label: 'Provincia (sigla)', placeholder: 'es. MI' },
  { key: 'titolare_email',             label: 'Email di contatto *',          required: true, type: 'email' },
  { key: 'titolare_telefono',          label: 'Telefono' },
]

const TOGGLES = [
  { key: 'usa_form_contatti',    label: 'Form di contatto (minisito)',  hint: 'Raccoglie nome, email, telefono, messaggio' },
  { key: 'usa_newsletter',       label: 'Iscrizione newsletter',        hint: 'Raccoglie nome, email, telefono' },
  { key: 'usa_richieste_ospiti', label: 'Richieste ospiti (PWA)',       hint: 'Raccoglie numero camera, tipo richiesta, messaggio' },
  { key: 'usa_prenotazioni',     label: 'Sistema prenotazioni',         hint: 'Se integri strumenti di booking esterni (TheFork, Booking, ecc.)' },
]

export default function PrivacySettingsSection({ entityData, pwaSlug, pwaPrefix, onSave, saving, saved, saveError }) {
  const [form, setForm] = useState(DEFAULT)

  useEffect(() => {
    if (entityData?.privacy_data) {
      setForm({ ...DEFAULT, ...entityData.privacy_data })
    } else if (entityData) {
      // Precompila da dati già presenti sull'entità
      setForm(f => ({
        ...f,
        titolare_nome:      entityData.name || '',
        titolare_indirizzo: entityData.address || '',
        titolare_email:     entityData.email || '',
        titolare_telefono:  entityData.phone || '',
      }))
    }
  }, [entityData?.id])

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave({ privacy_data: form })
  }

  const privacyUrl = pwaSlug ? `${window.location.origin}/${pwaPrefix}/${pwaSlug}/privacy` : null
  const cookieUrl  = pwaSlug ? `${window.location.origin}/${pwaPrefix}/${pwaSlug}/cookie`  : null

  return (
    <div style={{ maxWidth: 680 }}>
      <h2 style={titleStyle}>Privacy & Cookie Policy</h2>
      <p style={descStyle}>
        Compila i dati del titolare del trattamento. Le policy GDPR vengono generate automaticamente
        e sono accessibili tramite i link pubblici qui sotto.
      </p>

      {/* Link policy pubbliche */}
      {privacyUrl && (
        <div style={{ ...cardStyle, background: '#f0faf5', border: '1px solid #c6f0e0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#276749', marginBottom: 12 }}>
            Link policy pubbliche (aggiornate in tempo reale)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Privacy Policy', url: privacyUrl },
              { label: 'Cookie Policy',  url: cookieUrl },
            ].map(({ label, url }) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#276749', fontWeight: 600, textDecoration: 'none' }}>
                <ExternalLink size={13} strokeWidth={2} />
                {label}: <span style={{ fontWeight: 400, color: '#2d8059' }}>{url}</span>
              </a>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 10 }}>
            Incolla questi link nella comunicazione ai tuoi clienti, nel footer del sito e nel banner cookie.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* Titolare del trattamento */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Titolare del trattamento</h3>
          <p style={hintText}>Il soggetto responsabile del trattamento dei dati (tu o la tua azienda). Obbligatorio per GDPR art. 13.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {FIELDS_TITOLARE.map(({ key, label, required, type = 'text', placeholder }) => (
              <div key={key} style={{ gridColumn: ['titolare_indirizzo', 'titolare_nome', 'titolare_email'].includes(key) ? 'span 2' : undefined }}>
                <label style={lblStyle}>{label}</label>
                <input
                  type={type}
                  value={form[key] || ''}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                  required={required}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        </div>

        {/* DPO */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Responsabile della Protezione dei Dati (DPO)</h3>
          <p style={hintText}>
            Obbligatorio per enti pubblici e alcune organizzazioni private (es. trattamento sistematico su larga scala).
            Per piccole attività ricettive è generalmente facoltativo ma consigliato.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={lblStyle}>Nome DPO</label>
              <input value={form.dpo_nome || ''} onChange={e => set('dpo_nome', e.target.value)} placeholder="Lascia vuoto se non nominato" style={inputStyle} />
            </div>
            <div>
              <label style={lblStyle}>Email DPO</label>
              <input type="email" value={form.dpo_email || ''} onChange={e => set('dpo_email', e.target.value)} placeholder="dpo@esempio.it" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Servizi attivi */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Servizi attivi che raccolgono dati</h3>
          <p style={hintText}>
            Indica quali funzionalità hai attivato. La policy verrà generata includendo solo le sezioni pertinenti.
          </p>
          {TOGGLES.map(({ key, label, hint }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}>
                <input
                  type="checkbox"
                  checked={!!form[key]}
                  onChange={e => set(key, e.target.checked)}
                  style={{ width: 16, height: 16, flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{hint}</div>
                </div>
              </label>
            </div>
          ))}
        </div>

        {/* Fornitori */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Fornitori di servizi (responsabili esterni)</h3>
          <p style={hintText}>
            I fornitori già pre-configurati per questa piattaforma. Modificali solo se usi servizi diversi.
          </p>
          <div style={{ marginBottom: 14 }}>
            <label style={lblStyle}>Hosting / Database</label>
            <input value={form.hosting_provider || ''} onChange={e => set('hosting_provider', e.target.value)} style={inputStyle} />
            <span style={{ fontSize: 12, color: '#aaa', display: 'block', marginTop: 4 }}>
              Supabase = server in EU (Frankfurt). Nessun trasferimento dati extra-UE.
            </span>
          </div>
          <div>
            <label style={lblStyle}>Invio email transazionali</label>
            <input value={form.email_provider || ''} onChange={e => set('email_provider', e.target.value)} style={inputStyle} />
          </div>
        </div>

        {saveError && <p style={{ color: '#c00', fontSize: 13, marginBottom: 12 }}>{saveError}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button type="submit" disabled={saving} style={saveBtn}>
            {saving ? 'Salvataggio…' : saved ? '✓ Salvato' : 'Salva impostazioni privacy'}
          </button>
          {saved && <span style={{ fontSize: 13, color: '#38a169', fontWeight: 600 }}>Le policy pubbliche sono aggiornate</span>}
        </div>

        <div style={{ marginTop: 20, padding: 14, background: '#fffbeb', border: '1px solid #f6cc5c', borderRadius: 10, fontSize: 13, color: '#7d5a00', lineHeight: 1.6 }}>
          <strong>Nota legale:</strong> Questa piattaforma genera una policy standard conforme al GDPR (Reg. UE 2016/679)
          e alle linee guida del Garante Privacy italiano. Ti consigliamo di farla revisionare da un
          professionista legale se tratti categorie particolari di dati (dati sanitari, dati di minori, ecc.)
          o se effettui trattamenti su larga scala.
        </div>
      </form>
    </div>
  )
}

const titleStyle   = { marginTop: 0, marginBottom: 4, fontSize: 22 }
const descStyle    = { margin: '0 0 24px', color: '#888', fontSize: 14 }
const cardStyle    = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }
const sectionTitle = { marginTop: 0, marginBottom: 6, fontSize: 15, fontWeight: 700 }
const hintText     = { fontSize: 13, color: '#888', margin: '0 0 16px' }
const lblStyle     = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 5 }
const inputStyle   = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }
const saveBtn      = { padding: '10px 28px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
