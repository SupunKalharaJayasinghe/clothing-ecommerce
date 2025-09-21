import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'
import { useAuth } from '../state/auth'

export default function CustomersPage() {
  const { user } = useAuth()
  const canManage = Boolean(user?.isPrimaryAdmin)

  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user'] })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState('')

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

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canManage) { alert('Only the primary admin can save customers.'); return }
    setSaving(true)
    try {
      if (editingId) {
        const payload = { ...form }
        if (!payload.password) delete payload.password
        await api.patch(`/admin/customers/${editingId}`, payload)
      } else {
        await api.post('/admin/customers', form)
      }
      setForm({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user'] })
      setEditingId('')
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id) => {
    if (!canManage) { alert('Only the primary admin can delete customers.'); return }
    if (!confirm('Are you sure?')) return
    try {
      await api.delete(`/admin/customers/${id}`)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  const onEdit = (u) => {
    if (!canManage) return
    setEditingId(u.id)
    setForm({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      username: u.username || '',
      password: '',
      roles: ['user']
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Customers</h1>
        <div className="flex gap-2">
          <input placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} className="input" />
          <button onClick={load} className="btn btn-primary">Filter</button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <table className="table modern-table">
              <thead>
                <tr>
                  <th className="border p-2 text-left">Name</th>
                  <th className="border p-2 text-left">Email</th>
                  <th className="border p-2 text-left">Username</th>
                  {canManage && <th className="border p-2 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={canManage ? 4 : 3} className="p-4 text-center">Loading...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={canManage ? 4 : 3} className="p-4 text-center">No customers</td></tr>
                ) : items.map(u => (
                  <tr key={u.id}>
                    <td className="border p-2">{u.firstName} {u.lastName}</td>
                    <td className="border p-2">{u.email}</td>
                    <td className="border p-2">{u.username}</td>
                    {canManage && (
                      <td className="border p-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => onEdit(u)} className="btn btn-light btn-sm">Edit</button>
                          <button onClick={() => onDelete(u.id)} className="btn btn-danger btn-sm">Delete</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-2">{editingId ? 'Edit customer' : 'Create customer'}</h2>
          {canManage ? (
            <form onSubmit={onSubmit} className="card p-3 text-sm">
              <label className="block text-xs mb-1">First name</label>
              <input className="w-full input mb-2" value={form.firstName} onChange={e=>setForm(v=>({...v, firstName: e.target.value}))} />
              <label className="block text-xs mb-1">Last name</label>
              <input className="w-full input mb-2" value={form.lastName} onChange={e=>setForm(v=>({...v, lastName: e.target.value}))} />
              <label className="block text-xs mb-1">Email</label>
              <input className="w-full input mb-2" value={form.email} onChange={e=>setForm(v=>({...v, email: e.target.value}))} />
              <label className="block text-xs mb-1">Username</label>
              <input className="w-full input mb-2" value={form.username} onChange={e=>setForm(v=>({...v, username: e.target.value}))} />
              <label className="block text-xs mb-1">Password</label>
              <input type="password" className="w-full input mb-3" value={form.password} onChange={e=>setForm(v=>({...v, password: e.target.value}))} />

              <div className="flex items-center gap-2 mt-2">
                {editingId && (
                  <button type="button" className="btn btn-light flex-1" onClick={() => { setEditingId(''); setForm({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user'] }) }}>Cancel</button>
                )}
                <button disabled={saving} className="w-full btn btn-primary disabled:opacity-50 flex-1">{saving ? 'Saving...' : (editingId ? 'Save changes' : 'Create customer')}</button>
              </div>
            </form>
          ) : (
            <div className="card p-4 text-sm">
              <div className="text-[13px] text-gray-400">Only the primary admin can create customers.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
