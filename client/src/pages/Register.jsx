import { useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { registerUser, verifyEmailRegister } from '../features/auth/authSlice'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { getNextFromSearch, getLoginPathWithNext } from '../lib/nextParam'
import { APP_NAME } from '../lib/constants'
import { User, MapPin, CreditCard, ShoppingCart as CartIcon, Package as PackageIcon, Star as StarIcon, Shield as ShieldIcon } from '../lib/icons'
import TextField from '../components/ui/TextField'
import PasswordField from '../components/ui/PasswordField'

const usernameRegex = /^[a-z0-9_.]+$/ // lower letters, numbers, _, .
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form) {
  const errors = {}

  if (!form.firstName.trim()) errors.firstName = 'First name is required'
  if (!form.lastName.trim()) errors.lastName = 'Last name is required'

  const u = form.username.trim()
  if (!u) errors.username = 'Username is required'
  else if (u.length < 3) errors.username = 'Min 3 characters'
  else if (u.length > 30) errors.username = 'Max 30 characters'
  else if (!usernameRegex.test(u)) errors.username = 'Only lowercase letters, numbers, underscore, dot'

  const e = form.email.trim()
  if (!e) errors.email = 'Email is required'
  else if (!emailRegex.test(e)) errors.email = 'Enter a valid email'

  const p = form.password
  if (!p) errors.password = 'Password is required'
  else {
    if (p.length < 8) errors.password = 'At least 8 characters'
    if (!/[a-z]/.test(p)) errors.password = 'Needs a lowercase letter'
    if (!/[A-Z]/.test(p)) errors.password = 'Needs an uppercase letter'
    if (!/[0-9]/.test(p)) errors.password = 'Needs a number'
    if (!/[^\w\s]/.test(p)) errors.password = 'Needs a symbol'
    if (/\s/.test(p)) errors.password = 'No spaces allowed'
  }

  if (!form.confirmPassword) errors.confirmPassword = 'Please confirm password'
  else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match'

  return errors
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Good night'
}

export default function Register() {
  const dispatch = useAppDispatch()
  const nav = useNavigate()
  const location = useLocation()
  const { status, error, email } = useAppSelector(s => s.auth)

  const nextPath = useMemo(() => getNextFromSearch(location.search), [location.search])
  const greeting = useMemo(() => getGreeting(), [])

  const [form, setForm] = useState({
    firstName: '', lastName: '', username: '', email: '',
    password: '', confirmPassword: ''
  })
  const [touched, setTouched] = useState({})
  const errors = useMemo(() => validate(form), [form])

  // verification code after signup
  const [code, setCode] = useState('')

  const strong = {
    len: form.password.length >= 8,
    lower: /[a-z]/.test(form.password),
    upper: /[A-Z]/.test(form.password),
    num: /[0-9]/.test(form.password),
    sym: /[^\w\s]/.test(form.password),
    nospace: !/\s/.test(form.password)
  }
  const allGood = Object.values(strong).every(Boolean)

  async function onSubmit(e) {
    e.preventDefault()
    setTouched({
      firstName: true, lastName: true, username: true, email: true,
      password: true, confirmPassword: true
    })
    if (Object.keys(errors).length) return
    const res = await dispatch(registerUser(form))
    if (registerUser.fulfilled.match(res) && res.payload?.user) nav(nextPath, { replace: true })
  }

  async function onVerifyRegister(e) {
    e.preventDefault()
    if (!code.trim()) return
    const res = await dispatch(verifyEmailRegister({ tmpToken: email.tmpToken, code: code.trim() }))
    if (verifyEmailRegister.fulfilled.match(res)) nav(nextPath, { replace: true })
  }

  const inputCls = 'input'

  // concise, icon-based getting-started tiles
  const steps = useMemo(() => ([
    { Icon: User, title: 'Profile', hint: 'Add your info', to: '/account' },
    { Icon: MapPin, title: 'Address', hint: 'Set delivery', to: '/account' },
    { Icon: CreditCard, title: 'Card (opt.)', hint: 'Save for 1-click', to: '/account' },
    { Icon: CartIcon, title: 'Shop', hint: 'Browse & add', to: '/products' },
    { Icon: CreditCard, title: 'Pay', hint: 'COD / Card / Bank', to: '/checkout' },
    { Icon: PackageIcon, title: 'Track', hint: 'Live order status', to: '/orders' },
    { Icon: StarIcon, title: 'Review', hint: 'Share feedback', to: '/products' },
    { Icon: ShieldIcon, title: '2FA (opt.)', hint: 'Extra security', to: '/account' }
  ]), [])

  return (
    <div className="container-app section">
      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Vertical divider on large screens */}
        <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 w-px bg-[--color-border]" aria-hidden="true" />
        {/* Left: Welcome & concise icon steps */}
        <aside className="order-2 lg:order-1">
          <div>
            <p className="text-sm text-[--color-muted]">{greeting},</p>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1">
              Welcome to {APP_NAME}
            </h1>
            <p className="mt-2 text-[--color-muted]">Quick start guide</p>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {steps.map((s, i) => (
                <Link
                  to={s.to}
                  key={i}
                  className="group flex items-center gap-3 rounded-xl border border-[--color-border] bg-[--color-surface-glass] backdrop-blur-sm p-3 hover:bg-[--color-surface-hover] transition-all duration-200 hover:transform hover:scale-[1.02]"
                  aria-label={`${s.title} – ${s.hint}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[--color-brand-600] to-[--color-brand-500] text-white flex items-center justify-center shadow-lg">
                    {s.Icon ? <s.Icon size={18} /> : null}
                  </div>
                  <div>
                    <div className="font-semibold leading-tight text-[--color-text-high]">{s.title}</div>
                    <div className="text-xs text-[--color-text-medium]">{s.hint}</div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/products" className="btn btn-primary">Start shopping</Link>
              <Link to="/favorites" className="btn">View favorites</Link>
            </div>
          </div>
        </aside>

        {/* Right: Registration Form or Email Verification */}
        <section className="order-1 lg:order-2">
          <div className="max-w-md ml-auto card p-6">
            <h2 className="text-2xl font-bold text-[--color-text-high] mb-2">Create account</h2>
            {nextPath !== '/' && (
              <p className="text-xs text-[--color-text-medium] mt-1">
                You'll be returned to <span className="font-mono text-[--color-brand-400]">{nextPath}</span> after signup.
              </p>
            )}

            {email.required && email.mode === 'register' ? (
              <form onSubmit={onVerifyRegister} className="mt-6 form-grid">
                <p className="text-sm text-[--color-text-medium]">We sent a 6-digit verification code to your email. Enter it below to verify your account.</p>
                <TextField
                  label="Email verification code"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  required
                />
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
            ) : (
            <form onSubmit={onSubmit} className="mt-6 form-grid form-grid-sm-2">
              <TextField
                label="First name"
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                onBlur={() => setTouched({ ...touched, firstName: true })}
                autoComplete="given-name"
                required
                error={touched.firstName ? errors.firstName : ''}
                Icon={User}
              />

              <TextField
                label="Last name"
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                onBlur={() => setTouched({ ...touched, lastName: true })}
                autoComplete="family-name"
                required
                error={touched.lastName ? errors.lastName : ''}
                Icon={User}
              />

              <TextField
                label="Username"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                onBlur={() => setTouched({ ...touched, username: true })}
                placeholder="yourname"
                autoComplete="username"
                required
                error={touched.username ? errors.username : ''}
                Icon={User}
              />

              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                onBlur={() => setTouched({ ...touched, email: true })}
                autoComplete="email"
                required
                error={touched.email ? errors.email : ''}
                Icon={MapPin}
              />

              <div className="md:col-span-1">
                <PasswordField
                  label="Password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  onBlur={() => setTouched({ ...touched, password: true })}
                  required
                  error={touched.password ? errors.password : ''}
                />
                <div className="strength-meter">
                  {['len','lower','upper','num','sym','nospace'].map((k, i) => (
                    <span key={i} className={`strength-bar ${strong[k] ? 'on' : ''}`} />
                  ))}
                </div>
              </div>

              <PasswordField
                label="Confirm password"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                onBlur={() => setTouched({ ...touched, confirmPassword: true })}
                required
                error={touched.confirmPassword ? errors.confirmPassword : ''}
              />

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                disabled={status === 'loading' || Object.keys(errors).length > 0 || !allGood}
                className="mt-2 w-full btn btn-primary disabled:opacity-50"
              >
                {status === 'loading' ? 'Creating…' : 'Create account'}
              </button>

              <p className="text-sm mt-2">
                Already have an account?{' '}
                <Link className="underline" to={getLoginPathWithNext(nextPath)}>
                  Login
                </Link>
              </p>
            </form>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
