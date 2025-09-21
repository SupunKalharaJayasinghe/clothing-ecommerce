import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'

export default function CustomersPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user'] })
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/customers', { params: { q } })
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
      await api.post('/admin/customers', form)
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
      await api.delete(`/admin/customers/${id}`)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Customers</h1>
        <div className="flex gap-2">
          <input placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} className="border px-2 py-1 rounded" />
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
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="p-4 text-center">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="4" className="p-4 text-center">No customers</td></tr>
              ) : items.map(u => (
                <tr key={u.id}>
                  <td className="border p-2">{u.firstName} {u.lastName}</td>
                  <td className="border p-2">{u.email}</td>
                  <td className="border p-2">{u.username}</td>
                  <td className="border p-2 text-center">
                    <button onClick={() => onDelete(u.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Create customer</h2>
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

            <button disabled={creating} className="w-full bg-black text-white py-1.5 rounded disabled:opacity-50">{creating ? 'Creating...' : 'Create customer'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
