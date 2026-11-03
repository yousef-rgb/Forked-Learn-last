import { useMemo } from 'react'

/** The seven evolution stages. Index = rank index (0 = Denia, 6 = Neonz). */
export const CHARACTERS = [
  { name: 'Denia', title: 'The Seedling', blurb: 'Every journey starts small. Denia just hatched.', c: { body: '#6fd08c', light: '#c5f5d3', accent: '#2e9e57', line: '#1d4d33', eye: '#10221a' } },
  { name: 'Embera', title: 'The Spark', blurb: 'Curiosity ignites. Embera grows ears and a flame.', c: { body: '#ff9a3c', light: '#ffd9a0', accent: '#ff4d2e', line: '#6b2a12', eye: '#2a1206' } },
  { name: 'Voltix', title: 'The Charged', blurb: 'Horns crackle with energy as skills connect.', c: { body: '#ffd23c', light: '#fff2a8', accent: '#7a5cff', line: '#5a4400', eye: '#2a2100' } },
  { name: 'Aquor', title: 'The Wave', blurb: 'Fins turn to wings. Aquor starts to glide.', c: { body: '#3c8dff', light: '#b4d6ff', accent: '#19c6e0', line: '#0b2b6b', eye: '#06142e' } },
  { name: 'Zephyra', title: 'The Storm', blurb: 'Wide wings and a glowing gaze. Problems bend to her.', c: { body: '#8a5cff', light: '#d3c0ff', accent: '#ff5cc8', line: '#2e1670', eye: '#ffe45c' } },
  { name: 'Titanor', title: 'The Titan', blurb: 'Crowned and armored. Titanor builds what others cannot.', c: { body: '#e0394a', light: '#ffa3ad', accent: '#ffc83c', line: '#5a0f1a', eye: '#ffe45c' } },
  { name: 'Neonz', title: 'The Final Form', blurb: 'Pure light. Neonz has mastered the whole map.', c: { body: '#1b2142', light: '#46509e', accent: '#00f0ff', line: '#00f0ff', eye: '#ff2bd6' } },
] as const

type Cell = [number, number, string]

const build = (stage: number): Cell[] => {
  const s = Math.max(0, Math.min(6, stage)) + 1
  const { body, light, accent, line, eye } = CHARACTERS[s - 1].c
  const hw = [3, 3, 4, 4, 4, 5, 5][s - 1]
  const h = [6, 7, 8, 8, 9, 9, 10][s - 1]
  const y1 = 14
  const y0 = y1 - h + 1
  const cells = new Map<string, string>()
  const put = (x: number, y: number, c: string) => { if (x >= 0 && x < 16 && y >= 0 && y < 16) cells.set(`${x},${y}`, c) }
  const mir = (dx: number, y: number, c: string) => { put(8 + dx, y, c); put(7 - dx, y, c) } // dx >= 0 distance from centre

  // body mask (pill shape), outline derived from the mask edge
  const mask = new Set<string>()
  for (let r = 0; r < h; r++) {
    const taper = r === 0 || r === h - 1 ? 2 : r === 1 || r === h - 2 ? 1 : 0
    const w = hw - taper
    for (let dx = 0; dx < w; dx++) { mask.add(`${8 + dx},${y0 + r}`); mask.add(`${7 - dx},${y0 + r}`) }
  }
  const has = (x: number, y: number) => mask.has(`${x},${y}`)
  const wings = s >= 4
  // wings go underneath the body
  if (wings) {
    const span = s >= 5 ? 3 : 2
    for (let i = 1; i <= span; i++) for (let r = 1; r < (s >= 5 ? 6 : 4); r++) if (r + i < 8) mir(hw - 1 + i, y0 + r + (i === span ? 0 : 0), i === span ? line : accent)
    if (s >= 5) for (let r = 2; r < 5; r++) mir(hw + 1, y0 + r, light)
  }
  for (const k of mask) {
    const [x, y] = k.split(',').map(Number)
    const edge = !has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1)
    put(x, y, edge ? line : body)
  }
  // belly
  for (let r = Math.floor(h * 0.55); r < h - 1; r++) for (let dx = 0; dx < Math.max(1, hw - 2); dx++) mir(dx, y0 + r, light)
  // eyes
  const ey = y0 + Math.floor(h * 0.35)
  const ex = Math.max(1, hw - 3)
  mir(ex, ey, eye); if (s >= 3) mir(ex, ey + 1, eye)
  if (s >= 5) { mir(ex + 1, ey - 1, accent) }
  // smile
  mir(0, ey + 3 > y1 - 1 ? y1 - 2 : ey + 3, line)

  // stage-specific features
  if (s === 1) { put(8, y0 - 1, accent); put(8, y0 - 2, accent); put(9, y0 - 2, accent); put(10, y0 - 3, accent) }
  if (s >= 2) { mir(hw - 2, y0 - 1, accent); mir(hw - 2, y0 - 2, s === 2 ? accent : line) }
  if (s === 2) { mir(0, y0 - 1, accent); put(8, y0 - 2, accent) }
  if (s >= 3) { mir(hw - 1, y0, accent); mir(hw - 1, y0 - 1, accent); mir(hw, y0 - 2, accent); mir(hw - 2, y0 + 1, s === 3 ? accent : line); mir(hw, y0 + h - 3, line); mir(hw, y0 + h - 2, line) }
  if (s >= 3) { mir(Math.max(1, hw - 2), y1, line); mir(Math.max(1, hw - 2) + 1, y1, line) } // feet
  if (s >= 6) { // crown
    for (let dx = 0; dx < 3; dx++) mir(dx, y0 - 1, accent)
    mir(0, y0 - 2, accent); mir(2, y0 - 2, accent)
    mir(1, y0, accent)
  }
  if (s >= 6) { mir(hw, y0 + 2, accent); mir(hw, y0 + 3, accent) } // shoulder plates
  if (s === 7) { // halo + sparks
    for (let dx = 0; dx < 4; dx++) mir(dx, y0 - 4, accent)
    mir(4, y0 - 3, accent); mir(4, y0 - 2, accent)
    put(1, 2, accent); put(14, 4, accent); put(0, 9, accent); put(15, 8, accent)
    mir(2, y0 + 4, accent)
  }
  return [...cells].map(([k, c]) => { const [x, y] = k.split(',').map(Number); return [x, y, c] as Cell })
}

export function Character({ stage, size = 64, locked = false, className = '', label }: { stage: number; size?: number; locked?: boolean; className?: string; label?: boolean }) {
  const cells = useMemo(() => build(stage), [stage])
  const ch = CHARACTERS[Math.max(0, Math.min(6, stage))]
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className={`character ${locked ? 'character--locked' : ''} ${stage === 6 ? 'character--neon' : ''} ${className}`} role={label ? 'img' : undefined} aria-label={label ? ch.name : undefined} aria-hidden={label ? undefined : true}>
      {cells.map(([x, y, c], i) => <rect key={i} x={x} y={y} width="1.02" height="1.02" fill={locked ? '#6b7283' : c} />)}
    </svg>
  )
}
