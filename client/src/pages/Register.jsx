import { useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { registerUser } from '../features/auth/authSlice'
import { useNavigate, Link } from 'react-router-dom'

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

export default function Register() {
  const dispatch = useAppDispatch()
  const nav = useNavigate()
  const { status, error } = useAppSelector(s => s.auth)

  const [form, setForm] = useState({
    firstName: '', lastName: '', username: '', email: '',
    password: '', confirmPassword: ''
  })
  const [touched, setTouched] = useState({})
  const errors = useMemo(() => validate(form), [form])

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
    if (registerUser.fulfilled.match(res)) nav('/')
  }

  const inputCls = "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Create account</h1>
      <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-3">
        <div>
          <label className="block text-sm mb-1">First name</label>
          <input
            className={inputCls}
            value={form.firstName}
            onChange={e => setForm({ ...form, firstName: e.target.value })}
            onBlur={() => setTouched({ ...touched, firstName: true })}
            autoComplete="given-name"
            required
          />
          {touched.firstName && errors.firstName && <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>}
        </div>

        <div>
          <label className="block text-sm mb-1">Last name</label>
          <input
            className={inputCls}
            value={form.lastName}
            onChange={e => setForm({ ...form, lastName: e.target.value })}
            onBlur={() => setTouched({ ...touched, lastName: true })}
            autoComplete="family-name"
            required
          />
          {touched.lastName && errors.lastName && <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>}
        </div>

        <div>
          <label className="block text-sm mb-1">Username</label>
          <input
            className={inputCls}
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            onBlur={() => setTouched({ ...touched, username: true })}
            placeholder="yourname"
            autoComplete="username"
            required
          />
          {touched.username && errors.username && <p className="text-red-600 text-sm mt-1">{errors.username}</p>}
        </div>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            className={inputCls}
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            onBlur={() => setTouched({ ...touched, email: true })}
            autoComplete="email"
            required
          />
          {touched.email && errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            className={inputCls}
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onBlur={() => setTouched({ ...touched, password: true })}
            autoComplete="new-password"
            required
          />
          {touched.password && errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
          <ul className="mt-2 text-xs space-y-1">
            <li className={strong.len ? 'text-green-600' : 'opacity-70'}>• At least 8 characters</li>
            <li className={strong.lower ? 'text-green-600' : 'opacity-70'}>• Lowercase letter</li>
            <li className={strong.upper ? 'text-green-600' : 'opacity-70'}>• Uppercase letter</li>
            <li className={strong.num ? 'text-green-600' : 'opacity-70'}>• Number</li>
            <li className={strong.sym ? 'text-green-600' : 'opacity-70'}>• Symbol</li>
            <li className={strong.nospace ? 'text-green-600' : 'opacity-70'}>• No spaces</li>
          </ul>
        </div>

        <div>
          <label className="block text-sm mb-1">Confirm password</label>
          <input
            className={inputCls}
            type="password"
            value={form.confirmPassword}
            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
            onBlur={() => setTouched({ ...touched, confirmPassword: true })}
            autoComplete="new-password"
            required
          />
          {touched.confirmPassword && errors.confirmPassword && (
            <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>
          )}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          disabled={status === 'loading' || Object.keys(errors).length > 0 || !allGood}
          className="mt-2 w-full rounded-lg border py-2 disabled:opacity-50"
        >
          {status === 'loading' ? 'Creating…' : 'Sign up'}
        </button>

        <p className="text-sm mt-2">
          Already have an account? <Link className="underline" to="/login">Login</Link>
        </p>
      </form>
    </div>
  )
}
