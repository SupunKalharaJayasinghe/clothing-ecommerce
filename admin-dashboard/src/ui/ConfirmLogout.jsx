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
    <div className="modal-overlay" aria-modal="true" role="dialog">
      {/* backdrop */}
      <div
        className={`modal-backdrop ${canAct ? 'active' : ''}`}
        onClick={() => { if (canAct) onClose?.() }}
      />

      {/* modal */}
      <div className="modal-container">
        <div className="confirm-modal">
          {/* icon header */}
          <div className="confirm-header">
            <div className="confirm-icon">
              <Shield size={22} />
            </div>
            <div className="confirm-text">
              <div className="confirm-title">{title}</div>
              <div className="confirm-subtitle">Please wait {secondsLeft}s before you can choose.</div>
            </div>
          </div>

          {/* progress */}
          <div className="confirm-progress">
            <div
              className="confirm-progress-bar"
              style={{ width: `${((delaySeconds - secondsLeft) / delaySeconds) * 100}%` }}
            />
          </div>

          <div className="confirm-actions">
            <button
              className={`btn btn-secondary ${!canAct ? 'disabled' : ''}`}
              disabled={!canAct}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`btn btn-danger ${!canAct ? 'disabled' : ''}`}
              disabled={!canAct}
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