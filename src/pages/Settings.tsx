import { useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Button, Card, Modal } from '../components/ui'
import { useTheme, type ThemePref } from '../store/theme'
import { useAuth } from '../store/auth'
import { useGame } from '../store/game'
import { useToast } from '../store/toast'

const KEY = 'quest.settings'
interface Local { sound: boolean; language: string; reminders: boolean; achNotes: boolean; weekly: boolean; show: boolean }
const defaults: Local = { sound: false, language: 'en', reminders: true, achNotes: true, weekly: false, show: true }
const load = (): Local => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return defaults } }

function Toggle({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="setrow">
      <div><label htmlFor={id}><strong>{label}</strong></label>{hint && <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>{hint}</span>}</div>
      <button id={id} role="switch" aria-checked={checked} className={`switch ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}><span /></button>
    </div>
  )
}

export default function Settings() {
  const { theme, setTheme, motion, setMotion, fontScale, setFontScale } = useTheme()
  const { reset } = useGame()
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const [s, setS] = useState<Local>(load)
  const [confirm, setConfirm] = useState(false)
  const set = <K extends keyof Local>(k: K, v: Local[K]) => setS((p) => { const n = { ...p, [k]: v }; try { localStorage.setItem(KEY, JSON.stringify(n)) } catch { /* ignore */ } return n })
  const setDaily = async (m: number) => {
    try { await updateProfile({ dailyMinutes: m }); toast({ kind: 'success', title: 'Daily goal saved' }) }
    catch (err) { toast({ kind: 'error', title: 'Could not save your daily goal', body: err instanceof Error ? err.message : 'Please try again.' }) }
  }
  const themes: { id: ThemePref; label: string; icon: typeof Sun }[] = [{ id: 'light', label: 'Light', icon: Sun }, { id: 'dark', label: 'Dark', icon: Moon }, { id: 'system', label: 'System', icon: Monitor }]

  return (
    <div className="page page--narrow">
      <header className="page__head"><div><p className="muted">Appearance and preferences are saved in this browser. Your progress is saved to your account.</p><h1 className="page__title">Settings</h1></div></header>

      <Card className="set"><h2 className="h-sm">Appearance</h2>
        <div className="seg seg--lg" role="radiogroup" aria-label="Theme">{themes.map((t) => <button key={t.id} role="radio" aria-checked={theme === t.id} className={theme === t.id ? 'is-on' : ''} onClick={() => setTheme(t.id)}><t.icon size={16} /> {t.label}</button>)}</div>
        <div className="setrow"><div><strong>Font size</strong><span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>Scales all text across the app.</span></div>
          <div className="seg" role="radiogroup" aria-label="Font size">{[{ l: 'A', v: 0.9, a: 'Small' }, { l: 'A', v: 1, a: 'Default' }, { l: 'A', v: 1.15, a: 'Large' }].map((o, i) => <button key={o.a} role="radio" aria-label={o.a} aria-checked={fontScale === o.v} className={fontScale === o.v ? 'is-on' : ''} style={{ fontSize: 12 + i * 3 }} onClick={() => setFontScale(o.v)}>{o.l}</button>)}</div></div>
      </Card>

      <Card className="set"><h2 className="h-sm">Accessibility</h2>
        <Toggle id="motion" label="Reduce animations" hint="Turns off page transitions and motion effects." checked={motion === 'reduced'} onChange={(v) => setMotion(v ? 'reduced' : 'full')} />
        <Toggle id="sound" label="Sound effects" hint="Preference is saved; audio effects arrive in a later release." checked={s.sound} onChange={(v) => set('sound', v)} />
      </Card>

      <Card className="set"><h2 className="h-sm">Language</h2>
        <div className="setrow"><div><label htmlFor="lang"><strong>Interface language</strong></label><span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>Only English is translated today. Your choice is remembered for later.</span></div>
          <select id="lang" className="input" style={{ width: 160 }} value={s.language} onChange={(e) => { set('language', e.target.value); if (e.target.value !== 'en') toast({ kind: 'info', title: 'Saved. Translations are not available yet.' }) }}><option value="en">English</option><option value="ar">العربية</option><option value="fr">Français</option></select></div>
      </Card>

      <Card className="set"><h2 className="h-sm">Learning preferences</h2>
        <div className="setrow"><div><label htmlFor="daily"><strong>Daily goal</strong></label><span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>Minutes you plan to learn each day.</span></div>
          <select id="daily" className="input" style={{ width: 140 }} value={user?.dailyMinutes ?? 20} onChange={(e) => void setDaily(Number(e.target.value))}>{[10, 20, 30, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select></div>
        <Toggle id="show" label="Show hints by default" checked={s.show} onChange={(v) => set('show', v)} />
      </Card>

      <Card className="set"><h2 className="h-sm">Notifications</h2>
        <Toggle id="rem" label="Daily quest reminders" hint="Preference is saved; reminders are not sent yet." checked={s.reminders} onChange={(v) => set('reminders', v)} />
        <Toggle id="ach" label="Achievement and level-up alerts" checked={s.achNotes} onChange={(v) => set('achNotes', v)} />
        <Toggle id="week" label="Weekly progress summary" hint="Preference is saved; summaries are not sent yet." checked={s.weekly} onChange={(v) => set('weekly', v)} />
      </Card>

      <Card className="set"><h2 className="h-sm">Account &amp; progress</h2>
        <p className="muted">Signed in as <strong>{user?.email}</strong>. Your progress is saved to your account and follows you to any device.</p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Button onClick={() => setConfirm(true)}>Reset progress</Button>
        </div>
      </Card>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Reset all progress?">
        <p className="muted">This permanently clears XP, completed lessons, notes and bookmarks on your account, on every device. It cannot be undone.</p>
        <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="primary" onClick={() => { reset(); toast({ kind: 'success', title: 'Progress reset' }); setConfirm(false) }}>Reset everything</Button></div>
      </Modal>
    </div>
  )
}
