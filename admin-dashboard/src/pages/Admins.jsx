import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../utils/http'
import { Trash2, Search } from 'lucide-react'

const roleLabels = {
  admin: 'Main Admin',
  user_manager: 'User manager',
  product_manager: 'Product manager',
  order_manager: 'Order manager',
  payment_manager: 'Payment manager',
  refund_manager: 'Refund manager',
  return_manager: 'Return manager',
  review_manager: 'Review manager',
}

export default function AdminsPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user_manager'] })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/admins', { params: { q, role } })
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
    setSaving(true)
    try {
      if (editingId) {
        const payload = { ...form }
        if (!payload.password) delete payload.password
        await api.patch(`/admin/admins/${editingId}`, payload)
      } else {
        await api.post('/admin/admins', form)
      }
      setForm({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user_manager'] })
      setEditingId('')
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id) => {
    if (!confirm('Are you sure?')) return
    try {
      await api.delete(`/admin/admins/${id}`)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  const onEdit = (u) => {
    setEditingId(u.id)
    setForm({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      username: u.username || '',
      password: '',
      roles: Array.from(new Set(u.roles || []))
    })
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
        <h1 className="text-xl font-semibold">Admins</h1>
        <div className="toolbar">
          <div className="input-with-icon">
            <Search size={16} />
            <input placeholder="Search admins..." value={q} onChange={e=>setQ(e.target.value)} />
          </div>
          <select value={role} onChange={e=>setRole(e.target.value)} className="input">
            <option value="">All roles</option>
            {allRoles.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
          </select>
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
                <th className="border p-2 text-left">Roles</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-4 text-center">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center">No admins</td></tr>
              ) : items.map(u => (
                <tr key={u.id}>
                  <td className="border p-2">{u.firstName} {u.lastName} {u.isPrimaryAdmin && <span className="text-xs text-purple-600">(Primary)</span>}</td>
                  <td className="border p-2">{u.email}</td>
                  <td className="border p-2">{u.username}</td>
                  <td className="border p-2">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map(r => (
                        <span key={r} className="badge">{roleLabels[r] || r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="border p-2 text-center">
                    {!u.isPrimaryAdmin && (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => onEdit(u)} className="btn btn-light btn-sm">Edit</button>
                        <button onClick={() => onDelete(u.id)} className="btn btn-danger btn-sm inline-flex items-center gap-1"><Trash2 size={14}/> Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-2">{editingId ? 'Edit admin' : 'Create admin'}</h2>
          <form onSubmit={onSubmit} className="card p-3 text-sm">
            <div className="form-grid form-grid-sm-2 gap-3">
              <div>
                <label className="block text-xs mb-1">First name</label>
                <input className="w-full input" value={form.firstName} onChange={e=>setForm(v=>({...v, firstName: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Last name</label>
                <input className="w-full input" value={form.lastName} onChange={e=>setForm(v=>({...v, lastName: e.target.value}))} />
              </div>
              <div className="form-grid-sm-2 col-span-full">
                <label className="block text-xs mb-1">Email</label>
                <input className="w-full input" value={form.email} onChange={e=>setForm(v=>({...v, email: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Username</label>
                <input className="w-full input" value={form.username} onChange={e=>setForm(v=>({...v, username: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Password</label>
                <input type="password" className="w-full input" value={form.password} onChange={e=>setForm(v=>({...v, password: e.target.value}))} />
              </div>
            </div>

            <div className="mt-3">
              <div className="font-medium text-xs mb-1">Roles</div>
              <div className="chip-list">
                {allRoles.map(r => (
                  <button type="button" key={r} className={`chip-toggle ${form.roles.includes(r) ? 'on' : ''}`} onClick={()=>toggleRoleInForm(r)}>
                    {roleLabels[r]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              {editingId && <button type="button" className="btn btn-light flex-1" onClick={() => { setEditingId(''); setForm({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user_manager'] }) }}>Cancel</button>}
              <button disabled={saving} className="w-full btn btn-primary disabled:opacity-50 flex-1">{saving ? 'Saving...' : (editingId ? 'Save changes' : 'Create admin')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
