import React, { useState } from 'react'
import { useAuth } from '../state/auth'

export default function LoginPage() {
  const { login } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(identifier, password)
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm p-6 border rounded-lg">
        <h1 className="text-xl font-semibold mb-4">Admin Login</h1>
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        <label className="block text-sm mb-1">Email or Username</label>
        <input className="w-full border px-3 py-2 rounded mb-3" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
        <label className="block text-sm mb-1">Password</label>
        <input type="password" className="w-full border px-3 py-2 rounded mb-4" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full bg-black text-white py-2 rounded disabled:opacity-50" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
