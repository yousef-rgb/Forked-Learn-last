import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/layouts.css'
import './styles/landing.css'
import './styles/app.css'
import './styles/bot.css'
import { isSupabaseConfigured } from './lib/supabaseClient'

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="container" style={{ padding: '96px 24px', textAlign: 'center', display: 'grid', gap: 16, justifyItems: 'center' }} role="alert">
        <h1>Something went wrong</h1>
        <p className="muted">The page hit an unexpected error. Your saved progress is safe.</p>
        <button className="btn btn--primary" onClick={() => window.location.assign('/app')}>Reload the app</button>
      </div>
    )
  }
}

function ConfigMissing() {
  return (
    <div className="container" style={{ padding: '96px 24px', display: 'grid', gap: 12, maxWidth: 640 }} role="alert">
      <h1>Forked Learn is not configured</h1>
      <p className="muted">
        This build has no Supabase settings. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in
        your environment (Vercel → Project → Settings → Environment Variables, or a local <code>.env</code> file), then rebuild.
      </p>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)

if (!isSupabaseConfigured) {
  root.render(<ConfigMissing />)
} else {
  void import('./App').then(({ default: App }) =>
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    ),
  )
}
