import 'dotenv/config'
import express from 'express'
import cors from 'cors'
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

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = [
  'http://localhost:5173',
  'https://stayapp-henna.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean)

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/properties', propertiesRouter)
app.use('/api/guest', guestRouter)
app.use('/api/requests', requestsRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/aziende', aziendeRouter)
app.use('/api/ristoranti', ristorantiRouter)
app.use('/api/users', usersRouter)
app.use('/api/public', publicRouter)
app.use('/api/collegamenti', collegamentiRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/eventi', eventiRouter)
app.use('/api/blog', blogRouter)
app.use('/api/contatti', contattiRouter)
app.use('/api/attivita', attivitaRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => console.log(`StayApp server running on :${PORT}`))
