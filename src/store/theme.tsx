import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'
export type MotionPref = 'full' | 'reduced'
interface Prefs { theme: ThemePref; motion: MotionPref; fontScale: number }

interface Ctx extends Prefs {
  resolved: 'light' | 'dark'
  setTheme: (t: ThemePref) => void
  toggle: () => void
  setMotion: (m: MotionPref) => void
  setFontScale: (n: number) => void
}

const KEY_THEME = 'quest.theme'
const KEY_PREFS = 'quest.prefs'
const ThemeCtx = createContext<Ctx>(null as unknown as Ctx)
export const useTheme = () => useContext(ThemeCtx)

const systemDark = () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
const read = <T,>(key: string, fallback: T): T => { try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback } }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>(() => (localStorage.getItem(KEY_THEME) as ThemePref) || 'system')
  const [prefs, setPrefs] = useState<Omit<Prefs, 'theme'>>(() => read(KEY_PREFS, { motion: 'full' as MotionPref, fontScale: 1 }))
  const [sysDark, setSysDark] = useState(systemDark)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setSysDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const resolved: 'light' | 'dark' = theme === 'system' ? (sysDark ? 'dark' : 'light') : theme

  useEffect(() => { document.documentElement.setAttribute('data-theme', resolved) }, [resolved])
  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle('no-motion', prefs.motion === 'reduced')
    el.style.setProperty('--fs-scale', String(prefs.fontScale))
    try { localStorage.setItem(KEY_PREFS, JSON.stringify(prefs)) } catch { /* storage unavailable */ }
  }, [prefs])

  const animateSwitch = () => {
    const el = document.documentElement
    el.classList.add('theme-anim')
    window.setTimeout(() => el.classList.remove('theme-anim'), 350)
  }
  const setTheme = useCallback((t: ThemePref) => { animateSwitch(); setThemeState(t); try { localStorage.setItem(KEY_THEME, t) } catch { /* ignore */ } }, [])
  const toggle = useCallback(() => setTheme(resolved === 'dark' ? 'light' : 'dark'), [resolved, setTheme])

  const value = useMemo<Ctx>(() => ({
    theme, resolved, ...prefs, setTheme, toggle,
    setMotion: (motion) => setPrefs((p) => ({ ...p, motion })),
    setFontScale: (fontScale) => setPrefs((p) => ({ ...p, fontScale })),
  }), [theme, resolved, prefs, setTheme, toggle])

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}
