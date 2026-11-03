import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Check, Clock, Lock, Play } from 'lucide-react'
import { BUILT_TOPICS, COURSES, courseById, lessonById, questsOfCourse } from '../data/curriculum'
import { Button, Card, PixelIcon, ProgressBar, Ring, StatusChip } from '../components/ui'
import { courseProgress, lessonDone, nextLessonOf, questProgress, questStatus, isPlayable } from '../store/engine'
import { useGame } from '../store/game'

export function CourseList() {
  const { state } = useGame()
  return (
    <div className="page">
      <header className="page__head"><div><p className="muted">Three paths, one quest map.</p><h1 className="page__title">Courses</h1></div></header>
      <div className="grid grid--3">
        {COURSES.map((c) => {
          const p = courseProgress(state, c.id)
          const qs = questsOfCourse(c.id).filter((q) => !q.soon)
          const mins = qs.reduce((n, q) => n + q.minutes, 0)
          return (
            <Card key={c.id} accent={c.accent} hover className="path">
              <PixelIcon name={c.icon} size={60} />
              <h3>{c.title}</h3>
              <p className="muted">{c.tagline}</p>
              <ProgressBar value={p.pct} label={`${c.title} progress`} />
              <div className="row" style={{ flexWrap: 'wrap' }}><span className="chip chip--soft">{p.done}/{p.total} lessons</span><span className="chip chip--soft">~{Math.round(mins / 60)}h</span></div>
              <Link to={`/app/course/${c.id}`} className="path__go">{p.done ? 'Open course' : 'View course'} <ArrowRight size={16} /></Link>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function CourseOverview() {
  const { id } = useParams()
  const nav = useNavigate()
  const { state, start } = useGame()
  if (!COURSES.some((c) => c.id === id)) return <Navigate to="/app/courses" replace />
  const c = courseById(id as never)
  const p = courseProgress(state, c.id)
  const qs = questsOfCourse(c.id)
  const live = qs.filter((q) => !q.soon)
  const mins = live.reduce((n, q) => n + q.minutes, 0)
  const next = live.find((q) => ['in-progress', 'available'].includes(questStatus(state, q)))
  const built = BUILT_TOPICS[c.id]

  return (
    <div className="page">
      <header className="course-hero">
        <PixelIcon name={c.icon} size={80} />
        <div>
          <span className="eyebrow mono">Course</span>
          <h1 className="page__title">{c.title}</h1>
          <p className="lead">{c.description}</p>
          <div className="row" style={{ flexWrap: 'wrap', marginTop: 12 }}>
            <span className="chip chip--soft"><Clock size={12} /> ~{Math.round(mins / 60)}h of lessons live</span>
            <span className="chip chip--soft">{p.total} lessons</span>
            <span className="chip chip--soft">{c.roadmap.length} topics planned</span>
          </div>
        </div>
        <Card className="course-hero__prog"><Ring value={p.pct} /><div><strong>Your progress</strong><span className="muted">{p.done} of {p.total} lessons</span></div>
          {next ? <Button variant="primary" icon={<Play size={16} />} onClick={() => { start(next.id); nav(`/app/lesson/${nextLessonOf(state, next)}`) }}>{p.done ? 'Continue' : 'Start course'}</Button> : p.pct === 100 ? <span className="chip chip--done">Course complete</span> : <span className="chip chip--locked">Prerequisites needed</span>}
        </Card>
      </header>

      <div className="course-grid">
        <div className="course-main">
          <Card className="intro">
            <div className="row"><span className="avatar">Q</span><div><strong>{c.instructor.name}</strong><span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>{c.instructor.role}</span></div></div>
            <p>{c.instructor.intro}</p>
          </Card>

          <h2 className="h-sm">Curriculum</h2>
          <div className="curriculum">
            {qs.map((q) => {
              const st = questStatus(state, q); const pr = questProgress(state, q)
              return (
                <Card key={q.id} pad={false} className={`chapter chapter--${st}`}>
                  <div className="chapter__head">
                    <span className="mono chapter__n">{q.boss ? '★' : String(q.num).padStart(2, '0')}</span>
                    <div className="chapter__t"><strong>{q.title}</strong><span className="muted">{q.description}</span></div>
                    <StatusChip status={st} />
                  </div>
                  {q.lessonIds.length > 0 ? (
                    <ul className="chapter__lessons">
                      {q.lessonIds.map((lid) => { const l = lessonById(lid)!; const done = lessonDone(state, lid); const ok = isPlayable(st); return (
                        <li key={lid}>
                          <span className={`qd__dot ${done ? 'ok' : ''}`}>{done ? <Check size={12} strokeWidth={4} /> : ok ? null : <Lock size={11} />}</span>
                          {ok ? <Link to={`/app/lesson/${lid}`}>{l.title}</Link> : <span className="muted">{l.title}</span>}
                          <span className="mono muted" style={{ fontSize: '0.75rem' }}>{l.minutes} min</span>
                        </li>
                      ) })}
                    </ul>
                  ) : <p className="muted chapter__soon">Lessons for this chapter are on the roadmap.</p>}
                  {pr.total > 0 && <div style={{ padding: '0 20px 16px' }}><ProgressBar value={pr.pct} small label="Chapter progress" /></div>}
                </Card>
              )
            })}
          </div>

          <h2 className="h-sm">Full topic roadmap</h2>
          <p className="muted" style={{ marginBottom: 12 }}>Highlighted topics have lessons today. The rest are planned for the course.</p>
          <div className="roadmap">{c.roadmap.map((t, i) => <span key={t} className={`topic ${built.includes(t) ? 'topic--on' : ''}`}><span className="mono">{String(i + 1).padStart(2, '0')}</span>{t}</span>)}</div>
        </div>

        <aside className="course-side">
          <Card><h3>You will learn to</h3><ul className="ticks">{c.objectives.map((o) => <li key={o}><Check size={14} strokeWidth={4} />{o}</li>)}</ul></Card>
          <Card><h3>Skills acquired</h3><div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>{c.skills.map((s) => <span key={s} className="chip chip--blue">{s}</span>)}</div></Card>
          <Card><h3>Prerequisites</h3><ul className="ticks">{c.prerequisites.map((o) => <li key={o}><Check size={14} strokeWidth={4} />{o}</li>)}</ul></Card>
        </aside>
      </div>
    </div>
  )
}
