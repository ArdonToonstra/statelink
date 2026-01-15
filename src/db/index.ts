import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Create postgres connection
const connectionString = process.env.DATABASE_URL!

// For queries - enable SSL for cloud databases like Neon
const queryClient = postgres(connectionString, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
})

// Create drizzle instance with schema
export const db = drizzle(queryClient, { schema })

// Export schema for convenience
export * from './schema'
