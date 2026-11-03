export const dayKey = (d: Date = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const addDays = (d: Date, n: number) => {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

export const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Current and longest streak from a set of active day keys. A streak stays alive if the last active day was yesterday. */
export const computeStreaks = (keys: string[], today: Date = new Date()) => {
  const set = new Set(keys)
  let current = 0
  let cursor = today
  if (!set.has(dayKey(cursor))) cursor = addDays(cursor, -1)
  while (set.has(dayKey(cursor))) {
    current++
    cursor = addDays(cursor, -1)
  }
  const sorted = [...set].sort()
  let longest = 0
  let run = 0
  let prev: Date | null = null
  for (const k of sorted) {
    const d = fromKey(k)
    run = prev && dayKey(addDays(prev, 1)) === k ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = d
  }
  return { current, longest: Math.max(longest, current) }
}

export const greeting = (d: Date = new Date()) => {
  const h = d.getHours()
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export const formatLong = (d: Date = new Date()) =>
  d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
