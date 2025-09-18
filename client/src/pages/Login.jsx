import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { loginUser, verifyTwoFA } from '../features/auth/authSlice'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const dispatch = useAppDispatch()
  const nav = useNavigate()
  const { status, error, twoFA } = useAppSelector(s => s.auth)

  // step 1 form
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [touched, setTouched] = useState({})
  const errors = {}
  if (!form.identifier.trim()) errors.identifier = 'Username or email is required'
  if (!form.password) errors.password = 'Password is required'

  // step 2 form
  const [code, setCode] = useState('')
  const [remember, setRemember] = useState(true)

  async function onSubmit(e) {
    e.preventDefault()
    setTouched({ identifier: true, password: true })
    if (Object.keys(errors).length) return
    const res = await dispatch(loginUser(form))
    if (loginUser.fulfilled.match(res) && !res.payload?.twoFARequired) nav('/')
  }

  async function onVerify(e) {
    e.preventDefault()
    if (!code.trim()) return
    const res = await dispatch(verifyTwoFA({ tmpToken: twoFA.tmpToken, code: code.trim(), remember }))
    if (verifyTwoFA.fulfilled.match(res)) nav('/')
  }

  const inputCls = "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Login</h1>

      {!twoFA.required ? (
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

          <div className="flex items-center justify-between">
            <Link to="/forgot-password" className="text-sm underline">Forgot password?</Link>
          </div>

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
      ) : (
        <form onSubmit={onVerify} className="mt-6 space-y-3">
          <p className="text-sm">Two-step verification is enabled. Enter your 6-digit code (or a backup code).</p>
          <input
            className={inputCls}
            placeholder="Enter 6-digit code"
            value={code}
            onChange={e => setCode(e.target.value)}
            autoFocus
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            Don’t ask for 30 days on this device
          </label>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button className="rounded-lg border px-3 py-2" type="submit" disabled={status==='loading'}>
              {status==='loading' ? 'Verifying…' : 'Verify'}
            </button>
            <button className="rounded-lg border px-3 py-2" type="button" onClick={() => window.location.reload()}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
