const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET']

export function validateEnv() {
  const missingVars = requiredEnvVars.filter((key) => !process.env[key]?.trim())

  if (!missingVars.length) {
    return
  }

  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}. Copy .env.example to .env and fill in the required values.`,
  )
}
