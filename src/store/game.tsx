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

import { ACHIEVEMENTS } from '../data/curriculum'
import {
  completeLesson as engineComplete,
  emptyState,
  levelFor,
  totalXp,
  type GameState,
  type RewardEvent,
} from './engine'
import {
  clearLocal,
  fetchCloud,
  isEmptyProgress,
  mergeProgress,
  pushCloud,
  purgeLegacyLocalState,
  readLocal,
  sameState,
  writeLocal,
} from '../services/progress'
import { useAuth } from './auth'
import { useToast } from './toast'

/** idle-states of the cloud sync, shown in the top bar. */
export type SyncStatus = 'loading' | 'saved' | 'saving' | 'error'

const SAVE_DELAY_MS = 1500
const MAX_RETRY_MS = 60_000
const MAX_NOTE_LENGTH = 10_000

interface Ctx {
  state: GameState
  xp: number
  level: ReturnType<typeof levelFor>
  rewards: RewardEvent[]
  /** false until this user's progress has been loaded; pages must not render progress before that */
  ready: boolean
  /** set when progress could not be loaded and there is no local backup to fall back to */
  loadError: string | null
  retryLoad: () => void
  sync: SyncStatus
  /** Saves pending changes, then removes the local copy. Resolves false if the cloud save failed. */
  flushAndClear: () => Promise<boolean>
  dismissReward: () => void
  complete: (lessonId: string, perfect: boolean) => void
  start: (questId: string) => void
  toggleBookmark: (lessonId: string) => void
  setNote: (lessonId: string, text: string) => void
  setExercise: (lessonId: string, checks: boolean[]) => void
  setHints: (lessonId: string, n: number) => void
  markAllRead: () => void
  reset: () => void
}

const GameCtx = createContext<Ctx>(null as unknown as Ctx)

export const useGame = () => useContext(GameCtx)

export function GameProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth()
  const { toast } = useToast()

  const [state, setState] = useState<GameState>(emptyState)
  const [rewards, setRewards] = useState<RewardEvent[]>([])
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sync, setSync] = useState<SyncStatus>('loading')
  const [loadNonce, setLoadNonce] = useState(0)

  // Latest values for callbacks that outlive a render (timers, listeners, async saves).
  const stateRef = useRef(state)
  const toastRef = useRef(toast)
  const saveRef = useRef<() => Promise<boolean>>(async () => true)
  useEffect(() => {
    stateRef.current = state
    toastRef.current = toast
  })

  // Switching accounts: drop the previous user's progress during render, before any child can paint it.
  const [owner, setOwner] = useState<string | null>(null)
  if (owner !== userId) {
    setOwner(userId)
    setState(emptyState())
    setRewards([])
    setReady(false)
    setLoadError(null)
    setSync('loading')
  }

  const userRef = useRef<string | null>(null)
  const readyRef = useRef(false)
  /** the object that came from load/merge rather than from the user; changes to it are not "edits" */
  const baselineRef = useRef<GameState | null>(null)
  const versionRef = useRef(0)
  const dirtyRef = useRef(false)
  const forceRef = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const retryMs = useRef(0)
  const errorShown = useRef(false)
  const inflight = useRef<Promise<boolean> | null>(null)

  /* ───────────── saving ───────────── */

  const schedule = useCallback((ms: number, run: () => void) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(run, ms)
  }, [])

  const save = useCallback(async (): Promise<boolean> => {
    const uid = userRef.current
    if (!uid || !readyRef.current) return true
    while (inflight.current) await inflight.current
    if (userRef.current !== uid) return true
    if (!dirtyRef.current && !forceRef.current) return true

    const startVersion = versionRef.current
    const snapshot = stateRef.current
    const force = forceRef.current

    const run = (async (): Promise<boolean> => {
      const res = await pushCloud(uid, snapshot, force)
      if (userRef.current !== uid) return true

      if (!res.ok) {
        console.error('Failed to save progress:', res.message)
        setSync('error')
        if (!errorShown.current) {
          errorShown.current = true
          toastRef.current({
            kind: 'error',
            title: 'Could not save your progress',
            body: 'It is kept on this device and we will keep retrying.',
          })
        }
        retryMs.current = Math.min(MAX_RETRY_MS, retryMs.current ? retryMs.current * 2 : 5000)
        schedule(retryMs.current, () => void saveRef.current())
        return false
      }

      errorShown.current = false
      retryMs.current = 0
      if (force) forceRef.current = false
      if (versionRef.current === startVersion) {
        dirtyRef.current = false
        // The cloud copy may contain progress from another device; adopt it.
        if (!sameState(res.merged, snapshot)) {
          baselineRef.current = res.merged
          stateRef.current = res.merged
          setState(res.merged)
        }
        writeLocal(uid, res.merged, false)
        setSync('saved')
      }
      // else: newer edits arrived while saving; their own save is already scheduled.
      return true
    })()

    inflight.current = run
    try {
      return await run
    } finally {
      if (inflight.current === run) inflight.current = null
    }
  }, [schedule])
  useEffect(() => {
    saveRef.current = save
  }, [save])

  /* ───────────── loading (runs whenever the signed-in user changes) ───────────── */

  useEffect(() => {
    purgeLegacyLocalState()
    userRef.current = userId
    readyRef.current = false
    window.clearTimeout(timer.current)
    dirtyRef.current = false
    forceRef.current = false
    retryMs.current = 0
    errorShown.current = false
    baselineRef.current = null

    const blank = emptyState()
    stateRef.current = blank
    if (!userId) return

    let cancelled = false
    void (async () => {
      const local = readLocal(userId)
      const cloud = await fetchCloud(userId)
      if (cancelled) return

      let next: GameState
      let dirty = false
      if (cloud.ok) {
        if (cloud.state) {
          // Unsynced local edits (e.g. made offline) are merged in; otherwise the cloud copy is authoritative.
          next = local?.dirty ? mergeProgress(cloud.state, local.state) : cloud.state
          dirty = !!local?.dirty
        } else if (local && !isEmptyProgress(local.state)) {
          next = local.state
          dirty = true
        } else {
          next = blank
        }
      } else if (local) {
        // Cloud unreachable: keep working from this user's own backup; saving merges with the cloud later.
        console.error('Could not load progress from the cloud:', cloud.message)
        next = local.state
        dirty = true
      } else {
        setLoadError(cloud.message)
        setSync('error')
        return
      }

      baselineRef.current = next
      stateRef.current = next
      dirtyRef.current = dirty
      writeLocal(userId, next, dirty)
      setState(next)
      readyRef.current = true
      setReady(true)
      if (dirty) {
        setSync('saving')
        schedule(0, () => void save())
      } else {
        setSync('saved')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId, loadNonce, save, schedule])

  /* ───────────── persisting edits ───────────── */

  useEffect(() => {
    const uid = userRef.current
    if (!ready || !uid || state === baselineRef.current) return
    versionRef.current++
    dirtyRef.current = true
    writeLocal(uid, state, true)
    setSync('saving')
    schedule(SAVE_DELAY_MS, () => void save())
  }, [state, ready, save, schedule])

  // Push pending changes when the tab is hidden/closed, and retry as soon as the network is back.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') {
        window.clearTimeout(timer.current)
        void save()
      }
    }
    const online = () => schedule(0, () => void save())
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    window.addEventListener('online', online)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('online', online)
    }
  }, [save, schedule])

  const flushAndClear = useCallback(async () => {
    const uid = userRef.current
    if (!uid) return true
    window.clearTimeout(timer.current)
    const ok = await save()
    if (ok) clearLocal(uid)
    return ok
  }, [save])

  /* ───────────── mutations ───────────── */

  const patch = useCallback((fn: (s: GameState) => GameState) => setState((s) => fn(s)), [])

  const complete = useCallback((lessonId: string, perfect: boolean) => {
    const res = engineComplete(stateRef.current, lessonId, perfect)
    if (res.state === stateRef.current) return
    stateRef.current = res.state
    setState(res.state)

    toastRef.current({
      kind: 'xp',
      title: `+${res.xpGained} XP`,
      body: perfect ? 'Perfect score bonus included.' : 'Lesson complete.',
    })

    const queue = res.events.filter((e) => e.type === 'quest' || e.type === 'level' || e.type === 'achievement')
    if (queue.length) setRewards((r) => [...r, ...queue])

    for (const e of res.events) {
      if (e.type === 'unlock') toastRef.current({ kind: 'info', title: 'New quest unlocked', body: 'Check the Quest Map.' })
    }
  }, [])

  const reset = useCallback(() => {
    forceRef.current = true // the cloud copy must be overwritten, not merged back in
    setState(emptyState())
    setRewards([])
  }, [])

  const retryLoad = useCallback(() => {
    setLoadError(null)
    setSync('loading')
    setLoadNonce((n) => n + 1)
  }, [])

  const value = useMemo<Ctx>(() => {
    const xp = totalXp(state)
    return {
      state,
      xp,
      level: levelFor(xp),
      rewards,
      ready,
      loadError,
      retryLoad,
      sync,
      flushAndClear,
      dismissReward: () => setRewards((r) => r.slice(1)),
      complete,
      start: (questId) => patch((s) => (s.started.includes(questId) ? s : { ...s, started: [...s.started, questId] })),
      toggleBookmark: (id) =>
        patch((s) => ({
          ...s,
          bookmarks: s.bookmarks.includes(id) ? s.bookmarks.filter((b) => b !== id) : [...s.bookmarks, id],
        })),
      setNote: (id, text) => patch((s) => ({ ...s, notes: { ...s.notes, [id]: text.slice(0, MAX_NOTE_LENGTH) } })),
      setExercise: (id, checks) => patch((s) => ({ ...s, exercise: { ...s.exercise, [id]: checks } })),
      setHints: (id, n) => patch((s) => ({ ...s, hints: { ...s.hints, [id]: n } })),
      markAllRead: () => patch((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      reset,
    }
  }, [state, rewards, ready, loadError, retryLoad, sync, flushAndClear, complete, patch, reset])

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>
}

export const achievementById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!
