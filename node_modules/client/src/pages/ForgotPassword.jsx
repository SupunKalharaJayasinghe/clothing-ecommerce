import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { forgotPassword } from '../features/auth/authSlice'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const dispatch = useAppDispatch()
  const { forgot, error } = useAppSelector(s => s.auth)
  const [identifier, setIdentifier] = useState('')

  const inputCls = "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"

  async function onSubmit(e) {
    e.preventDefault()
    if (!identifier.trim()) return
    await dispatch(forgotPassword({ identifier }))
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <p className="text-sm opacity-80 mt-1">Enter your username or email. If an account exists, we’ll send a reset link.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input className={inputCls} placeholder="Username or Email" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {forgot.message && <p className="text-green-600 text-sm">{forgot.message}</p>}

        {/* For local dev convenience only */}
        {forgot.devToken && (
          <div className="text-xs mt-2 p-2 border rounded">
            Dev token: <code>{forgot.devToken}</code><br/>
            Reset link: <Link className="underline" to={`/reset-password/${forgot.devToken}`}>Open reset form</Link>
          </div>
        )}

        <button className="w-full rounded-lg border py-2">
          {forgot.status === 'loading' ? 'Sending…' : 'Send reset link'}
        </button>

        <p className="text-sm mt-2"><Link className="underline" to="/login">Back to login</Link></p>
      </form>
    </div>
  )
}
