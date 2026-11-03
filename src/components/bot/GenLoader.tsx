import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

const STEPS = ['Understanding your prompt…', 'Preparing the generation…', 'Building the visual composition…', 'Rendering your image…', 'Finalizing the result…']

/**
 * Pixel-art loader. It is deliberately indeterminate: the Worker reports no real progress,
 * so we show activity (a growing pixel canvas + rotating status text), never a fake percentage.
 */
export function GenLoader({ width, height, onCancel }: { width: number; height: number; onCancel: () => void }) {
  const [step, setStep] = useState(0)
  const reduce = useReducedMotion()
  useEffect(() => {
    const t = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4500)
    return () => window.clearInterval(t)
  }, [])
  const ratio = `${width} / ${height}`
  return (
    <div className="genload" role="status" aria-live="polite">
      <div className={`genload__canvas ${reduce ? 'is-still' : ''}`} style={{ aspectRatio: ratio }} aria-hidden="true">
        {Array.from({ length: 64 }, (_, i) => <i key={i} style={{ animationDelay: `${((i * 37) % 64) * 40}ms` }} />)}
      </div>
      <div className="genload__meta">
        <span className="genload__step mono" key={step}>{STEPS[step]}</span>
        <span className="genload__bar" aria-hidden="true"><b /></span>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted mono" style={{ fontSize: '0.72rem' }}>{width}×{height}px</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}><X size={14} /> Cancel</button>
        </div>
      </div>
    </div>
  )
}
