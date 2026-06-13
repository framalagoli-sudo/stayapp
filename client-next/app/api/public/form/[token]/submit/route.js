import { supabaseAdmin } from '@/lib/supabase-server'
import { sendWebhooks } from '@/lib/send-webhooks'

const SPAM_KEYWORDS = /\b(viagra|cialis|casino|crypto|bitcoin|nft|forex|backlink|seo service|buy followers|make money fast)\b/i
const SPAM_SCRIPTS  = /[а-яА-Я一-鿿؀-ۿ]/

const submitRateMap = new Map()
const formFloodMap  = new Map()
const FLOOD_THRESHOLD = 20
const FLOOD_WINDOW_MS = 600_000

function checkRateLimit(token, ip) {
  const key = `${token}:${ip}`
  const now = Date.now()
  const entry = submitRateMap.get(key)
  if (!entry || entry.resetAt < now) { submitRateMap.set(key, { count: 1, resetAt: now + 3_600_000 }); return true }
  if (entry.count >= 5) return false
  entry.count++; return true
}

function trackFlood(formId) {
  const now = Date.now()
  const entry = formFloodMap.get(formId)
  if (!entry || entry.resetAt < now) { formFloodMap.set(formId, { count: 1, resetAt: now + FLOOD_WINDOW_MS }); return false }
  entry.count++
  return entry.count >= FLOOD_THRESHOLD
}

function esc(v) { return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') }

function sanitizeStr(val) { return String(val).replace(/<[^>]*>/g, '').trim().slice(0, 10_000) }

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

function isSpamContent(dati, campi) {
  for (const c of (campi || [])) {
    if (c.tipo !== 'text' && c.tipo !== 'textarea') continue
    const val = String(dati[c.id] ?? '')
    if (!val) continue
    if (SPAM_KEYWORDS.test(val)) return true
    if (SPAM_SCRIPTS.test(val)) return true
    if ((val.match(/https?:\/\//gi) || []).length >= 2) return true
  }
  return false
}

async function isEmailDeliverable(email) {
  const key = process.env.ABSTRACT_API_KEY
  if (!key) return true
  try {
    const res = await fetch(`https://emailvalidation.abstractapi.com/v1/?api_key=${key}&email=${encodeURIComponent(email)}`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return true
    const data = await res.json()
    return data.deliverability === 'DELIVERABLE'
  } catch { return true }
}

function applyTemplate(template, vars) {
  return String(template ?? '').replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

function buildAutoresponderHtml(testo, righeRiepilogo) {
  const testoHtml = esc(testo).replace(/\n/g, '<br>')
  return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#333">
    <div style="font-size:15px;line-height:1.7">${testoHtml}</div>
    ${righeRiepilogo ? `<div style="margin-top:28px;border-top:1px solid #eee;padding-top:20px">
      <p style="font-size:12px;color:#888;margin:0 0 10px;text-transform:uppercase;letter-spacing:.04em">Riepilogo dati inviati</p>
      <table style="width:100%;border-collapse:collapse">${righeRiepilogo}</table>
    </div>` : ''}
  </div>`
}

export async function POST(request, { params }) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'

    const body = await request.json()

    // 1. Honeypot
    if (body?._hp) return Response.json({ ok: true, redirect_url: null })

    // 2. Rate limit
    if (!checkRateLimit(params.token, ip))
      return Response.json({ error: 'Troppe richieste. Riprova tra qualche minuto.' }, { status: 429 })

    // 3. Carica form
    const { data: form } = await supabaseAdmin.from('form_builder')
      .select('id, azienda_id, nome, campi, redirect_url, email_notifica, attivo, email_conferma_attiva, email_conferma_oggetto, email_conferma_testo, tag_auto')
      .eq('token', params.token).single()
    if (!form) return Response.json({ error: 'Form non trovato' }, { status: 404 })
    if (!form.attivo) return Response.json({ error: 'Form non attivo' }, { status: 403 })

    // 3b. Flood
    if (trackFlood(form.id)) return Response.json({ error: 'Troppe richieste. Riprova tra qualche minuto.' }, { status: 429 })

    // 4. Sanitizza
    const campiIds = (form.campi || []).map(c => c.id)
    const rawDati = { ...body }; delete rawDati._hp
    const dati = sanitizeDati(rawDati, campiIds)

    // 4b. Spam
    if (isSpamContent(dati, form.campi)) return Response.json({ ok: true, redirect_url: form.redirect_url || null })

    // 5. Consenso GDPR
    const consensoCampo = (form.campi || []).find(c => c.tipo === 'consenso')
    if (consensoCampo && !dati[consensoCampo.id])
      return Response.json({ error: 'È necessario accettare la Privacy Policy per procedere.' }, { status: 400 })
    const consensoDato = !!consensoCampo && !!dati[consensoCampo.id]
    const consensoPrivacyUrl = consensoCampo?.privacy_url || ''

    // 6. Campi obbligatori
    const campiRequired = (form.campi || []).filter(c => c.required || c.tipo === 'consenso')
    for (const c of campiRequired) {
      const val = dati[c.id]
      const mancante = typeof val === 'boolean' ? !val : !String(val ?? '').trim()
      if (mancante) return Response.json({ error: `Campo obbligatorio mancante: ${esc(c.label)}` }, { status: 400 })
    }

    // 7. Crea/trova contatto
    let contattoId = null, emailNonValida = false
    const emailCampo = (form.campi || []).find(c => c.tipo === 'email')
    const email = emailCampo ? String(dati[emailCampo.id] || '').toLowerCase().trim() : null
    const nomeCampo = (form.campi || []).find(c => c.tipo === 'text' && c.label?.toLowerCase().includes('nome'))
    const nome = nomeCampo ? String(dati[nomeCampo.id] || '').trim() : null
    const telCampo = (form.campi || []).find(c => c.tipo === 'tel')
    const telefono = telCampo ? String(dati[telCampo.id] || '').trim() : null

    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const deliverable = await isEmailDeliverable(email)
      emailNonValida = !deliverable

      const { data: existing } = await supabaseAdmin.from('contatti')
        .select('id, email_non_valida').eq('azienda_id', form.azienda_id).eq('email', email).maybeSingle()

      if (existing) {
        contattoId = existing.id
        emailNonValida = existing.email_non_valida || emailNonValida
        if (!existing.email_non_valida && !deliverable)
          supabaseAdmin.from('contatti').update({ email_non_valida: true }).eq('id', existing.id).catch(() => {})
      } else {
        const { data: nc } = await supabaseAdmin.from('contatti').insert({
          azienda_id: form.azienda_id, email, nome: nome || email, telefono: telefono || null,
          fonte: 'form', email_non_valida: emailNonValida,
        }).select('id').single()
        contattoId = nc?.id || null
      }
    }

    // 8. Salva submission
    const { error: subErr } = await supabaseAdmin.from('form_submissions').insert({
      form_id: form.id, azienda_id: form.azienda_id, dati, contatto_id: contattoId,
      ip, consenso_dato: consensoDato, consenso_privacy_url: consensoPrivacyUrl,
    })
    if (subErr) return Response.json({ error: subErr.message }, { status: 500 })

    // 9. Email notifica admin
    if (form.email_notifica && process.env.RESEND_API_KEY) {
      const righe = (form.campi || []).filter(c => c.tipo !== 'consenso').map(c => {
        const val = typeof dati[c.id] === 'boolean' ? (dati[c.id] ? 'Sì' : 'No') : esc(dati[c.id] ?? '')
        return `<tr><td style="padding:6px 12px;color:#666;font-size:13px;border-bottom:1px solid #f0f0f0;white-space:nowrap">${esc(c.label)}</td><td style="padding:6px 12px;font-size:13px;border-bottom:1px solid #f0f0f0">${val}</td></tr>`
      }).join('')
      const consentRow = consensoDato ? `<tr><td style="padding:6px 12px;color:#666;font-size:13px;border-bottom:1px solid #f0f0f0">Consenso GDPR</td><td style="padding:6px 12px;font-size:13px;border-bottom:1px solid #f0f0f0;color:#276749">✓ Accettato — IP: ${esc(ip)}</td></tr>` : ''
      try {
        const { Resend } = await import('resend')
        new Resend(process.env.RESEND_API_KEY).emails.send({
          from: process.env.RESEND_FROM || 'noreply@oltrenova.com',
          to: form.email_notifica,
          subject: `Nuova risposta: ${esc(form.nome)}`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#1a1a2e;margin-bottom:4px">Nuova risposta ricevuta</h2><p style="color:#888;font-size:13px;margin-top:0">Form: <strong>${esc(form.nome)}</strong></p><table style="width:100%;border-collapse:collapse;margin-top:16px">${righe}${consentRow}</table></div>`,
        }).catch(() => {})
      } catch {}
    }

    // 10. Auto-tag
    if (contattoId && form.tag_auto?.length) {
      supabaseAdmin.from('contatti').select('tags').eq('id', contattoId).single()
        .then(({ data: ct }) => {
          const merged = [...new Set([...(ct?.tags || []), ...form.tag_auto])]
          return supabaseAdmin.from('contatti').update({ tags: merged }).eq('id', contattoId)
        }).catch(() => {})
    }

    // 11. Autoresponder
    if (form.email_conferma_attiva && email && !emailNonValida && process.env.RESEND_API_KEY) {
      const vars = { nome: nome || email, form_nome: form.nome }
      const oggetto = applyTemplate(form.email_conferma_oggetto || `Abbiamo ricevuto il tuo messaggio — ${form.nome}`, vars)
      const testo = applyTemplate(form.email_conferma_testo || `Ciao {{nome}},\n\nabbiamo ricevuto la tua richiesta tramite il form "${form.nome}".\nTi risponderemo al più presto.`, vars)
      const righeRiepilogo = (form.campi || []).filter(c => c.tipo !== 'consenso' && dati[c.id] !== undefined && dati[c.id] !== '').map(c => {
        const val = typeof dati[c.id] === 'boolean' ? (dati[c.id] ? 'Sì' : 'No') : esc(String(dati[c.id] ?? ''))
        return `<tr><td style="padding:5px 10px;font-size:13px;color:#666;border-bottom:1px solid #f0f0f0;white-space:nowrap">${esc(c.label)}</td><td style="padding:5px 10px;font-size:13px;border-bottom:1px solid #f0f0f0">${val}</td></tr>`
      }).join('')
      try {
        const { Resend } = await import('resend')
        new Resend(process.env.RESEND_API_KEY).emails.send({
          from: process.env.RESEND_FROM || 'noreply@oltrenova.com', to: email,
          subject: oggetto, html: buildAutoresponderHtml(testo, righeRiepilogo),
        }).catch(() => {})
      } catch {}
    }

    // 12. Webhook
    sendWebhooks(form.azienda_id, 'form_submit', {
      form_id: form.id, form_nome: esc(form.nome),
      contatto_id: contattoId || null, email: email || null, nome: nome || null, dati,
    }).catch(() => {})

    return Response.json({ ok: true, redirect_url: form.redirect_url || null })
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }) }
}
