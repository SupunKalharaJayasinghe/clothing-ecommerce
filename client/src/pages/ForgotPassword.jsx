import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { forgotPassword } from '../features/auth/authSlice'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const dispatch = useAppDispatch()
  const { forgot, error } = useAppSelector(s => s.auth)
  const [identifier, setIdentifier] = useState('')

  const inputCls = "input"

  async function onSubmit(e) {
    e.preventDefault()
    if (!identifier.trim()) return
    await dispatch(forgotPassword({ identifier }))
  }

  return (
    <div className="container-app section max-w-sm">
      <h1 className="section-title">Forgot password</h1>
      <p className="text-sm opacity-80 mt-1">Enter your username or email. If an account exists, we’ll send a reset link.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input className={inputCls} placeholder="Username or Email" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {forgot.message && <p className="text-green-600 text-sm">{forgot.message}</p>}

        {/* For local dev convenience only */}
        {forgot.devToken && (
          <div className="text-xs mt-2 card">
            <div className="card-body p-2">
            Dev token: <code>{forgot.devToken}</code><br/>
            Reset link: <Link className="underline" to={`/reset-password/${forgot.devToken}`}>Open reset form</Link>
            </div>
          </div>
        )}

        <button className="w-full btn btn-primary">
          {forgot.status === 'loading' ? 'Sending…' : 'Send reset link'}
        </button>

        <p className="text-sm mt-2"><Link className="underline" to="/login">Back to login</Link></p>
      </form>
    </div>
  )
}
