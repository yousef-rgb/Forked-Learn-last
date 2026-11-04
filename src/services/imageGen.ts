import { IMAGE_WORKER_URL } from '../lib/env'
import { BotError, authHeaders, withTimeout } from './botApi'

/**
 * Forked Image — Cloudflare Workers AI (FLUX.2)
 *
 * - Quality tiers: fast (Klein 9B) / balanced / max (FLUX.2 dev).
 * - Reference images in (almost) any format: PNG, JPEG, WebP, GIF, BMP, AVIF,
 *   SVG, TIFF, ICO, HEIC/HEIF. Detected by magic bytes, not by file extension,
 *   then converted in the browser to a PNG smaller than 512px.
 * - Automatic retry when the model is busy.
 * - Friendly user-facing errors + detailed developer diagnostics.
 */

export type Quality = 'fast' | 'balanced' | 'max'
export type EnhanceMode = 'off' | 'auto' | 'on'

export const LIMITS = {
  minSide: 256,
  maxSide: 1920,
  sideStep: 16,
  maxRefs: 4,
  /** Raw upload limit: we shrink the image locally, so this can be generous. */
  maxFileBytes: 25 * 1024 * 1024,
  /** What is actually sent to the worker for each reference. */
  maxUploadBytes: 5 * 1024 * 1024,
  maxReferenceDimension: 511,
  maxPromptLength: 10_000,
  types: [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/avif',
    'image/heic',
    'image/heif',
    'image/tiff',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/apng',
  ] as string[],
  extensions: [
    'png', 'jpg', 'jpeg', 'jfif', 'webp', 'gif', 'bmp', 'avif', 'heic',
    'heif', 'tif', 'tiff', 'svg', 'ico', 'apng',
  ] as string[],
}

/** Use on <input type="file" accept={ACCEPT_ATTR}>. */
export const ACCEPT_ATTR = [
  'image/*',
  ...LIMITS.extensions.map(ext => `.${ext}`),
].join(',')

/** Must be higher than the worker's own timeout (150s). */
export const GENERATION_TIMEOUT_MS = 170_000
const MAX_RETRIES = 2

export type Shape =
  | 'square'
  | 'portrait'
  | 'landscape'
  | 'tall'
  | 'wide'
  | 'custom'

export const PRESETS: Record<
  Exclude<Shape, 'custom'>,
  { w: number; h: number; label: string }
> = {
  square: { w: 1024, h: 1024, label: 'Square' },
  portrait: { w: 768, h: 1024, label: 'Portrait' },
  landscape: { w: 1024, h: 768, label: 'Landscape' },
  tall: { w: 768, h: 1344, label: 'Tall' },
  wide: { w: 1344, h: 768, label: 'Wide' },
}

export const QUALITY_LABELS: Record<Quality, string> = {
  fast: 'Fast',
  balanced: 'Balanced',
  max: 'Maximum quality',
}

// ==========================================
// VALIDATION
// ==========================================

export function validateDimensions(w: number, h: number): string | null {
  if (!Number.isInteger(w) || !Number.isInteger(h)) {
    return 'Please choose valid image dimensions.'
  }

  if (
    w < LIMITS.minSide ||
    h < LIMITS.minSide ||
    w > LIMITS.maxSide ||
    h > LIMITS.maxSide
  ) {
    return `Image dimensions must be between ${LIMITS.minSide} and ${LIMITS.maxSide} pixels.`
  }

  return null
}

/**
 * Quick synchronous check for file pickers.
 * Real format detection happens later using the file's actual bytes,
 * so files with an empty/wrong MIME type (e.g. HEIC) are not rejected here.
 */
export function validateImageFile(file: File): string | null {
  const name = file.name || 'Image'
  const ext = file.name?.split('.').pop()?.toLowerCase() ?? ''

  if (!file.type.startsWith('image/') && !LIMITS.extensions.includes(ext)) {
    return `${name}: Please upload an image file.`
  }

  if (file.size === 0) {
    return `${name}: This file appears to be empty.`
  }

  if (file.size > LIMITS.maxFileBytes) {
    return `${name}: The image must be smaller than ${LIMITS.maxFileBytes / 1024 / 1024} MB.`
  }

  return null
}

/** Snaps a dimension to the nearest multiple of 16 inside the allowed range. */
export function snapDimension(value: number): number {
  const snapped = Math.round(value / LIMITS.sideStep) * LIMITS.sideStep
  return Math.min(LIMITS.maxSide, Math.max(LIMITS.minSide, snapped))
}

// ==========================================
// FRIENDLY ERRORS
// ==========================================

const MESSAGES = {
  generic:
    'We couldn’t create your image this time. Please try again in a moment.',
  network:
    'We’re having trouble connecting to the image service. Please check your internet connection and try again.',
  timeout: 'Your image is taking longer than expected. Please try again.',
  unauthorized:
    'Your session may have expired. Please sign in again and retry.',
  forbidden:
    'The image service is temporarily unavailable. Please try again later.',
  rateLimit:
    'You’ve reached the current image generation limit. Please wait a little and try again.',
  server:
    'Something went wrong while creating your image. Please try again shortly.',
  invalidImage:
    'We couldn’t process one of your reference images. Please upload another image and try again.',
  unsupportedImage:
    'We couldn’t read this image format. Please try PNG, JPEG, WebP, GIF, AVIF, or another common format.',
  referenceRead:
    'We couldn’t access one of your reference images. Please upload it again.',
  missingImage:
    'Your image couldn’t be prepared successfully. Please try again.',
}

function userError(message: string, category: BotError['code'] = 'server'): BotError {
  return new BotError(category, message)
}

// ==========================================
// FORMAT DETECTION (magic bytes)
// ==========================================

export function sniffImageType(b: Uint8Array): string | null {
  const ascii = (s: number, e: number) =>
    String.fromCharCode(...Array.from(b.subarray(s, e)))

  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (ascii(0, 4) === 'GIF8') return 'image/gif'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  if (b[0] === 0x42 && b[1] === 0x4d) return 'image/bmp'
  if (ascii(0, 4) === 'II*\0' || ascii(0, 4) === 'MM\0*') return 'image/tiff'
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'image/x-icon'

  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12)
    if (brand === 'avif' || brand === 'avis') return 'image/avif'
    if (
      ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1', 'heif'].includes(brand)
    ) {
      return 'image/heic'
    }
  }

  const head = new TextDecoder().decode(b.subarray(0, 1024)).toLowerCase()
  if (head.includes('<svg')) return 'image/svg+xml'

  return null
}

async function detectType(blob: Blob): Promise<string | null> {
  const head = new Uint8Array(await blob.slice(0, 1024).arrayBuffer())
  return sniffImageType(head)
}

// ==========================================
// OPTIONAL HEIC SUPPORT
// ==========================================

type HeicConverter = (blob: Blob) => Promise<Blob>
let heicConverter: HeicConverter | null = null

/**
 * Safari decodes HEIC natively. For other browsers, install `heic2any` and
 * register it once at app start:
 *
 *   import heic2any from 'heic2any'
 *   setHeicConverter(async blob =>
 *     (await heic2any({ blob, toType: 'image/png' })) as Blob
 *   )
 */
export function setHeicConverter(fn: HeicConverter | null): void {
  heicConverter = fn
}

// ==========================================
// FILE READING
// ==========================================

export const fileToDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(userError(MESSAGES.invalidImage, 'invalid'))
      }
    }

    reader.onerror = () => {
      reject(userError(MESSAGES.invalidImage, 'invalid'))
    }

    reader.readAsDataURL(file)
  })

/** Converts an existing image URL (data / blob / https) to a Data URL. */
export async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    return url
  }

  if (!url.startsWith('blob:') && !/^https:\/\//i.test(url)) {
    throw userError(MESSAGES.referenceRead, 'invalid')
  }

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status}`)
    }

    const blob = await response.blob()

    if (blob.size === 0 || blob.size > LIMITS.maxFileBytes) {
      throw new Error('Invalid image size.')
    }

    return await fileToDataUrl(blob)
  } catch (error) {
    console.error('[Forked Image] Reference URL read failed:', error)
    throw userError(MESSAGES.referenceRead, 'invalid')
  }
}

// ==========================================
// BASE64 / DATA URL
// ==========================================

function b64ToBlob(value: string, type = 'image/png'): Blob {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new Blob([bytes], { type })
}

/** MIME type is intentionally not enforced here: bytes are sniffed later. */
function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/i)

  if (!match) {
    throw userError(MESSAGES.invalidImage, 'invalid')
  }

  const mimeType = (match[1] || 'application/octet-stream').toLowerCase()
  const isBase64 = Boolean(match[2])
  const payload = match[3]

  try {
    if (isBase64) {
      return b64ToBlob(payload, mimeType)
    }

    return new Blob([new TextEncoder().encode(decodeURIComponent(payload))], {
      type: mimeType,
    })
  } catch {
    throw userError(MESSAGES.invalidImage, 'invalid')
  }
}

// ==========================================
// IMAGE PROCESSING
// ==========================================

interface Decoded {
  source: CanvasImageSource
  width: number
  height: number
  close: () => void
}

async function decodeBlob(blob: Blob): Promise<Decoded> {
  try {
    const bitmap = await createImageBitmap(blob)

    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    }
  } catch {
    // Falls through to <img>, which also handles SVG and some other formats.
  }

  const url = URL.createObjectURL(blob)

  try {
    const img = new Image()
    img.decoding = 'async'

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Image decode failed.'))
      img.src = url
    })

    return {
      source: img,
      width: img.naturalWidth || 512,
      height: img.naturalHeight || 512,
      close: () => URL.revokeObjectURL(url),
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Image encoding failed.'))),
      type,
      quality
    )
  })
}

/**
 * Converts any supported image to a PNG smaller than 512x512, keeping the
 * aspect ratio. Transparent areas are flattened onto white. Falls back to
 * high-quality JPEG if the PNG is unexpectedly large.
 */
export async function resizeReferenceImage(source: Blob): Promise<Blob> {
  if (source.size === 0 || source.size > LIMITS.maxFileBytes) {
    throw userError(MESSAGES.invalidImage, 'invalid')
  }

  const detected = await detectType(source)

  if (!detected) {
    throw userError(MESSAGES.unsupportedImage, 'invalid')
  }

  // Re-type the blob so the browser decoder is never fooled by a wrong MIME.
  const typed = new Blob([source], { type: detected })

  let decoded: Decoded | null = null

  try {
    try {
      decoded = await decodeBlob(typed)
    } catch (error) {
      if (detected === 'image/heic' && heicConverter) {
        decoded = await decodeBlob(await heicConverter(typed))
      } else {
        throw error
      }
    }

    const scale = Math.min(
      1,
      LIMITS.maxReferenceDimension / decoded.width,
      LIMITS.maxReferenceDimension / decoded.height
    )

    const width = Math.max(1, Math.floor(decoded.width * scale))
    const height = Math.max(1, Math.floor(decoded.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas initialization failed.')
    }

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(decoded.source, 0, 0, width, height)

    let result = await canvasToBlob(canvas, 'image/png')

    if (result.size > LIMITS.maxUploadBytes) {
      result = await canvasToBlob(canvas, 'image/jpeg', 0.92)
    }

    if (result.size === 0 || result.size > LIMITS.maxUploadBytes) {
      throw new Error('Processed image size is invalid.')
    }

    return result
  } catch (error) {
    console.error('[Forked Image] Reference processing failed:', error)

    if (error instanceof BotError) {
      throw error
    }

    const heicWithoutDecoder = detected === 'image/heic' && !heicConverter
    throw userError(
      heicWithoutDecoder ? MESSAGES.unsupportedImage : MESSAGES.invalidImage,
      'invalid'
    )
  } finally {
    decoded?.close()
  }
}

// ==========================================
// REFERENCE RESOLUTION
// ==========================================

export type ReferenceImage = string | Blob

async function resolveReference(
  reference: ReferenceImage,
  index: number
): Promise<File> {
  try {
    let source: Blob

    if (reference instanceof Blob) {
      source = reference
    } else if (reference.startsWith('data:')) {
      source = dataUrlToBlob(reference)
    } else if (reference.startsWith('blob:') || /^https:\/\//i.test(reference)) {
      const response = await fetch(reference)

      if (!response.ok) {
        throw new Error(`Reference fetch failed: ${response.status}`)
      }

      source = await response.blob()
    } else {
      throw new Error('Unsupported reference source.')
    }

    const prepared = await resizeReferenceImage(source)
    const ext = prepared.type === 'image/jpeg' ? 'jpg' : 'png'

    return new File([prepared], `reference-${index + 1}.${ext}`, {
      type: prepared.type || 'image/png',
    })
  } catch (error) {
    console.error(`[Forked Image] Reference ${index + 1} failed:`, error)

    if (error instanceof BotError) {
      throw error
    }

    throw userError(MESSAGES.referenceRead, 'invalid')
  }
}

// ==========================================
// TYPES
// ==========================================

export interface GenerateArgs {
  prompt: string
  width: number
  height: number
  references?: ReferenceImage[]
  sessionId: string
  signal?: AbortSignal
  /** fast = Klein 9B, balanced/max = FLUX.2 dev. Default: balanced. */
  quality?: Quality
  /** Only used by balanced/max. 1–50. */
  steps?: number
  /** Only used by balanced/max. 0–20. */
  guidance?: number
  /** Reuse a previous result's seed to reproduce an image. */
  seed?: number
  /**
   * auto (default): translate non-English prompts only.
   * on: also rewrite the prompt with more visual detail.
   * off: send the prompt untouched.
   */
  enhance?: EnhanceMode
}

export interface GenerateResult {
  url: string
  temporary: boolean
  seed?: number
  model?: string
  quality?: Quality
  /** The prompt actually sent to the model (after translation/enhancement). */
  prompt?: string
  promptEnhanced?: boolean
  width?: number
  height?: number
  requestId?: string
  processingTimeMs?: number
  /** MIME type of the generated image (used to pick the right download extension). */
  mime?: string
}

/** Call when you no longer need a result to free its blob URL. */
export function releaseResult(result: GenerateResult): void {
  if (result.temporary) {
    URL.revokeObjectURL(result.url)
  }
}

// ==========================================
// ENDPOINT
// ==========================================

function getEndpoint(): string {
  const baseUrl = IMAGE_WORKER_URL.replace(/\/+$/, '')

  return baseUrl.endsWith('/api/generate')
    ? baseUrl
    : `${baseUrl}/api/generate`
}

// ==========================================
// HTTP ERROR HANDLING
// ==========================================

function getFriendlyHttpError(
  status: number,
  data?: Record<string, unknown> | null
): BotError {
  const code = String(data?.code ?? '')
  const debug =
    data?.debug && typeof data.debug === 'object'
      ? (data.debug as Record<string, unknown>)
      : undefined
  const diagnosticText = [code, debug?.code, debug?.message, debug?.cause]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (code === 'AI_DAILY_LIMIT' || /\b3036\b/.test(diagnosticText)) {
    return userError(
      'The daily free image limit has been reached. Please try again tomorrow, or use the Fast quality option, which uses less of the free allowance.',
      'server'
    )
  }

  if (code === 'AI_CAPACITY_EXCEEDED' || /\b3040\b/.test(diagnosticText)) {
    return userError(
      'The image model is currently busy. Please try again in a moment.',
      'server'
    )
  }

  if (code === 'AI_TIMEOUT' || /\b3007\b/.test(diagnosticText)) {
    return userError(MESSAGES.timeout, 'server')
  }

  if (code === 'CONTENT_FILTERED') {
    return userError(
      typeof data?.error === 'string'
        ? data.error
        : 'This request was blocked by the content filter. Please rephrase your prompt.',
      'invalid'
    )
  }

  if (code === 'INVALID_IMAGE' || code === 'UNSUPPORTED_IMAGE') {
    return userError(MESSAGES.invalidImage, 'invalid')
  }

  if (code === 'AI_MODEL_NOT_FOUND' || /\b5007\b/.test(diagnosticText)) {
    return userError(
      'The configured image model could not be found. Please check the Cloudflare Worker configuration.',
      'config'
    )
  }

  if (code === 'AI_BINDING_MISSING' || code === 'MISSING_CREDENTIALS') {
    return userError(
      'The Workers AI binding is missing. Configure a binding named AI in Cloudflare.',
      'config'
    )
  }

  if (code === 'AI_UPSTREAM_AUTH') {
    return userError(
      'The image service is not authorized. Please check the Worker credentials.',
      'config'
    )
  }

  if (code === 'ORIGIN_NOT_ALLOWED') {
    return userError(
      'This website is not allowed to use the image service. Check ALLOWED_ORIGINS in Cloudflare.',
      'server'
    )
  }

  if (status === 400 || status === 415 || status === 422) {
    return userError(
      typeof data?.error === 'string'
        ? data.error
        : 'We couldn’t process your request. Please check your prompt and reference images.',
      'invalid'
    )
  }

  if (status === 401) return userError(MESSAGES.unauthorized, 'server')
  if (status === 403) return userError(MESSAGES.forbidden, 'server')

  if (status === 413) {
    return userError(
      'Your reference images are too large. Please choose smaller images.',
      'invalid'
    )
  }

  if (status === 429) return userError(MESSAGES.rateLimit, 'server')
  if (status === 408 || status === 504) return userError(MESSAGES.timeout, 'server')

  if (status === 503) {
    return userError(
      'The image model is temporarily busy. Please try again shortly.',
      'server'
    )
  }

  if (typeof data?.error === 'string' && data.error.trim()) {
    return userError(data.error, 'server')
  }

  if (status >= 500) return userError(MESSAGES.server, 'server')
  return userError(MESSAGES.generic, 'server')
}

// ==========================================
// RESPONSE HELPERS
// ==========================================

async function readJsonResponse(
  response: Response
): Promise<Record<string, unknown> | null> {
  try {
    const data: unknown = await response.json()

    if (data && typeof data === 'object') {
      return data as Record<string, unknown>
    }

    return null
  } catch {
    return null
  }
}

function normalizeBase64(
  value: string,
  fallbackMime: string
): { data: string; mimeType: string } {
  const match = value.match(/^data:([^;,]+);base64,([\s\S]*)$/i)

  if (match) {
    return { mimeType: match[1].toLowerCase(), data: match[2] }
  }

  return { mimeType: fallbackMime, data: value }
}

function createImageResult(
  base64: string,
  fallbackMime = 'image/png',
  meta: Partial<GenerateResult> = {}
): GenerateResult {
  const normalized = normalizeBase64(base64, fallbackMime)

  if (!normalized.mimeType.startsWith('image/')) {
    throw userError(MESSAGES.missingImage, 'server')
  }

  let blob: Blob

  try {
    blob = b64ToBlob(normalized.data, normalized.mimeType)
  } catch {
    throw userError(MESSAGES.missingImage, 'server')
  }

  if (blob.size === 0) {
    throw userError(MESSAGES.missingImage, 'server')
  }

  return {
    ...meta,
    url: URL.createObjectURL(blob),
    temporary: true,
    mime: blob.type,
  }
}

function metaFrom(data: Record<string, unknown>): Partial<GenerateResult> {
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined)
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)

  return {
    seed: num(data.seed),
    model: str(data.model),
    quality: str(data.quality) as Quality | undefined,
    prompt: str(data.prompt),
    promptEnhanced:
      typeof data.promptEnhanced === 'boolean' ? data.promptEnhanced : undefined,
    width: num(data.width),
    height: num(data.height),
    requestId: str(data.requestId),
    processingTimeMs: num(data.processingTime),
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (signal.aborted) return resolve()
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true }
    )
  })
}

// ==========================================
// IMAGE GENERATION
// ==========================================

export async function generateImage(
  args: GenerateArgs
): Promise<GenerateResult> {
  if (!IMAGE_WORKER_URL) {
    throw userError(
      'Image generation is currently unavailable. Please try again later.',
      'config'
    )
  }

  const dimensionError = validateDimensions(args.width, args.height)

  if (dimensionError) {
    throw userError(dimensionError, 'invalid')
  }

  const width = snapDimension(args.width)
  const height = snapDimension(args.height)

  const prompt = args.prompt.trim()

  if (!prompt) {
    throw userError('Please describe the image you want to create.', 'invalid')
  }

  if (prompt.length > LIMITS.maxPromptLength) {
    throw userError(
      'Your description is too long. Please shorten it and try again.',
      'invalid'
    )
  }

  const references = args.references ?? []

  if (references.length > LIMITS.maxRefs) {
    throw userError(
      `You can use up to ${LIMITS.maxRefs} reference images per generation.`,
      'invalid'
    )
  }

  if (
    args.steps !== undefined &&
    (!Number.isInteger(args.steps) || args.steps < 1 || args.steps > 50)
  ) {
    throw userError('Steps must be a whole number between 1 and 50.', 'invalid')
  }

  if (
    args.guidance !== undefined &&
    (!Number.isFinite(args.guidance) || args.guidance < 0 || args.guidance > 20)
  ) {
    throw userError('Guidance must be a number between 0 and 20.', 'invalid')
  }

  if (
    args.seed !== undefined &&
    (!Number.isSafeInteger(args.seed) || args.seed < 0 || args.seed > 4_294_967_295)
  ) {
    throw userError('Seed must be a whole number between 0 and 4294967295.', 'invalid')
  }

  const timeout = withTimeout(args.signal, GENERATION_TIMEOUT_MS)

  try {
    // --------------------------------------
    // Prepare multipart request
    // --------------------------------------

    const formData = new FormData()

    formData.append('prompt', prompt)
    formData.append('width', String(width))
    formData.append('height', String(height))
    formData.append('quality', args.quality ?? 'balanced')
    formData.append('enhance', args.enhance ?? 'auto')

    if (args.steps !== undefined) formData.append('steps', String(args.steps))
    if (args.guidance !== undefined) formData.append('guidance', String(args.guidance))
    if (args.seed !== undefined) formData.append('seed', String(args.seed))

    // --------------------------------------
    // Process reference images (in parallel)
    // --------------------------------------

    const files = await Promise.all(
      references.map((reference, i) => resolveReference(reference, i))
    )

    if (timeout.signal.aborted) {
      throw timeout.timedOut()
        ? userError(MESSAGES.timeout, 'timeout')
        : userError('Image generation was cancelled.', 'aborted')
    }

    files.forEach((file, i) => {
      formData.append(`input_image_${i}`, file, file.name)
    })

    // --------------------------------------
    // Authentication
    // --------------------------------------

    let requestHeaders: Headers

    try {
      // Never set Content-Type manually for FormData: the browser must add
      // the multipart boundary automatically.
      requestHeaders = new Headers(await authHeaders())
      requestHeaders.delete('Content-Type')
    } catch (error) {
      console.error('[Forked Image] Authentication failed:', error)
      throw userError(MESSAGES.unauthorized, 'server')
    }

    // --------------------------------------
    // Send request (retries when the model is busy)
    // --------------------------------------

    let response: Response | null = null

    for (let attempt = 0; ; attempt++) {
      try {
        response = await fetch(getEndpoint(), {
          method: 'POST',
          signal: timeout.signal,
          headers: requestHeaders,
          body: formData,
        })
      } catch (error) {
        console.error('[Forked Image] Network request failed:', error)

        if (timeout.timedOut()) {
          throw userError(MESSAGES.timeout, 'server')
        }

        if (timeout.signal.aborted) {
          throw userError('Image generation was cancelled.', 'aborted')
        }

        throw userError(MESSAGES.network, 'server')
      }

      if (response.ok) break

      const errorData = await readJsonResponse(response)

      console.error('[Forked Image] Worker returned an error:', {
        status: response.status,
        error: errorData?.error ?? null,
        code: errorData?.code ?? null,
        requestId: errorData?.requestId ?? null,
        debug: errorData?.debug ?? null,
      })

      const busy =
        response.status === 503 || errorData?.code === 'AI_CAPACITY_EXCEEDED'

      if (busy && attempt < MAX_RETRIES && !timeout.signal.aborted) {
        await sleep(2000 * (attempt + 1), timeout.signal)
        continue
      }

      throw getFriendlyHttpError(response.status, errorData)
    }

    // --------------------------------------
    // Direct image response
    // --------------------------------------

    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.startsWith('image/')) {
      const blob = await response.blob()

      if (blob.size === 0) {
        throw userError(MESSAGES.missingImage, 'server')
      }

      return { url: URL.createObjectURL(blob), temporary: true, mime: blob.type }
    }

    // --------------------------------------
    // JSON response
    // --------------------------------------

    const data = await readJsonResponse(response)

    if (!data) {
      console.error('[Forked Image] Invalid JSON response.')
      throw userError(MESSAGES.server, 'server')
    }

    // Current Worker response.
    if (data.success === true && typeof data.image === 'string') {
      return createImageResult(
        data.image,
        typeof data.mimeType === 'string' ? data.mimeType : 'image/png',
        metaFrom(data)
      )
    }

    // Backward compatibility.
    const resultData = data.data as
      | { imageUrl?: string; imageBase64?: string; mimeType?: string }
      | undefined

    if (
      data.success === true &&
      resultData?.imageUrl &&
      /^https:\/\//i.test(resultData.imageUrl)
    ) {
      return { url: resultData.imageUrl, temporary: false }
    }

    if (data.success === true && typeof resultData?.imageBase64 === 'string') {
      return createImageResult(
        resultData.imageBase64,
        resultData.mimeType || 'image/png'
      )
    }

    console.error('[Forked Image] Worker returned no usable image.')
    throw userError(MESSAGES.missingImage, 'server')
  } catch (error) {
    if (error instanceof BotError) {
      throw error
    }

    console.error('[Forked Image] Unexpected generation error:', error)

    if (timeout.timedOut()) {
      throw userError(MESSAGES.timeout, 'server')
    }

    if (timeout.signal.aborted) {
      throw userError('Image generation was cancelled.', 'aborted')
    }

    throw userError(MESSAGES.generic, 'server')
  } finally {
    timeout.done()
  }
}
