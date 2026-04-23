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

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => console.log(`StayApp server running on :${PORT}`))
