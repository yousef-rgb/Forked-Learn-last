import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Paperclip, Send, SlidersHorizontal, Sparkles, Trash2, Wand2, X } from 'lucide-react'
import { Button, PixelIcon } from '../ui'
import { Markdown } from './Markdown'
import { ImageCard } from './ImageCard'
import { useAuth } from '../../store/auth'
import { useToast } from '../../store/toast'
import { useBot, type Mode, type SendOpts } from '../../store/useBot'
import { isChatConfigured, isImageConfigured } from '../../lib/env'
import { LIMITS, PRESETS, validateDimensions, type Shape } from '../../services/imageGen'
import { MAX_CHAT_FILES } from '../../services/botApi'

const MAX_CHAT_FILE_BYTES = 25 * 1024 * 1024
const SUGGESTIONS = [
  'Explain how neural networks learn',
  'Generate a pixel-art castle at sunset',
  'Help me debug my Python loop',
  'Create a poster for a coding club',
]
interface Picked { id: string; file: File; url: string }

export function BotChat({ height = 560 }: { height?: number | string }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const notify = useCallback((title: string, body?: string) => toast({ kind: 'error', title, body }), [toast])
  const bot = useBot((user?.email ?? 'guest').toLowerCase(), notify)

  const [text, setText] = useState('')
  const [picked, setPicked] = useState<Picked[]>([])
  const [mode, setMode] = useState<Mode>('auto')
  const [showSettings, setShowSettings] = useState(false)
  const [shape, setShape] = useState<Shape>('square')
  const [custom, setCustom] = useState({ w: 1024, h: 1024 })
  const [enhance, setEnhance] = useState(false)
  const [choice, setChoice] = useState<'original' | 'enhanced'>('enhanced')
  const [draft, setDraft] = useState('')
  const log = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const fileRef = useRef<HTMLInputElement>(null)

  const dims = shape === 'custom' ? custom : PRESETS[shape]
  const dimsW = dims.w, dimsH = dims.h
  const dimError = shape === 'custom' ? validateDimensions(custom.w, custom.h) : null
  const target = bot.editTarget ? bot.msgs.find((m) => m.id === bot.editTarget) : undefined

  // keep the log pinned to the bottom unless the user scrolled up
  useEffect(() => { const el = log.current; if (el && stick.current) el.scrollTop = el.scrollHeight }, [bot.msgs, bot.chatBusy, bot.pending])
  useEffect(() => { if (bot.pending) { setDraft(bot.pending.enhanced); setChoice('enhanced') } }, [bot.pending])
  useEffect(() => () => { picked.forEach((p) => URL.revokeObjectURL(p.url)) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const room = MAX_CHAT_FILES - picked.length
    const next: Picked[] = []
    for (const f of Array.from(list)) {
      if (f.size > MAX_CHAT_FILE_BYTES) { notify('File too large', `${f.name} is over 25 MB.`); continue }
      if (next.length >= room) { notify('Too many files', `You can attach up to ${MAX_CHAT_FILES}.`); break }
      next.push({ id: crypto.randomUUID(), file: f, url: f.type.startsWith('image/') ? URL.createObjectURL(f) : '' })
    }
    setPicked((p) => [...p, ...next])
    if (fileRef.current) fileRef.current.value = ''
  }
  const removePicked = (id: string) => setPicked((p) => { const f = p.find((x) => x.id === id); if (f?.url) URL.revokeObjectURL(f.url); return p.filter((x) => x.id !== id) })

  const submit = async () => {
    const opts: SendOpts = { mode, width: dimsW, height: dimsH, enhance }
    const ok = await bot.send(text, picked.map((p) => p.file), opts)
    if (ok) { setText(''); setPicked([]); stick.current = true }
  }
  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit() } }
  const copy = useCallback(async (t: string) => { try { await navigator.clipboard.writeText(t); toast({ kind: 'success', title: 'Prompt copied' }) } catch { notify('Could not copy') } }, [notify, toast])
  const clearAll = async () => { if (window.confirm('Clear this conversation? Generated images in the chat will be removed.')) await bot.clear() }

  const busy = bot.chatBusy || bot.enhancing
  const hint = useMemo(() => (mode === 'image' ? 'Describe the image to create or change…' : mode === 'chat' ? 'Ask anything…' : 'Ask anything, or describe an image to create…'), [mode])

  if (!isChatConfigured) {
    return (
      <section className="bot pcard" style={{ minHeight: 220 }} aria-label="Forked AI assistant">
        <div className="bot__empty"><PixelIcon name="brain" size={64} /><h3>AI Bot is not connected yet</h3>
          <p className="muted">Set <code>VITE_API_BASE_URL</code> in your environment (Vercel → Settings → Environment Variables, or a local <code>.env</code>) and rebuild.</p></div>
      </section>
    )
  }

  return (
    <section className="bot pcard" style={{ height }} aria-label="Forked AI assistant">
      <header className="bot__head">
        <PixelIcon name="brain" size={34} />
        <div className="bot__title"><strong>Forked AI</strong><span className="muted mono">{isImageConfigured ? 'chat · images' : 'chat only'}</span></div>
        <span className={`chip ${isImageConfigured ? 'chip--done' : 'chip--warn'}`}>{isImageConfigured ? 'Online' : 'Images off'}</span>
        <button type="button" className="icon-btn" onClick={() => void clearAll()} aria-label="Clear conversation" disabled={bot.msgs.length === 0}><Trash2 size={17} /></button>
      </header>

      <div className="bot__log" ref={log} role="log" aria-live="polite" aria-relevant="additions"
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}>
        {bot.msgs.length === 0 && (
          <div className="bot__empty">
            <PixelIcon name="mascot" size={84} />
            <h3>What are we building today?</h3>
            <p className="muted">Ask a question, get code help, or describe an image and I will create it.</p>
            <div className="bot__sugs">{SUGGESTIONS.map((s) => <button key={s} type="button" className="btn btn--ghost btn--sm" onClick={() => setText(s)}>{s}</button>)}</div>
          </div>
        )}
        {bot.msgs.map((m) => (
          <div key={m.id} className={`bmsg bmsg--${m.role}`}>
            {m.role === 'ai' && <span className="bmsg__av" aria-hidden="true"><PixelIcon name="brain" size={22} /></span>}
            <div className={`bmsg__bubble ${m.error ? 'is-error' : ''}`}>
              {m.attachments && m.attachments.length > 0 && (
                <div className="bmsg__files">{m.attachments.map((a) => a.image ? <img key={a.id} src={a.url} alt={a.name} /> : <span key={a.id} className="chip chip--soft">{a.name}</span>)}</div>
              )}
              {m.gen ? (
                <ImageCard gen={m.gen} at={m.at} onCancel={() => bot.cancel(m.id)} onRegenerate={() => bot.regenerate(m.id)} onEdit={() => { bot.setEditTarget(m.id); setMode('image') }} onDelete={() => bot.removeMessage(m.id)} onCopy={copy} />
              ) : m.role === 'ai' && !m.error ? <Markdown text={m.text ?? ''} /> : <p dir="auto" className="bmsg__plain">{m.text}</p>}
            </div>
          </div>
        ))}
        {busy && (
          <div className="bmsg bmsg--ai" role="status" aria-label={bot.enhancing ? 'Enhancing your prompt' : 'Forked AI is thinking'}>
            <span className="bmsg__av" aria-hidden="true"><PixelIcon name="brain" size={22} /></span>
            <div className="bmsg__bubble"><span className="typing" aria-hidden="true"><i /><i /><i /></span>{bot.enhancing && <span className="muted mono" style={{ fontSize: '0.75rem', marginLeft: 8 }}>Enhancing prompt…</span>}
              {bot.chatBusy && <button type="button" className="linkbtn" style={{ marginLeft: 10 }} onClick={bot.cancelChat}>Stop</button>}</div>
          </div>
        )}
      </div>

      {bot.pending && (
        <div className="bot__review" role="group" aria-label="Choose the prompt to use">
          <div className="row" style={{ justifyContent: 'space-between' }}><strong><Sparkles size={14} /> Review prompt</strong><button type="button" className="icon-btn" onClick={bot.cancelPending} aria-label="Cancel"><X size={16} /></button></div>
          <div className="seg" role="radiogroup" aria-label="Prompt version">
            {(['original', 'enhanced'] as const).map((c) => <button key={c} type="button" role="radio" aria-checked={choice === c} className={choice === c ? 'is-on' : ''} onClick={() => setChoice(c)}>{c === 'original' ? 'Original' : 'Enhanced'}</button>)}
          </div>
          {choice === 'original'
            ? <p className="bot__orig" dir="auto">{bot.pending.original}</p>
            : <textarea className="input" dir="auto" rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Enhanced prompt (editable)" maxLength={1500} />}
          <Button variant="primary" size="sm" icon={<Wand2 size={14} />} onClick={() => bot.confirmPending(choice, draft)} disabled={choice === 'enhanced' && !draft.trim()}>Generate</Button>
        </div>
      )}

      <div className="bot__composer">
        {target?.gen?.url && <div className="bot__target"><img src={target.gen.url} alt="" /><span>Editing this image. Describe the change.</span><button type="button" className="icon-btn" onClick={() => bot.setEditTarget(null)} aria-label="Stop editing this image"><X size={15} /></button></div>}
        {picked.length > 0 && (
          <ul className="bot__picked" aria-label="Attached files">
            {picked.map((p) => <li key={p.id}>{p.url ? <img src={p.url} alt={p.file.name} /> : <span className="mono">{p.file.name.slice(0, 14)}</span>}<button type="button" onClick={() => removePicked(p.id)} aria-label={`Remove ${p.file.name}`}><X size={12} /></button></li>)}
          </ul>
        )}
        {showSettings && (
          <div className="bot__settings">
            <div className="field"><label>Size</label>
              <div className="seg" role="radiogroup" aria-label="Image shape">
                {(['square', 'portrait', 'landscape', 'custom'] as Shape[]).map((s) => <button key={s} type="button" role="radio" aria-checked={shape === s} className={shape === s ? 'is-on' : ''} onClick={() => setShape(s)}>{s === 'custom' ? 'Custom' : PRESETS[s].label}</button>)}
              </div>
            </div>
            {shape === 'custom' ? (
              <div className="bot__dims">
                <div className="field"><label htmlFor="bw">Width</label><input id="bw" className="input" type="number" inputMode="numeric" min={LIMITS.minSide} max={LIMITS.maxSide} value={custom.w} onChange={(e) => setCustom((c) => ({ ...c, w: Number(e.target.value) }))} aria-invalid={!!dimError} /></div>
                <span aria-hidden="true">×</span>
                <div className="field"><label htmlFor="bh">Height</label><input id="bh" className="input" type="number" inputMode="numeric" min={LIMITS.minSide} max={LIMITS.maxSide} value={custom.h} onChange={(e) => setCustom((c) => ({ ...c, h: Number(e.target.value) }))} aria-invalid={!!dimError} /></div>
                {dimError ? <span className="field-error" role="alert">{dimError}</span> : <span className="field-hint">{LIMITS.minSide}–{LIMITS.maxSide} px per side</span>}
              </div>
            ) : <span className="field-hint mono">{dimsW}×{dimsH}px</span>}
            <label className="check"><input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} /> Enhance my prompt before generating</label>
            <span className="field-hint">Up to {LIMITS.maxRefs} reference images (PNG, JPEG, WebP, {LIMITS.maxFileBytes / 1024 / 1024} MB each).</span>
          </div>
        )}
        <div className="bot__bar">
          <div className="seg seg--sm" role="radiogroup" aria-label="Mode">
            {(['auto', 'chat', 'image'] as Mode[]).map((m) => <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? 'is-on' : ''} onClick={() => setMode(m)} disabled={m === 'image' && !isImageConfigured} title={m === 'image' && !isImageConfigured ? 'Set VITE_IMAGE_WORKER_URL to enable images' : undefined}>{m === 'auto' ? 'Auto' : m === 'chat' ? 'Chat' : 'Image'}</button>)}
          </div>
          <span className="bot__spacer" />
          <button type="button" className="icon-btn" onClick={() => fileRef.current?.click()} aria-label="Attach files or reference images" disabled={picked.length >= MAX_CHAT_FILES}><Paperclip size={18} /></button>
          <button type="button" className={`icon-btn ${showSettings ? 'is-on' : ''}`} onClick={() => setShowSettings((s) => !s)} aria-expanded={showSettings} aria-label="Image settings"><SlidersHorizontal size={18} /></button>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        </div>
        <div className="bot__input">
          <textarea className="input" dir="auto" rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder={hint} aria-label="Message" maxLength={8000} />
          <Button variant="primary" onClick={() => void submit()} disabled={(!text.trim() && picked.length === 0) || (shape === 'custom' && !!dimError && mode !== 'chat') || !!bot.pending || bot.enhancing} icon={mode === 'image' ? <ImagePlus size={17} /> : <Send size={17} />} aria-label="Send">{mode === 'image' ? 'Create' : 'Send'}</Button>
        </div>
      </div>
    </section>
  )
}
