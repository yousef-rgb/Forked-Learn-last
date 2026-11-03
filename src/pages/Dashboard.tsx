import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Bookmark, Flame, Lock, Map as MapIcon, Play, Sparkles, User } from 'lucide-react'
import { ACHIEVEMENTS, COURSES, QUESTS, lessonById, questById } from '../data/curriculum'
import { ButtonLink, Button, Card, CountUp, EmptyState, PixelIcon, ProgressBar, Ring, StatusChip } from '../components/ui'
import { ActivityCalendar, WeeklyChart } from '../components/Charts'
import { Character } from '../components/Character'
import { BotChat } from '../components/bot/BotChat'
import { courseProgress, dailyProgress, learningMinutes, nextLessonOf, overallProgress, questProgress, questStatus, snapshot, type GameState } from '../store/engine'
import { useAuth } from '../store/auth'
import { useGame } from '../store/game'
import { formatLong, greeting } from '../utils/dates'

/** The quest the learner should continue: in-progress first, then the first open quest. */
const pickContinue = (s: GameState) => {
  const playable = QUESTS.filter((q) => !q.soon)
  return playable.find((q) => questStatus(s, q) === 'in-progress') ?? playable.find((q) => questStatus(s, q) === 'available')
}

export default function Dashboard() {
  const { user } = useAuth()
  const { state, xp, level, start } = useGame()
  const nav = useNavigate()
  const snap = snapshot(state)
  const hours = Math.round((learningMinutes(state) / 60) * 10) / 10
  const completedQuests = QUESTS.filter((q) => ['completed', 'mastered'].includes(questStatus(state, q))).length
  const cont = pickContinue(state)
  const contLesson = cont ? lessonById(nextLessonOf(state, cont)) : undefined
  const daily = dailyProgress(state)
  const overall = overallProgress(state)
  const recent = Object.entries(state.completedLessons).filter(([id]) => lessonById(id)).sort((a, b) => b[1].at.localeCompare(a[1].at)).slice(0, 5)
  const upcoming = QUESTS.filter((q) => questStatus(state, q) === 'locked').slice(0, 3)
  const recommended = QUESTS.filter((q) => !q.soon && ['available', 'in-progress'].includes(questStatus(state, q)) && q.id !== cont?.id).slice(0, 3)
  const ach = ACHIEVEMENTS.map((a) => ({ a, r: a.check(snap) })).sort((x, y) => Number(y.r.done) - Number(x.r.done) || y.r.progress - x.r.progress).slice(0, 4)
  const bookmark = state.bookmarks[0]

  const goContinue = () => { if (cont && contLesson) { start(cont.id); nav(`/app/lesson/${contLesson.id}`) } }

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <p className="muted">{formatLong()}</p>
          <h1 className="page__title">{greeting()}, {user?.name}.</h1>
        </div>
        <Card pad={false} className="head-rank"><Character stage={level.level - 1} size={44} label /><div><strong>{level.rank}</strong><span className="muted mono" style={{ fontSize: '0.78rem' }}>Level {level.level}</span></div></Card>
      </header>

      <section aria-label="Statistics" className="stats-row">
        {[
          { label: 'Total XP', node: <CountUp value={xp} />, icon: 'star' },
          { label: 'Level', node: <>{level.level}</>, icon: 'crown' },
          { label: 'Day streak', node: <>{snap.streak}</>, icon: 'flame' },
          { label: 'Quests cleared', node: <CountUp value={completedQuests} />, icon: 'flag' },
          { label: 'Learning hours', node: <>{hours}</>, icon: 'calendar' },
          { label: 'Rank', node: <span className="stat-sm">{level.rank}</span>, icon: 'trophy' },
        ].map((s) => (
          <Card key={s.label} className="tile" pad={false}><PixelIcon name={s.icon} size={30} /><span className="tile__v mono">{s.node}</span><span className="tile__l">{s.label}</span></Card>
        ))}
      </section>

      <section aria-label="Forked AI assistant" className="dash-bot-wrap">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}><span className="eyebrow"><PixelIcon name="brain" size={28} /> Forked AI</span><ButtonLink to="/app/assistant" size="sm">Open full screen</ButtonLink></div>
        <BotChat height={560} />
      </section>

      <div className="dash-grid">
        <Card className="dash-continue" accent="blue">
          <span className="eyebrow">Continue learning</span>
          {cont && contLesson ? (<>
            <h2>{contLesson.title}</h2>
            <p className="muted">{cont.title} · Quest {String(cont.num).padStart(2, '0')}</p>
            <ProgressBar value={questProgress(state, cont).pct} label="Quest progress" />
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span className="mono muted" style={{ fontSize: '0.82rem' }}>{questProgress(state, cont).done}/{questProgress(state, cont).total} lessons · {contLesson.minutes} min</span>
              <Button variant="primary" onClick={goContinue} icon={<Play size={16} />}>{questProgress(state, cont).done ? 'Continue' : 'Start'}</Button>
            </div>
          </>) : <p className="muted">All current quests are cleared. More worlds are on the way.</p>}
        </Card>

        <Card className="dash-daily">
          <div className="row" style={{ justifyContent: 'space-between' }}><span className="eyebrow">Daily quest</span><span className="chip chip--warn">+25 XP</span></div>
          <h3>{daily.def.title}</h3>
          <p className="muted">{daily.def.text}</p>
          <ProgressBar value={daily.pct} label="Daily quest progress" />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="mono" style={{ fontSize: '0.82rem' }}>{Math.min(daily.value, daily.def.target)}/{daily.def.target}</span>
            {daily.claimed ? <span className="chip chip--done">Claimed</span> : <Button size="sm" onClick={goContinue} disabled={!cont}>Go</Button>}
          </div>
        </Card>

        <Card className="dash-overview">
          <h3>Learning overview</h3>
          <div className="rings">
            {[{ l: 'Overall', v: overall.pct, c: 'var(--primary)' }, { l: 'Computer Science', v: courseProgress(state, 'cs').pct, c: 'var(--gdg-green)' }, { l: 'Python', v: courseProgress(state, 'python').pct, c: 'var(--gdg-yellow)' }, { l: 'JavaScript', v: courseProgress(state, 'js').pct, c: 'var(--gdg-red)' }].map((r) => (
              <div key={r.l} className="ring-item"><Ring value={r.v} color={r.c} size={92} /><span>{r.l}</span></div>
            ))}
          </div>
        </Card>

        <Card className="dash-week"><h3>Weekly activity</h3><WeeklyChart state={state} /></Card>
        <Card className="dash-cal"><h3>Learning calendar</h3><ActivityCalendar state={state} compact /></Card>

        <Card className="dash-path">
          <h3>Current learning path</h3>
          <ol className="path-list">
            {COURSES.map((c) => {
              const p = courseProgress(state, c.id)
              return (
                <li key={c.id}>
                  <PixelIcon name={c.icon} size={32} />
                  <div className="path-list__body"><Link to={`/app/course/${c.id}`}><strong>{c.title}</strong></Link><ProgressBar value={p.pct} small label={`${c.title} progress`} /></div>
                  <span className="mono muted" style={{ fontSize: '0.8rem' }}>{p.done}/{p.total}</span>
                </li>
              )
            })}
          </ol>
        </Card>

        <Card className="dash-recent">
          <h3>Recently completed</h3>
          {recent.length === 0 ? <EmptyState icon="sprout" title="Nothing yet" text="Finish your first lesson and it will appear here." action={<Button variant="primary" onClick={goContinue}>Start a lesson</Button>} /> : (
            <ul className="list">
              {recent.map(([id, rec]) => { const l = lessonById(id)!; return (
                <li key={id}><Link to={`/app/lesson/${id}`} className="list__main"><strong>{l.title}</strong><span className="muted">{questById(l.questId)?.title}</span></Link>{rec.perfect && <span className="chip chip--done">Perfect</span>}<span className="mono muted" style={{ fontSize: '0.75rem' }}>{new Date(rec.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></li>
              ) })}
            </ul>
          )}
        </Card>

        <Card className="dash-reco">
          <h3>Recommended quests</h3>
          {recommended.length === 0 ? <p className="muted">Clear more quests to unlock new recommendations.</p> : (
            <ul className="list">
              {recommended.map((q) => (
                <li key={q.id}><Link to="/app/quests" className="list__main"><strong>{q.title}</strong><span className="muted">{q.difficulty} · {q.minutes} min · +{q.xp} XP</span></Link><StatusChip status={questStatus(state, q)} /></li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="dash-unlock">
          <h3>Upcoming unlocks</h3>
          {upcoming.length === 0 ? <p className="muted">Everything available is unlocked.</p> : (
            <ul className="list">
              {upcoming.map((q) => {
                const missing = q.prereqs.map((id) => questById(id)!).filter((p) => questStatus(state, p) !== 'completed' && questStatus(state, p) !== 'mastered')
                return <li key={q.id}><Lock size={16} className="muted" /><div className="list__main"><strong>{q.title}</strong><span className="muted">Needs: {missing.map((m) => m.title).join(', ')}</span></div></li>
              })}
            </ul>
          )}
        </Card>

        <Card className="dash-ach">
          <div className="row" style={{ justifyContent: 'space-between' }}><h3>Achievement highlights</h3><Link to="/app/profile" className="mono" style={{ fontSize: '0.8rem' }}>All badges</Link></div>
          <div className="ach-grid">
            {ach.map(({ a, r }) => (
              <div key={a.id} className={`ach ${r.done ? '' : 'ach--locked'}`}><PixelIcon name={a.icon} size={34} /><div><strong>{a.title}</strong><span className="muted">{r.done ? 'Unlocked' : r.label}</span>{!r.done && <ProgressBar value={r.progress * 100} small label={a.title} />}</div></div>
            ))}
          </div>
        </Card>

        <Card className="dash-quick">
          <h3>Quick actions</h3>
          <div className="quick">
            <ButtonLink to="/app/quests" icon={<MapIcon size={16} />}>Open quest map</ButtonLink>
            <Button onClick={goContinue} icon={<ArrowRight size={16} />} disabled={!cont}>Resume lesson</Button>
            <Button onClick={() => bookmark ? nav(`/app/lesson/${bookmark}`) : nav('/app/courses')} icon={<Bookmark size={16} />}>{bookmark ? 'Open bookmark' : 'Browse courses'}</Button>
            <ButtonLink to="/app/profile" icon={<User size={16} />}>View profile</ButtonLink>
            <ButtonLink to="/app/settings" icon={<Sparkles size={16} />}>Preferences</ButtonLink>
            <span className="chip chip--soft"><Flame size={12} /> {snap.streak}-day streak</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
