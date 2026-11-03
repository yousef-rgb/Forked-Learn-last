import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const passwordScore = (p: string) => {
  let s = 0
  if (p.length >= 8) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 14) s++
  return s
}
const LABELS = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']

export function Field({ label, error, hint, children, id }: { label: string; error?: string; hint?: string; children: (p: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode; id?: string }) {
  const auto = useId()
  const fid = id ?? auto
  const desc = error ? `${fid}-err` : hint ? `${fid}-hint` : undefined
  return (
    <div className="field">
      <label htmlFor={fid}>{label}</label>
      {children({ id: fid, 'aria-invalid': !!error, 'aria-describedby': desc })}
      {error ? <span id={`${fid}-err`} className="field-error" role="alert">{error}</span> : hint ? <span id={`${fid}-hint`} className="field-hint">{hint}</span> : null}
    </div>
  )
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <div className="pw">
      <input {...props} type={show ? 'text' : 'password'} className="input" />
      <button type="button" className="pw__toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
  )
}

export function StrengthMeter({ password }: { password: string }) {
  const s = password ? passwordScore(password) : 0
  return (
    <div className="strength" aria-live="polite">
      <div className="strength__bars" aria-hidden="true">{[1, 2, 3, 4].map((i) => <span key={i} className={i <= s ? `on on--${s}` : ''} />)}</div>
      <span className="field-hint">{password ? `Password strength: ${LABELS[s]}` : 'Use 8+ characters with upper and lower case, a number and a symbol.'}</span>
    </div>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <span className="spinner" role="status" aria-label={label} />
}
