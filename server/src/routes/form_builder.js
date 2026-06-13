import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import { Resend } from 'resend'
import { sendWebhooks } from '../lib/webhook.js'

const router = Router()
const resend = new Resend(process.env.RESEND_API_KEY)

// ── Rate limiter in-memory ────────────────────────────────────────────────────
// Chiave: `${formToken}:${ip}` — max 5 submit per ora per IP per form
const submitRateMap = new Map()

function checkRateLimit(token, ip) {
  const key = `${token}:${ip}`
  const now = Date.now()
  const entry = submitRateMap.get(key)
  if (!entry || entry.resetAt < now) {
    submitRateMap.set(key, { count: 1, resetAt: now + 3_600_000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

// Pulizia periodica per evitare memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of submitRateMap.entries()) {
    if (entry.resetAt < now) submitRateMap.delete(key)
  }
  for (const [key, entry] of formFloodMap.entries()) {
    if (entry.resetAt < now) formFloodMap.delete(key)
  }
}, 600_000)

// ── Spam content detection ────────────────────────────────────────────────────
// Keyword classiche dello spam e script non-latini in contesto italiano/inglese
const SPAM_KEYWORDS = /\b(viagra|cialis|casino|crypto|bitcoin|nft|forex|backlink|seo service|buy followers|make money fast)\b/i
const SPAM_SCRIPTS  = /[а-яА-Я一-鿿؀-ۿ]/  // cirillico, cinese, arabo

function isSpamContent(dati, campi) {
  for (const c of (campi || [])) {
    if (c.tipo !== 'text' && c.tipo !== 'textarea') continue
    const val = String(dati[c.id] ?? '')
    if (!val) continue
    if (SPAM_KEYWORDS.test(val)) return true
    if (SPAM_SCRIPTS.test(val)) return true
    if ((val.match(/https?:\/\//gi) || []).length >= 2) return true  // 2+ URL = spam certo
  }
  return false
}

// ── Flood detection per-form (max 20 submit / 10 minuti) ─────────────────────
const formFloodMap = new Map()
const FLOOD_THRESHOLD = 20
const FLOOD_WINDOW_MS = 600_000

function trackFlood(form) {
  const now = Date.now()
  const entry = formFloodMap.get(form.id)

  if (!entry || entry.resetAt < now) {
    formFloodMap.set(form.id, { count: 1, resetAt: now + FLOOD_WINDOW_MS, alertSent: false })
    return false
  }

  entry.count++

  if (entry.count >= FLOOD_THRESHOLD && !entry.alertSent) {
    entry.alertSent = true
    if (form.email_notifica && process.env.RESEND_API_KEY) {
      resend.emails.send({
        from: process.env.RESEND_FROM || 'noreply@oltrenova.com',
        to: form.email_notifica,
        subject: `⚠️ Form "${escHtml(form.nome)}" sotto attacco`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#333">
          <h2 style="color:#c53030">⚠️ Possibile attacco al form</h2>
          <p>Il form <strong>${escHtml(form.nome)}</strong> ha ricevuto <strong>${entry.count} invii in 10 minuti</strong>.</p>
          <p>I nuovi submit sono stati <strong>bloccati automaticamente</strong> per proteggere il tuo account.</p>
          <p style="font-size:13px;color:#888">Puoi disattivare il form dall&apos;editor StayApp se il problema persiste.</p>
        </div>`,
      }).catch(() => {})
    }
  }

  return entry.count >= FLOOD_THRESHOLD
}

// ── Email validation via Abstract API ────────────────────────────────────────
// Verifica che l'indirizzo sia realmente consegnabile prima di inviare autoresponder.
// Se ABSTRACT_API_KEY non è configurata, passa tutto (sicuro fallback).
async function isEmailDeliverable(email) {
  const key = process.env.ABSTRACT_API_KEY
  if (!key) return true
  try {
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${key}&email=${encodeURIComponent(email)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return true
    const data = await res.json()
    return data.deliverability === 'DELIVERABLE'
  } catch { return true }
}

// ── Sicurezza: sanitizzazione e escape ───────────────────────────────────────

// Estrae l'IP reale del client (Railway usa proxy)
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.ip || 'unknown'
}

// Rimuove tutti i tag HTML e tronca a 10.000 char
function sanitizeStr(val) {
  return String(val).replace(/<[^>]*>/g, '').trim().slice(0, 10_000)
}

// Filtra i dati del form: solo chiavi UUID note, valori sanificati
function sanitizeDati(rawDati, campiIds) {
  const validIds = new Set(campiIds)
  const out = {}
  for (const [k, v] of Object.entries(rawDati || {})) {
    if (!validIds.has(k)) continue
    if (typeof v === 'boolean') out[k] = v
    else if (typeof v === 'number') out[k] = v
    else out[k] = sanitizeStr(v)
  }
  return out
}

// Escape HTML per uso in template email (previene XSS nell'inbox admin)
function escHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Sostituisce {{variabile}} nel template con i valori forniti
function applyTemplate(template, vars) {
  return String(template ?? '').replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

// Costruisce HTML email di conferma per l'utente
function buildAutoresponderHtml(testo, righeRiepilogo) {
  const testoHtml = escHtml(testo).replace(/\n/g, '<br>')
  return `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#333">
      <div style="font-size:15px;line-height:1.7">${testoHtml}</div>
      ${righeRiepilogo ? `
        <div style="margin-top:28px;border-top:1px solid #eee;padding-top:20px">
          <p style="font-size:12px;color:#888;margin:0 0 10px;text-transform:uppercase;letter-spacing:.04em">Riepilogo dati inviati</p>
          <table style="width:100%;border-collapse:collapse">${righeRiepilogo}</table>
        </div>` : ''}
    </div>`
}

// ── Admin: lista form ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { data, error } = await supabase
      .from('form_builder')
      .select('id, nome, descrizione, attivo, token, created_at, updated_at')
      .eq('azienda_id', profile.azienda_id)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Admin: singolo form ───────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { data, error } = await supabase
      .from('form_builder')
      .select('*')
      .eq('id', req.params.id)
      .eq('azienda_id', profile.azienda_id)
      .single()
    if (error) return res.status(404).json({ error: 'Non trovato' })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Admin: crea form ──────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { data, error } = await supabase
      .from('form_builder')
      .insert({ azienda_id: profile.azienda_id, nome: req.body.nome || 'Nuovo form', campi: [] })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Admin: aggiorna form ──────────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const allowed = ['nome', 'descrizione', 'campi', 'redirect_url', 'email_notifica', 'attivo',
      'email_conferma_attiva', 'email_conferma_oggetto', 'email_conferma_testo', 'tag_auto', 'multi_step']
    const patch = { updated_at: new Date().toISOString() }
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k]

    const { data, error } = await supabase
      .from('form_builder')
      .update(patch)
      .eq('id', req.params.id)
      .eq('azienda_id', profile.azienda_id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Admin: elimina form ───────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { error } = await supabase
      .from('form_builder')
      .delete()
      .eq('id', req.params.id)
      .eq('azienda_id', profile.azienda_id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Admin: submissions di un form ─────────────────────────────────────────────
router.get('/:id/submissions', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('azienda_id').eq('id', req.user.id).single()
    if (!profile?.azienda_id) return res.status(403).json({ error: 'Nessuna azienda' })

    const { data: form } = await supabase
      .from('form_builder')
      .select('id')
      .eq('id', req.params.id)
      .eq('azienda_id', profile.azienda_id)
      .single()
    if (!form) return res.status(403).json({ error: 'Accesso negato' })

    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const offset = Number(req.query.offset) || 0

    const { data, count, error } = await supabase
      .from('form_submissions')
      .select('*', { count: 'exact' })
      .eq('form_id', req.params.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ data, count, limit, offset })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Pubblico: leggi form via token ────────────────────────────────────────────
router.get('/public/:token', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('form_builder')
      .select('id, nome, descrizione, campi, redirect_url, attivo, multi_step')
      .eq('token', req.params.token)
      .single()
    if (error || !data) return res.status(404).json({ error: 'Form non trovato' })
    if (!data.attivo) return res.status(403).json({ error: 'Form non attivo' })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Pubblico: invia form ──────────────────────────────────────────────────────
router.post('/public/:token/submit', async (req, res) => {
  try {
    const clientIp = getClientIp(req)

    // 1. Honeypot anti-bot: se _hp è valorizzato, è un bot — risposta silenziosa
    if (req.body?._hp) {
      return res.json({ ok: true, redirect_url: null })
    }

    // 2. Rate limit: max 5 submit/ora per IP per form
    if (!checkRateLimit(req.params.token, clientIp)) {
      return res.status(429).json({ error: 'Troppe richieste. Riprova tra qualche minuto.' })
    }

    // 3. Carica form (include attivo per verifica server-side)
    const { data: form } = await supabase
      .from('form_builder')
      .select('id, azienda_id, nome, campi, redirect_url, email_notifica, attivo, email_conferma_attiva, email_conferma_oggetto, email_conferma_testo, tag_auto')
      .eq('token', req.params.token)
      .single()
    if (!form) return res.status(404).json({ error: 'Form non trovato' })
    if (!form.attivo) return res.status(403).json({ error: 'Form non attivo' })

    // 3b. Flood protection: blocca se superati 20 submit in 10 minuti su questo form
    if (trackFlood(form)) {
      return res.status(429).json({ error: 'Troppe richieste. Riprova tra qualche minuto.' })
    }

    // 4. Sanitizza dati — solo campi noti, valori ripuliti da HTML
    const campiIds = (form.campi || []).map(c => c.id)
    const rawDati = { ...req.body }
    delete rawDati._hp
    const dati = sanitizeDati(rawDati, campiIds)

    // 4b. Spam content detection: silent reject per bot avanzati
    if (isSpamContent(dati, form.campi)) {
      return res.json({ ok: true, redirect_url: form.redirect_url || null })
    }

    // 5. Valida campo Consenso GDPR (obbligatorio se presente nel form)
    const consensoCampo = (form.campi || []).find(c => c.tipo === 'consenso')
    if (consensoCampo && !dati[consensoCampo.id]) {
      return res.status(400).json({ error: 'È necessario accettare la Privacy Policy per procedere.' })
    }
    const consensoDato = !!consensoCampo && !!dati[consensoCampo.id]
    const consensoPrivacyUrl = consensoCampo?.privacy_url || ''

    // 6. Valida campi required (doppia validazione server-side)
    const campiRequired = (form.campi || []).filter(c => c.required || c.tipo === 'consenso')
    for (const c of campiRequired) {
      const val = dati[c.id]
      const mancante = (typeof val === 'boolean') ? !val : !String(val ?? '').trim()
      if (mancante) {
        return res.status(400).json({ error: `Campo obbligatorio mancante: ${escHtml(c.label)}` })
      }
    }

    // 7. Crea/trova contatto se presente campo email
    let contattoId = null
    let emailNonValida = false
    const emailCampo = (form.campi || []).find(c => c.tipo === 'email')
    const email = emailCampo ? String(dati[emailCampo.id] || '').toLowerCase().trim() : null
    const nomeCampo = (form.campi || []).find(c => c.tipo === 'text' && c.label.toLowerCase().includes('nome'))
    const nome = nomeCampo ? String(dati[nomeCampo.id] || '').trim() : null
    const telCampo = (form.campi || []).find(c => c.tipo === 'tel')
    const telefono = telCampo ? String(dati[telCampo.id] || '').trim() : null

    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      // Valida consegnabilità prima di salvare (Abstract API — skip se non configurata)
      const deliverable = await isEmailDeliverable(email)
      emailNonValida = !deliverable

      const { data: existing } = await supabase
        .from('contatti')
        .select('id, email_non_valida')
        .eq('azienda_id', form.azienda_id)
        .eq('email', email)
        .maybeSingle()

      if (existing) {
        contattoId = existing.id
        emailNonValida = existing.email_non_valida || emailNonValida
        // Se l'email risulta ora non consegnabile, aggiorna il record esistente
        if (!existing.email_non_valida && !deliverable) {
          supabase.from('contatti').update({ email_non_valida: true }).eq('id', existing.id).catch(() => {})
        }
      } else {
        const { data: newContatto } = await supabase
          .from('contatti')
          .insert({
            azienda_id: form.azienda_id,
            email,
            nome: nome || email,
            telefono: telefono || null,
            fonte: 'form',
            email_non_valida: emailNonValida,
          })
          .select('id')
          .single()
        contattoId = newContatto?.id || null
      }
    }

    // 8. Salva submission con dati consenso GDPR
    const { error: subErr } = await supabase
      .from('form_submissions')
      .insert({
        form_id: form.id,
        azienda_id: form.azienda_id,
        dati,
        contatto_id: contattoId,
        ip: clientIp,
        consenso_dato: consensoDato,
        consenso_privacy_url: consensoPrivacyUrl,
      })
    if (subErr) return res.status(500).json({ error: subErr.message })

    // 9. Email notifica admin (valori HTML-escaped per sicurezza)
    if (form.email_notifica && process.env.RESEND_API_KEY) {
      const righe = (form.campi || [])
        .filter(c => c.tipo !== 'consenso')
        .map(c => {
          const val = typeof dati[c.id] === 'boolean'
            ? (dati[c.id] ? 'Sì' : 'No')
            : escHtml(dati[c.id] ?? '')
          return `<tr>
            <td style="padding:6px 12px;color:#666;font-size:13px;border-bottom:1px solid #f0f0f0;white-space:nowrap">${escHtml(c.label)}</td>
            <td style="padding:6px 12px;font-size:13px;border-bottom:1px solid #f0f0f0">${val}</td>
          </tr>`
        }).join('')

      const consentRow = consensoDato
        ? `<tr><td style="padding:6px 12px;color:#666;font-size:13px;border-bottom:1px solid #f0f0f0">Consenso GDPR</td><td style="padding:6px 12px;font-size:13px;border-bottom:1px solid #f0f0f0;color:#276749">✓ Accettato — IP: ${escHtml(clientIp)}</td></tr>`
        : ''

      resend.emails.send({
        from: process.env.RESEND_FROM || 'noreply@oltrenova.com',
        to: form.email_notifica,
        subject: `Nuova risposta: ${escHtml(form.nome)}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1a1a2e;margin-bottom:4px">Nuova risposta ricevuta</h2>
            <p style="color:#888;font-size:13px;margin-top:0">Form: <strong>${escHtml(form.nome)}</strong></p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px">${righe}${consentRow}</table>
          </div>`,
      }).catch(() => {})
    }

    // 10. Auto-tagging contatto CRM
    if (contattoId && form.tag_auto?.length) {
      supabase.from('contatti').select('tags').eq('id', contattoId).single()
        .then(({ data: ct }) => {
          const current = ct?.tags || []
          const merged = [...new Set([...current, ...form.tag_auto])]
          return supabase.from('contatti').update({ tags: merged }).eq('id', contattoId)
        })
        .catch(() => {})
    }

    // 11. Email di conferma automatica all'utente (autoresponder)
    // Skip se l'indirizzo è marcato come non valido (bounce o complaint)
    if (form.email_conferma_attiva && email && !emailNonValida && process.env.RESEND_API_KEY) {
      const vars = { nome: nome || email, form_nome: form.nome }
      const oggetto = applyTemplate(
        form.email_conferma_oggetto || `Abbiamo ricevuto il tuo messaggio — ${form.nome}`,
        vars
      )
      const testo = applyTemplate(
        form.email_conferma_testo ||
          `Ciao {{nome}},\n\nabbiamo ricevuto la tua richiesta tramite il form "${form.nome}".\nTi risponderemo al più presto.`,
        vars
      )
      const righeRiepilogo = (form.campi || [])
        .filter(c => c.tipo !== 'consenso' && dati[c.id] !== undefined && dati[c.id] !== '')
        .map(c => {
          const val = typeof dati[c.id] === 'boolean'
            ? (dati[c.id] ? 'Sì' : 'No')
            : escHtml(String(dati[c.id] ?? ''))
          return `<tr>
            <td style="padding:5px 10px;font-size:13px;color:#666;border-bottom:1px solid #f0f0f0;white-space:nowrap">${escHtml(c.label)}</td>
            <td style="padding:5px 10px;font-size:13px;border-bottom:1px solid #f0f0f0">${val}</td>
          </tr>`
        }).join('')

      resend.emails.send({
        from: process.env.RESEND_FROM || 'noreply@oltrenova.com',
        to: email,
        subject: oggetto,
        html: buildAutoresponderHtml(testo, righeRiepilogo),
      }).catch(() => {})
    }

    // 12. Webhook form_submit (Zapier / Make / n8n)
    sendWebhooks(form.azienda_id, 'form_submit', {
      form_id: form.id,
      form_nome: escHtml(form.nome),
      contatto_id: contattoId || null,
      email: email || null,
      nome: nome || null,
      dati,
    }).catch(() => {})

    res.json({ ok: true, redirect_url: form.redirect_url || null })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router
