import mongoose from 'mongoose'

export async function connectDB() {
  const connection = await mongoose.connect(process.env.MONGODB_URI)
  console.log(`MongoDB connected: ${connection.connection.host}`)
}
