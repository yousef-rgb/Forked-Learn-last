import { supabase } from '../lib/supabaseClient'
import { emptyState, type Activity, type GameState } from '../store/engine'
import type { AppNotification } from '../types'

/* ───────────── validation: never trust JSON coming from storage or the network ───────────── */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

const KINDS = new Set(['xp', 'achievement', 'unlock', 'daily', 'level', 'info'])

/** Turns unknown JSON into a well-formed GameState, dropping anything malformed. */
export function sanitizeState(raw: unknown): GameState {
  const out = emptyState()
  if (!isObj(raw)) return out

  if (isObj(raw.completedLessons)) {
    for (const [id, rec] of Object.entries(raw.completedLessons)) {
      if (isObj(rec) && typeof rec.at === 'string') out.completedLessons[id] = { at: rec.at, perfect: rec.perfect === true }
    }
  }
  out.started = strArr(raw.started)
  if (isObj(raw.unlocked)) {
    for (const [id, at] of Object.entries(raw.unlocked)) if (typeof at === 'string') out.unlocked[id] = at
  }
  out.dailyClaimed = strArr(raw.dailyClaimed)
  if (isObj(raw.activity)) {
    for (const [day, a] of Object.entries(raw.activity)) {
      if (isObj(a)) {
        out.activity[day] = {
          lessons: isNum(a.lessons) ? a.lessons : 0,
          perfect: isNum(a.perfect) ? a.perfect : 0,
          minutes: isNum(a.minutes) ? a.minutes : 0,
          xp: isNum(a.xp) ? a.xp : 0,
        }
      }
    }
  }
  out.bookmarks = strArr(raw.bookmarks)
  if (isObj(raw.notes)) {
    for (const [id, t] of Object.entries(raw.notes)) if (typeof t === 'string') out.notes[id] = t
  }
  if (isObj(raw.exercise)) {
    for (const [id, v] of Object.entries(raw.exercise)) {
      if (Array.isArray(v)) out.exercise[id] = v.map((x) => x === true)
    }
  }
  if (isObj(raw.hints)) {
    for (const [id, n] of Object.entries(raw.hints)) if (isNum(n) && n >= 0) out.hints[id] = Math.floor(n)
  }
  if (Array.isArray(raw.notifications)) {
    out.notifications = raw.notifications
      .filter(isObj)
      .filter((n) => typeof n.id === 'string' && typeof n.title === 'string' && typeof n.body === 'string' && typeof n.at === 'string' && KINDS.has(n.kind as string))
      .map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, at: n.at, read: n.read === true }) as AppNotification)
      .slice(0, 30)
  }
  return out
}

/* ───────────── merging (so two devices never erase each other's progress) ───────────── */

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])]

/**
 * Combines two progress snapshots of the SAME user. Fields that only ever grow (completed lessons,
 * achievements, daily claims, activity) are unioned, so progress made on another device is never lost.
 * Fields a user can undo or edit (bookmarks, notes, hints, checklists, notifications) come from `local`.
 */
export function mergeProgress(remote: GameState, local: GameState): GameState {
  const completedLessons = { ...remote.completedLessons }
  for (const [id, rec] of Object.entries(local.completedLessons)) {
    const other = completedLessons[id]
    completedLessons[id] = other
      ? { at: other.at < rec.at ? other.at : rec.at, perfect: other.perfect || rec.perfect }
      : rec
  }
  const unlocked = { ...remote.unlocked }
  for (const [id, at] of Object.entries(local.unlocked)) unlocked[id] = unlocked[id] && unlocked[id] < at ? unlocked[id] : at

  const activity: Record<string, Activity> = { ...remote.activity }
  for (const [day, a] of Object.entries(local.activity)) {
    const b = activity[day]
    activity[day] = b
      ? { lessons: Math.max(a.lessons, b.lessons), perfect: Math.max(a.perfect, b.perfect), minutes: Math.max(a.minutes, b.minutes), xp: Math.max(a.xp, b.xp) }
      : a
  }
  return {
    ...local,
    completedLessons,
    unlocked,
    activity,
    started: union(remote.started, local.started),
    dailyClaimed: union(remote.dailyClaimed, local.dailyClaimed),
  }
}

export const isEmptyProgress = (s: GameState) =>
  Object.keys(s.completedLessons).length === 0 && s.started.length === 0 && Object.keys(s.notes).length === 0 && s.bookmarks.length === 0

export const sameState = (a: GameState, b: GameState) => JSON.stringify(a) === JSON.stringify(b)

/* ───────────── per-user local backup ───────────── */

/** Pre-auth builds stored one shared, unscoped copy here. It can belong to anyone, so it is deleted. */
const LEGACY_KEY = 'quest.state.v1'
const localKey = (userId: string) => `quest.progress.v2.${userId}`

interface LocalEnvelope {
  state: GameState
  /** true while there are changes that the cloud has not confirmed yet */
  dirty: boolean
}

export function purgeLegacyLocalState() {
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function readLocal(userId: string): LocalEnvelope | null {
  try {
    const raw = localStorage.getItem(localKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isObj(parsed)) return null
    return { state: sanitizeState(parsed.state), dirty: parsed.dirty === true }
  } catch {
    return null
  }
}

export function writeLocal(userId: string, state: GameState, dirty: boolean) {
  try {
    localStorage.setItem(localKey(userId), JSON.stringify({ state, dirty }))
  } catch {
    /* storage may be full or blocked; the cloud copy is still the source of truth */
  }
}

export function clearLocal(userId: string) {
  try {
    localStorage.removeItem(localKey(userId))
  } catch {
    /* ignore */
  }
}

/* ───────────── cloud (Supabase `game_states`, one row per user, protected by RLS) ───────────── */

export type CloudRead = { ok: true; state: GameState | null } | { ok: false; message: string }

export async function fetchCloud(userId: string): Promise<CloudRead> {
  const { data, error } = await supabase.from('game_states').select('state').eq('user_id', userId).maybeSingle()
  if (error) return { ok: false, message: error.message }
  return { ok: true, state: data ? sanitizeState(data.state) : null }
}

export type CloudWrite = { ok: true; merged: GameState } | { ok: false; message: string }

/**
 * Saves `state`. Unless `force` is set it first reads the cloud copy and merges it in, so a device
 * with stale data cannot overwrite progress made elsewhere. `force` is used only by "Reset progress".
 */
export async function pushCloud(userId: string, state: GameState, force: boolean): Promise<CloudWrite> {
  let toSave = state
  if (!force) {
    const remote = await fetchCloud(userId)
    if (!remote.ok) return remote
    if (remote.state) toSave = mergeProgress(remote.state, state)
  }
  const { error } = await supabase
    .from('game_states')
    .upsert({ user_id: userId, state: toSave, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return { ok: false, message: error.message }
  return { ok: true, merged: toSave }
}
