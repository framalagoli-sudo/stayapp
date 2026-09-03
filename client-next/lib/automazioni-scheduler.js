import { supabaseAdmin } from './supabase-server'
import { inviaMessaggioWhatsapp } from './whatsapp-messaggio'

function applyVars(str, vars) {
  if (typeof str !== 'string') return str
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

function buildEmailHtml({ entityName, entityLogo, primary = '#1a1a2e', heading, text, ctaText, ctaUrl, unsubscribeUrl }) {
  const logo = entityLogo
    ? `<td style="width:44px;padding-right:12px;vertical-align:middle"><img src="${entityLogo}" alt="" style="height:36px;width:36px;object-fit:contain;border-radius:7px;display:block"></td>`
    : ''
  const cta = ctaText && ctaUrl
    ? `<table cellpadding="0" cellspacing="0" style="margin-top:24px"><tr><td style="background:${primary};border-radius:8px"><a href="${ctaUrl}" style="display:inline-block;padding:13px 26px;color:#fff;text-decoration:none;font-size:15px;font-weight:700;font-family:Arial,sans-serif">${esc(ctaText)}</a></td></tr></table>`
    : ''
  const unsub = unsubscribeUrl
    ? `<p style="font-size:11px;color:#bbb;font-family:Arial,sans-serif;margin:0;line-height:1.6">Hai ricevuto questa email da <strong>${esc(entityName)}</strong>.<br><a href="${unsubscribeUrl}" style="color:#bbb">Annulla iscrizione</a></p>`
    : `<p style="font-size:11px;color:#bbb;font-family:Arial,sans-serif;margin:0;line-height:1.6">Email inviata da <strong>${esc(entityName)}</strong> tramite OltreNova.</p>`

  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07)">
  <tr><td style="background:${primary};padding:22px 32px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      ${logo}
      <td style="vertical-align:middle"><span style="font-size:18px;font-weight:700;color:#fff;font-family:Arial,sans-serif">${esc(entityName)}</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:36px 32px 40px">
    ${heading ? `<h1 style="font-size:24px;font-weight:700;color:#1a1a2e;margin:0 0 16px;font-family:Georgia,serif;line-height:1.3">${esc(heading)}</h1>` : ''}
    ${text ? `<p style="font-size:15px;color:#444;line-height:1.8;margin:0;font-family:Arial,sans-serif;white-space:pre-wrap">${esc(text)}</p>` : ''}
    ${cta}
  </td></tr>
  <tr><td style="padding:20px 32px 24px;background:#f9f9fb;border-top:1px solid #f0f0f0;text-align:center">
    ${unsub}
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

// ⚠️ Leggeva da `properties`/`ristoranti`/`attivita`, che dalla migration 079
// **nessuno aggiorna più**: un'entità creata dopo l'unificazione lì non esiste,
// quindi l'email partiva firmata «OltreNova» invece che col nome del cliente.
// Nessun errore, nessun log: solo la firma sbagliata addosso a un messaggio che
// il cliente crede suo. Misurato in produzione: 2 entità su 15, e **tutte**
// quelle create da qui in avanti.
async function getEntityBranding(entity_tipo, entity_id) {
  const { data } = await supabaseAdmin.from('entita')
    .select('name, logo_url, theme').eq('id', entity_id).maybeSingle()
  return { name: data?.name || 'OltreNova', logo: data?.logo_url || null, primary: data?.theme?.primaryColor || '#1a1a2e' }
}

// Il ramo WhatsApp: i controlli stanno tutti in `inviaMessaggioWhatsapp`, che
// serve anche alla conferma di una prenotazione. Erano scritti qui dentro; con
// due chiamanti, tenerli in un posto solo evita che il secondo ne dimentichi
// uno — ed è così che i controlli si perdono.
//
// ⚠️ Su WhatsApp non viaggia il testo libero dello step: serve un template
// approvato da Meta, e lo step dice QUALE (vedi lib/automazioni-canali.js).
async function inviaWhatsapp(log, auto, vars, entityName) {
  const step = auto.steps[log.step_index]
  const esito = await inviaMessaggioWhatsapp({
    aziendaId: auto.azienda_id,
    telefono: log.contact_telefono,
    email: log.contact_email,
    templateKey: step?.wa_template,
    vars,
    nomeEntita: entityName,
  })
  if (!esito.ok) throw new Error(esito.motivo)
}

export async function runAutomazioniScheduler() {
  const now = new Date().toISOString()

  const { data: pending } = await supabaseAdmin
    .from('automazioni_log')
    .select('*, automazioni(*)')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .limit(20)

  if (!pending?.length) return

  for (const log of pending) {
    const auto = log.automazioni
    if (!auto?.attiva) {
      await supabaseAdmin.from('automazioni_log').update({ status: 'failed', error_msg: 'Automazione disattivata' }).eq('id', log.id)
      continue
    }

    const step = Array.isArray(auto.steps) ? auto.steps[log.step_index] : null
    if (!step) {
      await supabaseAdmin.from('automazioni_log').update({ status: 'failed', error_msg: 'Step non trovato' }).eq('id', log.id)
      continue
    }

    try {
      const { name: entityName, logo: entityLogo, primary } = await getEntityBranding(auto.entity_tipo, auto.entity_id)
      const vars = (typeof log.vars === 'object' ? log.vars : JSON.parse(log.vars || '{}')) || {}

      if (log.canale === 'whatsapp') {
        await inviaWhatsapp(log, auto, vars, entityName)
        await supabaseAdmin.from('automazioni_log').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', log.id)
        continue
      }

      const subject = applyVars(step.subject || 'Messaggio da ' + entityName, vars)
      const heading = applyVars(step.heading || '', vars)
      const text    = applyVars(step.text || '', vars)
      const ctaText = applyVars(step.cta_text || '', vars)
      const ctaUrl  = applyVars(step.cta_url || '', vars)

      const html = buildEmailHtml({ entityName, entityLogo, primary, heading, text, ctaText, ctaUrl })

      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(process.env.RESEND_API_KEY ?? '').trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: (process.env.RESEND_FROM ?? '').trim() || 'noreply@stayapp.io',
          to: [log.contact_email],
          subject,
          html,
        }),
      })

      if (!resp.ok) {
        const errBody = await resp.text()
        throw new Error(`Resend ${resp.status}: ${errBody}`)
      }

      await supabaseAdmin.from('automazioni_log').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', log.id)
    } catch (err) {
      console.error('[automazioni]', err.message)
      await supabaseAdmin.from('automazioni_log').update({ status: 'failed', error_msg: err.message.slice(0, 255) }).eq('id', log.id)
    }
  }
}
