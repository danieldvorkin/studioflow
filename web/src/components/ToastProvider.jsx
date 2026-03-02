/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const removeToast = useCallback((id) => {
    const existing = timersRef.current.get(id)
    if (existing?.auto) clearTimeout(existing.auto)
    if (existing?.hard) clearTimeout(existing.hard)
    timersRef.current.delete(id)
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const scheduleAutoRemoval = useCallback(
    (id, delayMs) => {
      const existing = timersRef.current.get(id)
      if (existing?.auto) clearTimeout(existing.auto)

      const auto = setTimeout(() => {
        removeToast(id)
      }, delayMs)

      timersRef.current.set(id, { auto, hard: existing?.hard || null })
    },
    [removeToast]
  )

  const scheduleHardRemoval = useCallback(
    (id, delayMs) => {
      const existing = timersRef.current.get(id)
      if (existing?.hard) clearTimeout(existing.hard)

      const hard = setTimeout(() => {
        removeToast(id)
      }, delayMs)

      timersRef.current.set(id, { auto: existing?.auto || null, hard })
    },
    [removeToast]
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const entry of timers.values()) {
        if (entry?.auto) clearTimeout(entry.auto)
        if (entry?.hard) clearTimeout(entry.hard)
      }
      timers.clear()
    }
  }, [])

  const addToast = useCallback(
    ({ message, type = 'success', duration }) => {
      const effectiveDurationMs =
        typeof duration === 'number'
          ? duration
          : type === 'error'
            ? 10_000
            : 6_000

      const maxLifetimeMs = type === 'error' ? 30_000 : 15_000

      const id = ++idCounter
      const now = Date.now()

      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          type,
          remainingMs: effectiveDurationMs,
          maxLifetimeMs,
          createdAt: now,
          startedAt: now,
          isPaused: false,
        },
      ])

      scheduleAutoRemoval(id, effectiveDurationMs)
      scheduleHardRemoval(id, maxLifetimeMs)
    },
    [scheduleAutoRemoval, scheduleHardRemoval]
  )

  const pauseToast = useCallback((id) => {
    const existing = timersRef.current.get(id)
    if (existing?.auto) clearTimeout(existing.auto)
    timersRef.current.set(id, { auto: null, hard: existing?.hard || null })

    setToasts((prev) =>
      prev.map((t) => {
        if (t.id !== id || t.isPaused) return t
        const now = Date.now()
        const elapsedMs = t.startedAt ? now - t.startedAt : 0
        const remainingMs = Math.max((t.remainingMs ?? 0) - elapsedMs, 0)
        return { ...t, isPaused: true, remainingMs, startedAt: null }
      })
    )
  }, [])

  const resumeToast = useCallback(
    (id) => {
      let remainingToSchedule = null
      let hardRemainingMs = null

      setToasts((prev) =>
        prev.map((t) => {
          if (t.id !== id || !t.isPaused) return t
          const remainingMs = Math.max(t.remainingMs ?? 0, 0)
          remainingToSchedule = remainingMs
          const maxLifetimeMs = Math.max(t.maxLifetimeMs ?? 0, 0)
          const createdAt = t.createdAt
          if (createdAt && maxLifetimeMs > 0) {
            hardRemainingMs = Math.max((createdAt + maxLifetimeMs) - Date.now(), 0)
          }
          return { ...t, isPaused: false, startedAt: Date.now() }
        })
      )

      if (remainingToSchedule == null) return

      if (hardRemainingMs != null && hardRemainingMs <= 0) {
        removeToast(id)
        return
      }

      if (remainingToSchedule <= 0) {
        removeToast(id)
        return
      }

      const delayMs = hardRemainingMs == null ? remainingToSchedule : Math.min(remainingToSchedule, hardRemainingMs)
      if (delayMs <= 0) {
        removeToast(id)
        return
      }

      scheduleAutoRemoval(id, delayMs)
    },
    [removeToast, scheduleAutoRemoval]
  )

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-end gap-2 p-4 sm:items-center">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onMouseEnter={() => pauseToast(toast.id)}
            onMouseLeave={() => resumeToast(toast.id)}
            className={`pointer-events-auto w-full max-w-sm rounded-lg border px-3 py-2 text-sm shadow-lg backdrop-blur ${toast.type === 'error'
              ? 'border-rose-500/60 bg-rose-950/80 text-rose-50'
              : 'border-emerald-500/60 bg-emerald-950/80 text-emerald-50'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
