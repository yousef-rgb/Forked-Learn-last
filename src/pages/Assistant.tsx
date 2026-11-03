import { BotChat } from '../components/bot/BotChat'

export default function Assistant() {
  return (
    <div className="page">
      <header className="page__head"><div><p className="muted">Forked AI</p><h1 className="page__title">Ask anything. Create anything.</h1></div></header>
      <BotChat height="calc(100dvh - 210px)" />
    </div>
  )
}
