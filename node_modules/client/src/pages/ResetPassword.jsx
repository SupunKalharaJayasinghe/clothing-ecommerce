import { useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { resetPassword } from '../features/auth/authSlice'

export default function ResetPassword() {
  const { token } = useParams()
  const dispatch = useAppDispatch()
  const nav = useNavigate()
  const { reset, error } = useAppSelector(s => s.auth)
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })

  const strong = useMemo(() => ({
    len: form.newPassword.length >= 8,
    lower: /[a-z]/.test(form.newPassword),
    upper: /[A-Z]/.test(form.newPassword),
    num: /[0-9]/.test(form.newPassword),
    sym: /[^\w\s]/.test(form.newPassword),
    nospace: !/\s/.test(form.newPassword)
  }), [form.newPassword])

  const input = "input"

  async function onSubmit(e) {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) return
    const res = await dispatch(resetPassword({ token, ...form }))
    if (resetPassword.fulfilled.match(res)) nav('/login')
  }

  return (
    <div className="container-app section max-w-sm">
      <h1 className="text-2xl font-bold">Reset password</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input className={input} type="password" placeholder="New password"
          value={form.newPassword} onChange={e=>setForm({...form, newPassword:e.target.value})} />
        <input className={input} type="password" placeholder="Confirm new password"
          value={form.confirmPassword} onChange={e=>setForm({...form, confirmPassword:e.target.value})} />

        <ul className="mt-2 text-xs space-y-1">
          <li className={strong.len ? 'text-green-600':'opacity-70'}>• ≥ 8 chars</li>
          <li className={strong.lower ? 'text-green-600':'opacity-70'}>• lowercase</li>
          <li className={strong.upper ? 'text-green-600':'opacity-70'}>• uppercase</li>
          <li className={strong.num ? 'text-green-600':'opacity-70'}>• number</li>
          <li className={strong.sym ? 'text-green-600':'opacity-70'}>• symbol</li>
          <li className={strong.nospace ? 'text-green-600':'opacity-70'}>• no spaces</li>
        </ul>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {reset.message && <p className="text-green-600 text-sm">{reset.message}</p>}

        <button className="w-full btn btn-primary">
          {reset.status === 'loading' ? 'Updating…' : 'Update password'}
        </button>

        <p className="text-sm mt-2"><Link className="underline" to="/login">Back to login</Link></p>
      </form>
    </div>
  )
}
