import { Copy, Download, Pencil, RefreshCw, Trash2, TriangleAlert } from 'lucide-react'
import type { Gen } from '../../store/useBot'
import { GenLoader } from './GenLoader'

interface Props {
  gen: Gen; at: number
  onCancel: () => void; onRegenerate: () => void; onEdit: () => void; onDelete: () => void; onCopy: (t: string) => void
}

async function download(url: string, name: string) {
  try {
    const blob = await (await fetch(url)).blob()
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name
    document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  } catch { window.open(url, '_blank', 'noopener,noreferrer') } // cross-origin without CORS: let the browser handle it
}

export function ImageCard({ gen, at, onCancel, onRegenerate, onEdit, onDelete, onCopy }: Props) {
  const shown = gen.enhanced ?? gen.prompt
  const time = new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return (
    <figure className="imgcard">
      {gen.status === 'loading' && <GenLoader width={gen.width} height={gen.height} onCancel={onCancel} />}
      {gen.status === 'done' && gen.url && <img src={gen.url} alt={shown} width={gen.width} height={gen.height} className="imgcard__img" loading="lazy" decoding="async" />}
      {(gen.status === 'error' || gen.status === 'cancelled') && (
        <div className="imgcard__fail" role="alert">
          <TriangleAlert size={22} />
          <strong>{gen.status === 'cancelled' ? 'Generation cancelled' : 'Could not create the image'}</strong>
          {gen.error && <span className="muted">{gen.error}</span>}
        </div>
      )}
      <figcaption className="imgcard__cap">
        <p className="imgcard__prompt" dir="auto" title={shown}>{shown}</p>
        <div className="imgcard__row">
          <span className="chip chip--soft">{gen.kind === 'edit' ? 'Edit' : 'Image'} · {gen.width}×{gen.height}</span>
          <time className="mono muted" style={{ fontSize: '0.72rem' }}>{time}</time>
        </div>
        {gen.status !== 'loading' && (
          <div className="imgcard__actions">
            {gen.status === 'done' && gen.url && <button type="button" className="btn btn--ghost btn--sm" onClick={() => void download(gen.url!, `forked-ai-${at}.png`)}><Download size={14} /> Download</button>}
            <button type="button" className="btn btn--ghost btn--sm" onClick={onRegenerate}><RefreshCw size={14} /> Regenerate</button>
            {gen.status === 'done' && <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit}><Pencil size={14} /> Edit</button>}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onCopy(shown)}><Copy size={14} /> Copy prompt</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onDelete} aria-label="Remove image from chat"><Trash2 size={14} /></button>
          </div>
        )}
      </figcaption>
    </figure>
  )
}
