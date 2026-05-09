import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI

let cached = global._mongoose

if (!cached) {
  cached = global._mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not defined in environment variables. " +
      "Create a .env.local file with your MongoDB connection string."
    )
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI)
  }

  cached.conn = await cached.promise
  return cached.conn
}
