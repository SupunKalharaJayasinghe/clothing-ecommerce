import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { loginUser } from '../features/auth/authSlice'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const dispatch = useAppDispatch()
  const nav = useNavigate()
  const { status, error } = useAppSelector(s => s.auth)

  const [form, setForm] = useState({ identifier: '', password: '' })
  const [touched, setTouched] = useState({})

  const errors = {}
  if (!form.identifier.trim()) errors.identifier = 'Username or email is required'
  if (!form.password) errors.password = 'Password is required'

  async function onSubmit(e) {
    e.preventDefault()
    setTouched({ identifier: true, password: true })
    if (Object.keys(errors).length) return
    const res = await dispatch(loginUser(form))
    if (loginUser.fulfilled.match(res)) nav('/')
  }

  const inputCls = "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Login</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <div>
          <label className="block text-sm mb-1">Username or Email</label>
          <input
            className={inputCls}
            value={form.identifier}
            onChange={e => setForm({ ...form, identifier: e.target.value })}
            onBlur={() => setTouched({ ...touched, identifier: true })}
            autoComplete="username"
            required
          />
          {touched.identifier && errors.identifier && <p className="text-red-600 text-sm mt-1">{errors.identifier}</p>}
        </div>

        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            className={inputCls}
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onBlur={() => setTouched({ ...touched, password: true })}
            autoComplete="current-password"
            required
          />
          {touched.password && errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          disabled={status === 'loading' || Object.keys(errors).length > 0}
          className="w-full rounded-lg border py-2 disabled:opacity-50"
        >
          {status === 'loading' ? 'Signing in…' : 'Login'}
        </button>

        <p className="text-sm mt-2">
          New here? <Link className="underline" to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  )
}
