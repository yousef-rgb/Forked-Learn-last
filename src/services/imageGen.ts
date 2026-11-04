
import { IMAGE_WORKER_URL } from '../lib/env'
import { BotError, authHeaders, withTimeout } from './botApi'

/**
 * Forked Image — Cloudflare Workers AI
 * Model: FLUX.2 Klein 9B
 *
 * Features:
 * - Reference images: File, Blob, Data URL, Blob URL and HTTPS.
 * - Automatic image resizing while preserving aspect ratio.
 * - Multipart image uploads.
 * - Friendly user-facing error messages.
 * - Detailed developer diagnostics.
 * - Backward-compatible response handling.
 */

export const LIMITS = {
  minSide: 256,
  maxSide: 1920,
  maxRefs: 4,
  maxFileBytes: 5 * 1024 * 1024,
  maxReferenceDimension: 511,
  types: ['image/png', 'image/jpeg', 'image/webp'] as string[],
}

export const GENERATION_TIMEOUT_MS = 120_000

export type Shape = 'square' | 'portrait' | 'landscape' | 'custom'

export const PRESETS: Record<
  Exclude<Shape, 'custom'>,
  { w: number; h: number; label: string }
> = {
  square: { w: 1024, h: 1024, label: 'Square' },
  portrait: { w: 768, h: 1024, label: 'Portrait' },
  landscape: { w: 1024, h: 768, label: 'Landscape' },
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

export function validateImageFile(file: File): string | null {
  if (!LIMITS.types.includes(file.type)) {
    return `${file.name || 'Image'}: Please upload a PNG, JPEG, or WebP image.`
  }

  if (file.size === 0) {
    return `${file.name || 'Image'}: This file appears to be empty.`
  }

  if (file.size > LIMITS.maxFileBytes) {
    return `${file.name || 'Image'}: The image must be smaller than 5 MB.`
  }

  return null
}

// ==========================================
// FRIENDLY ERRORS
// ==========================================

const MESSAGES = {
  generic:
    'We couldn’t create your image this time. Please try again in a moment.',

  network:
    'We’re having trouble connecting to the image service. Please check your internet connection and try again.',

  timeout:
    'Your image is taking longer than expected. Please try again.',

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
    'This image format isn’t supported. Please use PNG, JPEG, or WebP.',

  referenceRead:
    'We couldn’t access one of your reference images. Please upload it again.',

  missingImage:
    'Your image couldn’t be prepared successfully. Please try again.',
}

function userError(message: string, category = 'server'): BotError {
  return new BotError(category, message)
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

/**
 * Converts an existing image URL to Data URL.
 * Blob URLs are supported without requiring remote hosting.
 */
export async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    return url
  }

  if (
    !url.startsWith('blob:') &&
    !/^https:\/\//i.test(url)
  ) {
    throw userError(MESSAGES.referenceRead, 'invalid')
  }

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status}`)
    }

    const blob = await response.blob()

    if (!LIMITS.types.includes(blob.type)) {
      throw new Error('Unsupported image content type.')
    }

    if (
      blob.size === 0 ||
      blob.size > LIMITS.maxFileBytes
    ) {
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

function b64ToBlob(
  value: string,
  type = 'image/png'
): Blob {
  const cleanBase64 = value.replace(/\s/g, '')
  const binary = atob(cleanBase64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new Blob([bytes], { type })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(
    /^data:([^;,]+)?(;base64)?,([\s\S]*)$/i
  )

  if (!match) {
    throw userError(MESSAGES.invalidImage, 'invalid')
  }

  const mimeType = (match[1] || 'image/png').toLowerCase()
  const isBase64 = Boolean(match[2])
  const payload = match[3]

  if (!LIMITS.types.includes(mimeType)) {
    throw userError(MESSAGES.unsupportedImage, 'invalid')
  }

  try {
    if (isBase64) {
      return b64ToBlob(payload, mimeType)
    }

    return new Blob(
      [new TextEncoder().encode(decodeURIComponent(payload))],
      { type: mimeType }
    )
  } catch {
    throw userError(MESSAGES.invalidImage, 'invalid')
  }
}

// ==========================================
// IMAGE PROCESSING
// ==========================================

/**
 * Resizes reference images to less than 512x512.
 * Preserves the original aspect ratio.
 * Uses PNG output for consistent processing.
 */
export async function resizeReferenceImage(
  source: Blob
): Promise<Blob> {
  if (!LIMITS.types.includes(source.type)) {
    throw userError(MESSAGES.unsupportedImage, 'invalid')
  }

  if (
    source.size === 0 ||
    source.size > LIMITS.maxFileBytes
  ) {
    throw userError(MESSAGES.invalidImage, 'invalid')
  }

  let bitmap: ImageBitmap | null = null

  try {
    bitmap = await createImageBitmap(source)

    const maxDimension = LIMITS.maxReferenceDimension

    const scale = Math.min(
      1,
      maxDimension / bitmap.width,
      maxDimension / bitmap.height
    )

    const width = Math.max(
      1,
      Math.floor(bitmap.width * scale)
    )

    const height = Math.max(
      1,
      Math.floor(bitmap.height * scale)
    )

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas initialization failed.')
    }

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'

    context.drawImage(bitmap, 0, 0, width, height)

    const result = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Image encoding failed.'))
          }
        },
        'image/png'
      )
    })

    if (
      result.size === 0 ||
      result.size > LIMITS.maxFileBytes
    ) {
      throw new Error('Processed image size is invalid.')
    }

    return result
  } catch (error) {
    console.error('[Forked Image] Reference processing failed:', error)

    if (error instanceof BotError) {
      throw error
    }

    throw userError(MESSAGES.invalidImage, 'invalid')
  } finally {
    bitmap?.close()
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
    } else if (
      reference.startsWith('blob:') ||
      /^https:\/\//i.test(reference)
    ) {
      const response = await fetch(reference)

      if (!response.ok) {
        throw new Error(`Reference fetch failed: ${response.status}`)
      }

      source = await response.blob()
    } else {
      throw new Error('Unsupported reference source.')
    }

    if (!LIMITS.types.includes(source.type)) {
      throw userError(MESSAGES.unsupportedImage, 'invalid')
    }

    if (
      source.size === 0 ||
      source.size > LIMITS.maxFileBytes
    ) {
      throw userError(MESSAGES.invalidImage, 'invalid')
    }

    const prepared = await resizeReferenceImage(source)

    return new File(
      [prepared],
      `reference-${index + 1}.png`,
      { type: 'image/png' }
    )
  } catch (error) {
    console.error(
      `[Forked Image] Reference ${index + 1} failed:`,
      error
    )

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
}

export interface GenerateResult {
  url: string
  temporary: boolean
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

function getFriendlyHttpError(status: number): BotError {
  switch (status) {
    case 400:
    case 415:
    case 422:
      return userError(
        'We couldn’t process your request. Please check your prompt and reference images.',
        'invalid'
      )

    case 401:
      return userError(MESSAGES.unauthorized, 'server')

    case 403:
      return userError(MESSAGES.forbidden, 'server')

    case 413:
      return userError(
        'Your reference images are too large. Please choose smaller images.',
        'invalid'
      )

    case 429:
      return userError(MESSAGES.rateLimit, 'server')

    case 408:
      return userError(MESSAGES.timeout, 'server')

    default:
      if (status >= 500) {
        return userError(MESSAGES.server, 'server')
      }

      return userError(MESSAGES.generic, 'server')
  }
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

function normalizeBase64(value: string): {
  data: string
  mimeType: string
} {
  const match = value.match(
    /^data:([^;,]+);base64,([\s\S]*)$/i
  )

  if (match) {
    return {
      mimeType: match[1],
      data: match[2],
    }
  }

  return {
    mimeType: 'image/png',
    data: value,
  }
}

function createImageResult(
  base64: string,
  mimeType = 'image/png'
): GenerateResult {
  const normalized = normalizeBase64(base64)

  if (!LIMITS.types.includes(normalized.mimeType)) {
    throw userError(MESSAGES.missingImage, 'server')
  }

  const blob = b64ToBlob(
    normalized.data,
    normalized.mimeType || mimeType
  )

  if (blob.size === 0) {
    throw userError(MESSAGES.missingImage, 'server')
  }

  return {
    url: URL.createObjectURL(blob),
    temporary: true,
  }
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

  const dimensionError = validateDimensions(
    args.width,
    args.height
  )

  if (dimensionError) {
    throw userError(dimensionError, 'invalid')
  }

  const prompt = args.prompt.trim()

  if (!prompt) {
    throw userError(
      'Please describe the image you want to create.',
      'invalid'
    )
  }

  if (prompt.length > 2048) {
    throw userError(
      'Your description is too long. Please shorten it and try again.',
      'invalid'
    )
  }

  const references = args.references ?? []

  if (references.length > LIMITS.maxRefs) {
    throw userError(
      'You can use up to four reference images per generation.',
      'invalid'
    )
  }

  const timeout = withTimeout(
    args.signal,
    GENERATION_TIMEOUT_MS
  )

  try {
    // --------------------------------------
    // Prepare multipart request
    // --------------------------------------

    const formData = new FormData()

    formData.append('prompt', prompt)
    formData.append('width', String(args.width))
    formData.append('height', String(args.height))

    // --------------------------------------
    // Process reference images
    // --------------------------------------

    for (let i = 0; i < references.length; i++) {
      if (timeout.signal.aborted) {
        throw userError(MESSAGES.timeout, 'server')
      }

      const file = await resolveReference(
        references[i],
        i
      )

      formData.append(
        `input_image_${i}`,
        file,
        file.name
      )
    }

    // --------------------------------------
    // Authentication
    // --------------------------------------

    let requestHeaders: Headers

    try {
      // Convert any supported HeadersInit shape into a mutable Headers object.
      // Never set Content-Type manually for FormData: the browser must add
      // the multipart boundary automatically.
      requestHeaders = new Headers(await authHeaders())
      requestHeaders.delete('Content-Type')
    } catch (error) {
      console.error('[Forked Image] Authentication failed:', error)

      throw userError(MESSAGES.unauthorized, 'server')
    }

    // --------------------------------------
    // Send request
    // --------------------------------------

    let response: Response

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
        throw userError(
          'Image generation was cancelled.',
          'server'
        )
      }

      throw userError(MESSAGES.network, 'server')
    }

    // --------------------------------------
    // HTTP errors
    // --------------------------------------

    if (!response.ok) {
      const errorData = await readJsonResponse(response)

      console.error('[Forked Image] Worker returned an error:', {
        status: response.status,
        error: errorData?.error ?? null,
        code: errorData?.code ?? null,
        model: errorData?.model ?? null,
        debug: errorData?.debug ?? null,
      })

      throw getFriendlyHttpError(response.status)
    }

    // --------------------------------------
    // Direct image response
    // --------------------------------------

    const contentType =
      response.headers.get('content-type') ?? ''

    if (contentType.startsWith('image/')) {
      const blob = await response.blob()

      if (blob.size === 0) {
        throw userError(MESSAGES.missingImage, 'server')
      }

      return {
        url: URL.createObjectURL(blob),
        temporary: true,
      }
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
    if (
      data.success === true &&
      typeof data.image === 'string'
    ) {
      return createImageResult(
        data.image,
        typeof data.mimeType === 'string'
          ? data.mimeType
          : 'image/png'
      )
    }

    // Backward compatibility.
    const resultData = data.data as
      | {
          imageUrl?: string
          imageBase64?: string
          mimeType?: string
        }
      | undefined

    if (
      data.success === true &&
      resultData?.imageUrl &&
      /^https:\/\//i.test(resultData.imageUrl)
    ) {
      return {
        url: resultData.imageUrl,
        temporary: false,
      }
    }

    if (
      data.success === true &&
      typeof resultData?.imageBase64 === 'string'
    ) {
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
      throw userError(
        'Image generation was cancelled.',
        'server'
      )
    }

    throw userError(MESSAGES.generic, 'server')

  } finally {
    timeout.done()
  }
}
