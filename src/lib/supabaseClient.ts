import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim()

/** False when the build was made without the public Supabase settings. `main.tsx` then shows a setup screen. */
export const isSupabaseConfigured = Boolean(url && key)

/**
 * Browser client. Only the public URL and the publishable (anon) key are ever used here;
 * data safety comes from Row Level Security (see supabase/schema.sql), never from hiding this key.
 *
 * When the variables are missing we still build a client against a placeholder host so that importing
 * this module cannot crash the page; the app is never rendered in that state.
 */
export const supabase = createClient(url || 'https://not-configured.invalid', key || 'not-configured', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
