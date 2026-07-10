function escEmail(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

// Footer conforme per le email al CLIENTE: identificazione legale del mittente
// (ragione sociale/P.IVA/sede) + link all'informativa privacy. `legale` = output
// di getAziendaLegale (campi opzionali → degrada). Se non c'è nulla, ripiega sul
// solo nome. NON include disiscrizione (le transazionali non ne hanno bisogno).
export function legalFooterHtml({ entityName, legale, privacyUrl } = {}) {
  const l = legale || {}
  const name = l.ragione_sociale || entityName || ''
  const cityLine = [l.cap, l.citta].filter(Boolean).join(' ')
  const addr = [l.indirizzo, cityLine, l.provincia ? `(${l.provincia})` : ''].filter(Boolean).join(', ')
  const line = [
    name && `<strong>${escEmail(name)}</strong>`,
    addr && escEmail(addr),
    l.partita_iva && `P.IVA ${escEmail(l.partita_iva)}`,
  ].filter(Boolean).join(' · ')
  const privacy = privacyUrl ? `<a href="${escEmail(privacyUrl)}" style="color:#999;text-decoration:underline">Informativa privacy</a>` : ''
  if (!line && !privacy) return escEmail(entityName || '')
  return `${line}${line && privacy ? '<br>' : ''}${privacy}`
}

// Email rivolta all'OSPITE (business → cliente): white-label, SOLO brand del
// business, nessun riferimento a OltreNova né link all'admin (vedi regola
// white-label). `intro` è HTML libero; `rows` opzionale per i dettagli.
// `legale`/`privacyUrl` → footer conforme (identificazione + privacy).
// `bodyHtml` → slot HTML libero DOPO le rows (tabelle ricche, pulsanti, ecc.).
export function guestEmailTemplate({ entityName, title, intro, rows = [], bodyHtml, legale, privacyUrl }) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:40px 20px">
  <table width="600" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <tr><td style="background:#1a1a2e;padding:28px 36px">
      <div style="font-size:22px;font-weight:700;color:#fff">${entityName}</div>
    </td></tr>
    <tr><td style="padding:32px 36px">
      <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a2e">${title}</h2>
      ${intro ? `<p style="margin:0 0 20px;font-size:14px;color:#444;line-height:1.7">${intro}</p>` : ''}
      ${rows.length ? `<table width="100%" cellpadding="0" cellspacing="0">
        ${rows.map(r => `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;width:130px;font-size:13px;font-weight:600;color:#888;vertical-align:top">${r.label}</td>
          <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a1a2e;line-height:1.6">${r.value}</td>
        </tr>`).join('')}
      </table>` : ''}
      ${bodyHtml || ''}
    </td></tr>
    <tr><td style="padding:18px 36px;background:#f9f9fb;border-top:1px solid #f0f0f0;font-size:11px;color:#999;line-height:1.7">
      ${legalFooterHtml({ entityName, legale, privacyUrl })}
    </td></tr>
  </table>
  </td></tr></table></body></html>`
}

export function emailTemplate({ title, entityName, rows, appUrl }) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:40px 20px">
  <table width="600" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <tr><td style="background:#1a1a2e;padding:28px 36px">
      <div style="font-size:22px;font-weight:700;color:#fff">${entityName}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:4px">Notifica OltreNova</div>
    </td></tr>
    <tr><td style="padding:32px 36px">
      <h2 style="margin:0 0 24px;font-size:18px;color:#1a1a2e">${title}</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${rows.map(r => `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;width:130px;font-size:13px;font-weight:600;color:#888;vertical-align:top">${r.label}</td>
          <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a1a2e;line-height:1.6">${r.value}</td>
        </tr>`).join('')}
      </table>
    </td></tr>
    <tr><td style="padding:20px 36px;background:#f9f9fb;border-top:1px solid #f0f0f0">
      <a href="${appUrl}/admin/requests" style="color:#00b5b5;font-size:13px;text-decoration:none;font-weight:600">Apri il pannello admin →</a>
      <img src="https://www.oltrenova.com/logo-onlight.png" alt="OltreNova" width="51" height="16" style="vertical-align:middle;margin-left:16px;opacity:0.45">
    </td></tr>
  </table>
  </td></tr></table></body></html>`
}
