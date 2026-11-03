
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { CheckCircle2, Code2, Mail } from 'lucide-react'

import { Button, PixelIcon } from '../components/ui'
import {
  EMAIL_RE,
  Field,
  PasswordInput,
  Spinner,
  StrengthMeter,
  passwordScore,
} from '../components/forms'
import { AuthError, TRACKS, type OAuthProvider } from '../services/auth'
import { AuthPending } from '../layouts/AuthLayout'
import { useAuth } from '../store/auth'
import { useToast } from '../store/toast'
import type { CourseId } from '../types'

const messageOf = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback)

/* ───── Social Login ───── */

const Social = () => {
  const { loginWithProvider } = useAuth()
  const { toast } = useToast()
  const [busy, setBusy] = useState<OAuthProvider | null>(null)

  const go = async (provider: OAuthProvider, label: string) => {
    if (busy) return
    setBusy(provider)
    try {
      // On success the browser leaves for the provider, so there is nothing to reset.
      await loginWithProvider(provider)
    } catch (err) {
      toast({ kind: 'error', title: `${label} sign-in failed`, body: messageOf(err, 'Please try again.') })
      setBusy(null)
    }
  }

  return (
    <>
      <div className="or">
        <span>or continue with</span>
      </div>

      <div className="social">
        <button type="button" className="btn" onClick={() => go('google', 'Google')} disabled={busy !== null}>
          {busy === 'google' ? <Spinner /> : <Mail size={18} />}
          {busy === 'google' ? 'Connecting…' : 'Google'}
        </button>

        <button type="button" className="btn" onClick={() => go('github', 'GitHub')} disabled={busy !== null}>
          {busy === 'github' ? <Spinner /> : <Code2 size={18} />}
          {busy === 'github' ? 'Connecting…' : 'GitHub'}
        </button>
      </div>
    </>
  )
}

/* ───── Page Title ───── */

const Title = ({
  icon,
  title,
  text,
}: {
  icon: string
  title: string
  text: string
}) => (
  <div className="auth__title">
    <PixelIcon name={icon} size={48} />
    <h1>{title}</h1>
    <p className="muted">{text}</p>
  </div>
)

/* ───── Login ───── */

export function Login() {
  const { login, resendConfirmation } = useAuth()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const er: typeof errors = {}
    if (!EMAIL_RE.test(email.trim())) er.email = 'Enter a valid email address.'
    if (password.length < 1) er.password = 'Enter your password.'
    setErrors(er)
    setNeedsConfirm(false)
    if (Object.keys(er).length) return

    setBusy(true)
    try {
      await login(email, password)
      toast({ kind: 'success', title: 'Welcome back, adventurer!' })
      // GuestOnly sees the new session and routes to /app, onboarding, or the page you came from.
    } catch (err) {
      const a = err as AuthError
      setNeedsConfirm(a.code === 'email_not_confirmed')
      setErrors({ [a.field ?? 'form']: messageOf(err, 'Could not log in.') })
      setBusy(false)
    }
  }

  const resend = async () => {
    try {
      await resendConfirmation(email)
      toast({ kind: 'success', title: 'Confirmation email sent', body: 'Check your inbox (and spam folder).' })
    } catch (err) {
      toast({ kind: 'error', title: 'Could not send the email', body: messageOf(err, 'Please try again.') })
    }
  }

  return (
    <>
      <Title icon="flag" title="Welcome back" text="Log in to continue your quest." />

      <form onSubmit={submit} noValidate className="grid" style={{ gap: 16 }}>
        {errors.form && (
          <div className="alert alert--error" role="alert">
            {errors.form}
            {needsConfirm && (
              <>
                {' '}
                <button type="button" className="linkbtn" onClick={resend}>Resend confirmation email</button>
              </>
            )}
          </div>
        )}

        <Field label="Email" error={errors.email}>
          {(p) => (
            <input {...p} className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" />
          )}
        </Field>

        <Field label="Password" error={errors.password}>
          {(p) => <PasswordInput {...p} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy ? (<><Spinner />Signing in…</>) : 'Log in'}
        </Button>
      </form>

      <Social />

      <p className="muted">
        New to Forked Learn? <Link to="/signup">Create an account</Link>
      </p>
    </>
  )
}

/* ───── Sign up ───── */

export function Signup() {
  const { signup, resendConfirmation } = useAuth()
  const nav = useNavigate()
  const { toast } = useToast()

  const [f, setF] = useState({ name: '', email: '', password: '', terms: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const set = (k: string, v: string | boolean) => setF((s) => ({ ...s, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (f.name.trim().length < 2) er.name = 'Tell us what to call you (2+ characters).'
    if (!EMAIL_RE.test(f.email.trim())) er.email = 'Enter a valid email address.'
    if (f.password.length < 8) er.password = 'Use at least 8 characters.'
    else if (passwordScore(f.password) < 2) er.password = 'Add upper and lower case letters or a number.'
    if (!f.terms) er.terms = 'Please accept the terms to continue.'
    setErrors(er)
    if (Object.keys(er).length) return

    setBusy(true)
    try {
      const { needsConfirmation } = await signup(f.name.trim(), f.email, f.password)
      if (needsConfirmation) {
        setConfirmationSent(true)
        setBusy(false)
      } else {
        toast({ kind: 'success', title: 'Account created', body: 'Let’s set up your path.' })
        // GuestOnly routes the new session to /onboarding.
      }
    } catch (err) {
      const a = err as AuthError
      setErrors({ [a.field ?? 'form']: messageOf(err, 'Could not create your account.') })
      setBusy(false)
    }
  }

  const resend = async () => {
    try {
      await resendConfirmation(f.email)
      toast({ kind: 'success', title: 'Confirmation email sent', body: 'Check your inbox (and spam folder).' })
    } catch (err) {
      toast({ kind: 'error', title: 'Could not send the email', body: messageOf(err, 'Please try again.') })
    }
  }

  if (confirmationSent) {
    return (
      <>
        <Title icon="heart" title="Check your inbox" text={`We sent a confirmation link to ${f.email.trim()}.`} />
        <div className="alert alert--ok">
          <CheckCircle2 size={18} />
          Confirm your email address to activate your account.
        </div>
        <p className="muted">After confirming you will be signed in automatically. If you opened the link on another device, just log in here.</p>
        <Button variant="primary" size="lg" onClick={() => nav('/login', { replace: true })}>Go to login</Button>
        <button type="button" className="btn" onClick={resend}>Resend email</button>
        <button type="button" className="linkbtn" onClick={() => setConfirmationSent(false)}>Use a different email</button>
      </>
    )
  }

  return (
    <>
      <Title icon="rocket" title="Start your journey" text="Create your adventurer profile. It takes a minute." />

      <form onSubmit={submit} noValidate className="grid" style={{ gap: 16 }}>
        {errors.form && <div className="alert alert--error" role="alert">{errors.form}</div>}

        <Field label="Name" error={errors.name}>
          {(p) => <input {...p} className="input" autoComplete="name" value={f.name} maxLength={60} onChange={(e) => set('name', e.target.value)} />}
        </Field>

        <Field label="Email" error={errors.email}>
          {(p) => <input {...p} className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} />}
        </Field>

        <Field label="Password" error={errors.password}>
          {(p) => <PasswordInput {...p} autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} />}
        </Field>

        <StrengthMeter password={f.password} />

        <div>
          <label className="check">
            <input type="checkbox" checked={f.terms} onChange={(e) => set('terms', e.target.checked)} />
            I agree to the terms and understand how my account data is used.
          </label>
          {errors.terms && <span className="field-error" role="alert">{errors.terms}</span>}
        </div>

        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy ? (<><Spinner />Creating account…</>) : 'Create account'}
        </Button>
      </form>

      <Social />

      <p className="muted">
        Already playing? <Link to="/login">Log in</Link>
      </p>
    </>
  )
}

/* ───── Forgot password ───── */

export function Forgot() {
  const { requestReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await requestReset(email)
      setSent(true)
    } catch (err) {
      setError(messageOf(err, 'Could not send reset email.'))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <>
        <Title icon="heart" title="Check your inbox" text={`If an account exists for ${email.trim()}, a reset link is on its way.`} />
        <div className="alert alert--ok">
          <CheckCircle2 size={18} />
          Open the link in this same browser to choose a new password.
        </div>
        <Link to="/login">Back to log in</Link>
      </>
    )
  }

  return (
    <>
      <Title icon="doc" title="Forgot password?" text="Enter your email and we will send a reset link." />

      <form onSubmit={submit} noValidate className="grid" style={{ gap: 16 }}>
        <Field label="Email" error={error}>
          {(p) => <input {...p} className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>

        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy ? (<><Spinner />Sending…</>) : 'Send reset link'}
        </Button>
      </form>

      <Link to="/login">Back to log in</Link>
    </>
  )
}

/* ───── Reset password ───── */

/** Supabase reports link problems in the query string or the hash (e.g. otp_expired). */
const linkError = (): string | null => {
  const read = (raw: string) => {
    const p = new URLSearchParams(raw.replace(/^[?#]/, ''))
    return p.get('error_description') ?? p.get('error')
  }
  const msg = read(window.location.search) ?? read(window.location.hash)
  return msg ? msg.replace(/\+/g, ' ') : null
}

export function Reset() {
  const { status, resetPassword } = useAuth()
  const nav = useNavigate()
  const { toast } = useToast()

  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  if (status === 'loading') return <AuthPending />

  // The recovery link signs the visitor in with a short-lived session; without one the link is unusable.
  if (status === 'unauthenticated') {
    return (
      <>
        <Title icon="flag" title="Reset link invalid" text={linkError() ?? 'This link is invalid or has expired. Request a new one.'} />
        <Link className="btn btn--primary" to="/forgot-password">Request a new link</Link>
      </>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (p1.length < 8 || passwordScore(p1) < 2) er.p1 = 'Use 8+ characters with a mix of letters and numbers.'
    if (p1 !== p2) er.p2 = 'Passwords do not match.'
    setErrors(er)
    if (Object.keys(er).length) return

    setBusy(true)
    try {
      await resetPassword(p1)
      toast({ kind: 'success', title: 'Password updated', body: 'You are signed in with your new password.' })
      nav('/app', { replace: true })
    } catch (err) {
      setErrors({ form: messageOf(err, 'Could not update password.') })
      setBusy(false)
    }
  }

  return (
    <>
      <Title icon="crown" title="Choose a new password" text="Make it a good one." />

      {errors.form && <div className="alert alert--error" role="alert">{errors.form}</div>}

      <form onSubmit={submit} noValidate className="grid" style={{ gap: 16 }}>
        <Field label="New password" error={errors.p1}>
          {(p) => <PasswordInput {...p} autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} />}
        </Field>

        <StrengthMeter password={p1} />

        <Field label="Confirm password" error={errors.p2}>
          {(p) => <PasswordInput {...p} autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} />}
        </Field>

        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy ? (<><Spinner />Saving…</>) : 'Update password'}
        </Button>
      </form>
    </>
  )
}

/* ───── OAuth / email-confirmation landing page ───── */

export function AuthCallback() {
  const { status, user } = useAuth()

  if (status === 'loading') return <AuthPending />
  if (status === 'authenticated' && user) return <Navigate to={user.track ? '/app' : '/onboarding'} replace />

  return (
    <>
      <Title
        icon="flag"
        title="We could not sign you in"
        text={linkError() ?? 'The sign-in link was invalid, expired, or opened in a different browser than the one you started in.'}
      />
      <p className="muted">If you just confirmed your email, your account is ready: log in to continue.</p>
      <Link className="btn btn--primary" to="/login">Go to log in</Link>
    </>
  )
}

/* ───── Onboarding ───── */

const GOALS = ['Learn the basics', 'Get a CS degree', 'Switch careers', 'Build real projects']
const LEVELS = ['Total beginner', 'I have tried a little', 'I know some code']
const MINUTES = [10, 20, 30, 60]

function Choice<T extends string | number>({ options, value, onPick }: { options: T[]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="choices" role="radiogroup">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          className={`choice ${value === o ? 'is-on' : ''}`}
          onClick={() => onPick(o)}
        >
          {typeof o === 'number' ? `${o} min / day` : o}
        </button>
      ))}
    </div>
  )
}

export function Onboarding() {
  const { user, updateProfile } = useAuth()
  const nav = useNavigate()
  const { toast } = useToast()

  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState(GOALS[0])
  const [level, setLevel] = useState(LEVELS[0])
  const [track, setTrack] = useState<CourseId>('cs')
  const [mins, setMins] = useState(20)
  const [busy, setBusy] = useState(false)

  if (!user) return null // RequireAuth guarantees a user; this only narrows the type.

  const finish = async () => {
    if (busy) return
    setBusy(true)
    try {
      await updateProfile({ goal, level, track, dailyMinutes: mins })
      toast({ kind: 'success', title: `You're all set, ${user.name}!` })
      nav('/app', { replace: true })
    } catch (err) {
      toast({ kind: 'error', title: 'Could not save your profile', body: messageOf(err, 'Please try again.') })
      setBusy(false)
    }
  }

  const titles = ['What is your goal?', 'How much have you coded?', 'Pick your first world', 'Set a daily target']
  const last = titles.length - 1

  return (
    <>
      <div className="onb__dots" role="img" aria-label={`Step ${step + 1} of ${titles.length}`}>
        {titles.map((_, i) => (
          <span key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>

      <Title icon="sprout" title={titles[step]} text="You can change this later in Settings." />

      {step === 0 && <Choice options={GOALS} value={goal} onPick={setGoal} />}
      {step === 1 && <Choice options={LEVELS} value={level} onPick={setLevel} />}
      {step === 2 && (
        <div className="choices" role="radiogroup">
          {TRACKS.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={track === t.id} className={`choice ${track === t.id ? 'is-on' : ''}`} onClick={() => setTrack(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      {step === 3 && <Choice options={MINUTES} value={mins} onPick={setMins} />}

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Button variant="ghost" disabled={busy} onClick={() => (step === 0 ? finish() : setStep(step - 1))}>
          {step === 0 ? 'Skip for now' : 'Back'}
        </Button>

        <Button variant="primary" disabled={busy} onClick={() => (step === last ? finish() : setStep(step + 1))}>
          {busy ? (<><Spinner />Saving…</>) : step === last ? 'Enter Forked Learn' : 'Next'}
        </Button>
      </div>
    </>
  )
}
