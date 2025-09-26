import React, { useEffect, useRef, useState } from 'react'
import { Shield } from 'lucide-react'

export default function ConfirmLogout({ open, onClose, onConfirm, delaySeconds = 5, title = 'Are you sure, Do you want to logout?', confirmLabel = 'Logout' }) {
  const [secondsLeft, setSecondsLeft] = useState(delaySeconds)
  const [canAct, setCanAct] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setSecondsLeft(delaySeconds)
    setCanAct(false)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = Math.max(0, prev - 1)
        if (next === 0) {
          setCanAct(true)
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
        }
        return next
      })
    }, 1000)
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [open, delaySeconds])

  if (!open) return null

  return (
    <div className="fixed inset-0" style={{ zIndex: 3000 }} aria-modal="true" role="dialog">
      {/* backdrop */}
      <div
        className={`absolute inset-0 transition-opacity ${canAct ? 'opacity-100' : 'opacity-90'}`}
        style={{ backgroundColor: 'rgba(10, 13, 22, 0.65)' }}
        onClick={() => { if (canAct) onClose?.() }}
      />

      {/* modal */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          className="w-full max-w-md rounded-2xl shadow-2xl p-6 relative"
          style={{
            background: 'linear-gradient(180deg, rgba(16, 20, 32, 0.98) 0%, rgba(12, 16, 28, 0.98) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.45), 0 0 0 2px rgba(99,102,241,0.15) inset'
          }}
        >
          {/* icon header */}
          <div className="flex items-start gap-4 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}>
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <div className="text-xl font-extrabold tracking-tight text-white">{title}</div>
              <div className="text-sm" style={{ color: 'rgba(203,213,225,0.9)' }}>Please wait {secondsLeft}s before you can choose.</div>
            </div>
          </div>

          {/* progress */}
          <div className="w-full h-2 rounded-full overflow-hidden mb-5"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full transition-all duration-1000"
              style={{
                width: `${((delaySeconds - secondsLeft) / delaySeconds) * 100}%`,
                background: 'linear-gradient(90deg, #22c55e 0%, #3b82f6 50%, #8b5cf6 100%)',
                boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)'
              }}
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              className="btn"
              disabled={!canAct}
              style={{
                opacity: canAct ? 1 : 0.35,
                pointerEvents: canAct ? 'auto' : 'none',
                background: canAct ? '' : 'rgba(255,255,255,0.04)'
              }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!canAct}
              style={{ opacity: canAct ? 1 : 0.35, pointerEvents: canAct ? 'auto' : 'none' }}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}