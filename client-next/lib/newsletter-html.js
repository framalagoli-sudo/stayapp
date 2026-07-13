function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') }

// URL sicuro per attributi href/src: solo schemi benigni (blocca javascript:/data:),
// sempre escaped (niente breakout dall'attributo). I dati sono per-tenant → non fidati.
function safeUrl(u) {
  const s = String(u || '').trim()
  if (/^(https?:|mailto:|tel:)/i.test(s) || s.startsWith('/')) return esc(s)
  return '#'
}

function nlHeader(entityName, entityLogo) {
  return `<tr><td style="background:#1a1a2e;padding:24px 36px">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      ${entityLogo ? `<td style="width:48px;padding-right:14px;vertical-align:middle"><img src="${safeUrl(entityLogo)}" alt="" style="height:40px;width:40px;object-fit:contain;border-radius:8px;display:block"></td>` : ''}
      <td style="vertical-align:middle"><span style="font-size:20px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif">${esc(entityName)}</span></td>
    </tr></table>
  </td></tr>`
}

function nlLegalLine(legale, entityName) {
  const l = legale || {}
  const name = l.ragione_sociale || entityName || ''
  const cityLine = [l.cap, l.citta].filter(Boolean).join(' ')
  const addr = [l.indirizzo, cityLine, l.provincia ? `(${l.provincia})` : ''].filter(Boolean).join(', ')
  return [
    name && `<strong>${esc(name)}</strong>`,
    addr && esc(addr),
    l.partita_iva && `P.IVA ${esc(l.partita_iva)}`,
  ].filter(Boolean).join(' · ')
}

function nlFooter(unsubscribeUrl, entityName, legale, privacyUrl) {
  const legalLine = nlLegalLine(legale, entityName)
  return `<tr><td style="padding:24px 36px;background:#f9f9fb;border-top:1px solid #f0f0f0;text-align:center">
    <p style="font-size:12px;color:#aaa;font-family:Arial,sans-serif;line-height:1.7;margin:0 0 8px">
      Hai ricevuto questa email perché sei iscritto alla newsletter di <strong>${esc(entityName)}</strong>.<br>
      <a href="${safeUrl(unsubscribeUrl)}" style="color:#aaa;text-decoration:underline">Annulla iscrizione</a>
      ${privacyUrl ? `<span style="color:#ddd">&nbsp;·&nbsp;</span><a href="${safeUrl(privacyUrl)}" style="color:#aaa;text-decoration:underline">Privacy</a>` : ''}
      <span style="color:#ddd">&nbsp;·&nbsp;</span>
      <span style="color:#ccc">Powered by OltreNova</span>
    </p>
    ${legalLine ? `<p style="font-size:11px;color:#bbb;font-family:Arial,sans-serif;line-height:1.6;margin:0">${legalLine}</p>` : ''}
  </td></tr>`
}

function ctaButton(text, url, primary) {
  if (!text || !url) return ''
  return `<table cellpadding="0" cellspacing="0" style="margin-top:24px"><tr>
    <td style="background:${primary};border-radius:8px">
      <a href="${safeUrl(url)}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;font-family:Arial,sans-serif">${esc(text)}</a>
    </td>
  </tr></table>`
}

function bodySemplice(c, primary) {
  return `
    ${c.image_url ? `<tr><td><img src="${c.image_url}" alt="" style="width:100%;max-height:280px;object-fit:cover;display:block"></td></tr>` : ''}
    <tr><td style="padding:36px 36px 40px">
      ${c.heading ? `<h1 style="font-size:26px;font-weight:700;color:#1a1a2e;margin:0 0 16px;font-family:Georgia,serif;line-height:1.3">${esc(c.heading)}</h1>` : ''}
      ${c.text ? `<p style="font-size:16px;color:#444;line-height:1.8;margin:0;font-family:Arial,sans-serif;white-space:pre-wrap">${esc(c.text)}</p>` : ''}
      ${ctaButton(c.cta_text, c.cta_url, primary)}
    </td></tr>`
}

function bodyPromozione(c, primary) {
  const orig = parseFloat(c.price_original), disc = parseFloat(c.price_discounted)
  const pct = orig && disc && orig > disc ? Math.round((1 - disc / orig) * 100) : null
  const displayPrice = c.price_discounted || c.price_original
  return `
    ${c.image_url ? `<tr><td><img src="${c.image_url}" alt="" style="width:100%;max-height:320px;object-fit:cover;display:block"></td></tr>` : ''}
    <tr><td style="padding:36px 36px 40px">
      ${c.badge ? `<span style="display:inline-block;background:${primary}22;color:${primary};font-size:11px;font-weight:700;padding:4px 14px;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;font-family:Arial,sans-serif">${esc(c.badge)}</span><br><br>` : ''}
      ${c.heading ? `<h1 style="font-size:26px;font-weight:700;color:#1a1a2e;margin:0 0 20px;font-family:Georgia,serif;line-height:1.3">${esc(c.heading)}</h1>` : ''}
      ${displayPrice ? `<table cellpadding="0" cellspacing="0" style="margin-bottom:20px"><tr>
        <td style="font-size:44px;font-weight:800;color:${primary};font-family:Georgia,serif;padding-right:12px;line-height:1">€${esc(displayPrice)}</td>
        ${c.price_original && c.price_discounted ? `<td style="font-size:22px;color:#bbb;text-decoration:line-through;font-family:Arial,sans-serif;padding-right:10px;vertical-align:middle">€${esc(c.price_original)}</td>` : ''}
        ${pct ? `<td style="vertical-align:middle"><span style="display:inline-block;background:#22c55e;color:#fff;font-size:13px;font-weight:800;padding:5px 12px;border-radius:20px;font-family:Arial,sans-serif">-${pct}%</span></td>` : ''}
      </tr></table>` : ''}
      ${c.text ? `<p style="font-size:16px;color:#444;line-height:1.8;margin:0;font-family:Arial,sans-serif;white-space:pre-wrap">${esc(c.text)}</p>` : ''}
      ${ctaButton(c.cta_text, c.cta_url, primary)}
      ${c.conditions ? `<p style="font-size:12px;color:#aaa;margin:20px 0 0;font-family:Arial,sans-serif;line-height:1.6">${esc(c.conditions)}</p>` : ''}
    </td></tr>`
}

function bodyNotizie(c, primary) {
  const blocks = c.blocks || []
  return `
    <tr><td style="padding:36px 36px ${blocks.length ? '24px' : '40px'}">
      ${c.heading ? `<h1 style="font-size:26px;font-weight:700;color:#1a1a2e;margin:0 0 ${c.intro ? '12px' : '28px'};font-family:Georgia,serif;line-height:1.3">${esc(c.heading)}</h1>` : ''}
      ${c.intro ? `<p style="font-size:16px;color:#666;line-height:1.8;margin:0 0 28px;font-family:Arial,sans-serif">${esc(c.intro)}</p>` : ''}
    </td></tr>
    ${blocks.map((b, i) => `
    <tr><td style="padding:0 36px ${i < blocks.length - 1 ? '0' : '40px'}">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0;padding-top:24px;margin-bottom:24px"><tr>
        ${b.image_url ? `<td style="width:140px;padding-right:16px;vertical-align:top"><img src="${b.image_url}" alt="" style="width:140px;height:100px;object-fit:cover;border-radius:8px;display:block"></td>` : ''}
        <td style="vertical-align:top">
          ${b.title ? `<h3 style="font-size:17px;font-weight:700;color:#1a1a2e;margin:0 0 8px;font-family:Arial,sans-serif">${esc(b.title)}</h3>` : ''}
          ${b.text ? `<p style="font-size:14px;color:#555;line-height:1.7;margin:0;font-family:Arial,sans-serif">${esc(b.text)}</p>` : ''}
        </td>
      </tr></table>
    </td></tr>`).join('')}`
}

function bodyEvento(c, primary) {
  const dateStr = c.date ? new Date(c.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''
  return `
    ${c.image_url ? `<tr><td><img src="${c.image_url}" alt="" style="width:100%;max-height:280px;object-fit:cover;display:block"></td></tr>` : ''}
    <tr><td style="padding:36px 36px 40px">
      ${c.heading ? `<p style="font-size:13px;font-weight:700;color:${primary};text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;font-family:Arial,sans-serif">${esc(c.heading)}</p>` : ''}
      ${c.event_title ? `<h1 style="font-size:28px;font-weight:700;color:#1a1a2e;margin:0 0 20px;font-family:Georgia,serif;line-height:1.3">${esc(c.event_title)}</h1>` : ''}
      ${(c.date || c.location || c.price) ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:#f9f9fb;border-radius:10px;padding:16px 20px">
        ${c.date ? `<p style="font-size:14px;color:#555;margin:0 0 8px;font-family:Arial,sans-serif">📅 <strong>${dateStr}${c.time ? ' alle ' + esc(c.time) : ''}</strong></p>` : ''}
        ${c.location ? `<p style="font-size:14px;color:#555;margin:0 0 8px;font-family:Arial,sans-serif">📍 ${esc(c.location)}</p>` : ''}
        ${c.price ? `<p style="font-size:14px;color:#555;margin:0;font-family:Arial,sans-serif">💶 A partire da <strong>€${esc(c.price)}</strong></p>` : ''}
      </td></tr></table>` : ''}
      ${c.text ? `<p style="font-size:16px;color:#444;line-height:1.8;margin:0;font-family:Arial,sans-serif;white-space:pre-wrap">${esc(c.text)}</p>` : ''}
      ${ctaButton(c.cta_text, c.cta_url, primary)}
    </td></tr>`
}

export function buildNewsletterHtml({ entityName, entityLogo, primary = '#1a1a2e', template_id, content, unsubscribeUrl, preheader = '', legale, privacyUrl }) {
  const body = template_id === 'promozione' ? bodyPromozione(content, primary)
    : template_id === 'notizie' ? bodyNotizie(content, primary)
    : template_id === 'evento' ? bodyEvento(content, primary)
    : bodySemplice(content, primary)

  const preheaderHtml = preheader ? `
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#ffffff;opacity:0">
    ${esc(preheader)}${'&nbsp;&zwnj;'.repeat(Math.max(0, 100 - preheader.length))}
  </div>` : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(entityName)}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5">
${preheaderHtml}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5"><tr><td style="padding:40px 20px">
<table width="600" align="center" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:100%">
  ${nlHeader(entityName, entityLogo)}
  ${body}
  ${nlFooter(unsubscribeUrl, entityName, legale, privacyUrl)}
</table>
</td></tr></table>
</body></html>`
}

export function personalize(obj, nome) {
  const n = (nome || '').trim() || 'amico'
  if (typeof obj === 'string') return obj.replace(/\{\{nome\}\}/g, n)
  if (Array.isArray(obj)) return obj.map(x => personalize(x, nome))
  if (obj && typeof obj === 'object') return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, personalize(v, nome)]))
  return obj
}
