import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useToast } from '../store/toast'

const PY = new Set(['def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'and', 'or', 'not', 'import', 'from', 'class', 'break', 'continue', 'True', 'False', 'None', 'print', 'range', 'len', 'input', 'int', 'type'])
const JS = new Set(['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'of', 'in', 'true', 'false', 'null', 'undefined', 'new', 'typeof', 'console', 'break', 'continue'])

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Tiny dependency-free highlighter: comments, strings, numbers, keywords. Good enough for lesson snippets. */
export function highlight(src: string, lang: string): string {
  if (lang === 'text') return esc(src)
  const kw = lang === 'python' ? PY : JS
  const comment = lang === 'python' ? '#' : '//'
  return src.split('\n').map((line) => {
    const ci = line.indexOf(comment)
    // ignore comment markers inside strings (simple heuristic)
    let code = line, cmt = ''
    if (ci >= 0) {
      const before = line.slice(0, ci)
      const quotes = (before.match(/["']/g) || []).length
      if (quotes % 2 === 0) { code = before; cmt = line.slice(ci) }
    }
    const out = esc(code).replace(/(&quot;|"[^"]*"|'[^']*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g, (m, str, num, word) => {
      if (str) return `<span class="tok-s">${m}</span>`
      if (num) return `<span class="tok-n">${m}</span>`
      if (word && kw.has(word)) return `<span class="tok-k">${m}</span>`
      return m
    })
    return out + (cmt ? `<span class="tok-c">${esc(cmt)}</span>` : '')
  }).join('\n')
}

export function CodeBlock({ lang, label, source }: { lang: string; label: string; source: string }) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const copy = async () => {
    try { await navigator.clipboard.writeText(source); setCopied(true); setTimeout(() => setCopied(false), 1600) }
    catch { toast({ kind: 'error', title: 'Could not copy', body: 'Your browser blocked clipboard access.' }) }
  }
  return (
    <figure className="codeblock" style={{ margin: 0 }}>
      <figcaption className="codeblock__bar">
        <span>{label}</span>
        <button onClick={copy} className="codecopy" aria-label="Copy code">{copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}</button>
      </figcaption>
      <pre tabIndex={0}><code dangerouslySetInnerHTML={{ __html: highlight(source, lang) }} /></pre>
    </figure>
  )
}
