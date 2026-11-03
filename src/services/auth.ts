import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { CourseId, UserProfile } from '../types'

export type AuthField = 'email' | 'password' | 'form'

export class AuthError extends Error {
  field: AuthField
  code?: string

  constructor(message: string, field: AuthField = 'form', code?: string) {
    super(message)
    this.name = 'AuthError'
    this.field = field
    this.code = code
  }
}

export type OAuthProvider = 'github' | 'google'

/* ───────────── helpers ───────────── */

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

const usernameFrom = (raw: string) =>
  raw
    .split('@')[0]
    .replace(/[^a-z0-9_]/gi, '')
    .toLowerCase()
    .slice(0, 16) || 'adventurer'

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/** The profile we can build from the auth user alone (name/username come from signup or the OAuth provider). */
export const profileFromUser = (user: User): UserProfile => {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const email = user.email ?? str(meta.email) ?? ''
  const handle = str(meta.username) ?? str(meta.user_name) ?? str(meta.preferred_username) ?? email
  const username = usernameFrom(handle)
  const name = str(meta.name) ?? str(meta.full_name) ?? capitalize(usernameFrom(email || handle))
  return { name: name.slice(0, 60), email, username }
}

/** Where Supabase sends the browser back to. Must be on the project's redirect allow-list. */
const callbackUrl = () => `${window.location.origin}/auth/callback`

const friendly = (message: string, code?: string): string => {
  switch (code) {
    case 'invalid_credentials':
      return 'Incorrect email or password.'
    case 'email_not_confirmed':
      return 'Please confirm your email address first. Check your inbox for the confirmation link.'
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with this email already exists. Try logging in instead.'
    case 'weak_password':
      return 'That password is too weak. Use a longer one with a mix of letters and numbers.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many attempts. Please wait a minute and try again.'
    case 'same_password':
      return 'Choose a password different from your current one.'
    case 'provider_disabled':
    case 'validation_failed':
      return message
    default:
      return /fetch|network/i.test(message) ? 'Could not reach the server. Check your connection and try again.' : message
  }
}

const toAuthError = (error: { message: string; code?: string }, field: AuthField = 'form') =>
  new AuthError(friendly(error.message, error.code), field, error.code)

/* ───────────── profile persistence ───────────── */

interface ProfileRow {
  name: string | null
  username: string | null
  goal: string | null
  level: string | null
  track: string | null
  daily_minutes: number | null
}

const isCourse = (v: unknown): v is CourseId => v === 'cs' || v === 'python' || v === 'js'

const rowToProfile = (row: ProfileRow, base: UserProfile): UserProfile => ({
  name: row.name || base.name,
  email: base.email,
  username: row.username || base.username,
  goal: row.goal ?? undefined,
  level: row.level ?? undefined,
  track: isCourse(row.track) ? row.track : undefined,
  dailyMinutes: typeof row.daily_minutes === 'number' ? row.daily_minutes : undefined,
})

const COLUMNS = 'name, username, goal, level, track, daily_minutes'

/**
 * Loads the signed-in user's profile row. A database trigger normally creates it at signup
 * (supabase/schema.sql); if it is missing (older accounts) we create it once from the auth metadata.
 * `ignoreDuplicates` makes this safe if two tabs race, so a duplicate profile can never be created.
 */
export async function loadProfile(user: User): Promise<UserProfile> {
  const base = profileFromUser(user)

  const first = await supabase.from('profiles').select(COLUMNS).eq('id', user.id).maybeSingle()
  if (first.error) throw new AuthError(first.error.message)
  if (first.data) return rowToProfile(first.data as ProfileRow, base)

  const created = await supabase
    .from('profiles')
    .upsert({ id: user.id, name: base.name, username: base.username }, { onConflict: 'id', ignoreDuplicates: true })
  if (created.error) throw new AuthError(created.error.message)

  const again = await supabase.from('profiles').select(COLUMNS).eq('id', user.id).maybeSingle()
  if (again.error) throw new AuthError(again.error.message)
  return again.data ? rowToProfile(again.data as ProfileRow, base) : base
}

/* ───────────── service ───────────── */

export const authService = {
  async login(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password })
    if (error) {
      const field: AuthField = error.code === 'email_not_confirmed' ? 'form' : 'password'
      throw toAuthError(error, field)
    }
  },

  async signup(name: string, email: string, password: string): Promise<{ needsConfirmation: boolean }> {
    const cleanEmail = normalizeEmail(email)
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        // Stored on the auth user, so the name survives the email-confirmation round trip.
        // The database trigger copies it into `profiles` when the account is created.
        data: { name: name.trim(), username: usernameFrom(cleanEmail) },
        emailRedirectTo: callbackUrl(),
      },
    })
    if (error) throw toAuthError(error, error.code === 'weak_password' ? 'password' : 'email')
    if (!data.user) throw new AuthError('Unable to create your account. Please try again.')

    // With email confirmation on, Supabase answers an already-registered address with an
    // obfuscated user that has no identities (it must not leak whether the email exists by erroring).
    if (data.user.identities && data.user.identities.length === 0) {
      throw new AuthError('An account with this email already exists. Try logging in instead.', 'email', 'email_exists')
    }
    return { needsConfirmation: !data.session }
  },

  async resendConfirmation(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizeEmail(email),
      options: { emailRedirectTo: callbackUrl() },
    })
    if (error) throw toAuthError(error, 'email')
  },

  async loginWithProvider(provider: OAuthProvider): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl(),
        // Let people who share a device pick which Google account to use.
        ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}),
      },
    })
    if (error) throw toAuthError(error)
  },

  async requestReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw toAuthError(error, 'email')
  },

  /** Requires the temporary session created by the recovery link (or any signed-in session). */
  async resetPassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw toAuthError(error, 'password')
  },

  async updateProfile(userId: string, patch: Partial<UserProfile>): Promise<void> {
    const changes = {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.username !== undefined && { username: patch.username }),
      ...(patch.goal !== undefined && { goal: patch.goal }),
      ...(patch.level !== undefined && { level: patch.level }),
      ...(patch.track !== undefined && { track: patch.track }),
      ...(patch.dailyMinutes !== undefined && { daily_minutes: patch.dailyMinutes }),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('profiles').update(changes).eq('id', userId).select('id')
    if (error) throw new AuthError(error.message)
    if (!data || data.length === 0) {
      // Row missing (very old account): create it with the requested values.
      const { error: insertError } = await supabase.from('profiles').upsert({ id: userId, ...changes }, { onConflict: 'id' })
      if (insertError) throw new AuthError(insertError.message)
    }
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw toAuthError(error)
  },
}

export const TRACKS: { id: CourseId; label: string }[] = [
  { id: 'cs', label: 'Computer Science' },
  { id: 'python', label: 'Python' },
  { id: 'js', label: 'JavaScript' },
]
