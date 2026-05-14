import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import cors from 'cors'

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
import analyticsRouter from './routes/analytics.js'
import bookingRouter from './routes/booking.js'
import pagineRouter from './routes/pagine.js'
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

// ── CORS — whitelist esplicita ───────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'https://stayapp-henna.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // Permetti richieste senza origin (Postman, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
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

app.use(express.json({ limit: '2mb' })) // limite payload
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

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

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
  console.log(`StayApp server running on :${PORT}`)

  // Newsletter scheduler — ogni 60 secondi
  setInterval(() => runScheduledSends().catch(e => console.error('[scheduler]', e.message)), 60_000)

  // Backup notturno — ogni giorno alle 03:00 UTC
  cron.schedule('0 3 * * *', () => {
    runBackup().catch(e => console.error('[backup] Errore inatteso:', e.message))
  })
  console.log('[backup] Scheduler attivo — backup ogni notte alle 03:00 UTC')
})
