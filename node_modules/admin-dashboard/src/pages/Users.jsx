import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../utils/http'

const roleLabels = {
  admin: 'Main Admin',
  user_manager: 'User manager',
  product_manager: 'Product manager',
  order_manager: 'Order manager',
  payment_manager: 'Payment manager',
  refund_manager: 'Refund manager',
  return_manager: 'Return manager',
  review_manager: 'Review manager',
  user: 'Customer'
}

export default function UsersPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user'] })
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/users', { params: { q, role } })
      setItems(res.data.items)
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await api.post('/admin/users', form)
      setForm({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user'] })
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    } finally {
      setCreating(false)
    }
  }

  const onDelete = async (id) => {
    if (!confirm('Are you sure?')) return
    try {
      await api.delete(`/admin/users/${id}`)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  const allRoles = useMemo(() => Object.keys(roleLabels), [])

  const toggleRoleInForm = (r) => {
    setForm(f => {
      const exists = f.roles.includes(r)
      const next = exists ? f.roles.filter(x => x !== r) : [...f.roles, r]
      return { ...f, roles: next }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Users</h1>
        <div className="flex gap-2">
          <input placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} className="border px-2 py-1 rounded" />
          <select value={role} onChange={e=>setRole(e.target.value)} className="border px-2 py-1 rounded">
            <option value="">All roles</option>
            {allRoles.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
          </select>
          <button onClick={load} className="bg-black text-white px-3 py-1 rounded">Filter</button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <table className="w-full border text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-2 text-left">Name</th>
                <th className="border p-2 text-left">Email</th>
                <th className="border p-2 text-left">Username</th>
                <th className="border p-2 text-left">Roles</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-4 text-center">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center">No users</td></tr>
              ) : items.map(u => (
                <tr key={u.id}>
                  <td className="border p-2">{u.firstName} {u.lastName} {u.isPrimaryAdmin && <span className="text-xs text-purple-600">(Primary)</span>}</td>
                  <td className="border p-2">{u.email}</td>
                  <td className="border p-2">{u.username}</td>
                  <td className="border p-2">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map(r => (
                        <span key={r} className="text-xs bg-gray-200 rounded px-2 py-0.5">{roleLabels[r] || r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="border p-2 text-center">
                    {!u.isPrimaryAdmin && (
                      <button onClick={() => onDelete(u.id)} className="text-red-600 hover:underline">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Create user</h2>
          <form onSubmit={onCreate} className="border rounded p-3 text-sm">
            <label className="block text-xs mb-1">First name</label>
            <input className="w-full border px-2 py-1 rounded mb-2" value={form.firstName} onChange={e=>setForm(v=>({...v, firstName: e.target.value}))} />
            <label className="block text-xs mb-1">Last name</label>
            <input className="w-full border px-2 py-1 rounded mb-2" value={form.lastName} onChange={e=>setForm(v=>({...v, lastName: e.target.value}))} />
            <label className="block text-xs mb-1">Email</label>
            <input className="w-full border px-2 py-1 rounded mb-2" value={form.email} onChange={e=>setForm(v=>({...v, email: e.target.value}))} />
            <label className="block text-xs mb-1">Username</label>
            <input className="w-full border px-2 py-1 rounded mb-2" value={form.username} onChange={e=>setForm(v=>({...v, username: e.target.value}))} />
            <label className="block text-xs mb-1">Password</label>
            <input type="password" className="w-full border px-2 py-1 rounded mb-3" value={form.password} onChange={e=>setForm(v=>({...v, password: e.target.value}))} />

            <div className="mb-3">
              <div className="font-medium text-xs mb-1">Roles</div>
              <div className="flex flex-wrap gap-2">
                {allRoles.map(r => (
                  <label key={r} className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={form.roles.includes(r)} onChange={()=>toggleRoleInForm(r)} /> {roleLabels[r]}
                  </label>
                ))}
              </div>
            </div>

            <button disabled={creating} className="w-full bg-black text-white py-1.5 rounded disabled:opacity-50">{creating ? 'Creating...' : 'Create user'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
