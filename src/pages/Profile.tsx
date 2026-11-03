import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { ACHIEVEMENTS, COURSES, QUESTS, lessonById, questById } from '../data/curriculum'
import { Button, Card, CountUp, Modal, PixelIcon, ProgressBar } from '../components/ui'
import { ActivityCalendar } from '../components/Charts'
import { Character, CHARACTERS } from '../components/Character'
import { Field } from '../components/forms'
import { courseProgress, learningMinutes, questStatus, snapshot } from '../store/engine'
import { useAuth } from '../store/auth'
import { useGame } from '../store/game'
import { useToast } from '../store/toast'
import type { Achievement } from '../types'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const { state, xp, level } = useGame()
  const { toast } = useToast()
  const snap = snapshot(state)
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [err, setErr] = useState<{ name?: string; username?: string }>({})
  const [detail, setDetail] = useState<Achievement | null>(null)
  if (!user) return null

  const rows = ACHIEVEMENTS.map((a) => ({ a, r: a.check(snap) }))
  const unlocked = rows.filter((x) => x.r.done).length
  const history = Object.entries(state.completedLessons).filter(([id]) => lessonById(id)).sort((a, b) => b[1].at.localeCompare(a[1].at)).slice(0, 8)
  const cleared = QUESTS.filter((q) => ['completed', 'mastered'].includes(questStatus(state, q)))
  const save = async () => {
    const e: typeof err = {}
    if (name.trim().length < 2) e.name = 'At least 2 characters.'
    if (!/^[a-z0-9_]{3,16}$/i.test(username)) e.username = '3–16 letters, numbers or underscores.'
    setErr(e)
    if (Object.keys(e).length) return
    try {
      await updateProfile({ name: name.trim(), username: username.toLowerCase() })
      setEdit(false); toast({ kind: 'success', title: 'Profile updated' })
    } catch (e2) {
      toast({ kind: 'error', title: 'Could not update your profile', body: e2 instanceof Error ? e2.message : 'Please try again.' })
    }
  }

  return (
    <div className="page">
      <Card className="pf-hero">
        <span className="avatar avatar--lg">{user.name.charAt(0).toUpperCase()}</span>
        <div className="pf-hero__id">
          <h1 className="page__title">{user.name}</h1>
          <span className="muted mono">@{user.username}</span>
          <div className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}><span className="chip chip--blue">LV {level.level}</span><span className="chip chip--soft">{level.rank}</span>{user.goal && <span className="chip chip--soft">{user.goal}</span>}</div>
        </div>
        <div className="pf-hero__xp"><div className="row" style={{ gap: 12 }}><Character stage={level.level - 1} size={64} label /><div style={{ display: 'grid' }}><strong style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem' }}>{level.rank}</strong><span className="muted" style={{ fontSize: '0.78rem' }}>{CHARACTERS[level.level - 1].title}</span></div></div><span className="mono pf-xp"><CountUp value={xp} /> XP</span><ProgressBar value={level.pct} label="Progress to next rank" /><span className="muted" style={{ fontSize: '0.8rem' }}>{level.nextRank ? `${level.toNext} XP to ${level.nextRank}` : 'Max rank'}</span></div>
        <Button icon={<Pencil size={14} />} onClick={() => { setName(user.name); setUsername(user.username); setEdit(true) }}>Edit profile</Button>
      </Card>

      <section className="stats-row" aria-label="Learning statistics">
        {[{ l: 'Lessons done', v: Object.keys(state.completedLessons).length }, { l: 'Quests cleared', v: cleared.length }, { l: 'Current streak', v: snap.streak }, { l: 'Longest streak', v: snap.longestStreak }, { l: 'Hours learned', v: Math.round((learningMinutes(state) / 60) * 10) / 10 }, { l: 'Badges', v: `${unlocked}/${ACHIEVEMENTS.length}` }].map((s) => (
          <Card key={s.l} pad={false} className="tile"><span className="tile__v mono">{s.v}</span><span className="tile__l">{s.l}</span></Card>
        ))}
      </section>

      <div className="pf-grid">
        <Card><h3>Achievement showcase</h3>
          <div className="ach-wall">
            {rows.map(({ a, r }) => (
              <button key={a.id} className={`ach-card ${r.done ? '' : 'is-locked'}`} onClick={() => setDetail(a)} aria-label={`${a.title}, ${r.done ? 'unlocked' : r.label}`}>
                <PixelIcon name={a.icon} size={44} /><strong>{a.title}</strong><span className="muted">{r.done ? 'Unlocked' : r.label}</span>
              </button>
            ))}
          </div>
        </Card>
        <Card><h3>Skills</h3>
          <div className="skills">{COURSES.map((c) => { const p = courseProgress(state, c.id); return (
            <div key={c.id} className="skill"><div className="row" style={{ justifyContent: 'space-between' }}><span className="row"><PixelIcon name={c.icon} size={24} /><strong>{c.title}</strong></span><span className="mono">{p.pct}%</span></div><ProgressBar value={p.pct} small label={c.title} /></div>
          ) })}</div>
          <h3 style={{ marginTop: 24 }}>Activity</h3><ActivityCalendar state={state} compact />
        </Card>
        <Card><h3>Learning history</h3>
          {history.length === 0 ? <p className="muted">Complete a lesson to start your history.</p> : <ul className="list">{history.map(([id, rec]) => { const l = lessonById(id)!; return <li key={id}><div className="list__main"><strong>{l.title}</strong><span className="muted">{questById(l.questId)?.title}</span></div>{rec.perfect && <span className="chip chip--done">Perfect</span>}<span className="mono muted" style={{ fontSize: '0.75rem' }}>{new Date(rec.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></li> })}</ul>}
        </Card>
        <Card><h3>Project portfolio</h3><div className="empty" style={{ padding: 24 }}><PixelIcon name="rocket" size={44} /><p className="muted">The Project Workshop opens in a later release. Finished projects will appear here.</p></div></Card>
      </div>

      <Modal open={edit} onClose={() => setEdit(false)} title="Edit profile">
        <div className="grid" style={{ gap: 14 }}>
          <Field label="Display name" error={err.name}>{(p) => <input {...p} className="input" value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Field label="Username" error={err.username}>{(p) => <input {...p} className="input" value={username} onChange={(e) => setUsername(e.target.value)} />}</Field>
          <div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setEdit(false)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></div>
        </div>
      </Modal>
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title}>
        {detail && (() => { const r = detail.check(snap); return (<div className="reward"><PixelIcon name={detail.icon} size={72} /><p className="lead">{detail.description}</p><span className={`chip ${r.done ? 'chip--done' : 'chip--locked'}`}>{r.done ? `Unlocked +${detail.xp} XP` : `Locked · ${r.label}`}</span>{!r.done && <div style={{ width: '100%' }}><ProgressBar value={r.progress * 100} label={detail.title} /></div>}</div>) })()}
      </Modal>
    </div>
  )
}
