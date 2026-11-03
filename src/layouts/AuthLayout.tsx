import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { Logo } from './MarketingLayout'
import { PixelIcon, Skeleton } from '../components/ui'
import { useAuth } from '../store/auth'

export function AuthLayout() {
  return (
    <div className="auth">
      <div className="auth__panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Logo />
          <ThemeToggle />
        </div>
        <div className="auth__form"><Outlet /></div>
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          Your account keeps your progress safe and in sync across devices. <Link to="/">Back to home</Link>
        </p>
      </div>
      <aside className="auth__art" aria-hidden="true">
        <div className="auth__sky">
          <img src="/pixel/cloud.png" alt="" className="pixelated auth__cloud auth__cloud--a" />
          <img src="/pixel/cloud.png" alt="" className="pixelated auth__cloud auth__cloud--b" />
          <img src="/pixel/island.png" alt="" className="pixelated auth__island" />
        </div>
        <div className="auth__quote">
          <span className="chip chip--blue">QUEST 01</span>
          <h2>Start Your Journey</h2>
          <p>You join alone. You leave as part of a community.</p>
          <PixelIcon name="mascot" size={120} />
        </div>
        <div className="grass" />
      </aside>
    </div>
  )
}

export const AuthPending = () => (
  <div style={{ display: 'grid', gap: 12 }} role="status" aria-label="Checking your session">
    <Skeleton h={36} w="60%" />
    <Skeleton h={48} />
    <Skeleton h={48} />
  </div>
)

/** Only accept same-site paths as a post-login destination (blocks open redirects such as //evil.com). */
export const safePath = (p: unknown, fallback = '/app'): string =>
  typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/\\') ? p : fallback

/** Login/signup screens bounce signed-in users straight into the app (after the session is resolved). */
export function GuestOnly() {
  const { status, user } = useAuth()
  const loc = useLocation()
  if (status === 'loading') return <AuthPending />
  if (status === 'authenticated' && user) {
    const from = safePath((loc.state as { from?: string } | null)?.from)
    return <Navigate to={user.track ? from : '/onboarding'} replace />
  }
  return <Outlet />
}

/** Protected route wrapper: waits for the session, then either renders or sends the visitor to /login. */
export function RequireAuth() {
  const { status } = useAuth()
  const loc = useLocation()
  if (status === 'loading') return <AuthPending />
  if (status === 'unauthenticated') return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
  return <Outlet />
}
