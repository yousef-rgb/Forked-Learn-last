import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, Lock, Play, Sparkles } from 'lucide-react'
import { ACHIEVEMENTS, BUILT_TOPICS, COURSES, LESSONS, QUESTS, WORLDS, questsOfCourse } from '../data/curriculum'
import { RANKS } from '../store/engine'
import { ButtonLink, Button, Card, CountUp, PixelIcon, ProgressBar, Reveal, SectionHead, Grass } from '../components/ui'
import { CodeBlock } from '../components/CodeBlock'
import { Character } from '../components/Character'
import { useAuth } from '../store/auth'

/* ───── Hero ───── */
const MINI = [
  { n: 1, title: 'Hello, World', xp: 40 }, { n: 2, title: 'Variables', xp: 40 }, { n: 3, title: 'Loops', xp: 60 },
  { n: 4, title: 'Functions', xp: 60 }, { n: 5, title: 'Boss', xp: 150 },
]
function MiniPath() {
  const [cleared, setCleared] = useState(1)
  return (
    <div className="mini" role="group" aria-label="Quest progression preview">
      <div className="mini__track">
        {MINI.map((m, i) => {
          const state = i < cleared ? 'done' : i === cleared ? 'open' : 'locked'
          return (
            <div key={m.n} className="mini__item">
              <button className={`mini__node mini__node--${state}`} disabled={state !== 'open'} onClick={() => setCleared((c) => Math.min(MINI.length, c + 1))} aria-label={`Quest ${m.n}: ${m.title}, ${state === 'done' ? 'completed' : state === 'open' ? 'click to clear' : 'locked'}`}>
                {state === 'done' ? <Check size={18} /> : state === 'locked' ? <Lock size={14} /> : <Play size={14} />}
              </button>
              <span className="mini__label mono">{String(m.n).padStart(2, '0')}</span>
              {i < MINI.length - 1 && <span className={`mini__line ${i < cleared - 1 ? 'is-on' : ''}`} />}
            </div>
          )
        })}
      </div>
      <div className="mini__foot">
        <span className="mono">{cleared >= MINI.length ? 'World cleared!' : `Next: ${MINI[cleared].title} · +${MINI[cleared].xp} XP`}</span>
        {cleared >= MINI.length ? <button className="linkbtn" onClick={() => setCleared(1)}>Replay</button> : <span className="muted" style={{ fontSize: '0.78rem' }}>Click the glowing node</span>}
      </div>
    </div>
  )
}

function Hero() {
  const { user } = useAuth()
  return (
    <section className="hero">
      <div className="container hero__grid">
        <div className="hero__copy">
          <Reveal><div className="qbadge hero__badge"><div className="qbadge__top"><span>▪ QUEST</span><span className="qbadge__num">01</span></div><div className="qbadge__title">Start Your Journey</div></div></Reveal>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            LEARN TO CODE.<br /><span className="hero__accent">THINK LIKE AN ENGINEER.</span>
          </motion.h1>
          <motion.p className="lead hero__lead" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }}>
            Your programming journey starts here. Explore computer science, master programming fundamentals, solve challenges, and build real projects.
          </motion.p>
          <div className="row hero__cta">
            <ButtonLink to={user ? '/app' : '/signup'} variant="primary" size="lg" icon={<ArrowRight size={18} />}>{user ? 'Continue your quest' : 'Start Your Journey'}</ButtonLink>
            <ButtonLink to="/#paths" size="lg">Explore Courses</ButtonLink>
          </div>
          <MiniPath />
        </div>
        <div className="hero__art" aria-hidden="true">
          <img src="/pixel/cloud.png" className="pixelated hero__cloud hero__cloud--a" alt="" />
          <img src="/pixel/cloud.png" className="pixelated hero__cloud hero__cloud--b" alt="" />
          <img src="/pixel/island.png" className="pixelated hero__island" alt="" />
          <div className="hero__code hero__code--py pcard"><span className="chip chip--warn">Python</span><pre className="mono">{`for xp in range(3):\n    level_up()`}</pre></div>
          <div className="hero__code hero__code--js pcard"><span className="chip chip--blue">JavaScript</span><pre className="mono">{`const quest = () => "go";`}</pre></div>
          <img src="/pixel/mascot.png" className="pixelated hero__mascot" alt="" />
        </div>
      </div>
      <Grass />
    </section>
  )
}

/* ───── How it works ───── */
const STEPS = [
  { icon: 'flag', t: 'Pick a quest', d: 'Every topic is a quest on a map, with prerequisites, time estimates and XP rewards.', a: 'blue' as const },
  { icon: 'doc', t: 'Read the briefing', d: 'Short missions with analogies, code and diagrams. No walls of text.', a: 'red' as const },
  { icon: 'checklist', t: 'Clear the check', d: 'Try the exercise, then answer a knowledge check. Perfect scores earn bonus XP.', a: 'yellow' as const },
  { icon: 'trophy', t: 'Level up', d: 'Earn XP, unlock new quests, win achievements and defeat bosses.', a: 'green' as const },
]

/* ───── Interactive quest preview (section 7) ───── */
function QuestPreview() {
  const quests = QUESTS.filter((q) => q.worldId === 'w2' && !q.soon)
  const [done, setDone] = useState<string[]>([quests[0].id])
  const [sel, setSel] = useState(quests[1].id)
  const [xp, setXp] = useState(120)
  const status = (id: string, i: number) => (done.includes(id) ? 'done' : i === 0 || done.includes(quests[i - 1].id) ? 'open' : 'locked')
  const q = quests.find((x) => x.id === sel)!
  const qi = quests.indexOf(q)
  const st = status(q.id, qi)
  return (
    <div className="qprev">
      <div className="qprev__map" role="list">
        {quests.map((x, i) => {
          const s = status(x.id, i)
          return (
            <button key={x.id} role="listitem" className={`qprev__node qprev__node--${s} ${sel === x.id ? 'is-sel' : ''}`} onClick={() => setSel(x.id)}>
              <span className="mono qprev__num">{String(x.num).padStart(2, '0')}</span>
              <span className="qprev__name">{x.title.replace('Boss: ', '')}</span>
              <span className="chip" style={{ fontSize: '0.62rem' }}>{s === 'done' ? 'Cleared' : s === 'open' ? 'Open' : 'Locked'}</span>
            </button>
          )
        })}
      </div>
      <Card className="qprev__detail">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="chip chip--blue">QUEST {String(q.num).padStart(2, '0')}</span>
          <span className="mono" style={{ fontWeight: 700 }}><CountUp value={xp} /> XP</span>
        </div>
        <h3>{q.title}</h3>
        <p className="muted">{q.description}</p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <span className="chip chip--soft">{q.difficulty}</span><span className="chip chip--soft">{q.minutes} min</span><span className="chip chip--soft">+{q.xp} XP</span>
        </div>
        <AnimatePresence mode="wait">
          {st === 'done' ? (
            <motion.div key="d" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="chip chip--done" style={{ justifySelf: 'start' }}><Check size={14} /> Cleared</motion.div>
          ) : st === 'open' ? (
            <Button key="o" variant="primary" onClick={() => { setDone((d) => [...d, q.id]); setXp((x) => x + q.xp); const next = quests[qi + 1]; if (next) setSel(next.id) }} icon={<Sparkles size={16} />}>Clear this quest (demo)</Button>
          ) : (
            <p key="l" className="muted row"><Lock size={16} /> Clear the previous quest to unlock.</p>
          )}
        </AnimatePresence>
        {done.length === quests.length && <Button variant="ghost" size="sm" onClick={() => { setDone([quests[0].id]); setXp(120); setSel(quests[1].id) }}>Reset preview</Button>}
      </Card>
    </div>
  )
}

/* ───── Featured challenge: a real, working "Predict the output" ───── */
function PredictDemo() {
  const [pick, setPick] = useState<number | null>(null)
  const opts = ['3', '5', '"23"', 'Error']
  return (
    <Card className="predict" accent="blue">
      <div className="row" style={{ justifyContent: 'space-between' }}><span className="chip chip--blue">Predict the output</span><span className="chip chip--soft">+20 XP</span></div>
      <CodeBlock lang="javascript" label="challenge.js" source={'let a = "2";\nlet b = 3;\nconsole.log(a + b);'} />
      <div className="predict__opts" role="radiogroup" aria-label="Choose the output">
        {opts.map((o, i) => (
          <button key={o} role="radio" aria-checked={pick === i} className={`predict__opt ${pick === i ? (i === 2 ? 'is-right' : 'is-wrong') : ''}`} onClick={() => setPick(i)}>{o}</button>
        ))}
      </div>
      <p className={`predict__fb ${pick === 2 ? 'ok' : ''}`} aria-live="polite">
        {pick === null ? 'Choose an answer.' : pick === 2 ? 'Correct! + joins text with numbers by converting 3 to "3".' : 'Not quite. When one side of + is a string, JavaScript concatenates. Try again.'}
      </p>
    </Card>
  )
}

const PROJECTS = [
  { icon: 'calendar', t: 'Calculator', d: 'Operators, functions and input handling.', l: 'Beginner' },
  { icon: 'star', t: 'Number Guessing Game', d: 'Loops, conditions and randomness.', l: 'Beginner' },
  { icon: 'checklist', t: 'To-Do App', d: 'State, events and persistence.', l: 'Intermediate' },
  { icon: 'doc', t: 'Quiz App', d: 'Arrays of objects and scoring logic.', l: 'Intermediate' },
  { icon: 'globe', t: 'Weather App', d: 'APIs, JSON and async code.', l: 'Advanced' },
  { icon: 'rocket', t: 'Interactive Dashboard', d: 'Capstone: data, charts and design.', l: 'Advanced' },
]

const FAQ = [
  { q: 'Do I need to know how to code?', a: 'No. World 01 starts from "what is a computer?" and the first Python and JavaScript quests assume nothing.' },
  { q: 'Is Forked Learn free?', a: 'Yes. Creating an account is free and there are no payments. You can sign up with your email, Google or GitHub.' },
  { q: 'How does XP work?', a: 'Each lesson earns 40 XP, with +15 for a perfect knowledge check. Finishing a quest adds its bonus, and achievements and daily quests add more. Your level comes from total XP, so the numbers always add up.' },
  { q: 'Where is my progress saved?', a: 'In your account, so it follows you to any device. A backup copy is kept in your browser while you are signed in, and Settings → Reset progress clears it.' },
  { q: 'What is not built yet?', a: 'The code playground, challenge arena and project workshop are planned next. The quest map shows later chapters as "Coming soon" rather than pretending they exist.' },
]

function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="faq">
      {FAQ.map((f, i) => (
        <Card key={f.q} pad={false} className="faq__item">
          <button className="faq__q" aria-expanded={open === i} aria-controls={`faq-${i}`} onClick={() => setOpen(open === i ? null : i)}>
            <span>{f.q}</span><ChevronDown size={20} style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
          </button>
          <AnimatePresence initial={false}>
            {open === i && <motion.div id={`faq-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}><p className="faq__a muted">{f.a}</p></motion.div>}
          </AnimatePresence>
        </Card>
      ))}
    </div>
  )
}

function Roadmap({ course }: { course: 'python' | 'js' }) {
  const c = COURSES.find((x) => x.id === course)!
  const built = BUILT_TOPICS[course]
  return (
    <div className="roadmap">
      {c.roadmap.map((t, i) => (
        <span key={t} className={`topic ${built.includes(t) ? 'topic--on' : ''}`}><span className="mono">{String(i + 1).padStart(2, '0')}</span>{t}</span>
      ))}
    </div>
  )
}

function Gamification() {
  const [xp, setXp] = useState(0)
  const rank = [...RANKS].reverse().find((r) => xp >= r.min)!
  const next = RANKS[RANKS.findIndex((r) => r.name === rank.name) + 1]
  const pct = next ? ((xp - rank.min) / (next.min - rank.min)) * 100 : 100
  return (
    <div className="game">
      <Card className="game__xp">
        <span className="chip chip--blue">Try it</span>
        <div className="game__num mono"><CountUp value={xp} /> <small>XP</small></div>
        <div className="row" style={{ gap: 12 }}><Character stage={RANKS.findIndex((r) => r.name === rank.name)} size={72} label /><strong className="game__rank">{rank.name}</strong></div>
        <ProgressBar value={pct} label="Progress to next rank" />
        <span className="muted" style={{ fontSize: '0.85rem' }}>{next ? `${next.min - xp} XP to ${next.name}` : 'Neonz. The final form. Nothing left to prove!'}</span>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Button variant="primary" size="sm" onClick={() => setXp((x) => Math.min(3500, x + 40))}>+40 XP lesson</Button>
          <Button size="sm" onClick={() => setXp((x) => Math.min(3500, x + 250))}>+250 XP quest</Button>
          <Button variant="ghost" size="sm" onClick={() => setXp(0)}>Reset</Button>
        </div>
      </Card>
      <div className="ranks">
        {RANKS.map((r, i) => (
          <div key={r.name} className={`rank ${xp >= r.min ? 'is-on' : ''}`}><Character stage={i} size={32} locked={xp < r.min} /><strong>{r.name}</strong><span className="muted mono">{r.min} XP</span></div>
        ))}
      </div>
      <div className="badges">
        {ACHIEVEMENTS.slice(0, 8).map((a, i) => (
          <div key={a.id} className={`badge ${i < 3 ? '' : 'badge--locked'}`} title={a.description}>
            <PixelIcon name={a.icon} size={36} /><span>{a.title}</span>{i >= 3 && <Lock size={12} />}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Landing() {
  const totalXp = QUESTS.reduce((n, q) => n + q.xp, 0) + LESSONS.length * 40
  const topics = COURSES.reduce((n, c) => n + c.roadmap.length, 0)
  const cs = COURSES[0]
  const csQuests = questsOfCourse('cs').filter((q) => !q.boss)
  return (
    <>
      <Hero />

      <section className="section" id="how">
        <div className="container">
          <SectionHead num="02" label="How Forked Learn works" icon="flag" title="Learning, but make it a game." text="Four moves repeat across every lesson. Simple enough to start in a minute, deep enough to keep going." />
          <div className="grid grid--4">
            {STEPS.map((s, i) => (
              <Reveal key={s.t} delay={i * 0.07}><Card accent={s.a} hover className="step"><span className="step__n mono">{String(i + 1).padStart(2, '0')}</span><PixelIcon name={s.icon} size={52} /><h3>{s.t}</h3><p className="muted">{s.d}</p></Card></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--alt" id="paths">
        <div className="container">
          <SectionHead num="03" label="Explore learning paths" icon="globe" title="Three paths. One journey." text="Start with the foundations, then branch into the language that excites you. Each path is a world on the quest map." />
          <div className="grid grid--3">
            {COURSES.map((c, i) => {
              const lessons = LESSONS.filter((l) => QUESTS.find((q) => q.id === l.questId)?.course === c.id).length
              return (
                <Reveal key={c.id} delay={i * 0.08}>
                  <Card accent={c.accent} hover className="path">
                    <PixelIcon name={c.icon} size={64} />
                    <span className="eyebrow mono">World 0{i + 1}</span>
                    <h3>{c.title}</h3>
                    <p className="muted">{c.tagline}</p>
                    <div className="row path__meta"><span className="chip chip--soft">{lessons} lessons live</span><span className="chip chip--soft">{c.roadmap.length} topics</span></div>
                    <Link to="/signup" className="path__go">Begin this path <ArrowRight size={16} /></Link>
                  </Card>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead num="04" label="Computer science foundations" icon="brain" title="Before the code, the ideas." text={cs.description} />
          <div className="grid grid--2">
            {csQuests.map((q, i) => (
              <Reveal key={q.id} delay={i * 0.06}>
                <Card hover className="cs">
                  <div className="row" style={{ justifyContent: 'space-between' }}><span className="chip chip--blue">Module {String(q.num).padStart(2, '0')}</span><span className="muted mono" style={{ fontSize: '0.8rem' }}>{q.lessonIds.length} lessons · {q.minutes} min</span></div>
                  <h3>{q.title}</h3><p className="muted">{q.description}</p>
                  <div className="cs__topics">{q.lessonIds.map((id) => <span key={id} className="chip chip--soft">{LESSONS.find((l) => l.id === id)!.title.split(':')[0].split(' and ')[0]}</span>)}</div>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <SectionHead num="05" label="Python journey" icon="sprout" title="Python, one spell at a time." text={`${COURSES[1].roadmap.length} topics from print("hello") to data structures. The highlighted topics are playable today; the rest unlock as the course grows.`} />
          <Reveal><Roadmap course="python" /></Reveal>
          <Reveal><div className="split"><CodeBlock lang="python" label="first_spell.py" source={'name = "Nour"\nxp = 0\nfor lesson in range(3):\n    xp += 40\nprint(f"{name} has {xp} XP")  # Nour has 120 XP'} /><Card className="split__note" tint><h3>Readable on purpose</h3><p className="muted">Python lets you think about the problem instead of the punctuation. That is why it is the first language of so many engineers.</p></Card></div></Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead num="06" label="JavaScript journey" icon="rocket" title="JavaScript, from console to browser." text={`${COURSES[2].roadmap.length} topics covering the language that runs the interactive web. The highlighted topics are playable today.`} />
          <Reveal><Roadmap course="js" /></Reveal>
          <Reveal><div className="split"><CodeBlock lang="javascript" label="inventory.js" source={'const items = [{ name: "map", price: 5 }, { name: "sword", price: 25 }];\nconst cheap = items.filter((i) => i.price < 10);\nconsole.log(cheap.map((i) => i.name)); // ["map"]'} /><Card className="split__note" tint><h3>Quirky, powerful, everywhere</h3><p className="muted">We teach the quirks as tools, so type coercion and closures become strengths, not traps.</p></Card></div></Reveal>
        </div>
      </section>

      <section className="section section--alt" id="journey">
        <div className="container">
          <SectionHead num="07" label="Interactive quest preview" icon="calendar" title="Clear a quest. Unlock the next." text="This is a live preview of the Python world. Click a quest, clear it, watch XP climb and the path open." />
          <Reveal><QuestPreview /></Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead num="08" label="Featured challenges" icon="trophy" title="Predict it. Break it. Fix it." text="The Challenge Arena is on the roadmap. Here is a taste of the first challenge type, and it really works." />
          <div className="grid grid--chal">
            <Reveal><PredictDemo /></Reveal>
            <Reveal delay={0.08}>
              <div className="chal-side">
                {[{ t: 'Find the Bug', d: 'Spot the off-by-one in a loop.', i: 'heart' }, { t: 'Write a Function', d: 'Pass hidden test cases to earn XP.', i: 'rocket' }, { t: 'Solve an Algorithm', d: 'Binary search, from scratch.', i: 'crown' }].map((c) => (
                  <Card key={c.t} className="chal-mini"><PixelIcon name={c.i} size={40} /><div><strong>{c.t}</strong><p className="muted" style={{ fontSize: '0.88rem' }}>{c.d}</p></div><span className="chip chip--soft">Soon</span></Card>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <SectionHead num="09" label="Projects showcase" icon="rocket" title="Build things that work." text="World 05 turns skills into portfolio pieces. The Project Workshop opens in an upcoming release." />
          <div className="grid grid--3">
            {PROJECTS.map((p, i) => (
              <Reveal key={p.t} delay={(i % 3) * 0.06}><Card hover className="proj"><PixelIcon name={p.icon} size={44} /><h3>{p.t}</h3><p className="muted">{p.d}</p><div className="row"><span className="chip chip--soft">{p.l}</span><span className="chip chip--locked"><Lock size={10} /> Soon</span></div></Card></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="gamification">
        <div className="container">
          <SectionHead num="10" label="Gamification system" icon="crown" title="Seven forms. One evolution." text="Earn XP and your character evolves, from Denia all the way to Neonz. Achievements, daily quests and boss challenges all count. Try the XP meter." />
          <Reveal><Gamification /></Reveal>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <SectionHead num="11" label="Learning statistics" icon="flame" title="What is inside the world." />
          <div className="grid grid--4 stats">
            {[{ v: WORLDS.length, l: 'Worlds' }, { v: LESSONS.length, l: 'Lessons live' }, { v: topics, l: 'Topics on the roadmap' }, { v: totalXp, l: 'XP to earn' }].map((s) => (
              <Reveal key={s.l}><Card className="stat" tint><CountUp value={s.v} className="stat__v mono" /><span className="muted">{s.l}</span></Card></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="container container--narrow">
          <SectionHead num="12" label="FAQ" icon="doc" title="Questions, answered." />
          <Faq />
        </div>
      </section>

      <section className="cta">
        <div className="container cta__inner">
          <PixelIcon name="mascot" size={150} className="cta__mascot" />
          <div>
            <span className="chip chip--blue">QUEST 13</span>
            <h2>Your evolution begins now.</h2>
            <p className="lead">Create a free account and pick up your progress on any device.</p>
            <div className="row" style={{ flexWrap: 'wrap', marginTop: 16 }}>
              <ButtonLink to="/signup" variant="primary" size="lg" icon={<ArrowRight size={18} />}>Start Your Journey</ButtonLink>
              <ButtonLink to="/login" size="lg">I already have an account</ButtonLink>
            </div>
          </div>
        </div>
        <Grass />
      </section>
    </>
  )
}
