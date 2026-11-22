import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

// Safely access Vite environment variables
const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_SUPABASE_URL
  : undefined

const supabaseAnonKey = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : undefined

/**
 * Indicates whether live Supabase credentials (URL and public Anon key)
 * are configured in the environment.
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 20
  )
}

/**
 * Shared Supabase client instance.
 * Initialized only when valid environment credentials are provided.
 * When unconfigured, services gracefully fall back to local verified datasets.
 */
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured()
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
