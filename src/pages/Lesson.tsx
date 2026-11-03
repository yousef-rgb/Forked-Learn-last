import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Check, ChevronLeft, ChevronRight, Lightbulb, Lock, RotateCcw, Timer, X } from 'lucide-react'
import { LESSONS, lessonById, questById } from '../data/curriculum'
import { Button, Card, EmptyState, Modal, PixelIcon, ProgressBar, useMedia } from '../components/ui'
import { CodeBlock } from '../components/CodeBlock'
import { BitsWidget, SearchWidget } from '../components/Widgets'
import { isPlayable, lessonDone, questProgress, questStatus } from '../store/engine'
import { useGame } from '../store/game'
import { useToast } from '../store/toast'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

function Sidebar({ lessonId, onNavigate }: { lessonId: string; onNavigate?: () => void }) {
  const { state } = useGame()
  const cur = lessonById(lessonId)!
  const quest = questById(cur.questId)!
  const siblings = LESSONS.filter((l) => questById(l.questId)?.course === quest.course)
  const quests = [...new Set(siblings.map((l) => l.questId))].map((id) => questById(id)!)
  return (
    <nav className="lside" aria-label="Course lessons">
      <Link to={`/app/course/${quest.course}`} className="lside__back"><ArrowLeft size={14} /> Course overview</Link>
      {quests.map((q) => {
        const st = questStatus(state, q)
        const ok = isPlayable(st)
        return (
          <div key={q.id} className="lside__group">
            <div className="lside__q"><span className="mono">{q.boss ? '★' : String(q.num).padStart(2, '0')}</span><strong>{q.title.replace('Boss: ', '')}</strong>{!ok && <Lock size={12} />}</div>
            <ul>
              {q.lessonIds.map((id) => {
                const l = lessonById(id)!
                const done = lessonDone(state, id)
                return (
                  <li key={id}>
                    {ok ? <Link to={`/app/lesson/${id}`} onClick={onNavigate} className={`lside__l ${id === lessonId ? 'is-active' : ''}`} aria-current={id === lessonId ? 'page' : undefined}><span className={`qd__dot ${done ? 'ok' : ''}`}>{done && <Check size={12} strokeWidth={4} />}</span>{l.title}</Link> : <span className="lside__l is-locked"><span className="qd__dot"><Lock size={10} /></span>{l.title}</span>}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

export default function Lesson() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { toast } = useToast()
  const { state, complete, start, toggleBookmark, setNote, setExercise, setHints } = useGame()
  const wide = useMedia('(min-width: 1180px)')
  const mid = useMedia('(min-width: 900px)')
  const lesson = lessonById(id)

  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [checked, setChecked] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [navOpen, setNavOpen] = useState(false)
  const [study, setStudy] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [timerOn, setTimerOn] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [active, setActive] = useState('')

  useEffect(() => { setAnswers(Array(lesson?.quiz.length ?? 0).fill(null)); setChecked(false); setAttempts(0); setActive(''); if (lesson) start(lesson.questId) }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!timerOn) return; const t = window.setInterval(() => setSeconds((s) => s + 1), 1000); return () => window.clearInterval(t) }, [timerOn])

  const toc = useMemo(() => lesson ? [{ id: 'briefing', t: 'Mission briefing' }, ...lesson.sections.map((s) => ({ id: slug(s.heading), t: s.heading })), { id: 'analogy', t: 'Real-world analogy' }, ...(lesson.code ? [{ id: 'code', t: 'Code example' }] : []), ...(lesson.widget ? [{ id: 'try', t: 'Interactive diagram' }] : []), { id: 'exercise', t: 'Practice' }, { id: 'check', t: 'Knowledge check' }] : [], [lesson])

  if (!lesson) return <div className="page"><EmptyState icon="flag" title="Lesson not found" text="That lesson does not exist." action={<Button variant="primary" onClick={() => nav('/app/quests')}>Back to the quest map</Button>} /></div>
  const quest = questById(lesson.questId)!
  const qst = questStatus(state, quest)
  if (!isPlayable(qst)) return <div className="page"><EmptyState icon="crown" title="This quest is locked" text={`Clear the prerequisites of "${quest.title}" on the quest map to open this lesson.`} action={<Button variant="primary" onClick={() => nav(`/app/quests?quest=${quest.id}`)}>View prerequisites</Button>} /></div>

  const done = lessonDone(state, lesson.id)
  const idx = LESSONS.findIndex((l) => l.id === lesson.id)
  const courseLessons = LESSONS.filter((l) => questById(l.questId)?.course === quest.course)
  const ci = courseLessons.findIndex((l) => l.id === lesson.id)
  const prev = courseLessons[ci - 1]
  const next = courseLessons[ci + 1]
  const nextOk = next && isPlayable(questStatus(state, questById(next.questId)!))
  const prog = questProgress(state, quest)
  const bookmarked = state.bookmarks.includes(lesson.id)
  const checks = lesson.exercise.steps.map((_, i) => state.exercise[lesson.id]?.[i] ?? false)
  const hintCount = state.hints[lesson.id] ?? 0
  const allAnswered = answers.every((a) => a !== null)
  const correct = lesson.quiz.every((q, i) => answers[i] === q.answer)
  const lessonNote = state.notes[lesson.id] ?? ''
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const submit = () => { setChecked(true); setAttempts((a) => a + 1) }
  const finish = () => { complete(lesson.id, attempts === 1 && correct); if (next && nextOk) toast({ kind: 'info', title: 'Next up', body: next.title }) }
  const retry = () => { setChecked(false); setAnswers(Array(lesson.quiz.length).fill(null)) }
  const scrollTo = (sid: string) => { setActive(sid); document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  const RightRail = (
    <aside className="lrail" aria-label="Lesson tools">
      <Card className="lrail__card"><h4>On this page</h4><ul className="toc">{toc.map((t) => <li key={t.id}><button className={active === t.id ? 'is-active' : ''} onClick={() => scrollTo(t.id)}>{t.t}</button></li>)}</ul></Card>
      <Card className="lrail__card"><h4>Lesson progress</h4><ProgressBar value={prog.pct} label="Quest progress" /><span className="muted" style={{ fontSize: '0.82rem' }}>{prog.done}/{prog.total} lessons in this quest</span></Card>
      <Card className="lrail__card"><h4>Key concepts</h4><div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>{lesson.keyConcepts.map((k) => <span key={k} className="chip chip--blue">{k}</span>)}</div></Card>
      <Card className="lrail__card"><h4>Notes</h4><label className="sr-only" htmlFor="note">Notes for this lesson</label><textarea id="note" className="input" placeholder="Write what you want to remember…" value={lessonNote} onChange={(e) => setNote(lesson.id, e.target.value)} /><span className="field-hint">Saved automatically in this browser.</span></Card>
    </aside>
  )

  return (
    <div className={`lesson ${study ? 'lesson--study' : ''}`}>
      {mid && !study && <div className="lesson__left"><Sidebar lessonId={lesson.id} /></div>}
      <article className="lesson__main">
        <div className="lbar">
          {!mid && <Button size="sm" onClick={() => setNavOpen(true)}>Lessons</Button>}
          <div className="lbar__crumb mono"><Link to="/app/quests">Quests</Link> / {quest.title}</div>
          <div className="lbar__tools">
            {study && <span className="chip chip--blue mono"><Timer size={12} /> {fmt(seconds)}</span>}
            <button className={`icon-btn ${bookmarked ? 'is-on' : ''}`} style={{ width: 40, height: 40 }} onClick={() => { toggleBookmark(lesson.id); toast({ kind: 'info', title: bookmarked ? 'Bookmark removed' : 'Lesson bookmarked' }) }} aria-pressed={bookmarked} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this lesson'}>{bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button>
            <Button size="sm" onClick={() => { setStudy((s) => !s); setTimerOn((s) => !s); if (study) toast({ kind: 'success', title: 'Study session ended', body: `You focused for ${fmt(seconds)}.` }); else setSeconds(0) }}>{study ? 'Exit study mode' : 'Study mode'}</Button>
          </div>
        </div>

        <div className="lcontent">
          <header id="briefing">
            <div className="row" style={{ flexWrap: 'wrap' }}><span className="chip chip--blue">{lesson.boss ? 'Boss challenge' : `Lesson ${ci + 1}`}</span><span className="chip chip--soft">{lesson.minutes} min</span>{done && <span className="chip chip--done"><Check size={12} /> Completed</span>}</div>
            <h1 className="ltitle">{lesson.title}</h1>
            <Card tint className="brief"><PixelIcon name="megaphone" size={40} /><div><span className="eyebrow">Mission briefing</span><p>{lesson.brief}</p></div></Card>
          </header>

          {lesson.sections.map((s) => (
            <section key={s.heading} id={slug(s.heading)}><h2 className="lh">{s.heading}</h2>{s.body.map((p, i) => <p key={i} className="lp">{p}</p>)}</section>
          ))}

          <section id="analogy"><Card accent="yellow" className="analogy"><PixelIcon name="star" size={36} /><div><strong>Real-world analogy</strong><p>{lesson.analogy}</p></div></Card></section>

          {lesson.code && <section id="code"><h2 className="lh">Code example</h2><CodeBlock lang={lesson.code.lang} label={lesson.code.label} source={lesson.code.source} /></section>}
          {lesson.widget && <section id="try"><h2 className="lh">Try it yourself</h2>{lesson.widget === 'bits' ? <BitsWidget /> : <SearchWidget />}</section>}

          <section id="exercise">
            <h2 className="lh">Practice exercise</h2>
            <Card className="exercise">
              <p><strong>{lesson.exercise.prompt}</strong></p>
              <ul className="steps">{lesson.exercise.steps.map((s, i) => (
                <li key={i}><label className="check"><input type="checkbox" checked={!!checks[i]} onChange={() => setExercise(lesson.id, checks.map((c, j) => (j === i ? !c : c)))} />{s}</label></li>
              ))}</ul>
              {hintCount > 0 && <ol className="hints" aria-live="polite">{lesson.exercise.hints.slice(0, hintCount).map((h, i) => <li key={i}><Lightbulb size={14} /> {h}</li>)}</ol>}
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <Button size="sm" icon={<Lightbulb size={14} />} onClick={() => setHints(lesson.id, Math.min(lesson.exercise.hints.length, hintCount + 1))} disabled={hintCount >= lesson.exercise.hints.length}>{hintCount >= lesson.exercise.hints.length ? 'No more hints' : `Ask for a hint (${hintCount}/${lesson.exercise.hints.length})`}</Button>
                <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={() => setConfirmReset(true)}>Reset exercise</Button>
              </div>
            </Card>
          </section>

          <section id="check">
            <h2 className="lh">Knowledge check</h2>
            {lesson.quiz.map((q, qi) => (
              <Card key={qi} className="quiz">
                <p><strong>{qi + 1}. {q.q}</strong></p>
                <div className="quiz__opts" role="radiogroup" aria-label={q.q}>
                  {q.options.map((o, oi) => {
                    const picked = answers[qi] === oi
                    const cls = checked ? (oi === q.answer ? 'right' : picked ? 'wrong' : '') : picked ? 'picked' : ''
                    return <button key={oi} role="radio" aria-checked={picked} disabled={checked && correct} className={`qopt ${cls}`} onClick={() => { if (checked && !correct) { setChecked(false) } setAnswers((a) => a.map((x, j) => (j === qi ? oi : x))) }}>{o}{checked && oi === q.answer && <Check size={16} />}{checked && picked && oi !== q.answer && <X size={16} />}</button>
                  })}
                </div>
                {checked && <p className={`quiz__ex ${answers[qi] === q.answer ? 'ok' : 'bad'}`}>{answers[qi] === q.answer ? 'Correct. ' : 'Not quite. '}{q.explain}</p>}
              </Card>
            ))}
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {done ? <span className="chip chip--done"><Check size={12} /> Lesson already completed</span> : !checked ? <Button variant="primary" onClick={submit} disabled={!allAnswered}>{allAnswered ? 'Check answers' : 'Answer every question'}</Button> : correct ? <Button variant="primary" icon={<Check size={16} />} onClick={finish}>Mark as complete{attempts === 1 ? ' (perfect!)' : ''}</Button> : <><span className="chip chip--warn">Some answers need another look</span><Button onClick={retry}>Try again</Button></>}
            </div>
          </section>

          <nav className="lnav" aria-label="Lesson navigation">
            {prev ? <Button onClick={() => nav(`/app/lesson/${prev.id}`)} icon={<ChevronLeft size={16} />}>Previous</Button> : <span />}
            {next ? <Button variant={done ? 'primary' : 'default'} disabled={!nextOk} onClick={() => nav(`/app/lesson/${next.id}`)}>{nextOk ? 'Next lesson' : 'Next quest locked'} <ChevronRight size={16} /></Button> : <Button variant="primary" onClick={() => nav('/app/quests')}>Back to quest map <ArrowRight size={16} /></Button>}
          </nav>
        </div>
      </article>
      {wide && !study && <div className="lesson__right">{RightRail}</div>}

      {!mid && (
        <Modal open={navOpen} onClose={() => setNavOpen(false)} title="Lessons" wide><div className="sheet"><Sidebar lessonId={lesson.id} onNavigate={() => setNavOpen(false)} /></div></Modal>
      )}
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset this exercise?">
        <p className="muted">Your checklist and revealed hints for this lesson will be cleared. Notes and completion stay.</p>
        <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}><Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button><Button variant="primary" onClick={() => { setExercise(lesson.id, lesson.exercise.steps.map(() => false)); setHints(lesson.id, 0); setConfirmReset(false); toast({ kind: 'success', title: 'Exercise reset' }) }}>Reset</Button></div>
      </Modal>
      {!wide && !study && mid && <div className="lesson__below">{RightRail}</div>}
      {!mid && !study && <div className="lesson__below">{RightRail}</div>}
      <span className="sr-only">{idx}</span>
    </div>
  )
}
