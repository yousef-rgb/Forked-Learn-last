import { Fragment, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { highlight } from '../CodeBlock'

/**
 * Small, dependency-free Markdown renderer that builds React elements (never raw HTML), so model output
 * cannot inject markup or scripts. Supports headings, lists, quotes, fenced code, **bold**, *italic*, `code`, [links](https://…).
 */
function Inline({ text }: { text: string }) {
  const out: ReactNode[] = []
  const re = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[[^\]\n]+\]\((https?:\/\/[^\s)]+)\))/g
  let last = 0, m: RegExpExecArray | null, i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (m[1]) out.push(<code key={i++} className="md-code">{t.slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={i++}>{t.slice(2, -2)}</strong>)
    else if (m[3]) out.push(<em key={i++}>{t.slice(1, -1)}</em>)
    else out.push(<a key={i++} href={m[5]} target="_blank" rel="noopener noreferrer">{t.slice(1, t.indexOf(']'))}</a>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}

function Fence({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const l = /^(py|python)$/i.test(lang) ? 'python' : /^(js|javascript|ts|typescript|jsx|tsx)$/i.test(lang) ? 'js' : 'text'
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ } }
  return (
    <div className="codeblock md-fence" dir="ltr">
      <div className="codeblock__bar"><span>{lang || 'code'}</span><button type="button" className="linkbtn" onClick={copy} aria-label="Copy code">{copied ? <Check size={14} /> : <Copy size={14} />}</button></div>
      <pre><code dangerouslySetInnerHTML={{ __html: highlight(code, l) }} /></pre>
    </div>
  )
}

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0, k = 0
  while (i < lines.length) {
    const line = lines[i]
    const fence = line.match(/^```\s*([\w+-]*)/)
    if (fence) {
      const buf: string[] = []; i++
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++])
      i++; blocks.push(<Fence key={k++} lang={fence[1]} code={buf.join('\n')} />); continue
    }
    const h = line.match(/^(#{1,4})\s+(.*)/)
    if (h) { blocks.push(<p key={k++} className="md-h" dir="auto"><Inline text={h[2]} /></p>); i++; continue }
    if (/^\s*([-*•])\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line); const items: string[] = []
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*([-*•])\s+/).test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ''))
      const L = ordered ? 'ol' : 'ul'
      blocks.push(<L key={k++} className="md-list" dir="auto">{items.map((t, n) => <li key={n}><Inline text={t} /></li>)}</L>); continue
    }
    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''))
      blocks.push(<blockquote key={k++} className="md-quote" dir="auto"><Inline text={buf.join(' ')} /></blockquote>); continue
    }
    if (!line.trim()) { i++; continue }
    const buf: string[] = []
    while (i < lines.length && lines[i].trim() && !/^```|^#{1,4}\s|^\s*([-*•]|\d+[.)])\s+|^>/.test(lines[i])) buf.push(lines[i++])
    blocks.push(<p key={k++} dir="auto">{buf.map((t, n) => <Fragment key={n}>{n > 0 && <br />}<Inline text={t} /></Fragment>)}</p>)
  }
  return <div className="md">{blocks}</div>
}
