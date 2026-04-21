import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import propertiesRouter from './routes/properties.js'
import guestRouter from './routes/guest.js'
import requestsRouter from './routes/requests.js'
import authRouter from './routes/auth.js'
import uploadRouter from './routes/upload.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/properties', propertiesRouter)
app.use('/api/guest', guestRouter)
app.use('/api/requests', requestsRouter)
app.use('/api/upload', uploadRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => console.log(`StayApp server running on :${PORT}`))
