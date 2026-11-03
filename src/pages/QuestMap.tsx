import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Clock, Lock, Play, RotateCcw, Sparkles, Swords } from 'lucide-react'
import { LESSONS, WORLDS, lessonById, questById, questsOfWorld } from '../data/curriculum'
import { Button, Card, Modal, PixelIcon, ProgressBar, StatusChip, useMedia } from '../components/ui'
import { isPlayable, lessonDone, nextLessonOf, questProgress, questStatus, type GameState } from '../store/engine'
import { useGame } from '../store/game'
import type { Quest, QuestStatus, World } from '../types'

const posFor = (i: number, n: number) => ({ x: n === 1 ? 50 : 8 + (i * 84) / (n - 1), y: i % 2 === 0 ? 26 : 66 })

function Node({ q, st, pct, onOpen, style }: { q: Quest; st: QuestStatus; pct: number; onOpen: () => void; style?: React.CSSProperties }) {
  const label = `Quest ${q.num}: ${q.title}. ${st.replace('-', ' ')}${pct ? `, ${pct}% complete` : ''}`
  return (
    <button className={`qnode qnode--${st} ${q.boss ? 'qnode--boss' : ''}`} style={style} onClick={onOpen} aria-label={label}>
      <span className="qnode__box">
        {st === 'locked' || st === 'soon' ? <Lock size={q.boss ? 24 : 20} /> : q.boss ? <Swords size={26} /> : <PixelIcon name={q.icon} size={34} />}
        {(st === 'completed' || st === 'mastered') && <span className="qnode__tick"><Check size={14} strokeWidth={4} /></span>}
        {st === 'mastered' && <span className="qnode__star" aria-hidden="true">★</span>}
      </span>
      <span className="qnode__num mono">{q.boss ? 'BOSS' : String(q.num).padStart(2, '0')}</span>
      <span className="qnode__title">{q.title.replace('Boss: ', '')}</span>
      {st === 'in-progress' && <span className="qnode__ring mono">{pct}%</span>}
      {st === 'soon' && <span className="chip chip--soft qnode__soon">Soon</span>}
    </button>
  )
}

function WorldMap({ world, desktop, state, onOpen }: { world: World; desktop: boolean; state: GameState; onOpen: (id: string) => void }) {
  const quests = questsOfWorld(world.id)
  const stats = quests.map((q) => ({ q, st: questStatus(state, q), pct: questProgress(state, q).pct }))
  const playable = stats.filter((s) => !s.q.soon)
  const donePct = playable.length ? Math.round((playable.filter((s) => ['completed', 'mastered'].includes(s.st)).length / playable.length) * 100) : 0
  const pts = quests.map((_, i) => posFor(i, quests.length))

  return (
    <section className={`world world--${world.accent}`} id={world.id} aria-labelledby={`${world.id}-t`}>
      <div className="world__head">
        <PixelIcon name={world.icon} size={56} />
        <div className="world__titles">
          <span className="eyebrow mono">World {String(world.num).padStart(2, '0')}</span>
          <h2 id={`${world.id}-t`}>{world.title}</h2>
          <p className="muted">{world.tagline}</p>
        </div>
        <div className="world__prog"><span className="mono">{donePct}%</span><ProgressBar value={donePct} small label={`${world.title} progress`} /></div>
      </div>

      {desktop ? (
        <div className="wmap">
          <svg className="wmap__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {pts.slice(1).map((p, i) => {
              const a = pts[i]
              const done = ['completed', 'mastered'].includes(stats[i].st)
              const next = stats[i + 1].st
              const ghost = next === 'soon' || next === 'locked'
              return <line key={i} x1={a.x} y1={a.y} x2={p.x} y2={p.y} className={`wmap__line ${done ? 'is-done' : ''} ${ghost ? 'is-ghost' : ''}`} />
            })}
          </svg>
          {stats.map((s, i) => (
            <motion.div key={s.q.id} className="wmap__pos" style={{ left: `${pts[i].x}%`, top: `${pts[i].y}%` }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, duration: 0.25 }}>
              <Node q={s.q} st={s.st} pct={s.pct} onOpen={() => onOpen(s.q.id)} />
            </motion.div>
          ))}
        </div>
      ) : (
        <ol className="vmap">
          {stats.map((s) => (
            <li key={s.q.id} className={`vmap__item vmap__item--${s.st}`}>
              <Node q={s.q} st={s.st} pct={s.pct} onOpen={() => onOpen(s.q.id)} />
              <button className="vmap__card pcard" onClick={() => onOpen(s.q.id)}>
                <span className="row" style={{ justifyContent: 'space-between' }}><strong>{s.q.title}</strong><StatusChip status={s.st} /></span>
                <span className="muted vmap__meta">{s.q.difficulty} · {s.q.minutes} min · +{s.q.xp} XP</span>
                {s.pct > 0 && <ProgressBar value={s.pct} small label="Quest progress" />}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function QuestDialog({ q, state, onClose }: { q: Quest | undefined; state: GameState; onClose: () => void }) {
  const nav = useNavigate()
  const { start } = useGame()
  if (!q) return <Modal open={false} onClose={onClose}>{null}</Modal>
  const st = questStatus(state, q)
  const prog = questProgress(state, q)
  const world = WORLDS.find((w) => w.id === q.worldId)!
  const go = (lessonId: string) => { start(q.id); onClose(); nav(`/app/lesson/${lessonId}`) }
  const missing = q.prereqs.map((id) => questById(id)!)
  return (
    <Modal open onClose={onClose} wide label={`Quest ${q.num}: ${q.title}`}>
      <div className="qd">
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <span className="chip chip--blue">{q.boss ? 'Boss challenge' : `Quest ${String(q.num).padStart(2, '0')}`}</span>
          <span className="chip chip--soft">World {String(world.num).padStart(2, '0')}</span>
          <StatusChip status={st} />
        </div>
        <h2>{q.title}</h2>
        <p className="muted">{q.description}</p>
        <dl className="qd__facts">
          <div><dt>Difficulty</dt><dd>{q.difficulty}</dd></div>
          <div><dt><Clock size={12} /> Time</dt><dd>{q.minutes} min</dd></div>
          <div><dt><Sparkles size={12} /> Reward</dt><dd>+{q.xp} XP</dd></div>
          <div><dt>Complete</dt><dd>{q.soon ? '—' : `${prog.pct}%`}</dd></div>
        </dl>
        {!q.soon && <ProgressBar value={prog.pct} label="Quest completion" />}

        <h3 className="qd__h">Prerequisites</h3>
        {missing.length === 0 ? <p className="muted">None. You can start right away.</p> : (
          <ul className="qd__list">
            {missing.map((p) => { const ps = questStatus(state, p); const ok = ps === 'completed' || ps === 'mastered'; return (
              <li key={p.id}><span className={`qd__dot ${ok ? 'ok' : ''}`}>{ok ? <Check size={12} strokeWidth={4} /> : <Lock size={11} />}</span>{p.title}<span className="muted">{ok ? 'Cleared' : p.soon ? 'Coming soon' : 'Required'}</span></li>
            ) })}
          </ul>
        )}

        {q.lessonIds.length > 0 && (<>
          <h3 className="qd__h">Levels ({q.lessonIds.length})</h3>
          <ul className="qd__list">
            {q.lessonIds.map((id, i) => { const l = lessonById(id)!; const done = lessonDone(state, id); const can = isPlayable(st); return (
              <li key={id}>
                <span className={`qd__dot ${done ? 'ok' : ''}`}>{done ? <Check size={12} strokeWidth={4} /> : <span className="mono" style={{ fontSize: '0.65rem' }}>{i + 1}</span>}</span>
                {can ? <button className="linkbtn qd__link" onClick={() => go(id)}>{l.title}</button> : <span>{l.title}</span>}
                <span className="muted mono" style={{ fontSize: '0.75rem' }}>{l.minutes}m</span>
              </li>
            ) })}
          </ul>
        </>)}

        <div className="row qd__actions">
          {st === 'soon' && <p className="muted">This chapter is on the roadmap but its lessons are not written yet.</p>}
          {st === 'locked' && <p className="muted row"><Lock size={16} /> Clear the prerequisites above to unlock this quest.</p>}
          {(st === 'available' || st === 'in-progress') && <Button variant="primary" size="lg" icon={<Play size={18} />} onClick={() => go(nextLessonOf(state, q))}>{prog.done ? 'Continue quest' : 'Start quest'}</Button>}
          {(st === 'completed' || st === 'mastered') && <Button variant="primary" icon={<RotateCcw size={16} />} onClick={() => go(q.lessonIds[0])}>Review lessons</Button>}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function QuestMap() {
  const { state, xp, level } = useGame()
  const desktop = useMedia('(min-width: 900px)')
  const [params, setParams] = useSearchParams()
  const sel = params.get('quest')
  const quest = sel ? questById(sel) : undefined
  const open = (id: string) => setParams({ quest: id }, { replace: true })
  const close = () => setParams({}, { replace: true })
  useEffect(() => { if (sel && !quest) setParams({}, { replace: true }) }, [sel, quest, setParams])
  const counts = useMemo(() => {
    const c: Record<QuestStatus, number> = { locked: 0, available: 0, 'in-progress': 0, completed: 0, mastered: 0, soon: 0 }
    for (const w of WORLDS) for (const q of questsOfWorld(w.id)) c[questStatus(state, q)]++
    return c
  }, [state])

  return (
    <div className="page">
      <header className="page__head">
        <div><p className="muted">Five worlds. One long adventure.</p><h1 className="page__title">Quest Map</h1></div>
        <Card pad={false} className="head-rank"><PixelIcon name="star" size={30} /><div><strong>{xp.toLocaleString()} XP</strong><span className="muted mono" style={{ fontSize: '0.78rem' }}>Level {level.level} · {level.rank}</span></div></Card>
      </header>

      <div className="legend" aria-label="Legend">
        {([['available', 'Available'], ['in-progress', 'In progress'], ['completed', 'Completed'], ['mastered', 'Mastered'], ['locked', 'Locked'], ['soon', 'Coming soon']] as [QuestStatus, string][]).map(([k, l]) => (
          <span key={k} className="legend__item"><i className={`legend__swatch legend__swatch--${k}`} />{l} <b className="mono">{counts[k]}</b></span>
        ))}
        <span className="muted legend__note">{LESSONS.length} lessons live</span>
      </div>

      <nav className="worldnav" aria-label="Jump to world">
        {WORLDS.map((w) => <a key={w.id} href={`#${w.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(w.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}><span className="mono">{String(w.num).padStart(2, '0')}</span> {w.title.split(' ')[0]}</a>)}
      </nav>

      {WORLDS.map((w, i) => (
        <div key={w.id}>
          {i > 0 && <div className="transition" aria-hidden="true"><span /><b className="mono">▸ Entering World {String(w.num).padStart(2, '0')}</b><span /></div>}
          <WorldMap world={w} desktop={desktop} state={state} onOpen={open} />
        </div>
      ))}

      <QuestDialog q={quest} state={state} onClose={close} />
    </div>
  )
}
