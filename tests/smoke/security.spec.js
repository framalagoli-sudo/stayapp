/**
 * Regression sicurezza — protegge i fix critici della Fase 0.
 * Gira come ruolo `staff` reale (non super_admin), quindi cattura ciò che gli
 * smoke UI non vedono: IDOR multi-tenant, enforcement 2FA, permessi, contratti dati.
 *
 * Esegui da tests/:  npm test   (gira insieme agli smoke)
 * Richiede in .env.test: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 *
 * Crea fixture effimere (1 azienda + 1 staff) e le elimina in afterAll.
 * L'eliminazione dell'azienda fa cascade su contatti (FK ON DELETE CASCADE).
 */
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.test' })

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, TEST_URL = 'https://www.oltrenova.com' } = process.env
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const anon  = createClient(SUPABASE_URL, SUPABASE_ANON_KEY,         { auth: { persistSession: false, autoRefreshToken: false } })

const RS = 'CI-SEC-TEST'           // ragione_sociale fixture, per pre-cleanup
const CONTACT_EMAIL = `ci-sec-contact-${Date.now()}@playwright.internal`

const ctx = { aziendaId: null, staffUserId: null, staffToken: null, otherEntity: null, anyEntity: null }
const authH = token => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })

test.describe('Regression sicurezza (ruolo staff)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    // pre-cleanup aziende fixture stale
    const { data: stale } = await admin.from('aziende').select('id').eq('ragione_sociale', RS)
    for (const a of (stale || [])) await admin.from('aziende').delete().eq('id', a.id)

    // azienda fixture (require_2fa off)
    const { data: az } = await admin.from('aziende').insert({ ragione_sociale: RS, require_2fa: false }).select().single()
    ctx.aziendaId = az.id

    // staff con SOLO permesso "contatti"
    const email = `ci-sec-${Date.now()}@playwright.internal`
    const password = 'CiSecTest123!aZ'
    const { data: u } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    ctx.staffUserId = u.user.id
    await admin.from('profiles').upsert({ id: u.user.id, role: 'staff', azienda_id: az.id, full_name: 'CI Sec Staff', permissions: { contatti: true } })
    const { data: sess } = await anon.auth.signInWithPassword({ email, password })
    ctx.staffToken = sess.session.access_token

    // un'entità di un'ALTRA azienda (per IDOR, sola lettura → 404)
    const { data: otherProp } = await admin.from('properties').select('id').neq('azienda_id', az.id).limit(1).maybeSingle()
    if (otherProp) ctx.otherEntity = { tipo: 'struttura', id: otherProp.id }

    // entità di TEST nell'azienda fittizia (senza email/automazioni/webhook → ZERO mail reali).
    // Usata per il test form contatto, così non si notifica un titolare reale.
    const { data: testProp } = await admin.from('properties')
      .insert({ azienda_id: az.id, slug: `ci-sec-${Date.now()}`, name: 'CI Sec Prop', active: false })
      .select('id').single()
    ctx.testEntity = { tipo: 'struttura', id: testProp.id }
  })

  test.afterAll(async () => {
    try { await admin.from('contatti').delete().eq('email', CONTACT_EMAIL) } catch {}
    if (ctx.testEntity)  { try { await admin.from('properties').delete().eq('id', ctx.testEntity.id) } catch {} }
    if (ctx.staffUserId) { try { await admin.auth.admin.deleteUser(ctx.staffUserId) } catch {} }
    if (ctx.aziendaId)   { try { await admin.from('aziende').delete().eq('id', ctx.aziendaId) } catch {} } // cascade contatti/properties
  })

  test('permessi: staff senza permesso → POST /api/newsletter bloccato (403)', async ({ request }) => {
    const res = await request.post(`${TEST_URL}/api/newsletter`, { headers: authH(ctx.staffToken), data: { subject: 'x', azienda_id: ctx.aziendaId } })
    expect(res.status(), 'newsletter non concesso deve essere 403').toBe(403)
    expect((await res.json()).code).toBe('permission_denied')
  })

  test('permessi: staff con permesso → POST /api/contatti consentito', async ({ request }) => {
    const res = await request.post(`${TEST_URL}/api/contatti`, { headers: authH(ctx.staffToken), data: { nome: 'CI Sec OK', azienda_id: ctx.aziendaId } })
    expect([200, 201], 'contatti concesso deve passare').toContain(res.status())
  })

  test('IDOR: staff non accede alle pagine di un\'altra azienda (404)', async ({ request }) => {
    test.skip(!ctx.otherEntity, 'nessuna entità di altra azienda disponibile')
    const res = await request.get(`${TEST_URL}/api/pagine?entity_tipo=${ctx.otherEntity.tipo}&entity_id=${ctx.otherEntity.id}`, { headers: authH(ctx.staffToken) })
    expect(res.status(), 'accesso entità di altra azienda deve essere 404').toBe(404)
  })

  test('contact form: campi IT (nome/messaggio) salvati — regressione lead persi', async ({ request }) => {
    // Usa l'entità di TEST (no email) → verifica il salvataggio senza spammare titolari reali.
    const res = await request.post(`${TEST_URL}/api/guest/contact`, {
      headers: { 'Content-Type': 'application/json' },
      data: { entity_tipo: ctx.testEntity.tipo, entity_id: ctx.testEntity.id, nome: 'CI Sec Lead', email: CONTACT_EMAIL, messaggio: 'regressione' },
    })
    expect(res.status(), 'il form con campi IT deve rispondere 200 (non 400)').toBe(200)
    // Conferma che il contatto sia stato creato nell'azienda di test (regressione vera).
    const { data: c } = await admin.from('contatti').select('id, nome').eq('azienda_id', ctx.aziendaId).eq('email', CONTACT_EMAIL).maybeSingle()
    expect(c?.nome, 'il contatto deve essere salvato con nome valorizzato').toBe('CI Sec Lead')
  })

  test('2FA: require_2fa ON + sessione aal1 → 403 mfa_required', async ({ request }) => {
    await admin.from('aziende').update({ require_2fa: true }).eq('id', ctx.aziendaId)
    const res = await request.get(`${TEST_URL}/api/contatti?azienda_id=${ctx.aziendaId}`, { headers: authH(ctx.staffToken) })
    const body = await res.json().catch(() => ({}))
    await admin.from('aziende').update({ require_2fa: false }).eq('id', ctx.aziendaId) // ripristino sempre
    expect(res.status(), 'sessione aal1 con require_2fa deve essere 403').toBe(403)
    expect(body.code).toBe('mfa_required')
  })

  test('2FA OFF: stessa sessione torna ad accedere (no falsi positivi)', async ({ request }) => {
    const res = await request.get(`${TEST_URL}/api/contatti?azienda_id=${ctx.aziendaId}`, { headers: authH(ctx.staffToken) })
    expect(res.status(), 'senza require_2fa deve passare').toBe(200)
  })
})
