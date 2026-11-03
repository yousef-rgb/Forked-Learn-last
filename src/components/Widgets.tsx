import { useMemo, useState } from 'react'
import { Button } from './ui'

/** Interactive binary-to-decimal converter: toggle bits, see the place values add up. */
export function BitsWidget() {
  const [bits, setBits] = useState<number[]>([0, 0, 1, 0, 1, 0, 1, 0])
  const values = [128, 64, 32, 16, 8, 4, 2, 1]
  const total = bits.reduce((n, b, i) => n + b * values[i], 0)
  const terms = values.filter((_, i) => bits[i]).join(' + ')
  return (
    <div className="widget" aria-label="Binary converter">
      <div className="widget__bits">
        {bits.map((b, i) => (
          <button key={i} className={`bit ${b ? 'is-on' : ''}`} aria-pressed={!!b} aria-label={`Bit worth ${values[i]}, currently ${b}`} onClick={() => setBits((s) => s.map((x, j) => (j === i ? 1 - x : x)))}>
            <span className="bit__val mono">{values[i]}</span><b className="mono">{b}</b>
          </button>
        ))}
      </div>
      <p className="mono widget__out" aria-live="polite">{bits.join('')}₂ = {terms || '0'} = <strong>{total}</strong></p>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <Button size="sm" onClick={() => setBits([0, 0, 0, 0, 0, 0, 0, 0])}>Clear</Button>
        <Button size="sm" onClick={() => setBits([1, 1, 1, 1, 1, 1, 1, 1])}>All on (255)</Button>
        <Button size="sm" onClick={() => setBits(Array.from({ length: 8 }, () => (Math.random() > 0.5 ? 1 : 0)))}>Random</Button>
      </div>
    </div>
  )
}

/** Step-by-step linear vs binary search on a sorted list, with an honest comparison counter. */
export function SearchWidget() {
  const list = useMemo(() => [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], [])
  const [target, setTarget] = useState(23)
  const [mode, setMode] = useState<'linear' | 'binary'>('linear')
  const [step, setStep] = useState(0)

  const trace = useMemo(() => {
    const t: { idx: number; lo?: number; hi?: number; found: boolean }[] = []
    if (mode === 'linear') {
      for (let i = 0; i < list.length; i++) { t.push({ idx: i, found: list[i] === target }); if (list[i] === target) break }
    } else {
      let lo = 0, hi = list.length - 1
      while (lo <= hi) { const mid = Math.floor((lo + hi) / 2); t.push({ idx: mid, lo, hi, found: list[mid] === target }); if (list[mid] === target) break; if (list[mid] < target) lo = mid + 1; else hi = mid - 1 }
    }
    return t
  }, [list, target, mode])

  const cur = step > 0 ? trace[Math.min(step, trace.length) - 1] : null
  const finished = step >= trace.length
  const reset = (m = mode, t = target) => { setMode(m); setTarget(t); setStep(0) }
  return (
    <div className="widget" aria-label="Search visualizer">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <div className="seg" role="radiogroup" aria-label="Algorithm">
          {(['linear', 'binary'] as const).map((m) => <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? 'is-on' : ''} onClick={() => reset(m)}>{m === 'linear' ? 'Linear' : 'Binary'}</button>)}
        </div>
        <label className="row" style={{ gap: 8 }}>Target
          <select className="input" style={{ width: 90, minHeight: 36 }} value={target} onChange={(e) => reset(mode, Number(e.target.value))}>
            {[...list, 7].sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n}{!list.includes(n) ? ' (missing)' : ''}</option>)}
          </select>
        </label>
      </div>
      <div className="swatches" aria-label="Sorted list">
        {list.map((n, i) => {
          const checked = trace.slice(0, step).some((t) => t.idx === i)
          const active = cur?.idx === i
          const out = mode === 'binary' && cur && cur.lo !== undefined && (i < cur.lo || i > cur.hi!) && !cur.found
          return <span key={n} className={`cell mono ${checked ? 'is-checked' : ''} ${active ? 'is-active' : ''} ${active && cur?.found ? 'is-found' : ''} ${out ? 'is-out' : ''}`}>{n}</span>
        })}
      </div>
      <p className="widget__out mono" aria-live="polite">
        {step === 0 ? 'Press Step to compare the first item.' : finished ? (cur?.found ? `Found ${target} after ${trace.length} comparison${trace.length > 1 ? 's' : ''}.` : `${target} is not in the list (${trace.length} comparisons).`) : `Comparison ${step}: checked ${list[cur!.idx]}.`}
      </p>
      <div className="row"><Button size="sm" variant="primary" onClick={() => setStep((s) => Math.min(trace.length, s + 1))} disabled={finished}>Step</Button><Button size="sm" onClick={() => setStep(0)}>Restart</Button></div>
    </div>
  )
}
