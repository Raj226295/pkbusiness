import mongoose from 'mongoose'

export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI?.trim()

  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI is missing. Copy .env.example to .env and set a MongoDB connection string before starting the server.',
    )
  }

  const connection = await mongoose.connect(mongoUri)
  console.log(`MongoDB connected: ${connection.connection.host}`)
}
