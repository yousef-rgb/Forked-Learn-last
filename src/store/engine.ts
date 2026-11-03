import { ACHIEVEMENTS, LESSONS, QUESTS, lessonById, questById } from '../data/curriculum'
import type { AppNotification, Quest, QuestStatus } from '../types'
import { computeStreaks, dayKey } from '../utils/dates'

/* ───────────── Constants: the entire XP economy lives here ───────────── */
export const LESSON_XP = 40
export const PERFECT_BONUS = 15
export const DAILY_XP = 25

export const RANKS = [
  { name: 'Denia', min: 0 },
  { name: 'Embera', min: 150 },
  { name: 'Voltix', min: 400 },
  { name: 'Aquor', min: 800 },
  { name: 'Zephyra', min: 1400 },
  { name: 'Titanor', min: 2200 },
  { name: 'Neonz', min: 3200 },
] as const

/* ───────────── State ───────────── */
export interface Activity { lessons: number; perfect: number; minutes: number; xp: number }

export interface GameState {
  completedLessons: Record<string, { at: string; perfect: boolean }>
  started: string[]
  unlocked: Record<string, string> // achievementId -> ISO date
  dailyClaimed: string[]
  activity: Record<string, Activity>
  bookmarks: string[]
  notes: Record<string, string>
  exercise: Record<string, boolean[]>
  hints: Record<string, number>
  notifications: AppNotification[]
}

export const emptyState = (): GameState => ({
  completedLessons: {}, started: [], unlocked: {}, dailyClaimed: [], activity: {},
  bookmarks: [], notes: {}, exercise: {}, hints: {}, notifications: [],
})

/* ───────────── Derived values ───────────── */
export const snapshot = (s: GameState) => {
  const keys = Object.entries(s.activity).filter(([, a]) => a.lessons > 0).map(([k]) => k)
  const { current, longest } = computeStreaks(keys)
  return { completedLessons: s.completedLessons, streak: current, longestStreak: longest }
}

export const lessonDone = (s: GameState, id: string) => !!s.completedLessons[id]

export const questProgress = (s: GameState, q: Quest) => {
  const total = q.lessonIds.length
  const done = q.lessonIds.filter((id) => lessonDone(s, id)).length
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}

export const questFullyDone = (s: GameState, q: Quest) => q.lessonIds.length > 0 && q.lessonIds.every((id) => lessonDone(s, id))
export const questMastered = (s: GameState, q: Quest) => questFullyDone(s, q) && q.lessonIds.every((id) => s.completedLessons[id].perfect)

export const questStatus = (s: GameState, q: Quest): QuestStatus => {
  if (q.soon) return 'soon'
  const prereqsMet = q.prereqs.every((id) => { const p = questById(id); return p ? (p.soon ? false : questFullyDone(s, p)) : true })
  if (!prereqsMet) return 'locked'
  if (questMastered(s, q)) return 'mastered'
  if (questFullyDone(s, q)) return 'completed'
  if (questProgress(s, q).done > 0 || s.started.includes(q.id)) return 'in-progress'
  return 'available'
}

export const isPlayable = (st: QuestStatus) => st !== 'locked' && st !== 'soon'

export const nextLessonOf = (s: GameState, q: Quest) => q.lessonIds.find((id) => !lessonDone(s, id)) ?? q.lessonIds[0]

export const unlockedAchievementIds = (s: GameState) => {
  const snap = snapshot(s)
  return ACHIEVEMENTS.filter((a) => a.check(snap).done).map((a) => a.id)
}

export const totalXp = (s: GameState) => {
  let xp = 0
  for (const rec of Object.values(s.completedLessons)) xp += LESSON_XP + (rec.perfect ? PERFECT_BONUS : 0)
  for (const q of QUESTS) if (questFullyDone(s, q)) xp += q.xp
  const unlocked = unlockedAchievementIds(s)
  for (const a of ACHIEVEMENTS) if (unlocked.includes(a.id)) xp += a.xp
  xp += s.dailyClaimed.length * DAILY_XP
  return xp
}

export const levelFor = (xp: number) => {
  let idx = 0
  RANKS.forEach((r, i) => { if (xp >= r.min) idx = i })
  const cur = RANKS[idx]
  const next = RANKS[idx + 1]
  return {
    level: idx + 1, rank: cur.name, nextRank: next?.name ?? null,
    xpIntoLevel: xp - cur.min, xpForLevel: next ? next.min - cur.min : 0,
    pct: next ? Math.round(((xp - cur.min) / (next.min - cur.min)) * 100) : 100,
    toNext: next ? next.min - xp : 0,
  }
}

export const learningMinutes = (s: GameState) => Object.values(s.activity).reduce((n, a) => n + a.minutes, 0)

/* Course-level progress, used by the dashboard rings */
export const courseProgress = (s: GameState, course: 'cs' | 'python' | 'js') => {
  const ls = LESSONS.filter((l) => questById(l.questId)?.course === course)
  const done = ls.filter((l) => lessonDone(s, l.id)).length
  return { done, total: ls.length, pct: ls.length ? Math.round((done / ls.length) * 100) : 0 }
}
export const overallProgress = (s: GameState) => {
  const done = LESSONS.filter((l) => lessonDone(s, l.id)).length
  return { done, total: LESSONS.length, pct: Math.round((done / LESSONS.length) * 100) }
}

/* ───────────── Daily quest (rotates by weekday) ───────────── */
export interface DailyDef { id: string; title: string; text: string; target: number; metric: 'lessons' | 'perfect' | 'minutes' }
const DAILIES: DailyDef[] = [
  { id: 'd-two', title: 'Double Feature', text: 'Complete 2 lessons today', target: 2, metric: 'lessons' },
  { id: 'd-perfect', title: 'Flawless', text: 'Answer a knowledge check perfectly', target: 1, metric: 'perfect' },
  { id: 'd-time', title: 'Deep Focus', text: 'Learn for 20 minutes', target: 20, metric: 'minutes' },
  { id: 'd-one', title: 'Daily Spark', text: 'Complete 1 lesson today', target: 1, metric: 'lessons' },
  { id: 'd-three', title: 'Triple Threat', text: 'Complete 3 lessons today', target: 3, metric: 'lessons' },
]
export const dailyFor = (d: Date = new Date()) => DAILIES[d.getDay() % DAILIES.length]
export const dailyProgress = (s: GameState, d: Date = new Date()) => {
  const def = dailyFor(d)
  const a = s.activity[dayKey(d)]
  const value = a ? a[def.metric] : 0
  return { def, value, pct: Math.min(100, Math.round((value / def.target) * 100)), done: value >= def.target, claimed: s.dailyClaimed.includes(dayKey(d)) }
}

/* ───────────── The one mutation that matters: completing a lesson ───────────── */
export type RewardEvent =
  | { type: 'level'; level: number; rank: string }
  | { type: 'quest'; questId: string; xp: number; mastered: boolean }
  | { type: 'achievement'; id: string }
  | { type: 'unlock'; questId: string }

export interface CompleteResult { state: GameState; xpGained: number; events: RewardEvent[] }

export const completeLesson = (prev: GameState, lessonId: string, perfect: boolean): CompleteResult => {
  const lesson = lessonById(lessonId)
  if (!lesson || prev.completedLessons[lessonId]) return { state: prev, xpGained: 0, events: [] }

  const beforeXp = totalXp(prev)
  const beforeLevel = levelFor(beforeXp).level
  const beforeStatus = Object.fromEntries(QUESTS.map((q) => [q.id, questStatus(prev, q)]))
  const beforeUnlocked = new Set(unlockedAchievementIds(prev))

  const now = new Date()
  const key = dayKey(now)
  const next: GameState = {
    ...prev,
    completedLessons: { ...prev.completedLessons, [lessonId]: { at: now.toISOString(), perfect } },
    activity: { ...prev.activity },
    unlocked: { ...prev.unlocked },
    dailyClaimed: [...prev.dailyClaimed],
    notifications: [...prev.notifications],
  }
  const a = { ...(next.activity[key] ?? { lessons: 0, perfect: 0, minutes: 0, xp: 0 }) }
  a.lessons++; a.minutes += lesson.minutes; if (perfect) a.perfect++
  next.activity[key] = a

  // daily quest
  const dp = dailyProgress(next, now)
  if (dp.done && !dp.claimed) next.dailyClaimed.push(key)

  const events: RewardEvent[] = []
  const afterUnlocked = unlockedAchievementIds(next)
  for (const id of afterUnlocked) if (!beforeUnlocked.has(id)) { next.unlocked[id] = now.toISOString(); events.push({ type: 'achievement', id }) }

  for (const q of QUESTS) {
    const before = beforeStatus[q.id]
    const after = questStatus(next, q)
    if (q.lessonIds.includes(lessonId) && (after === 'completed' || after === 'mastered')) events.unshift({ type: 'quest', questId: q.id, xp: q.xp, mastered: after === 'mastered' })
    else if (before === 'locked' && (after === 'available' || after === 'in-progress')) events.push({ type: 'unlock', questId: q.id })
  }

  const afterXp = totalXp(next)
  const lvl = levelFor(afterXp)
  if (lvl.level > beforeLevel) events.push({ type: 'level', level: lvl.level, rank: lvl.rank })
  const gained = afterXp - beforeXp
  a.xp += gained
  next.activity[key] = a

  const mk = (kind: AppNotification['kind'], title: string, body: string): AppNotification => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, title, body, at: now.toISOString(), read: false })
  next.notifications.unshift(mk('xp', `+${gained} XP`, `You completed "${lesson.title}".`))
  for (const e of events) {
    if (e.type === 'achievement') { const ach = ACHIEVEMENTS.find((x) => x.id === e.id)!; next.notifications.unshift(mk('achievement', 'Achievement unlocked', `${ach.title}: ${ach.description}`)) }
    if (e.type === 'quest') next.notifications.unshift(mk('info', 'Quest complete', `${questById(e.questId)!.title} cleared for +${e.xp} XP.`))
    if (e.type === 'unlock') next.notifications.unshift(mk('unlock', 'New quest unlocked', questById(e.questId)!.title))
    if (e.type === 'level') next.notifications.unshift(mk('level', 'Level up!', `You reached Level ${e.level}: ${e.rank}.`))
  }
  next.notifications = next.notifications.slice(0, 30)
  return { state: next, xpGained: gained, events }
}
