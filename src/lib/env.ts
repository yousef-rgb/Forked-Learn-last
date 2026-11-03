/**
 * Runtime configuration for the AI Bot. Every URL comes from the environment, never from source code.
 *
 * NOTE: anything named VITE_* is bundled into the browser. That is fine for URLs, but secrets
 * (Cloudflare API token, account id, model name) must live ONLY on the backend / Worker.
 */
const clean = (v: string | undefined) => (v ?? '').trim().replace(/\/+$/, '')

/** Base URL of the chat backend, e.g. https://your-backend.example.com/api (expects POST {base}/chat). */
export const API_BASE_URL = clean(import.meta.env.VITE_API_BASE_URL)
/** Full URL of the Cloudflare Worker that generates images (expects POST {url}). */
export const IMAGE_WORKER_URL = clean(import.meta.env.VITE_IMAGE_WORKER_URL)

export const isChatConfigured = API_BASE_URL.length > 0
export const isImageConfigured = IMAGE_WORKER_URL.length > 0
