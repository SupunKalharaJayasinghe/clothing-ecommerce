import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { registerUser } from '../features/auth/authSlice'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const dispatch = useAppDispatch()
  const nav = useNavigate()
  const { status, error } = useAppSelector(s => s.auth)

  const onSubmit = async (e) => {
    e.preventDefault()
    const res = await dispatch(registerUser(form))
    if (registerUser.fulfilled.match(res)) nav('/')
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Create account</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input className="w-full border rounded-lg px-3 py-2" placeholder="Name"
          value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className="w-full border rounded-lg px-3 py-2" placeholder="Email" type="email"
          value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input className="w-full border rounded-lg px-3 py-2" placeholder="Password" type="password"
          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={status === 'loading'} className="w-full rounded-lg border py-2">
          {status === 'loading' ? 'Creating…' : 'Sign up'}
        </button>
      </form>
    </div>
  )
}
