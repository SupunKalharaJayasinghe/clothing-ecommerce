import React, { useState } from 'react'
import { useAuth } from '../state/auth'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const { login, verifyEmailLogin, emailStep } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await login(identifier, password)
      if (!res?.emailLoginRequired) {
        navigate('/')
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const onVerify = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      await verifyEmailLogin(code.trim())
      navigate('/')
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      {!emailStep.required ? (
        <form onSubmit={onSubmit} className="w-full max-w-sm p-6 border rounded-lg">
          <h1 className="text-xl font-semibold mb-4">Admin Login</h1>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <label className="block text-sm mb-1">Email or Username</label>
          <input className="w-full input mb-3" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
          <label className="block text-sm mb-1">Password</label>
          <input type="password" className="w-full input mb-4" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="w-full btn btn-primary disabled:opacity-50" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      ) : (
        <form onSubmit={onVerify} className="w-full max-w-sm p-6 border rounded-lg">
          <h1 className="text-xl font-semibold mb-4">Verify your email</h1>
          <p className="text-sm text-[--color-text-medium] mb-3">We've sent a 6-digit code to your email. Enter it below to continue.</p>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <label className="block text-sm mb-1">Verification code</label>
          <input className="w-full input mb-4" value={code} onChange={e=>setCode(e.target.value)} placeholder="123456" />
          <div className="flex gap-2">
            <button className="btn btn-primary disabled:opacity-50" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button type="button" className="btn" onClick={() => window.location.reload()}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
