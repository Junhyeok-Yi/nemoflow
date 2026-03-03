import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is required for server-side meeting APIs`)
  }
  return value
}

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  return createClient(
    requireEnv('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)', url),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
