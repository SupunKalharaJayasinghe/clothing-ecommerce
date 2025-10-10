import { createRoot } from 'react-dom/client'
import React, { useEffect, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'

export function confirmDialog({ title = 'Confirm', description = '', confirmText = 'Confirm', cancelText = 'Cancel' }) {
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    function Cleanup() {
      useEffect(() => () => { try { root.unmount(); host.remove() } catch (_) {} }, [])
      return null
    }

    function App() {
      const [open, setOpen] = useState(true)
      const [busy, setBusy] = useState(false)
      const close = (val) => {
        setOpen(false)
        setTimeout(() => resolve(val), 10)
      }
      const onConfirm = async () => {
        setBusy(true)
        close(true)
      }
      const onCancel = () => close(false)
      return (
        <>
          <Cleanup />
          <ConfirmModal open={open} title={title} description={description} confirmText={confirmText} cancelText={cancelText} busy={busy} onConfirm={onConfirm} onCancel={onCancel} />
        </>
      )
    }

    root.render(<App />)
  })
}
