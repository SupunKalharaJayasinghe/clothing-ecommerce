import { useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { loginUser, verifyTwoFA } from '../features/auth/authSlice'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { getNextFromSearch, getRegisterPathWithNext } from '../lib/nextParam'

export default function Login() {
  const dispatch = useAppDispatch()
  const nav = useNavigate()
  const location = useLocation()
  const { status, error, twoFA, user, hydrated } = useAppSelector(s => s.auth)

  // Determine where to go after successful auth
  const nextPath = useMemo(() => getNextFromSearch(location.search), [location.search])

  // If user is already authenticated after hydration, redirect away from login
  useEffect(() => {
    if (hydrated && user && !twoFA.required) {
      nav(nextPath, { replace: true })
    }
  }, [hydrated, user, twoFA.required, nextPath, nav])

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
    if (loginUser.fulfilled.match(res) && !res.payload?.twoFARequired) nav(nextPath, { replace: true })
  }

  async function onVerify(e) {
    e.preventDefault()
    if (!code.trim()) return
    const res = await dispatch(verifyTwoFA({ tmpToken: twoFA.tmpToken, code: code.trim(), remember }))
    if (verifyTwoFA.fulfilled.match(res)) nav(nextPath, { replace: true })
  }

  const inputCls = "input"

  return (
    <div className="container-app section max-w-sm">
      <h1 className="section-title">Login</h1>
      {nextPath !== '/' && (
        <p className="text-xs text-[--color-muted] mt-1">You’ll be returned to <span className="font-mono">{nextPath}</span> after login.</p>
      )}

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

          <div className="flex items-center justify-end">
            <Link to="/forgot-password" className="text-sm underline">Forgot password?</Link>
          </div>

          <button
            disabled={status === 'loading' || Object.keys(errors).length > 0}
            className="w-full btn btn-primary disabled:opacity-50"
          >
            {status === 'loading' ? 'Signing in…' : 'Login'}
          </button>

          <p className="text-sm mt-2">
            New here?{' '}
            <Link
              className="underline"
              to={getRegisterPathWithNext(nextPath)}
            >
              Create an account
            </Link>
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
            <button className="btn btn-primary" type="submit" disabled={status==='loading'}>
              {status==='loading' ? 'Verifying…' : 'Verify'}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => window.location.reload()}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
