import { supabaseAdmin } from './supabase-server'
import { sendEmail } from './send-email'
import { platformEmailTemplate, html } from './email-template'
import { fusoSicuro } from './fuso'

// La registrazione aperta, in due tempi.
//
// 1. `/api/auth/signup` crea SOLO l'account, non confermato, e mette i dati
//    della registrazione in `app_metadata.registrazione` (nome, fuso, prova dei
//    Termini). Poi manda il link di conferma.
// 2. Chi apre il link conferma l'indirizzo e chiama `completaRegistrazione`:
//    SOLO allora nascono l'azienda e il profilo da titolare.
//
// Perché non tutto subito: chi si registra con l'indirizzo di un altro
// lascerebbe un'azienda fantasma intestata a quella casella, che riceverebbe i
// nostri resoconti e i nostri avvisi. Un account mai confermato non entra
// (Supabase rifiuta il login con `email_not_confirmed`) e non ha niente.
//
// ⚠️ `app_metadata`, mai `user_metadata`: il secondo lo può riscrivere
// l'utente stesso dal browser (`auth.updateUser`), e diventerebbe un modo per
// farsi creare un'azienda senza passare dalla registrazione.

const BASE = (process.env.CLIENT_URL ?? '').trim() || 'https://oltrenova.com'
const GIORNI_DI_PROVA = 14

// Il link di conferma. Sempre di tipo «magiclink», anche alla prima volta:
// sull'account non confermato lo conferma (provato su Supabase il 23/10/2026)
// e non serve conoscere la password, quindi vale anche per il «rimandamela».
// ⛔ Chiamarla SOLO per un account che esiste: per un indirizzo sconosciuto
// Supabase CREA l'utente (provato lo stesso giorno).
export async function mandaConfermaEmail(email) {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) return { ok: false, errore: error.message }
  const token = data?.properties?.hashed_token
  if (!token) return { ok: false, errore: 'link di conferma non generato' }
  const nome = data.user?.app_metadata?.registrazione?.nome_azienda
  const link = `${BASE}/admin/conferma-email?token_hash=${encodeURIComponent(token)}`
  const r = await sendEmail({
    _ctx: 'conferma-email', to: email,
    subject: 'Conferma il tuo indirizzo — OltreNova',
    html: platformEmailTemplate({
      title: 'Conferma il tuo indirizzo',
      intro: html`${nome ? html`Stai creando l'account di <strong>${nome}</strong> su OltreNova. ` : ''}Premi il pulsante per confermare che questo indirizzo è tuo: poi entri e hai <strong>${GIORNI_DI_PROVA} giorni di prova gratuita</strong>, senza carta di credito.`,
      ctaText: 'Conferma e entra →', ctaUrl: link,
      footerNote: 'Se non sei stato tu, ignora questa email: senza conferma non viene creato niente.',
    }),
  })
  return r?.error ? { ok: false, errore: r.error.message } : { ok: true }
}

// Dopo la conferma: azienda + profilo da titolare, una volta sola.
// Restituisce `stato`: completata · gia_fatta · niente · non_confermata.
export async function completaRegistrazione(user) {
  if (!user?.email_confirmed_at) return { stato: 'non_confermata' }
  const reg = user.app_metadata?.registrazione
  if (!reg) return { stato: 'niente' }
  const togliInAttesa = () => supabaseAdmin.auth.admin.updateUserById(user.id, { app_metadata: { registrazione: null } })

  const { data: profilo } = await supabaseAdmin.from('profiles').select('azienda_id').eq('id', user.id).maybeSingle()
  if (profilo?.azienda_id) { await togliInAttesa(); return { stato: 'gia_fatta' } }

  const { data: az, error: azErr } = await supabaseAdmin.from('aziende').insert({
    ragione_sociale: reg.nome_azienda,
    email: user.email,
    fuso_orario: fusoSicuro(reg.fuso_orario),
    moduli: { struttura: false, ristorante: false, attivita: false },
    piano: 'base', active: true, subscription_status: 'trial',
    // La prova parte da quando si entra davvero, non da quando si è compilato il modulo.
    trial_ends_at: new Date(Date.now() + GIORNI_DI_PROVA * 24 * 3600 * 1000).toISOString(),
    // La prova del consenso è quella del momento della registrazione.
    termini_accettati_il: reg.termini_accettati_il,
    termini_versione: reg.termini_versione,
  }).select('id').single()
  if (azErr) throw new Error(`azienda: ${azErr.message}`)

  // Due conferme simultanee (doppio clic, due schede) creerebbero due aziende:
  // il profilo si aggancia solo se è ancora senza azienda, e chi arriva secondo
  // cancella la propria.
  const campi = { role: 'admin_azienda', azienda_id: az.id, full_name: reg.nome_azienda }
  const { data: agganciati, error: pErr } = profilo
    ? await supabaseAdmin.from('profiles').update(campi).eq('id', user.id).is('azienda_id', null).select('id')
    : await supabaseAdmin.from('profiles').upsert({ id: user.id, ...campi }, { onConflict: 'id' }).select('id')
  if (pErr || !agganciati?.length) {
    await supabaseAdmin.from('aziende').delete().eq('id', az.id)
    if (pErr) throw new Error(`profilo: ${pErr.message}`)
    return { stato: 'gia_fatta' }
  }
  await togliInAttesa()
  return { stato: 'completata' }
}
