import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'

import { supabase } from '../lib/supabaseClient'
import { authService, loadProfile, profileFromUser, type OAuthProvider } from '../services/auth'
import type { UserProfile } from '../types'

/**
 * `loading`         — the stored session / OAuth redirect has not been resolved yet. Never redirect in this state.
 * `authenticated`   — there is a session and `user` (the profile) is loaded.
 * `unauthenticated` — no session.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface Ctx {
  status: AuthStatus
  /** Profile of the signed-in user; null unless status === 'authenticated'. */
  user: UserProfile | null
  /** Supabase auth user id; the key for all per-user data. */
  userId: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  loginWithProvider: (provider: OAuthProvider) => Promise<void>
  resendConfirmation: (email: string) => Promise<void>
  requestReset: (email: string) => Promise<void>
  resetPassword: (password: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>
}

const AuthCtx = createContext<Ctx>(null as unknown as Ctx)

export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Which auth user the current profile belongs to, and a token that invalidates stale async loads.
  const loadedFor = useRef<string | null>(null)
  const token = useRef(0)

  /* eslint-disable react-hooks/exhaustive-deps -- `token` is a plain counter, not a DOM ref: the cleanup
     must bump the *current* value to invalidate in-flight profile loads. */
  useEffect(() => {
    let alive = true

    const resolve = async (authUser: User) => {
      const mine = ++token.current
      let profile: UserProfile
      try {
        profile = await loadProfile(authUser)
      } catch (error) {
        // The session is valid even if the profile table is unreachable: fall back to the auth metadata
        // so the user is not locked out, and surface the problem in the console for debugging.
        console.error('Could not load profile:', error instanceof Error ? error.message : error)
        profile = profileFromUser(authUser)
      }
      if (!alive || mine !== token.current) return
      loadedFor.current = authUser.id
      setUserId(authUser.id)
      setUser(profile)
      setStatus('authenticated')
    }

    // This listener is the ONLY place auth state is derived. INITIAL_SESSION fires once the stored
    // session (or the ?code= of an OAuth / email link) has been processed, so `loading` is accurate.
    // Supabase advises against awaiting other Supabase calls inside the callback, so work is deferred.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        token.current++
        loadedFor.current = null
        setUser(null)
        setUserId(null)
        setStatus('unauthenticated')
        return
      }
      // Token refreshes and tab-focus SIGNED_IN events for the same user must not reload anything.
      if (loadedFor.current === session.user.id && event !== 'USER_UPDATED') return
      setTimeout(() => void resolve(session.user), 0)
    })

    return () => {
      alive = false
      token.current++
      subscription.unsubscribe()
    }
  }, [])
  /* eslint-enable react-hooks/exhaustive-deps */

  const login = useCallback((email: string, password: string) => authService.login(email, password), [])
  const signup = useCallback((name: string, email: string, password: string) => authService.signup(name, email, password), [])
  const loginWithProvider = useCallback((p: OAuthProvider) => authService.loginWithProvider(p), [])
  const resendConfirmation = useCallback((email: string) => authService.resendConfirmation(email), [])
  const requestReset = useCallback((email: string) => authService.requestReset(email), [])
  const resetPassword = useCallback((password: string) => authService.resetPassword(password), [])

  const logout = useCallback(async () => {
    await authService.logout()
    // onAuthStateChange(SIGNED_OUT) clears the rest; do it eagerly too so the UI never shows a stale user.
    token.current++
    loadedFor.current = null
    setUser(null)
    setUserId(null)
    setStatus('unauthenticated')
  }, [])

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!userId) throw new Error('Not signed in.')
      await authService.updateProfile(userId, patch)
      setUser((u) => (u ? { ...u, ...patch } : u))
    },
    [userId],
  )

  const value = useMemo<Ctx>(
    () => ({
      status,
      user,
      userId,
      login,
      signup,
      loginWithProvider,
      resendConfirmation,
      requestReset,
      resetPassword,
      logout,
      updateProfile,
    }),
    [status, user, userId, login, signup, loginWithProvider, resendConfirmation, requestReset, resetPassword, logout, updateProfile],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
