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
