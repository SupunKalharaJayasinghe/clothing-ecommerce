import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'

export default function DeliveryPage() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    fullName: '',
    dob: '',
    phone: '',
    email: '',
    password: '',
    addressLine1: '',
    city: '',
    country: '',
    govIdNumber: '',
    vehicleType: 'bike'
  })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/delivery', { params: { q } })
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
      const payload = {
        fullName: form.fullName,
        dob: form.dob ? new Date(form.dob) : undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        password: form.password || undefined,
        addressLine1: form.addressLine1,
        city: form.city,
        country: form.country,
        govIdNumber: form.govIdNumber,
        vehicleType: form.vehicleType || undefined
      }
      if (editingId) {
        if (!payload.password) delete payload.password
        await api.patch(`/admin/delivery/${editingId}`, payload)
      } else {
        if (!payload.password) throw new Error('Password required for new delivery user')
        await api.post('/admin/delivery', payload)
      }
      setForm({
        fullName: '', dob: '', phone: '', email: '', password: '', addressLine1: '', city: '', country: '', govIdNumber: '', vehicleType: 'bike'
      })
      setEditingId('')
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    } finally {
      setSaving(false)
    }
  }

  const onEdit = (d) => {
    setEditingId(d.id)
    setForm({
      fullName: d.fullName || '',
      dob: d.dob ? String(d.dob).substring(0,10) : '',
      phone: d.phone || '',
      email: d.email || '',
      password: '',
      addressLine1: d.addressLine1 || '',
      city: d.city || '',
      country: d.country || '',
      govIdNumber: d.govIdNumber || '',
      vehicleType: d.vehicleType || 'bike'
    })
  }

  const onDelete = async (d) => {
    const ok = window.confirm(`Delete delivery user "${d.fullName || d.email || d.phone}"? This cannot be undone.`)
    if (!ok) return
    try {
      await api.delete(`/admin/delivery/${d.id}`)
      // if we were editing this one, reset the form
      if (editingId === d.id) {
        setEditingId('')
        setForm({ fullName: '', dob: '', phone: '', email: '', password: '', addressLine1: '', city: '', country: '', govIdNumber: '', vehicleType: 'bike' })
      }
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Delivery users</h1>
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
                  <th className="border p-2 text-left">Phone</th>
                  <th className="border p-2 text-left">Email</th>
                  <th className="border p-2 text-left">City</th>
                  <th className="border p-2 text-left">Country</th>
                  <th className="border p-2 text-left">Vehicle</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="p-4 text-center">Loading...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan="7" className="p-4 text-center">No delivery users</td></tr>
                ) : items.map(d => (
                  <tr key={d.id}>
                    <td className="border p-2">{d.fullName}</td>
                    <td className="border p-2">{d.phone || '-'}</td>
                    <td className="border p-2">{d.email || '-'}</td>
                    <td className="border p-2">{d.city || '-'}</td>
                    <td className="border p-2">{d.country || '-'}</td>
                    <td className="border p-2">{d.vehicleType || '-'}</td>
                    <td className="border p-2 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <button onClick={() => onEdit(d)} className="btn btn-light btn-sm">Edit</button>
                        <button onClick={() => onDelete(d)} className="btn btn-danger btn-sm">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-2">{editingId ? 'Edit delivery user' : 'Create delivery user'}</h2>
          <form onSubmit={onSubmit} className="card p-3 text-sm">
            <div className="form-grid form-grid-sm-2 gap-3">
              <div className="col-span-full">
                <label className="block text-xs mb-1">Full name</label>
                <input className="w-full input" value={form.fullName} onChange={e=>setForm(v=>({...v, fullName: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Date of birth</label>
                <input type="date" className="w-full input" value={form.dob} onChange={e=>setForm(v=>({...v, dob: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Phone</label>
                <input className="w-full input" value={form.phone} onChange={e=>setForm(v=>({...v, phone: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Email</label>
                <input className="w-full input" value={form.email} onChange={e=>setForm(v=>({...v, email: e.target.value}))} />
              </div>
              <div className="col-span-full">
                <label className="block text-xs mb-1">Password {editingId ? '(leave empty to keep)' : ''}</label>
                <input type="password" className="w-full input" value={form.password} onChange={e=>setForm(v=>({...v, password: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Address line 1</label>
                <input className="w-full input" value={form.addressLine1} onChange={e=>setForm(v=>({...v, addressLine1: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs mb-1">City</label>
                <input className="w-full input" value={form.city} onChange={e=>setForm(v=>({...v, city: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Country</label>
                <input className="w-full input" value={form.country} onChange={e=>setForm(v=>({...v, country: e.target.value}))} />
              </div>
              <div className="col-span-full">
                <label className="block text-xs mb-1">Government ID number</label>
                <input className="w-full input" value={form.govIdNumber} onChange={e=>setForm(v=>({...v, govIdNumber: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Vehicle type (optional)</label>
                <select className="w-full input" value={form.vehicleType} onChange={e=>setForm(v=>({...v, vehicleType: e.target.value}))}>
                  <option value="bike">Bike</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="motorbike">Motorbike</option>
                  <option value="car">Car</option>
                  <option value="van">Van</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              {editingId && <button type="button" className="btn btn-light flex-1" onClick={() => { setEditingId(''); setForm({ fullName: '', dob: '', phone: '', email: '', password: '', addressLine1: '', city: '', country: '', govIdNumber: '', vehicleType: 'bike' }) }}>Cancel</button>}
              <button disabled={saving} className="w-full btn btn-primary disabled:opacity-50 flex-1">{saving ? 'Saving...' : (editingId ? 'Save changes' : 'Create user')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
