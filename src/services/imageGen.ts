
import { IMAGE_WORKER_URL } from '../lib/env'
import { BotError, authHeaders, networkError, statusToError, withTimeout } from './botApi'

/** Documented limits of @cf/black-forest-labs/flux-2-klein-4b. */
export const LIMITS = {
  minSide: 256,
  maxSide: 1920,
  maxRefs: 4,
  maxFileBytes: 5 * 1024 * 1024,
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

export function validateDimensions(w: number, h: number): string | null {
  if (!Number.isInteger(w) || !Number.isInteger(h)) {
    return 'Width and height must be whole numbers.'
  }

  if (
    w < LIMITS.minSide ||
    h < LIMITS.minSide ||
    w > LIMITS.maxSide ||
    h > LIMITS.maxSide
  ) {
    return `Width and height must be between ${LIMITS.minSide} and ${LIMITS.maxSide} px.`
  }

  return null
}

export function validateImageFile(f: File): string | null {
  if (!LIMITS.types.includes(f.type)) {
    return `${f.name}: only PNG, JPEG or WebP images are supported.`
  }

  if (f.size > LIMITS.maxFileBytes) {
    return `${f.name}: larger than ${LIMITS.maxFileBytes / 1024 / 1024} MB.`
  }

  if (f.size === 0) {
    return `${f.name}: the file is empty.`
  }

  return null
}

export const fileToDataUrl = (f: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()

    r.onload = () => resolve(String(r.result))

    r.onerror = () =>
      reject(
        new BotError('invalid', 'Could not read the image file.')
      )

    r.readAsDataURL(f)
  })

/**
 * Reads a previously generated image back
 * so it can be used as an edit reference.
 */
export async function urlToDataUrl(url: string): Promise<string> {
  try {
    // Data URLs can be read directly without fetch.
    if (url.startsWith('data:')) {
      return url
    }

    const res = await fetch(url)

    if (!res.ok) {
      throw new Error(String(res.status))
    }

    return await fileToDataUrl(await res.blob())
  } catch {
    throw new BotError(
      'invalid',
      'Could not read the previous image to edit it. Upload it again as a reference.'
    )
  }
}

export interface GenerateArgs {
  prompt: string
  width: number
  height: number
  references?: string[]
  sessionId: string
  signal?: AbortSignal
}

export interface GenerateResult {
  url: string
  temporary: boolean
}

const b64ToBlob = (b64: string, type = 'image/png') => {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)

  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i)
  }

  return new Blob([bytes], { type })
}

/**
 * Converts a Base64 or regular Data URL directly to Blob.
 * Does not use fetch(), avoiding CSP connect-src restrictions.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(
    /^data:([^;,]+)?(;base64)?,(.*)$/s
  )

  if (!match) {
    throw new BotError(
      'invalid',
      'Invalid reference image format.'
    )
  }

  const mimeType = match[1] || 'image/png'
  const isBase64 = Boolean(match[2])
  const payload = match[3]

  try {
    if (isBase64) {
      return b64ToBlob(payload, mimeType)
    }

    const decoded = decodeURIComponent(payload)

    return new Blob(
      [new TextEncoder().encode(decoded)],
      { type: mimeType }
    )
  } catch {
    throw new BotError(
      'invalid',
      'Could not decode the reference image.'
    )
  }
}

/**
 * Cloudflare Worker contract:
 *
 * POST {VITE_IMAGE_WORKER_URL}/api/generate
 *
 * FormData:
 *   prompt
 *   width
 *   height
 *   input_image_0 ... input_image_3 (optional)
 *
 * Authorization: Bearer <Supabase access token>
 *
 * Response:
 *   { success: true, image: "<base64>" }
 */

export async function generateImage(
  a: GenerateArgs
): Promise<GenerateResult> {
  if (!IMAGE_WORKER_URL) {
    throw new BotError(
      'config',
      'Image generation is not configured (VITE_IMAGE_WORKER_URL is missing).'
    )
  }

  const dimErr = validateDimensions(a.width, a.height)

  if (dimErr) {
    throw new BotError('invalid', dimErr)
  }

  if (!a.prompt.trim()) {
    throw new BotError(
      'invalid',
      'Describe the image you want first.'
    )
  }

  if ((a.references?.length ?? 0) > LIMITS.maxRefs) {
    throw new BotError(
      'invalid',
      `You can use at most ${LIMITS.maxRefs} reference images.`
    )
  }

  const t = withTimeout(a.signal, GENERATION_TIMEOUT_MS)

  try {
    // Prepare multipart form data
    const formData = new FormData()

    formData.append('prompt', a.prompt.trim())
    formData.append('width', String(a.width))
    formData.append('height', String(a.height))

    // Convert reference images into files
    for (let i = 0; i < (a.references?.length ?? 0); i++) {
      const reference = a.references![i]

      let blob: Blob

      if (reference.startsWith('data:')) {
        // Decode Base64 directly without fetch()
        blob = dataUrlToBlob(reference)
      } else if (
        reference.startsWith('blob:') ||
        /^https?:\/\//i.test(reference)
      ) {
        // Read Blob URLs or supported remote image URLs
        const response = await fetch(reference, {
          signal: t.signal,
        })

        if (!response.ok) {
          throw new BotError(
            'invalid',
            `Could not read reference image ${i + 1}.`
          )
        }

        blob = await response.blob()
      } else {
        throw new BotError(
          'invalid',
          `Reference image ${i + 1} has an unsupported URL format.`
        )
      }

      const file = new File(
        [blob],
        `reference-${i}.png`,
        {
          type: blob.type || 'image/png',
        }
      )

      const fileError = validateImageFile(file)

      if (fileError) {
        throw new BotError('invalid', fileError)
      }

      formData.append(`input_image_${i}`, file)
    }

    // Build the correct Worker endpoint
    const baseUrl = IMAGE_WORKER_URL.replace(/\/+$/, '')

    const endpoint = baseUrl.endsWith('/api/generate')
      ? baseUrl
      : `${baseUrl}/api/generate`

    // Send request to Cloudflare Worker
    const res = await fetch(endpoint, {
      method: 'POST',
      signal: t.signal,
      headers: {
        ...(await authHeaders()),
      },
      body: formData,
    })

    const type = res.headers.get('content-type') ?? ''

    // Handle HTTP errors
    if (!res.ok) {
      const body = type.includes('json')
        ? (await res.json().catch(() => null)) as {
            message?: string
            error?: string
          } | null
        : null

      throw statusToError(
        res.status,
        body?.message || body?.error
      )
    }

    // Handle direct image responses
    if (type.startsWith('image/')) {
      return {
        url: URL.createObjectURL(await res.blob()),
        temporary: true,
      }
    }

    // Handle JSON responses
    const body = await res.json().catch(() => null) as {
      success?: boolean
      image?: string
      message?: string
      error?: string
      data?: {
        imageUrl?: string
        imageBase64?: string
        mimeType?: string
      }
    } | null

    // Current Cloudflare Worker response
    if (body?.success && body.image) {
      return {
        url: URL.createObjectURL(
          b64ToBlob(body.image)
        ),
        temporary: true,
      }
    }

    // Backward compatibility: previous image URL format
    const d = body?.data

    if (
      body?.success &&
      d?.imageUrl &&
      /^https:\/\//i.test(d.imageUrl)
    ) {
      return {
        url: d.imageUrl,
        temporary: false,
      }
    }

    // Backward compatibility: previous Base64 format
    if (body?.success && d?.imageBase64) {
      return {
        url: URL.createObjectURL(
          b64ToBlob(
            d.imageBase64.replace(/^data:[^,]+,/, ''),
            d.mimeType
          )
        ),
        temporary: true,
      }
    }

    throw new BotError(
      'server',
      body?.message ||
        body?.error ||
        'The image service returned no image. Please try again.'
    )

  } catch (e) {
    if (e instanceof BotError) {
      throw e
    }

    throw networkError(
      t.timedOut(),
      t.signal.aborted && !t.timedOut()
    )

  } finally {
    t.done()
  }
}
