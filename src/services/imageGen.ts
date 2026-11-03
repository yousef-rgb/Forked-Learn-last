import { IMAGE_WORKER_URL } from '../lib/env'
import { BotError, authHeaders, networkError, statusToError, withTimeout } from './botApi'

/** Documented limits of @cf/black-forest-labs/flux-2-klein-4b. The Worker enforces them again server-side. */
export const LIMITS = { minSide: 256, maxSide: 1920, maxRefs: 4, maxFileBytes: 5 * 1024 * 1024, types: ['image/png', 'image/jpeg', 'image/webp'] as string[] }
export const GENERATION_TIMEOUT_MS = 120_000

export type Shape = 'square' | 'portrait' | 'landscape' | 'custom'
export const PRESETS: Record<Exclude<Shape, 'custom'>, { w: number; h: number; label: string }> = {
  square: { w: 1024, h: 1024, label: 'Square' },
  portrait: { w: 768, h: 1024, label: 'Portrait' },
  landscape: { w: 1024, h: 768, label: 'Landscape' },
}

export function validateDimensions(w: number, h: number): string | null {
  if (!Number.isInteger(w) || !Number.isInteger(h)) return 'Width and height must be whole numbers.'
  if (w < LIMITS.minSide || h < LIMITS.minSide || w > LIMITS.maxSide || h > LIMITS.maxSide)
    return `Width and height must be between ${LIMITS.minSide} and ${LIMITS.maxSide} px.`
  return null
}

export function validateImageFile(f: File): string | null {
  if (!LIMITS.types.includes(f.type)) return `${f.name}: only PNG, JPEG or WebP images are supported.`
  if (f.size > LIMITS.maxFileBytes) return `${f.name}: larger than ${LIMITS.maxFileBytes / 1024 / 1024} MB.`
  if (f.size === 0) return `${f.name}: the file is empty.`
  return null
}

export const fileToDataUrl = (f: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result)); r.onerror = () => reject(new BotError('invalid', 'Could not read the image file.'))
  r.readAsDataURL(f)
})

/** Reads a previously generated image back (blob: or same-origin/CORS-enabled URL) so it can be used as an edit reference. */
export async function urlToDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    return await fileToDataUrl(await res.blob())
  } catch { throw new BotError('invalid', 'Could not read the previous image to edit it. Upload it again as a reference.') }
}

export interface GenerateArgs { prompt: string; width: number; height: number; references?: string[]; sessionId: string; signal?: AbortSignal }
export interface GenerateResult { url: string; temporary: boolean }

const b64ToBlob = (b64: string, type = 'image/png') => {
  const bin = atob(b64); const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

/**
 * Contract with the Cloudflare Worker (see README → "AI Bot"):
 *   POST {VITE_IMAGE_WORKER_URL}  JSON { prompt, width, height, references?: dataURL[], sessionId }  + Authorization: Bearer <Supabase access token>
 *   → 200 image/*  (binary)                       or
 *   → 200 JSON { success: true, data: { imageUrl } | { imageBase64, mimeType? } }
 * Base64 is converted to a Blob URL immediately, never kept as a string in state or storage.
 */
export async function generateImage(a: GenerateArgs): Promise<GenerateResult> {
  if (!IMAGE_WORKER_URL) throw new BotError('config', 'Image generation is not configured (VITE_IMAGE_WORKER_URL is missing).')
  const dimErr = validateDimensions(a.width, a.height)
  if (dimErr) throw new BotError('invalid', dimErr)
  if (!a.prompt.trim()) throw new BotError('invalid', 'Describe the image you want first.')
  if ((a.references?.length ?? 0) > LIMITS.maxRefs) throw new BotError('invalid', `You can use at most ${LIMITS.maxRefs} reference images.`)

  const t = withTimeout(a.signal, GENERATION_TIMEOUT_MS)
  try {
    const res = await fetch(IMAGE_WORKER_URL, {
      method: 'POST', signal: t.signal,
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ prompt: a.prompt.trim(), width: a.width, height: a.height, references: a.references ?? [], sessionId: a.sessionId }),
    })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok) {
      const body = type.includes('json') ? await res.json().catch(() => null) as { message?: string; error?: string } | null : null
      throw statusToError(res.status, body?.message || body?.error)
    }
    if (type.startsWith('image/')) return { url: URL.createObjectURL(await res.blob()), temporary: true }
    const body = await res.json().catch(() => null) as { success?: boolean; message?: string; data?: { imageUrl?: string; imageBase64?: string; mimeType?: string } } | null
    const d = body?.data
    if (body?.success && d?.imageUrl && /^https:\/\//i.test(d.imageUrl)) return { url: d.imageUrl, temporary: false }
    if (body?.success && d?.imageBase64) return { url: URL.createObjectURL(b64ToBlob(d.imageBase64.replace(/^data:[^,]+,/, ''), d.mimeType)), temporary: true }
    throw new BotError('server', body?.message || 'The image service returned no image. Please try again.')
  } catch (e) {
    if (e instanceof BotError) throw e
    throw networkError(t.timedOut(), t.signal.aborted && !t.timedOut())
  } finally { t.done() }
}
