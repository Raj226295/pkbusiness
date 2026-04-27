import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { connectDB } from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import documentRoutes from './routes/documentRoutes.js'
import appointmentRoutes from './routes/appointmentRoutes.js'
import serviceRoutes from './routes/serviceRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import blogRoutes from './routes/blogRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import contactRoutes from './routes/contactRoutes.js'
import { errorHandler, notFound } from './middleware/errorMiddleware.js'
import { seedDefaults } from './utils/seedDefaults.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const port = Number(process.env.PORT || 5000)

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))
// Serve uploaded files back to the dashboard and admin review screens.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/blogs', blogRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/contact', contactRoutes)

app.use(notFound)
app.use(errorHandler)

async function startServer() {
  try {
    await connectDB()
    await seedDefaults()
    app.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

startServer()
