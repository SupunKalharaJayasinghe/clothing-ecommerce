import React from 'react'

export default function ConfirmModal({ open, title = 'Confirm', description = '', confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, busy = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onCancel} />
      <div className="relative bg-[color:var(--surface)] border border-[color:var(--surface-border)] rounded-2xl shadow-2xl w-[min(520px,92vw)] p-6 animate-scale-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold">!</div>
          <h3 className="text-xl font-semibold text-[color:var(--text-primary)]">{title}</h3>
        </div>
        {description && <p className="text-[color:var(--text-secondary)] mb-6 whitespace-pre-line">{description}</p>}
        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-lg border border-[color:var(--surface-border)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-hover)] disabled:opacity-60"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelText}
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md hover:from-rose-600 hover:to-red-700 disabled:opacity-60"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
