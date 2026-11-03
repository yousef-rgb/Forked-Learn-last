import { useCallback, useEffect, useRef, useState } from 'react'
import { BotError, MAX_CHAT_FILES, clearChat, enhanceImagePrompt, getSessionId, resetSessionId, sendChat } from '../services/botApi'
import { LIMITS, fileToDataUrl, generateImage, urlToDataUrl, validateDimensions, validateImageFile } from '../services/imageGen'
import { detectIntent, type Intent } from '../services/intent'

export type Mode = 'auto' | 'chat' | 'image'
export interface Gen {
  status: 'loading' | 'done' | 'error' | 'cancelled'
  kind: 'generate' | 'edit'
  prompt: string; enhanced?: string
  width: number; height: number
  url?: string; temporary?: boolean; error?: string
  /** In-memory reference images (data URLs) so Regenerate can repeat an edit. Never persisted. */
  refs: string[]
}
export interface Attachment { id: string; name: string; url: string; image: boolean }
export interface Msg { id: string; role: 'user' | 'ai'; at: number; text?: string; error?: boolean; attachments?: Attachment[]; gen?: Gen }
export interface SendOpts { mode: Mode; width: number; height: number; enhance: boolean }
export interface Pending { original: string; enhanced: string; intent: 'generate' | 'edit'; files: File[]; opts: SendOpts }

const uid = () => crypto.randomUUID()
const KEEP = 60
const storeKey = (userId: string) => `forkedai:bot:${userId}`

/** Only text and permanent (https) images survive a reload. Blob URLs and base64 are never written to storage. */
function load(userId: string): Msg[] {
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey(userId)) ?? '[]') as Msg[]
    return Array.isArray(raw) ? raw.filter((m) => m && typeof m.id === 'string') : []
  } catch { return [] }
}
function save(userId: string, msgs: Msg[]) {
  const out = msgs.slice(-KEEP).flatMap((m): Msg[] => {
    if (m.gen) {
      if (m.gen.status !== 'done' || !m.gen.url || m.gen.temporary) return []
      return [{ ...m, gen: { ...m.gen, refs: [] }, attachments: undefined }]
    }
    return [{ ...m, attachments: undefined }]
  })
  try { localStorage.setItem(storeKey(userId), JSON.stringify(out)) } catch { /* quota / private mode */ }
}

export function useBot(userId: string, notify: (title: string, body?: string) => void) {
  const [msgs, setMsgs] = useState<Msg[]>(() => load(userId))
  const [chatBusy, setChatBusy] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [editTarget, setEditTarget] = useState<string | null>(null)
  const sessionRef = useRef(getSessionId(userId))
  const genCtrls = useRef(new Map<string, AbortController>())
  const chatCtrl = useRef<AbortController | null>(null)
  const lastSend = useRef(0)
  const pendingTarget = useRef<string | undefined>(undefined)
  const msgsRef = useRef(msgs)
  useEffect(() => { msgsRef.current = msgs }, [msgs])

  useEffect(() => { save(userId, msgs) }, [userId, msgs])
  useEffect(() => {
    const ctrls = genCtrls.current
    return () => { ctrls.forEach((c) => c.abort()); chatCtrl.current?.abort() }
  }, [])

  const push = useCallback((m: Msg) => setMsgs((l) => [...l, m]), [])
  const patchGen = useCallback((id: string, g: Partial<Gen>) => setMsgs((l) => l.map((m) => (m.id === id && m.gen ? { ...m, gen: { ...m.gen, ...g } } : m))), [])
  const generating = msgs.some((m) => m.gen?.status === 'loading')

  const runGen = useCallback(async (id: string, g: Gen) => {
    const ctrl = new AbortController(); genCtrls.current.set(id, ctrl)
    try {
      const r = await generateImage({ prompt: g.enhanced ?? g.prompt, width: g.width, height: g.height, references: g.refs, sessionId: sessionRef.current, signal: ctrl.signal })
      patchGen(id, { status: 'done', url: r.url, temporary: r.temporary, error: undefined })
    } catch (e) {
      const err = e instanceof BotError ? e : new BotError('server', 'Something went wrong while generating the image.')
      patchGen(id, err.code === 'aborted' ? { status: 'cancelled' } : { status: 'error', error: err.message })
    } finally { genCtrls.current.delete(id) }
  }, [patchGen])

  const startGen = useCallback(async (kind: Gen['kind'], prompt: string, enhanced: string | undefined, opts: SendOpts, files: File[], targetUrl?: string) => {
    const id = uid()
    const g: Gen = { status: 'loading', kind, prompt, enhanced, width: opts.width, height: opts.height, refs: [] }
    push({ id, role: 'ai', at: Date.now(), gen: g })
    try {
      const refs: string[] = []
      if (targetUrl) refs.push(await urlToDataUrl(targetUrl))
      for (const f of files) refs.push(await fileToDataUrl(f))
      g.refs = refs; patchGen(id, { refs })
      await runGen(id, g)
    } catch (e) {
      patchGen(id, { status: 'error', error: e instanceof BotError ? e.message : 'Could not prepare the image.' })
    }
  }, [patchGen, push, runGen])

  const runChat = useCallback(async (text: string, files: File[]) => {
    const ctrl = new AbortController(); chatCtrl.current = ctrl; setChatBusy(true)
    try {
      const answer = await sendChat({ message: text, sessionId: sessionRef.current, files, signal: ctrl.signal })
      push({ id: uid(), role: 'ai', at: Date.now(), text: answer })
    } catch (e) {
      const err = e instanceof BotError ? e : new BotError('server', 'Something went wrong.')
      push({ id: uid(), role: 'ai', at: Date.now(), text: err.code === 'aborted' ? 'Request cancelled.' : err.message, error: err.code !== 'aborted' })
    } finally { chatCtrl.current = null; setChatBusy(false) }
  }, [push])

  /** Returns true when the message was accepted (so the composer can clear itself). */
  const send = useCallback(async (raw: string, files: File[], opts: SendOpts): Promise<boolean> => {
    const text = raw.trim()
    if (!text && files.length === 0) return false
    if (Date.now() - lastSend.current < 800) return false
    if (enhancing || pending) { notify('Finish the prompt review first', 'Choose a prompt or cancel before sending another message.'); return false }

    const target = editTarget ? msgsRef.current.find((m) => m.id === editTarget && m.gen?.url) : undefined
    const recent = msgsRef.current.slice(-6).some((m) => m.gen?.status === 'done')
    const imgFiles = files.filter((f) => f.type.startsWith('image/'))
    let intent: Intent
    if (opts.mode === 'chat') intent = 'chat'
    else if (opts.mode === 'image') intent = imgFiles.length || target ? 'edit' : 'generate'
    else intent = target ? 'edit' : detectIntent(text, { hasRefs: imgFiles.length > 0, hasRecentImage: recent })

    const needsGen = intent !== 'chat'
    if (needsGen) {
      if (!text) { notify('Describe the image', 'Add a few words about what you want to create or change.'); return false }
      const dim = validateDimensions(opts.width, opts.height)
      if (dim) { notify('Invalid size', dim); return false }
      const total = imgFiles.length + (target ? 1 : 0)
      if (total > LIMITS.maxRefs) { notify('Too many reference images', `Use at most ${LIMITS.maxRefs} (including the image being edited).`); return false }
      for (const f of intent === 'both' ? imgFiles : files) { const err = validateImageFile(f); if (err) { notify('Unsupported file', err); return false } }
      if (generating) { notify('One image at a time', 'Wait for the current image to finish, or cancel it.'); return false }
    } else {
      if (files.length > MAX_CHAT_FILES) { notify('Too many files', `You can attach up to ${MAX_CHAT_FILES} files.`); return false }
      if (chatBusy) return false
    }
    if (intent === 'both' && chatBusy) return false

    lastSend.current = Date.now()
    push({ id: uid(), role: 'user', at: Date.now(), text, attachments: files.map((f) => ({ id: uid(), name: f.name, url: URL.createObjectURL(f), image: f.type.startsWith('image/') })) })
    setEditTarget(null)

    if (intent === 'chat') { void runChat(text, files); return true }
    if (intent === 'both') { void runChat(text, files); void startGen('edit', text, undefined, opts, imgFiles); return true }

    const kind: Gen['kind'] = target || imgFiles.length ? 'edit' : 'generate'
    if (opts.enhance) {
      setEnhancing(true)
      try {
        const enhanced = await enhanceImagePrompt(text)
        setPending({ original: text, enhanced, intent: kind, files: imgFiles, opts })
        pendingTarget.current = target?.gen?.url
      } catch {
        notify('Could not enhance the prompt', 'Using your original prompt instead.')
        void startGen(kind, text, undefined, opts, imgFiles, target?.gen?.url)
      } finally { setEnhancing(false) }
      return true
    }
    void startGen(kind, text, undefined, opts, imgFiles, target?.gen?.url)
    return true
  }, [chatBusy, editTarget, enhancing, generating, notify, pending, push, runChat, startGen])

  const confirmPending = useCallback((chosen: 'original' | 'enhanced', editedEnhanced: string) => {
    if (!pending) return
    const enhanced = chosen === 'enhanced' && editedEnhanced.trim() ? editedEnhanced.trim() : undefined
    void startGen(pending.intent, pending.original, enhanced, pending.opts, pending.files, pendingTarget.current)
    setPending(null)
  }, [pending, startGen])
  const cancelPending = useCallback(() => setPending(null), [])

  const cancel = useCallback((id: string) => genCtrls.current.get(id)?.abort(), [])
  const cancelChat = useCallback(() => chatCtrl.current?.abort(), [])
  const regenerate = useCallback((id: string) => {
    const m = msgsRef.current.find((x) => x.id === id); if (!m?.gen || m.gen.status === 'loading' || generating) return
    patchGen(id, { status: 'loading', error: undefined, url: undefined }); void runGen(id, { ...m.gen, status: 'loading' })
  }, [generating, patchGen, runGen])
  const removeMessage = useCallback((id: string) => {
    const m = msgsRef.current.find((x) => x.id === id)
    if (m?.gen?.url?.startsWith('blob:')) URL.revokeObjectURL(m.gen.url)
    if (editTarget === id) setEditTarget(null)
    setMsgs((l) => l.filter((x) => x.id !== id))
  }, [editTarget])
  const clear = useCallback(async () => {
    genCtrls.current.forEach((c) => c.abort()); chatCtrl.current?.abort()
    const old = sessionRef.current
    sessionRef.current = resetSessionId(userId)
    setMsgs([]); setPending(null); setEditTarget(null)
    await clearChat(old)
  }, [userId])

  return { msgs, chatBusy, enhancing, generating, pending, editTarget, setEditTarget, send, confirmPending, cancelPending, cancel, cancelChat, regenerate, removeMessage, clear }
}
