import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cors from 'cors'
import { supabase } from './lib/supabase.js'

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message, err.stack)
})

import propertiesRouter from './routes/properties.js'
import guestRouter from './routes/guest.js'
import requestsRouter from './routes/requests.js'
import authRouter from './routes/auth.js'
import uploadRouter from './routes/upload.js'
import aziendeRouter from './routes/aziende.js'
import ristorantiRouter from './routes/ristoranti.js'
import usersRouter from './routes/users.js'
import publicRouter from './routes/public.js'
import collegamentiRouter from './routes/collegamenti.js'
import messagesRouter from './routes/messages.js'
import eventiRouter from './routes/eventi.js'
import blogRouter from './routes/blog.js'
import contattiRouter from './routes/contatti.js'
import attivitaRouter from './routes/attivita.js'
import demoRouter from './routes/demo.js'
import newsletterRouter, { runScheduledSends } from './routes/newsletter.js'
import automazioniRouter from './routes/automazioni.js'
import recensioniRouter from './routes/recensioni.js'
import { runAutomazioniScheduler } from './lib/automazioni.js'
import analyticsRouter from './routes/analytics.js'
import bookingRouter from './routes/booking.js'
import pagineRouter from './routes/pagine.js'
import webhooksRouter from './routes/webhooks.js'
import preventivRouter from './routes/preventivi.js'
import formBuilderRouter from './routes/form_builder.js'
import pianoEditorialeRouter from './routes/piano_editoriale.js'
import dominiRouter from './routes/domini.js'
import aiRouter from './routes/ai.js'
import shopRouter from './routes/shop.js'
import contentStudioRouter from './routes/contentStudio.js'
import surveyRouter from './routes/survey.js'
import googleCalendarRouter from './routes/googleCalendar.js'
import loyaltyRouter from './routes/loyalty.js'
import blogAutomazioniRouter from './routes/blogAutomazioni.js'
import landingSeoRouter from './routes/landing_seo.js'
import { runBlogScheduler } from './lib/blogScheduler.js'
import { runBackup } from './lib/backup.js'
import { auditLog } from './middleware/auditLog.js'
import cron from 'node-cron'

const app = express()
app.set('trust proxy', 1) // IP reale dietro Railway/Cloudflare
const PORT = process.env.PORT || 3001

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // necessario per immagini Storage
}))

// ── CORS — whitelist esplicita + wildcard *.oltrenova.com + domini custom ────
const STAYAPP_DOMAIN = process.env.STAYAPP_DOMAIN || 'oltrenova.com'
const STAYAPP_SUBDOMAIN_RE = new RegExp(`^https://[a-z0-9-]+\\.${STAYAPP_DOMAIN.replace('.', '\\.')}$`)

const staticOrigins = new Set([
  'http://localhost:5173',
  'https://stayapp-henna.vercel.app',
  `https://${STAYAPP_DOMAIN}`,
  `https://www.${STAYAPP_DOMAIN}`,
  process.env.CLIENT_URL,
].filter(Boolean))

// Cache domini custom — ricarica ogni 5 minuti
let customDomainsCache = new Set()
async function refreshCustomDomains() {
  try {
    const { data } = await supabase.from('domini')
      .select('dominio').eq('tipo', 'custom').eq('stato', 'attivo')
    if (data) customDomainsCache = new Set(data.map(d => `https://${d.dominio}`))
  } catch (e) { console.error('[cors] refreshCustomDomains:', e.message) }
}
refreshCustomDomains()
setInterval(refreshCustomDomains, 5 * 60 * 1000)

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true) // Postman, curl, server-to-server
    if (staticOrigins.has(origin)) return cb(null, true)
    if (STAYAPP_SUBDOMAIN_RE.test(origin)) return cb(null, true)
    if (customDomainsCache.has(origin)) return cb(null, true)
    cb(new Error(`CORS: origine non consentita — ${origin}`))
  },
  credentials: true,
}))

// ── Rate limiting ────────────────────────────────────────────────────────────
const guestLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minuto
  max: 60,                   // max 60 richieste/minuto per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppe richieste, riprova tra un minuto.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 10,                   // max 10 tentativi login per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi, riprova tra 15 minuti.' },
})

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,                  // admin usa di più l'API
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppe richieste.' },
})

app.use('/api/guest', guestLimiter)
app.use('/api/auth',  authLimiter)

// Raw body per Stripe webhook (deve stare prima di express.json)
app.use('/api/shop/webhook/stripe', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '2mb' }))
app.use(auditLog) // audit log PATCH/DELETE su tutte le route admin

app.use('/api/auth',        authRouter)
app.use('/api/guest',       guestRouter)
app.use('/api/properties',  adminLimiter, propertiesRouter)
app.use('/api/requests',    adminLimiter, requestsRouter)
app.use('/api/upload',      adminLimiter, uploadRouter)
app.use('/api/aziende',     adminLimiter, aziendeRouter)
app.use('/api/ristoranti',  adminLimiter, ristorantiRouter)
app.use('/api/users',       adminLimiter, usersRouter)
app.use('/api/public',      publicRouter)
app.use('/api/collegamenti', adminLimiter, collegamentiRouter)
app.use('/api/messages',    adminLimiter, messagesRouter)
app.use('/api/eventi',      adminLimiter, eventiRouter)
app.use('/api/blog',        adminLimiter, blogRouter)
app.use('/api/contatti',    adminLimiter, contattiRouter)
app.use('/api/attivita',    adminLimiter, attivitaRouter)
app.use('/api/demo',        demoRouter)
app.use('/api/newsletter',  adminLimiter, newsletterRouter)
app.use('/api/analytics',   adminLimiter, analyticsRouter)
app.use('/api/booking',     adminLimiter, bookingRouter)
app.use('/api/pagine',      adminLimiter, pagineRouter)
app.use('/api/webhooks',    adminLimiter, webhooksRouter)
app.use('/api/automazioni',  adminLimiter, automazioniRouter)
app.use('/api/recensioni',   adminLimiter, recensioniRouter)
app.use('/api/preventivi',       preventivRouter)
app.use('/api/form-builder',    guestLimiter, formBuilderRouter)
app.use('/api/piano-editoriale', adminLimiter, pianoEditorialeRouter)
app.use('/api/domini',           adminLimiter, dominiRouter)
app.use('/api/ai',               adminLimiter, aiRouter)
app.use('/api/shop',             shopRouter)
app.use('/api/content-studio',   contentStudioRouter)
app.use('/api/survey',           surveyRouter)
app.use('/api/google-calendar',  googleCalendarRouter)
app.use('/api/loyalty',          loyaltyRouter)
app.use('/api/blog-automazioni', adminLimiter, blogAutomazioniRouter)
app.use('/api/landing-seo',     landingSeoRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', v: 'fix-enrichlinks-attivita' }))

// Backup manuale — solo super_admin, non esposto al rate limiter pubblico
app.post('/api/admin/backup', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Non autorizzato' })
  const log = []
  const _log = console.log.bind(console)
  const _err = console.error.bind(console)
  console.log = (...a) => { _log(...a); log.push(a.join(' ')) }
  console.error = (...a) => { _err(...a); log.push('ERROR: ' + a.join(' ')) }
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await sb.auth.getUser(token)
    if (authErr || !user) {
      console.log = _log; console.error = _err
      return res.status(401).json({ error: 'Non autorizzato', detail: authErr?.message })
    }
    const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      console.log = _log; console.error = _err
      return res.status(403).json({ error: 'Accesso negato' })
    }
    await runBackup()
    res.json({ ok: true, log })
  } catch (err) {
    log.push('THROWN: ' + err.message + (err.stack ? '\n' + err.stack : ''))
    res.status(500).json({ error: err.message, log })
  } finally {
    console.log = _log
    console.error = _err
  }
})

// Audit log — solo super_admin
app.get('/api/admin/audit-log', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Non autorizzato' })
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data: { user }, error: authErr } = await sb.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return res.status(401).json({ error: 'Non autorizzato' })
    const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') return res.status(403).json({ error: 'Accesso negato' })

    const limit  = Math.min(Number(req.query.limit)  || 50, 200)
    const offset = Number(req.query.offset) || 0
    let query = sb.from('audit_log').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (req.query.method)      query = query.eq('method', req.query.method.toUpperCase())
    if (req.query.entity_tipo) query = query.eq('entity_tipo', req.query.entity_tipo)
    if (req.query.user_email)  query = query.ilike('user_email', `%${req.query.user_email}%`)

    const { data, count, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    res.json({ data, count, limit, offset })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.message?.startsWith('CORS:')) return res.status(403).json({ error: err.message })
  console.error('[error]', err.message)
  res.status(500).json({ error: 'Errore interno del server.' })
})

app.listen(PORT, () => {
  console.log(`OltreNova server running on :${PORT}`)

  // Newsletter scheduler — ogni 60 secondi
  setInterval(() => runScheduledSends().catch(e => console.error('[scheduler]', e.message)), 60_000)

  // Automazioni scheduler — ogni 60 secondi
  setInterval(() => runAutomazioniScheduler().catch(e => console.error('[automazioni]', e.message)), 60_000)

  // Blog scheduler — ogni ora
  setInterval(() => runBlogScheduler().catch(e => console.error('[blogScheduler]', e.message)), 60 * 60_000)

  // Backup notturno — ogni giorno alle 03:00 UTC
  cron.schedule('0 3 * * *', () => {
    runBackup().catch(e => console.error('[backup] Errore inatteso:', e.message))
  })
  console.log('[backup] Scheduler attivo — backup ogni notte alle 03:00 UTC')
})
