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

const ctx = { aziendaId: null, staffUserId: null, staffToken: null, otherEntity: null, anyEntity: null, vetrinaId: null }
const authH = token => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })
const ENTITY_TBL = { struttura: 'properties', ristorante: 'ristoranti', attivita: 'attivita' }

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

    // admin_azienda della stessa azienda (permessi pieni) — per IDOR/escalation reali,
    // che uno staff senza permesso non raggiunge (viene bloccato prima da enforcePermission).
    const adminEmail = `ci-sec-admin-${Date.now()}@playwright.internal`
    const { data: au } = await admin.auth.admin.createUser({ email: adminEmail, password, email_confirm: true })
    ctx.adminUserId = au.user.id
    await admin.from('profiles').upsert({ id: au.user.id, role: 'admin_azienda', azienda_id: az.id, full_name: 'CI Sec Admin' })
    const { data: asess } = await anon.auth.signInWithPassword({ email: adminEmail, password })
    ctx.adminToken = asess.session.access_token

    // un'entità di un'ALTRA azienda (per IDOR, sola lettura → 404)
    const { data: otherProp } = await admin.from('properties').select('id').neq('azienda_id', az.id).limit(1).maybeSingle()
    if (otherProp) ctx.otherEntity = { tipo: 'struttura', id: otherProp.id }

    // Seconda azienda (VITTIMA) + newsletter bozza per i test IDOR cross-tenant (dati fittizi).
    const { data: azB } = await admin.from('aziende').insert({ ragione_sociale: `${RS}-B`, require_2fa: false }).select('id').single()
    ctx.victimAziendaId = azB?.id
    const { data: nlB } = await admin.from('newsletters').insert({ azienda_id: azB.id, subject: 'Bozza vittima', content: 'contenuto riservato', status: 'draft' }).select('id').single()
    ctx.victimNewsletterId = nlB?.id

    // entità di TEST nell'azienda fittizia (senza email/automazioni/webhook → ZERO mail reali).
    // Usata per il test form contatto, così non si notifica un titolare reale.
    const { data: testProp } = await admin.from('properties')
      .insert({ azienda_id: az.id, slug: `ci-sec-${Date.now()}`, name: 'CI Sec Prop', active: false })
      .select('id').single()
    ctx.testEntity = { tipo: 'struttura', id: testProp.id }
  })

  test.afterAll(async () => {
    try { await admin.from('contatti').delete().eq('email', CONTACT_EMAIL) } catch {}
    if (ctx.victimNewsletterId) { try { await admin.from('newsletters').delete().eq('id', ctx.victimNewsletterId) } catch {} }
    if (ctx.victimAziendaId)    { try { await admin.from('aziende').delete().eq('id', ctx.victimAziendaId) } catch {} }
    if (ctx.vetrinaId)   { try { await admin.from('vetrine').delete().eq('id', ctx.vetrinaId) } catch {} } // cascade elementi
    if (ctx.testEntity)  { try { await admin.from('properties').delete().eq('id', ctx.testEntity.id) } catch {} }
    if (ctx.staffUserId) { try { await admin.auth.admin.deleteUser(ctx.staffUserId) } catch {} }
    if (ctx.adminUserId) { try { await admin.auth.admin.deleteUser(ctx.adminUserId) } catch {} }
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
      data: { entity_tipo: ctx.testEntity.tipo, entity_id: ctx.testEntity.id, nome: 'CI Sec Lead', email: CONTACT_EMAIL, messaggio: 'regressione', turnstileToken: process.env.TURNSTILE_TEST_BYPASS },
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

  test('authz: endpoint admin senza token → 401 (nessun accesso anonimo)', async ({ request }) => {
    for (const path of ['/api/eventi', '/api/contatti', '/api/newsletter']) {
      const res = await request.get(`${TEST_URL}${path}`)
      expect(res.status(), `${path} senza auth deve essere 401`).toBe(401)
    }
  })

  test('scoping eventi: /api/guest/eventi non fa leak cross-azienda', async ({ request }) => {
    // Un evento reale pubblicato e futuro (anche "aziendale", entity_id null).
    const { data: ev } = await admin.from('eventi')
      .select('azienda_id')
      .eq('published', true).eq('active', true)
      .gte('date_start', new Date().toISOString()).limit(1).maybeSingle()
    test.skip(!ev, 'nessun evento pubblicato futuro disponibile')

    // Un'entità di QUELLA azienda con cui interrogare l'endpoint entity-scoped.
    let entity = null
    for (const [tipo, table] of Object.entries(ENTITY_TBL)) {
      const { data: e } = await admin.from(table).select('id').eq('azienda_id', ev.azienda_id).limit(1).maybeSingle()
      if (e) { entity = { tipo, id: e.id }; break }
    }
    test.skip(!entity, 'nessuna entità per l\'azienda dell\'evento')

    const res = await request.get(`${TEST_URL}/api/guest/eventi?entity_tipo=${entity.tipo}&entity_id=${entity.id}`)
    expect(res.status(), 'guest eventi deve rispondere 200').toBe(200)
    const ids = (await res.json() || []).map(e => e.id)
    if (!ids.length) return
    // Verifica l'azienda dal DB (non fidarsi del payload): ogni evento mostrato deve
    // appartenere all'azienda dell'entità interrogata, mai ad altre.
    const { data: rows } = await admin.from('eventi').select('id, azienda_id').in('id', ids)
    for (const r of rows) {
      expect(r.azienda_id, `evento ${r.id} è di un'altra azienda → LEAK`).toBe(ev.azienda_id)
    }
  })

  test('gating vetrine: dati_privati mai nella risposta pubblica', async ({ request }) => {
    // Fixture effimera: vetrina + elemento pubblicato con un valore PRIVATO sentinella.
    const SENTINEL = `CI-SEC-SECRET-${Date.now()}`
    const { data: v } = await admin.from('vetrine').insert({
      entity_tipo: ctx.testEntity.tipo, entity_id: ctx.testEntity.id,
      slug: `ci-sec-vet-${Date.now()}`, titolo: 'CI Sec Vetrina', status: 'pubblicata',
    }).select('id').single()
    ctx.vetrinaId = v.id
    await admin.from('vetrina_elementi').insert({
      vetrina_id: v.id, entity_tipo: ctx.testEntity.tipo, entity_id: ctx.testEntity.id,
      titolo: 'CI Sec Elemento', status: 'pubblicata',
      dati: { nota: 'campo pubblico' }, dati_privati: { segreto: SENTINEL },
    })

    const res = await request.get(`${TEST_URL}/api/guest/vetrina/${v.id}`)
    expect(res.status(), 'guest vetrina deve rispondere 200').toBe(200)
    const text = await res.text()
    expect(text, 'il valore in dati_privati NON deve comparire nella risposta pubblica → LEAK').not.toContain(SENTINEL)
    const body = JSON.parse(text)
    for (const el of (body.elementi || [])) {
      expect(el, 'nessun elemento pubblico deve esporre la chiave dati_privati').not.toHaveProperty('dati_privati')
    }
  })

  test('IDOR newsletter: send/test/duplicate di un\'altra azienda → 404, e non viene inviata', async ({ request }) => {
    test.skip(!ctx.victimNewsletterId, 'fixture newsletter vittima non creata')
    const id = ctx.victimNewsletterId
    const send = await request.post(`${TEST_URL}/api/newsletter/${id}/send`, { headers: authH(ctx.adminToken), data: {} })
    expect(send.status(), 'send cross-tenant deve essere 404').toBe(404)
    const t = await request.post(`${TEST_URL}/api/newsletter/${id}/test`, { headers: authH(ctx.adminToken), data: { test_email: 'ci@playwright.internal' } })
    expect(t.status(), 'test (leak contenuto) cross-tenant deve essere 404').toBe(404)
    const dup = await request.post(`${TEST_URL}/api/newsletter/${id}/duplicate`, { headers: authH(ctx.adminToken), data: {} })
    expect(dup.status(), 'duplicate cross-tenant deve essere 404').toBe(404)
    const { data: still } = await admin.from('newsletters').select('status').eq('id', id).single()
    expect(still?.status, 'la newsletter vittima non deve risultare inviata').not.toBe('sent')
  })

  test('escalation billing: un non-super non può auto-assegnarsi piano/moduli della propria azienda', async ({ request }) => {
    const res = await request.patch(`${TEST_URL}/api/aziende/${ctx.aziendaId}`, {
      headers: authH(ctx.adminToken),
      data: { piano: 'enterprise', moduli: { struttura: true, ristorante: true, attivita: true }, active: true },
    })
    // La PATCH può passare (isOwner), ma i campi commerciali NON devono essere applicati.
    const { data: az } = await admin.from('aziende').select('piano, moduli').eq('id', ctx.aziendaId).single()
    expect(az?.piano, 'il piano non deve essere auto-assegnato da un non-super').not.toBe('enterprise')
    expect(az?.moduli?.ristorante, 'i moduli non devono essere auto-abilitati da un non-super').not.toBe(true)
  })

  test('rate-limit: /api/public/register blocca il flood (429)', async ({ request }) => {
    // Limite 5/ora per IP. Body vuoto → 400 dopo il rate-limit (nessun utente creato).
    let got429 = false
    for (let i = 0; i < 8; i++) {
      const res = await request.post(`${TEST_URL}/api/public/register`, { data: {} })
      if (res.status() === 429) { got429 = true; break }
    }
    expect(got429, 'oltre il limite, register deve rispondere 429').toBe(true)
  })
})
