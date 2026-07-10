import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/send-email'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendWebhooks } from '@/lib/send-webhooks'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'

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
      sendEmail({ _ctx: 'form-builder',
        from: (process.env.RESEND_FROM ?? '').trim() || 'noreply@oltrenova.com',
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

// ── Spam content detection ────────────────────────────────────────────────────
const SPAM_KEYWORDS = /\b(viagra|cialis|casino|crypto|bitcoin|nft|forex|backlink|seo service|buy followers|make money fast)\b/i
const SPAM_SCRIPTS  = /[а-яА-Я一-鿿؀-ۿ]/

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

// ── Email validation via Abstract API ────────────────────────────────────────
async function isEmailDeliverable(email) {
  const key = (process.env.ABSTRACT_API_KEY ?? '').trim()
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
function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}

function sanitizeStr(val) {
  return String(val).replace(/<[^>]*>/g, '').trim().slice(0, 10_000)
}

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

function escHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function applyTemplate(template, vars) {
  return String(template ?? '').replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

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

export async function POST(request, { params }) {
  try {
    const { token } = await params
    const clientIp = getClientIp(request)
    const body = await request.json().catch(() => ({}))

    // 1. Honeypot anti-bot
    if (body._hp) {
      return NextResponse.json({ ok: true, redirect_url: null })
    }

    // 2. Rate limit condiviso (Postgres): max 5 submit/ora per IP per form.
    //    Sostituisce il vecchio limitatore in-memory, inefficace su serverless.
    const rl = await rateLimit(request, { name: `form:${token}`, limit: 5, windowSec: 3600, ip: clientIp })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Troppe richieste. Riprova tra qualche minuto.' }, { status: 429 })
    }

    // 2b. Verifica anti-bot Turnstile (inerte finché non configurata)
    const captcha = await verifyTurnstile(body.turnstileToken, clientIp)
    if (!captcha.success) {
      return NextResponse.json({ error: 'Verifica anti-bot fallita' }, { status: 403 })
    }

    // 3. Carica form
    const { data: form } = await supabaseAdmin
      .from('form_builder')
      .select('id, azienda_id, nome, campi, redirect_url, email_notifica, attivo, email_conferma_attiva, email_conferma_oggetto, email_conferma_testo, tag_auto, newsletter_optin')
      .eq('token', token)
      .single()
    if (!form) return NextResponse.json({ error: 'Form non trovato' }, { status: 404 })
    if (!form.attivo) return NextResponse.json({ error: 'Form non attivo' }, { status: 403 })

    // 3b. Flood protection
    if (trackFlood(form)) {
      return NextResponse.json({ error: 'Troppe richieste. Riprova tra qualche minuto.' }, { status: 429 })
    }

    // 4. Sanitizza dati
    const campiIds = (form.campi || []).map(c => c.id)
    const rawDati = { ...body }
    delete rawDati._hp
    const dati = sanitizeDati(rawDati, campiIds)

    // 4b. Spam content detection
    if (isSpamContent(dati, form.campi)) {
      return NextResponse.json({ ok: true, redirect_url: form.redirect_url || null })
    }

    // 5. Valida campo Consenso GDPR
    const consensoCampo = (form.campi || []).find(c => c.tipo === 'consenso')
    if (consensoCampo && !dati[consensoCampo.id]) {
      return NextResponse.json({ error: 'È necessario accettare la Privacy Policy per procedere.' }, { status: 400 })
    }
    const consensoDato = !!consensoCampo && !!dati[consensoCampo.id]
    const consensoPrivacyUrl = consensoCampo?.privacy_url || ''

    // 6. Valida campi required server-side
    const campiRequired = (form.campi || []).filter(c => c.required || c.tipo === 'consenso')
    for (const c of campiRequired) {
      const val = dati[c.id]
      const mancante = (typeof val === 'boolean') ? !val : !String(val ?? '').trim()
      if (mancante) {
        return NextResponse.json({ error: `Campo obbligatorio mancante: ${escHtml(c.label)}` }, { status: 400 })
      }
    }

    // 7. Crea/trova contatto CRM se presente campo email
    let contattoId = null
    let emailNonValida = false
    const emailCampo = (form.campi || []).find(c => c.tipo === 'email')
    const email = emailCampo ? String(dati[emailCampo.id] || '').toLowerCase().trim() : null
    const nomeCampo = (form.campi || []).find(c => c.tipo === 'text' && c.label.toLowerCase().includes('nome'))
    const nome = nomeCampo ? String(dati[nomeCampo.id] || '').trim() : null
    const telCampo = (form.campi || []).find(c => c.tipo === 'tel')
    const telefono = telCampo ? String(dati[telCampo.id] || '').trim() : null

    const marketingCampo = (form.campi || []).find(c => c.tipo === 'consenso_marketing')
    const marketingConsent = marketingCampo ? !!dati[marketingCampo.id] : false

    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const deliverable = await isEmailDeliverable(email)
      emailNonValida = !deliverable

      const { data: existing } = await supabaseAdmin
        .from('contatti')
        .select('id, email_non_valida, iscritto_newsletter')
        .eq('azienda_id', form.azienda_id)
        .eq('email', email)
        .maybeSingle()

      const newsletterOptin = (!!form.newsletter_optin && consensoDato) || marketingConsent
      if (existing) {
        contattoId = existing.id
        emailNonValida = existing.email_non_valida || emailNonValida
        const upd = {}
        if (!existing.email_non_valida && !deliverable) upd.email_non_valida = true
        if (newsletterOptin && !existing.iscritto_newsletter) upd.iscritto_newsletter = true
        if (Object.keys(upd).length) {
          const { error: updErr } = await supabaseAdmin.from('contatti').update(upd).eq('id', existing.id)
          if (updErr) console.error('[form-submit] contatti update error:', updErr.message)
        }
      } else {
        const { data: newContatto, error: contattoErr } = await supabaseAdmin
          .from('contatti')
          .insert({
            azienda_id: form.azienda_id,
            email,
            nome: nome || email,
            telefono: telefono || null,
            fonte: 'form',
            email_non_valida: emailNonValida,
            iscritto_newsletter: newsletterOptin,
          })
          .select('id')
          .single()
        if (contattoErr) console.error('[form-submit] contatti insert error:', contattoErr.message)
        contattoId = newContatto?.id || null
      }
    }

    // 8. Salva submission con dati consenso GDPR
    const { error: subErr } = await supabaseAdmin
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
    if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 })

    // 9. Email notifica admin
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

      sendEmail({ _ctx: 'form-builder',
        from: (process.env.RESEND_FROM ?? '').trim() || 'noreply@oltrenova.com',
        to: form.email_notifica,
        subject: `Nuova risposta: ${escHtml(form.nome)}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1a1a2e;margin-bottom:4px">Nuova risposta ricevuta</h2>
            <p style="color:#888;font-size:13px;margin-top:0">Form: <strong>${escHtml(form.nome)}</strong></p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px">${righe}${consentRow}</table>
          </div>`,
      }).catch(e => console.error('[form-submit] email notifica admin error:', e?.message || e))
    }

    // 10. Auto-tagging contatto CRM
    if (contattoId && form.tag_auto?.length) {
      const { data: ct } = await supabaseAdmin.from('contatti').select('tags').eq('id', contattoId).single()
      const current = ct?.tags || []
      const merged = [...new Set([...current, ...form.tag_auto])]
      const { error: tagErr } = await supabaseAdmin.from('contatti').update({ tags: merged }).eq('id', contattoId)
      if (tagErr) console.error('[form-submit] auto-tag error:', tagErr.message)
    }

    // 11. Autoresponder email all'utente
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

      sendEmail({ _ctx: 'form-builder',
        from: (process.env.RESEND_FROM ?? '').trim() || 'noreply@oltrenova.com',
        to: email,
        subject: oggetto,
        html: buildAutoresponderHtml(testo, righeRiepilogo),
      }).catch(e => console.error('[form-submit] autoresponder email error:', e?.message || e))
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

    return NextResponse.json({ ok: true, redirect_url: form.redirect_url || null })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
