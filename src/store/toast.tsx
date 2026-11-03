import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, Sparkles, TriangleAlert, X } from 'lucide-react'

type Kind = 'success' | 'info' | 'xp' | 'error'
interface Toast { id: number; kind: Kind; title: string; body?: string }
interface Ctx { toast: (t: Omit<Toast, 'id'>) => void }

const ToastCtx = createContext<Ctx>({ toast: () => {} })
export const useToast = () => useContext(ToastCtx)

const icon = (k: Kind) => (k === 'success' ? <CheckCircle2 size={18} /> : k === 'xp' ? <Sparkles size={18} /> : k === 'error' ? <TriangleAlert size={18} /> : <Info size={18} />)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), [])
  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setItems((l) => [...l.slice(-3), { ...t, id }])
    window.setTimeout(() => dismiss(id), 4500)
  }, [dismiss])
  const value = useMemo(() => ({ toast }), [toast])
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }} className={`toast toast--${t.kind}`}>
              <span className="toast__icon">{icon(t.kind)}</span>
              <div className="toast__text"><strong>{t.title}</strong>{t.body && <span>{t.body}</span>}</div>
              <button className="toast__x" onClick={() => dismiss(t.id)} aria-label="Dismiss notification"><X size={16} /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}
