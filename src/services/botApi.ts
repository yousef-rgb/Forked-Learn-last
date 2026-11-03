import { API_BASE_URL } from '../lib/env'
import { supabase } from '../lib/supabaseClient'

export class BotError extends Error {
  code: 'config' | 'auth' | 'rate' | 'network' | 'timeout' | 'aborted' | 'invalid' | 'server'
  constructor(code: BotError['code'], message: string) { super(message); this.code = code; this.name = 'BotError' }
}

export const CHAT_TIMEOUT_MS = 90_000
export const MAX_CHAT_FILES = 5

/** Stable per-user conversation id (kept in this browser only; the backend owns the real history). */
export function getSessionId(userId: string): string {
  const key = `forkedai:session:${userId}`
  try {
    const found = localStorage.getItem(key)
    if (found) return found
    const id = crypto.randomUUID()
    localStorage.setItem(key, id)
    return id
  } catch { return crypto.randomUUID() }
}
export function resetSessionId(userId: string): string {
  const id = crypto.randomUUID()
  try { localStorage.setItem(`forkedai:session:${userId}`, id) } catch { /* private mode */ }
  return id
}

export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Merges the caller's abort signal with a timeout so a hung request always ends. */
export function withTimeout(signal: AbortSignal | undefined, ms: number) {
  const ctrl = new AbortController()
  let timedOut = false
  const t = window.setTimeout(() => { timedOut = true; ctrl.abort() }, ms)
  const onAbort = () => ctrl.abort()
  if (signal?.aborted) ctrl.abort(); else signal?.addEventListener('abort', onAbort, { once: true })
  return { signal: ctrl.signal, timedOut: () => timedOut, done: () => { window.clearTimeout(t); signal?.removeEventListener('abort', onAbort) } }
}

export function statusToError(status: number, serverMsg?: string): BotError {
  if (status === 401 || status === 403) return new BotError('auth', 'Your session expired or you are not allowed to do this. Please log in again.')
  if (status === 429) return new BotError('rate', 'Too many requests. Please wait a moment and try again.')
  if (status === 400 || status === 413 || status === 415 || status === 422) return new BotError('invalid', serverMsg || 'The request was rejected. Check your message or files and try again.')
  return new BotError('server', serverMsg || 'The AI service had a problem. Please try again.')
}

export const networkError = (timedOut: boolean, aborted: boolean) =>
  aborted ? new BotError('aborted', 'Cancelled.')
    : timedOut ? new BotError('timeout', 'This is taking too long. Please try again.')
      : new BotError('network', 'Could not reach the server. Check your connection, or the server CORS settings.')

interface ChatArgs { message: string; sessionId: string; files?: File[]; signal?: AbortSignal }

/** Sends one message to the web backend. Contract: POST {base}/chat → { success, data: { response } } (markdown). */
export async function sendChat({ message, sessionId, files = [], signal }: ChatArgs): Promise<string> {
  if (!API_BASE_URL) throw new BotError('config', 'The chat server is not configured (VITE_API_BASE_URL is missing).')
  const t = withTimeout(signal, CHAT_TIMEOUT_MS)
  try {
    const auth = await authHeaders()
    let init: RequestInit
    if (files.length) {
      const fd = new FormData()
      fd.append('message', message)
      fd.append('sessionId', sessionId)
      files.forEach((f) => fd.append('files', f))
      init = { method: 'POST', body: fd, headers: auth }
    } else {
      init = { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify({ message, sessionId }) }
    }
    const res = await fetch(`${API_BASE_URL}/chat`, { ...init, signal: t.signal })
    const body = await res.json().catch(() => null) as { success?: boolean; message?: string; error?: string; data?: { response?: string } } | null
    if (!res.ok || !body?.success) throw statusToError(res.status, body?.message || body?.error)
    const text = body.data?.response
    if (!text) throw new BotError('server', 'The assistant returned an empty answer. Please try again.')
    return text
  } catch (e) {
    if (e instanceof BotError) throw e
    throw networkError(t.timedOut(), t.signal.aborted && !t.timedOut())
  } finally { t.done() }
}

export async function clearChat(sessionId: string): Promise<void> {
  if (!API_BASE_URL) return
  try {
    await fetch(`${API_BASE_URL}/chat/clear`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ sessionId }) })
  } catch { /* best effort */ }
}

/** Asks the SAME backend model to rewrite an image prompt. Uses a throwaway session so chat history stays clean. */
export async function enhanceImagePrompt(prompt: string, signal?: AbortSignal): Promise<string> {
  const sessionId = `enhance-${crypto.randomUUID()}`
  const instruction =
    'Rewrite the following image-generation prompt into one richer prompt. Add only relevant detail about composition, lighting, camera angle, ' +
    'environment, materials, style, color palette and rendering quality. Keep the user\'s subject and intent exactly; never add unrelated objects, people or text. ' +
    'Reply with ONLY the rewritten prompt, in English, no quotes, no preface, max 120 words.\n\nPrompt: ' + prompt
  try {
    const out = await sendChat({ message: instruction, sessionId, signal })
    return out.replace(/^["'`\s]+|["'`\s]+$/g, '').replace(/^(enhanced )?prompt:\s*/i, '').slice(0, 1500)
  } finally { void clearChat(sessionId) }
}
