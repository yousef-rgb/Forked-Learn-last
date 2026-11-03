import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { GameState } from '../store/engine'
import { addDays, dayKey } from '../utils/dates'

/** Last 7 days of XP as accessible bars. */
export function WeeklyChart({ state }: { state: GameState }) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => { const d = addDays(today, i - 6); const a = state.activity[dayKey(d)]; return { d, xp: a?.xp ?? 0, min: a?.minutes ?? 0 } })
  const max = Math.max(60, ...days.map((x) => x.xp))
  const total = days.reduce((n, x) => n + x.xp, 0)
  return (
    <div>
      <div className="wchart" role="img" aria-label={`XP earned over the last 7 days: ${days.map((x) => `${x.d.toLocaleDateString(undefined, { weekday: 'long' })} ${x.xp}`).join(', ')}`}>
        {days.map((x, i) => (
          <div key={i} className="wchart__col" title={`${x.xp} XP · ${x.min} min`}>
            <span className="wchart__val mono">{x.xp || ''}</span>
            <div className="wchart__bar"><div className={`wchart__fill ${i === 6 ? 'is-today' : ''}`} style={{ height: `${(x.xp / max) * 100}%` }} /></div>
            <span className="wchart__day">{x.d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}</span>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: '0.85rem', marginTop: 8 }}>{total} XP this week</p>
    </div>
  )
}

/** Monthly activity calendar with month navigation. */
export function ActivityCalendar({ state, compact }: { state: GameState; compact?: boolean }) {
  const [offset, setOffset] = useState(0)
  const now = new Date()
  const view = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const first = view.getDay()
  const dim = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)]
  const todayKey = dayKey(now)
  const activeInMonth = cells.filter((c) => c && state.activity[dayKey(new Date(view.getFullYear(), view.getMonth(), c))]?.lessons).length
  return (
    <div className={`cal ${compact ? 'cal--compact' : ''}`}>
      <div className="cal__head">
        <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => setOffset((o) => o - 1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
        <strong>{view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
        <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => setOffset((o) => Math.min(0, o + 1))} disabled={offset >= 0} aria-label="Next month"><ChevronRight size={16} /></button>
      </div>
      <div className="cal__grid" role="grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="cal__dow" role="columnheader">{d}</span>)}
        {cells.map((c, i) => {
          if (!c) return <span key={i} />
          const k = dayKey(new Date(view.getFullYear(), view.getMonth(), c))
          const a = state.activity[k]
          const lvl = !a?.lessons ? 0 : a.lessons >= 3 ? 3 : a.lessons === 2 ? 2 : 1
          return <span key={i} role="gridcell" className={`cal__day lvl-${lvl} ${k === todayKey ? 'is-today' : ''}`} title={a?.lessons ? `${a.lessons} lesson(s), ${a.xp} XP` : 'No activity'} aria-label={`${k}${a?.lessons ? `, ${a.lessons} lessons` : ''}`}>{c}</span>
        })}
      </div>
      <p className="muted" style={{ fontSize: '0.82rem' }}>{activeInMonth} active {activeInMonth === 1 ? 'day' : 'days'} this month</p>
    </div>
  )
}
