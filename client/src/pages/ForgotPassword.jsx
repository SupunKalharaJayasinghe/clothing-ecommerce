import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { forgotPassword } from '../features/auth/authSlice'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, Key } from '../lib/icons'
import TextField from '../components/ui/TextField'

export default function ForgotPassword() {
  const dispatch = useAppDispatch()
  const { forgot, error } = useAppSelector(s => s.auth)
  const [identifier, setIdentifier] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    if (!identifier.trim()) return
    await dispatch(forgotPassword({ identifier }))
  }

  return (
    <div className="container-app section">
      <div className="max-w-md mx-auto">
        <div className="card p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[--color-brand-600] to-[--color-brand-500] flex items-center justify-center shadow-lg">
              <Key size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[--color-text-high] mb-2">Forgot password?</h1>
            <p className="text-[--color-text-medium]">
              Enter your username or email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <TextField
              label="Username or Email"
              placeholder="Enter your username or email"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              Icon={Mail}
              required
            />

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {forgot.message && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-green-400 text-sm">{forgot.message}</p>
              </div>
            )}

            {/* For local dev convenience only */}
            {import.meta.env.DEV && forgot.devToken && (
              <div className="p-3 rounded-lg bg-[--color-surface-glass] border border-[--color-border] backdrop-blur-sm">
                <div className="text-xs text-[--color-text-medium]">
                  <p className="mb-1">Dev token: <code className="text-[--color-brand-400]">{forgot.devToken}</code></p>
                  <Link 
                    className="text-[--color-brand-400] hover:text-[--color-brand-300] underline" 
                    to={`/reset-password/${forgot.devToken}`}
                  >
                    Open reset form
                  </Link>
                </div>
              </div>
            )}

            <button 
              className="w-full btn btn-primary py-3 text-base font-semibold"
              disabled={forgot.status === 'loading' || !identifier.trim()}
            >
              {forgot.status === 'loading' ? 'Sending…' : 'Send reset link'}
            </button>

            <div className="text-center pt-4">
              <Link 
                className="inline-flex items-center gap-2 text-sm text-[--color-text-medium] hover:text-[--color-text-high] transition-colors"
                to="/login"
              >
                <ArrowLeft size={16} />
                Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
