import { useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { loginUser, verifyTwoFA, verifyEmailLogin, chooseLoginMethod, resendLoginEmailCode } from '../features/auth/authSlice'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { getNextFromSearch, getRegisterPathWithNext } from '../lib/nextParam'
import { APP_NAME } from '../lib/constants'
import TextField from '../components/ui/TextField'
import PasswordField from '../components/ui/PasswordField'
import { User as UserIcon } from '../lib/icons'

function ResendButton() {
  const dispatch = useAppDispatch()
  const { email, status } = useAppSelector(s => s.auth)
  const [cooldown, setCooldown] = useState(0)

  // initialize countdown from global state (first send and any resends)
  useEffect(() => {
    const until = email?.cooldownUntil || 0
    const now = Date.now()
    const remaining = Math.ceil((until - now) / 1000)
    setCooldown(remaining > 0 ? remaining : 0)
  }, [email?.cooldownUntil])

  // tick countdown every second
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  async function onResend() {
    if (!email?.tmpToken) return
    await dispatch(resendLoginEmailCode({ tmpToken: email.tmpToken }))
    setCooldown(30)
  }

  const disabled = status === 'loading' || cooldown > 0

  return (
    <button
      type="button"
      className="btn btn-plain text-sm"
      onClick={onResend}
      disabled={disabled}
      title={cooldown > 0 ? `Wait ${cooldown}s` : 'Resend code'}
    >
      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
    </button>
  )
}

export default function Login() {
  const dispatch = useAppDispatch()
  const nav = useNavigate()
  const location = useLocation()
const { status, error, methodChoice, twoFA, email, user, hydrated } = useAppSelector(s => s.auth)

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

  // step 2 forms
  const [code, setCode] = useState('')
  const [remember, setRemember] = useState(true)

  async function onSubmit(e) {
    e.preventDefault()
    setTouched({ identifier: true, password: true })
    if (Object.keys(errors).length) return
    const res = await dispatch(loginUser(form))
    if (
      loginUser.fulfilled.match(res) &&
      !res.payload?.chooseMethodRequired &&
      !res.payload?.twoFARequired &&
      !res.payload?.emailLoginRequired
    ) {
      nav(nextPath, { replace: true })
    }
  }

  async function onVerify(e) {
    e.preventDefault()
    if (!code.trim()) return
    const res = await dispatch(verifyTwoFA({ tmpToken: twoFA.tmpToken, code: code.trim(), remember }))
    if (verifyTwoFA.fulfilled.match(res)) nav(nextPath, { replace: true })
  }

  async function onVerifyEmail(e) {
    e.preventDefault()
    if (!code.trim()) return
    const res = await dispatch(verifyEmailLogin({ tmpToken: email.tmpToken, code: code.trim(), remember }))
    if (verifyEmailLogin.fulfilled.match(res)) {
      nav(nextPath, { replace: true })
    }
  }

  const inputCls = "input"

  async function onChoose(method) {
    if (!methodChoice?.tmpToken) return
    const res = await dispatch(chooseLoginMethod({ tmpToken: methodChoice.tmpToken, method }))
    // If fulfilled, next step (email or 2FA) will render automatically via state updates.
  }

  // Greeting based on local time
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 5) return 'Good night'
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    if (hour < 22) return 'Good evening'
    return 'Good night'
  }, [])

  return (
    <div className="container-app section">
      <div className="relative grid md:grid-cols-2 gap-8 items-start">
        {/* Vertical divider on large screens */}
        <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-px bg-[--color-border]" aria-hidden="true" />

        {/* Left: Greeting / Brand panel */}
        <section className="hidden md:block pr-8">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-[--color-text-medium]">{greeting},</p>
              <h1 className="text-4xl font-extrabold tracking-tight mt-1 text-[--color-text-high]">
                Welcome back
              </h1>
              <p className="text-[--color-text-medium] max-w-prose mt-2">
                Sign in to continue shopping with <span className="font-semibold text-[--color-text-high]">{APP_NAME}</span>.
                {nextPath !== '/' && (
                  <> You'll be returned to <span className="font-mono text-[--color-brand-400]">{nextPath}</span> after login.</>
                )}
              </p>
            </div>
            
            <div className="card p-6 bg-[--color-surface-glass] backdrop-blur-sm border border-[--color-border]">
              <div className="font-semibold mb-3 text-[--color-text-high]">Why sign in?</div>
              <ul className="text-sm space-y-2 text-[--color-text-medium]">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[--color-brand-500] rounded-full"></div>
                  Access orders and favorites
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[--color-brand-500] rounded-full"></div>
                  Faster checkout with saved details
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[--color-brand-500] rounded-full"></div>
                  Personalized recommendations
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Right: Auth forms */}
        <section className="md:justify-self-end w-full md:max-w-sm">
          <div className="card p-6">
            <h2 className="text-2xl font-bold text-[--color-text-high] mb-2">Login</h2>
            {nextPath !== '/' && (
              <p className="text-xs text-[--color-text-medium] mt-1 md:hidden">
                You'll be returned to <span className="font-mono text-[--color-brand-400]">{nextPath}</span> after login.
              </p>
            )}

            {methodChoice?.required ? (
              <div className="mt-6">
                <p className="text-sm text-[--color-text-medium] mb-3">Choose a verification method to continue:</p>
                {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
                <div className="grid gap-3">
                  <button type="button" className="btn btn-primary" onClick={() => onChoose('totp')} disabled={status==='loading'}>
                    Use Google Authenticator code
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => onChoose('email')} disabled={status==='loading'}>
                    Send a code to my email
                  </button>
                </div>
              </div>
            ) : email.required ? (
              <form onSubmit={onVerifyEmail} className="mt-6 form-grid">
                <p className="text-sm text-[--color-text-medium]">We sent a 6-digit verification code to your email. Enter it below to continue.</p>
                <TextField
                  label="Email verification code"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  required
                />
                <label className="flex items-center gap-2 text-sm text-[--color-text-medium]">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                  Don't ask for 30 days on this device
                </label>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                {/** resend status message could be shown via global toast; keep UI minimal here */}
                <div className="flex gap-2 items-center flex-wrap">
                  <button className="btn btn-primary" type="submit" disabled={status==='loading'}>
                    {status==='loading' ? 'Verifying…' : 'Verify'}
                  </button>
                  <button className="btn btn-outline" type="button" onClick={() => window.location.reload()}>
                    Cancel
                  </button>
                  <ResendButton />
                </div>
              </form>
            ) : !twoFA.required ? (
              <form onSubmit={onSubmit} className="mt-6 form-grid">
                <TextField
                  label="Username or Email"
                  value={form.identifier}
                  onChange={e => setForm({ ...form, identifier: e.target.value })}
                  onBlur={() => setTouched({ ...touched, identifier: true })}
                  autoComplete="username"
                  required
                  error={touched.identifier ? errors.identifier : ''}
                  Icon={UserIcon}
                />

                <PasswordField
                  label="Password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  onBlur={() => setTouched({ ...touched, password: true })}
                  autoComplete="current-password"
                  required
                  error={touched.password ? errors.password : ''}
                />

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <div className="flex items-center justify-between -mt-1">
                  <span />
                  <Link to="/forgot-password" className="text-sm text-[--color-brand-400] hover:text-[--color-brand-300] underline">Forgot password?</Link>
                </div>

                <button
                  disabled={status === 'loading' || Object.keys(errors).length > 0}
                  className="w-full btn btn-primary disabled:opacity-50"
                >
                  {status === 'loading' ? 'Signing in…' : 'Login'}
                </button>

                <p className="text-sm mt-2 text-[--color-text-medium]">
                  New here?{' '}
                  <Link
                    className="text-[--color-brand-400] hover:text-[--color-brand-300] underline"
                    to={getRegisterPathWithNext(nextPath)}
                  >
                    Create an account
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={onVerify} className="mt-6 form-grid">
                <p className="text-sm text-[--color-text-medium]">Two-step verification is enabled. Enter your 6-digit code (or a backup code).</p>
                <TextField
                  label="Verification code"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  required
                />
                <label className="flex items-center gap-2 text-sm text-[--color-text-medium]">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                  Don't ask for 30 days on this device
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
        </section>
      </div>
    </div>
  )
}
