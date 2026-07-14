import { supabaseAdmin } from './supabase-server'
import { sendEmail } from './send-email'
import { platformEmailTemplate } from './email-template'

// Destinatario degli alert di errore (l'operatore, es. Francesco). Configurabile;
// fallback su DEMO_NOTIFY_EMAIL che è già impostata. Se manca → nessun alert.
const ALERT_TO = (process.env.ERROR_ALERT_EMAIL || process.env.DEMO_NOTIFY_EMAIL || '').trim()
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Registra un errore server:
//  - SEMPRE su console → finisce nei Runtime Logs di Vercel (visibili nel dashboard).
//  - con { alert: true } (percorsi critici: booking, lead, ordini…) manda anche UN
//    alert email via Resend, deduplicato a max 1/ora per `source` (riusa la RPC
//    check_rate_limit) così un errore ricorrente NON diventa un flood di mail.
// Non lancia MAI: l'osservabilità non deve rompere la route.
export async function logError(source, err, { alert = false, ...extra } = {}) {
  const msg = typeof err === 'string' ? err : (err?.message || 'errore server')
  try {
    console.error(`[err:${source}]`, msg, err?.stack || '', Object.keys(extra).length ? extra : '')
  } catch {}

  if (!alert || !ALERT_TO) return
  try {
    // dedup: consenti al massimo 1 alert per source ogni ora
    const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: `alert:${source}`, p_limit: 1, p_window_seconds: 3600,
    })
    if (allowed !== true) return

    await sendEmail({
      _ctx: 'error-alert',
      to: ALERT_TO,
      subject: `⚠️ Errore in produzione: ${source}`,
      html: platformEmailTemplate({
        title: 'Errore in produzione',
        intro: `Un percorso critico ha generato un errore.<br><br><strong>Dove:</strong> ${esc(source)}<br><strong>Errore:</strong> ${esc(msg)}`,
        footerNote: 'Alert automatico (max 1/ora per punto). Dettaglio completo nei Runtime Logs di Vercel.',
      }),
    })
  } catch {}
}
