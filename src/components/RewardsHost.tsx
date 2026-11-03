import { useNavigate } from 'react-router-dom'
import { ACHIEVEMENTS, questById } from '../data/curriculum'
import { useGame } from '../store/game'
import { Button, Modal, PixelIcon } from './ui'
import { Character, CHARACTERS } from './Character'

/** Shows queued rewards one at a time: quest clears, level-ups, achievements. */
export function RewardsHost() {
  const { rewards, dismissReward } = useGame()
  const nav = useNavigate()
  const r = rewards[0]
  if (!r) return null

  let body = null
  if (r.type === 'level') {
    body = (<>
      <span className="chip chip--blue">Evolution! Level {r.level}</span>
      <div className="reward__evolve" aria-hidden="true"><Character stage={r.level - 2} size={72} /><span className="arrow">▸</span><div className="reward__burst"><Character stage={r.level - 1} size={104} className="reward__bounce" /></div></div>
      <h2 className="reward__title">{CHARACTERS[r.level - 2].name} evolved into {r.rank}!</h2>
      <p className="lead">{CHARACTERS[r.level - 1].blurb}</p>
    </>)
  } else if (r.type === 'quest') {
    const q = questById(r.questId)!
    body = (<>
      <div className="reward__burst" aria-hidden="true"><PixelIcon name="flag" size={88} className="reward__bounce" /></div>
      <span className="chip chip--done">{r.mastered ? '★ Quest mastered' : 'Quest complete'}</span>
      <h2 className="reward__title">{q.title}</h2>
      <p className="lead">+{r.xp} XP quest bonus{r.mastered ? '. Every knowledge check was perfect, which is the definition of mastery.' : '. Score every knowledge check perfectly to earn Mastery.'}</p>
    </>)
  } else if (r.type === 'achievement') {
    const a = ACHIEVEMENTS.find((x) => x.id === r.id)!
    body = (<>
      <div className="reward__burst" aria-hidden="true"><PixelIcon name={a.icon} size={88} className="reward__bounce" /></div>
      <span className="chip chip--warn">Achievement unlocked</span>
      <h2 className="reward__title">{a.title}</h2>
      <p className="lead">{a.description} +{a.xp} XP</p>
    </>)
  }

  return (
    <Modal open onClose={dismissReward} label="Reward">
      <div className="reward">
        {body}
        <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
          {r.type === 'quest' && <Button variant="ghost" onClick={() => { dismissReward(); nav('/app/quests') }}>View quest map</Button>}
          <Button variant="primary" onClick={dismissReward}>{rewards.length > 1 ? `Next reward (${rewards.length - 1} more)` : 'Continue'}</Button>
        </div>
      </div>
    </Modal>
  )
}
