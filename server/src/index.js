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

const app = express()
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

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.message?.startsWith('CORS:')) return res.status(403).json({ error: err.message })
  console.error('[error]', err.message)
  res.status(500).json({ error: 'Errore interno del server.' })
})

app.listen(PORT, () => {
  console.log(`StayApp server running on :${PORT}`)
  setInterval(() => runScheduledSends().catch(e => console.error('[scheduler]', e.message)), 60_000)
})
