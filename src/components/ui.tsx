import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, type LinkProps } from 'react-router-dom'
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import type { QuestStatus } from '../types'

/* ───── Pixel icon (the deck's artwork, shipped in /public/pixel) ───── */
export const PixelIcon = ({ name, size = 32, className = '', alt = '' }: { name: string; size?: number; className?: string; alt?: string }) => (
  <img src={`/pixel/${name}.png`} width={size} height={size} alt={alt} aria-hidden={alt ? undefined : true} className={`pixelated ${className}`} style={{ width: size, height: size, objectFit: 'contain' }} draggable={false} />
)

export const Grass = () => <div className="grass" aria-hidden="true" />

/* ───── Buttons ───── */
type Variant = 'default' | 'primary' | 'ink' | 'ghost'
interface BtnProps { variant?: Variant; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode }
const cls = (v: Variant = 'default', s: 'sm' | 'md' | 'lg' = 'md', extra = '') => `btn ${v !== 'default' ? `btn--${v}` : ''} ${s !== 'md' ? `btn--${s}` : ''} ${extra}`
export function Button({ variant, size, icon, className = '', children, ...rest }: BtnProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cls(variant, size, className)} {...rest}>{icon}{children}</button>
}
export function ButtonLink({ variant, size, icon, className = '', children, ...rest }: BtnProps & LinkProps) {
  return <Link className={cls(variant, size, className)} {...rest}>{icon}{children}</Link>
}

/* ───── Card ───── */
export function Card({ children, className = '', hover, accent, tint, pad = true, as: Tag = 'div', ...rest }: { children: ReactNode; className?: string; hover?: boolean; accent?: 'blue' | 'red' | 'yellow' | 'green'; tint?: boolean; pad?: boolean; as?: 'div' | 'section' | 'article' | 'li' } & Record<string, unknown>) {
  return (
    <Tag className={`pcard ${hover ? 'pcard--hover' : ''} ${accent ? `pcard--accent accent-${accent}` : ''} ${tint ? 'pcard--tint' : ''} ${pad ? 'pcard--pad' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

/* ───── QUEST HUD badge — straight from the slide corner ───── */
export const QuestBadge = ({ num, title }: { num: number | string; title: string }) => (
  <div className="qbadge" aria-label={`Quest ${num}: ${title}`}>
    <div className="qbadge__top"><span>▪ QUEST</span><span className="qbadge__num">{String(num).padStart(2, '0')}</span></div>
    <div className="qbadge__title">{title}</div>
  </div>
)

/* ───── Section header with editorial numbering ───── */
export const SectionHead = ({ num, label, title, text, icon }: { num: string; label: string; title: string; text?: string; icon?: string }) => (
  <Reveal className="section-head">
    <span className="eyebrow">{icon && <PixelIcon name={icon} size={28} />}<span className="mono">{num}</span> / {label}</span>
    <h2>{title}</h2>
    {text && <p>{text}</p>}
  </Reveal>
)

/* ───── Reveal on scroll ───── */
export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })
  const reduce = useReducedMotion()
  return (
    <motion.div ref={ref} className={className} initial={reduce ? false : { opacity: 0, y: 24 }} animate={inView || reduce ? { opacity: 1, y: 0 } : undefined} transition={{ duration: 0.5, delay, ease: [0.2, 0.8, 0.2, 1] }}>
      {children}
    </motion.div>
  )
}

/* ───── Progress ───── */
export const ProgressBar = ({ value, small, done, label }: { value: number; small?: boolean; done?: boolean; label?: string }) => (
  <div className={`pbar ${small ? 'pbar--sm' : ''} ${done || value >= 100 ? 'pbar--done' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-label={label ?? 'Progress'}>
    <div className="pbar__fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
)

export function Ring({ value, size = 96, stroke = 10, color = 'var(--primary)', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size }} role="img" aria-label={`${value}% complete`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-soft)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} strokeLinecap="butt" style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{children ?? `${value}%`}</div>
    </div>
  )
}

/* ───── Animated numbers ───── */
export function CountUp({ value, duration = 0.9, className }: { value: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const [text, setText] = useState(reduce ? String(value) : '0')
  const last = useRef(0)
  useEffect(() => {
    if (!inView && !reduce) return
    if (reduce) { setText(value.toLocaleString()); return }
    const c = animate(last.current, value, { duration, ease: 'easeOut', onUpdate: (v) => setText(Math.round(v).toLocaleString()) })
    last.current = value
    return () => c.stop()
  }, [value, inView, duration, reduce])
  return <span ref={ref} className={className}>{text}</span>
}

/* ───── Status chip ───── */
const STATUS: Record<QuestStatus, { label: string; cls: string }> = {
  locked: { label: 'Locked', cls: 'chip--locked' }, available: { label: 'Available', cls: 'chip--blue' },
  'in-progress': { label: 'In progress', cls: 'chip--warn' }, completed: { label: 'Completed', cls: 'chip--done' },
  mastered: { label: 'Mastered', cls: 'chip--done' }, soon: { label: 'Coming soon', cls: 'chip--soft' },
}
export const StatusChip = ({ status }: { status: QuestStatus }) => <span className={`chip ${STATUS[status].cls}`}>{status === 'mastered' ? '★ ' : ''}{STATUS[status].label}</span>

/* ───── Modal ───── */
export function Modal({ open, onClose, title, children, wide, label }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean; label?: string }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    panel.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.() }
  }, [open, onClose])
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <motion.div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label ?? title} className={`modal pcard ${wide ? 'modal--wide' : ''}`} initial={{ y: 30, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ duration: 0.22 }}>
            <button className="modal__x icon-btn" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
            {title && <h3 className="modal__title">{title}</h3>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export const EmptyState = ({ icon = 'flag', title, text, action }: { icon?: string; title: string; text: string; action?: ReactNode }) => (
  <div className="empty"><PixelIcon name={icon} size={56} /><h3>{title}</h3><p className="muted">{text}</p>{action}</div>
)

export const Skeleton = ({ h = 20, w = '100%' }: { h?: number; w?: string | number }) => <div className="skeleton" style={{ height: h, width: w }} aria-hidden="true" />

export function useMedia(query: string) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setM(mq.matches)
    on(); mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return m
}
