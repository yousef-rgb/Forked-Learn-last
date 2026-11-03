import { useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BookOpen, Bot, Cloud, Home, LogOut, Map as MapIcon, Settings, User as UserIcon } from 'lucide-react'
import { Logo } from './MarketingLayout'
import { ThemeToggle } from '../components/ThemeToggle'
import { RewardsHost } from '../components/RewardsHost'
import { Button, CountUp, EmptyState, PixelIcon, ProgressBar, Skeleton } from '../components/ui'
import { Character } from '../components/Character'
import { useAuth } from '../store/auth'
import { useGame } from '../store/game'
import { useToast } from '../store/toast'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: Home, end: true },
  { to: '/app/assistant', label: 'AI Bot', icon: Bot },
  { to: '/app/quests', label: 'Quest Map', icon: MapIcon },
  { to: '/app/courses', label: 'Courses', icon: BookOpen },
  { to: '/app/profile', label: 'Profile', icon: UserIcon },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

function useOutside<T extends HTMLElement>(close: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const on = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close() }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', on); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', on); document.removeEventListener('keydown', key) }
  }, [close])
  return ref
}

function Notifications() {
  const { state, markAllRead } = useGame()
  const [open, setOpen] = useState(false)
  const ref = useOutside<HTMLDivElement>(() => setOpen(false))
  const unread = state.notifications.filter((n) => !n.read).length
  return (
    <div className="pop-wrap" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}>
        <Bell size={18} />{unread > 0 && <span className="dot-badge">{unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="popover pcard" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="dialog" aria-label="Notifications">
            <div className="popover__head"><strong>Notifications</strong><button className="linkbtn" onClick={markAllRead} disabled={!unread}>Mark all read</button></div>
            {state.notifications.length === 0 ? <p className="muted" style={{ padding: 16 }}>Nothing yet. Finish a lesson to earn your first notification.</p> : (
              <ul className="notes">
                {state.notifications.slice(0, 8).map((n) => (
                  <li key={n.id} className={n.read ? '' : 'unread'}><strong>{n.title}</strong><span>{n.body}</span><time className="mono">{new Date(n.at).toLocaleDateString()}</time></li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SyncBadge() {
  const { sync } = useGame()
  const text = sync === 'saving' ? 'Saving…' : sync === 'error' ? 'Offline · retrying' : sync === 'loading' ? 'Loading…' : 'Saved'
  return (
    <span className={`sync mono sync--${sync}`} role="status" aria-live="polite" title="Your progress is saved to your account">
      <Cloud size={14} aria-hidden="true" /> <span className="sync__t">{text}</span>
    </span>
  )
}

function ProfileMenu() {
  const { user, logout } = useAuth()
  const { flushAndClear } = useGame()
  const nav = useNavigate()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useOutside<HTMLDivElement>(() => setOpen(false))
  if (!user) return null

  const signOut = async () => {
    setOpen(false)
    if (busy) return
    setBusy(true)
    try {
      // Save pending progress first; the local copy is only wiped once the cloud has it.
      const saved = await flushAndClear()
      await logout()
      toast(saved
        ? { kind: 'info', title: 'Signed out', body: 'Your progress is saved to your account.' }
        : { kind: 'info', title: 'Signed out', body: 'Some progress could not sync yet. It stays on this device and will upload next time you log in.' })
      nav('/')
    } catch (err) {
      toast({ kind: 'error', title: 'Could not sign out', body: err instanceof Error ? err.message : 'Please try again.' })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="pop-wrap" ref={ref}>
      <button className="avatar-btn" onClick={() => setOpen((o) => !o)} aria-label="Profile menu" aria-expanded={open}>
        <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="popover popover--menu pcard" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="popover__who"><strong>{user.name}</strong><span className="muted">@{user.username}</span></div>
            <button className="menuitem" onClick={() => { setOpen(false); nav('/app/profile') }}><UserIcon size={16} /> Profile</button>
            <button className="menuitem" onClick={() => { setOpen(false); nav('/app/settings') }}><Settings size={16} /> Settings</button>
            <button className="menuitem" onClick={signOut} disabled={busy}><LogOut size={16} /> Log out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function AppLayout() {
  const { status, user } = useAuth()
  const { xp, level, ready, loadError, retryLoad } = useGame()
  const loc = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  // Never redirect while the session is still being restored (OAuth return, page refresh).
  if (status === 'loading') return <div className="container" style={{ padding: '48px 24px', display: 'grid', gap: 16 }} role="status" aria-label="Loading your account"><Skeleton h={40} w="50%" /><Skeleton h={140} /><Skeleton h={140} /></div>
  if (status === 'unauthenticated' || !user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />

  const lessonView = loc.pathname.startsWith('/app/lesson')
  // Pages read progress from the game store; hold them back until THIS user's progress has loaded.
  const body = loadError
    ? <EmptyState icon="flag" title="Could not load your progress" text="We could not reach the server, so we did not want to show you an empty account. Check your connection and try again." action={<Button variant="primary" onClick={retryLoad}>Try again</Button>} />
    : !ready
      ? <div style={{ display: 'grid', gap: 16 }} role="status" aria-label="Loading your progress"><Skeleton h={40} w="50%" /><Skeleton h={140} /><Skeleton h={140} /></div>
      : <Outlet />
  return (
    <div className={`shell ${lessonView ? 'shell--lesson' : ''}`}>
      <a className="skip-link" href="#app-main">Skip to content</a>
      <aside className="side" aria-label="Main navigation">
        <Logo to="/app" />
        <nav className="side__nav">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `side__link ${isActive ? 'is-active' : ''}`}><n.icon size={18} />{n.label}</NavLink>)}
        </nav>
        <div className="side__xp pcard">
          <div className="row" style={{ justifyContent: 'space-between' }}><span className="chip chip--blue">LV {level.level}</span><span className="mono" style={{ fontSize: '0.8rem' }}><CountUp value={xp} /> XP</span></div>
          <div className="row" style={{ gap: 10 }}><Character stage={level.level - 1} size={44} label /><strong style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem' }}>{level.rank}</strong></div>
          <ProgressBar value={level.pct} small label="Progress to next rank" />
          <span className="muted" style={{ fontSize: '0.78rem' }}>{level.nextRank ? `${level.toNext} XP to ${level.nextRank}` : 'Max rank reached'}</span>
        </div>
        <div className="side__grass" aria-hidden="true"><img src="/pixel/mascot.png" alt="" width={72} className="pixelated" /></div>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <div className="topbar__brand"><Logo to="/app" /></div>
          <div className="topbar__spacer" />
          <div className="topbar__xp mono"><PixelIcon name="star" size={18} /> <CountUp value={xp} /> XP</div>
          <SyncBadge />
          <ThemeToggle />
          <Notifications />
          <ProfileMenu />
        </header>
        <main id="app-main" className="shell__content">
          <AnimatePresence mode="wait">
            <motion.div key={loc.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {body}
            </motion.div>
          </AnimatePresence>
        </main>
        <div className="shell__grass grass" aria-hidden="true" />
      </div>

      <nav className="tabbar" aria-label="Mobile navigation">
        {NAV.slice(0, 5).map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `tabbar__link ${isActive ? 'is-active' : ''}`}><n.icon size={20} /><span>{n.label === 'Quest Map' ? 'Quests' : n.label}</span></NavLink>)}
      </nav>
      <RewardsHost />
    </div>
  )
}
