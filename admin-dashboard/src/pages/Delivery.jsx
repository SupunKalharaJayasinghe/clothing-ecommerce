import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'
import { Search, Plus, X, Truck, User, Phone, Mail, MapPin, Calendar, CreditCard, Trash2, Bike, Car, Zap, Download, FileText } from 'lucide-react'
import { exportDeliveriesPDF, exportSingleDeliveryPDF } from '../utils/pdfExport'

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
  const [showModal, setShowModal] = useState(false)

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
      setShowModal(false)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    } finally {
      setSaving(false)
    }
  }

  const openCreateModal = () => {
    setEditingId('')
    setForm({
      fullName: '', dob: '', phone: '', email: '', password: '', addressLine1: '', city: '', country: '', govIdNumber: '', vehicleType: 'bike'
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId('')
    setForm({
      fullName: '', dob: '', phone: '', email: '', password: '', addressLine1: '', city: '', country: '', govIdNumber: '', vehicleType: 'bike'
    })
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
    setShowModal(true)
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

  // PDF export functions
  const handleExportAllPDF = () => {
    if (items.length === 0) {
      alert('No delivery personnel to export')
      return
    }
    exportDeliveriesPDF(items)
  }

  const handleExportSinglePDF = async (deliveryId) => {
    try {
      const res = await api.get(`/admin/delivery/${deliveryId}/details`)
      exportSingleDeliveryPDF(res.data.delivery)
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to export delivery details')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text-primary)] mb-2">Delivery Team</h1>
          <p className="text-[color:var(--text-muted)] text-sm">Manage delivery personnel and logistics</p>
        </div>
        <div className="filters-compact">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              placeholder="Search delivery team..."
              value={q}
              onChange={e=>setQ(e.target.value)}
              className="input min-w-[200px]"
            />
          </div>
          <button onClick={load} className="btn btn-secondary whitespace-nowrap">Filter</button>
          <button 
            onClick={handleExportAllPDF}
            className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
            disabled={items.length === 0}
            type="button"
          >
            <Download size={18} />
            Export PDF
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
          >
            <Plus size={20} />
            Add Delivery Person
          </button>
        </div>
      </div>

      {error && <div className="card card-body text-red-400 text-sm mb-6 border-red-500/20 bg-red-500/5">{error}</div>}

      <div className="w-full">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <Truck size={20} className="text-[color:var(--text-primary)]" />
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Delivery Personnel</h2>
                <p className="text-sm text-[color:var(--text-muted)] mt-1">Manage delivery team members and their details</p>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Personnel</th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th>Vehicle</th>
                    <th>Export</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8">
                        <div className="text-[color:var(--text-muted)]">Loading...</div>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8">
                        <div className="text-[color:var(--text-muted)]">No delivery personnel found</div>
                      </td>
                    </tr>
                  ) : items.map(d => {
                    const getVehicleIcon = (vehicleType) => {
                      switch(vehicleType?.toLowerCase()) {
                        case 'bike':
                        case 'motorbike':
                          return <Zap size={16} className="text-orange-400" />
                        case 'bicycle':
                          return <Bike size={16} className="text-green-400" />
                        case 'car':
                          return <Car size={16} className="text-blue-400" />
                        case 'van':
                          return <Truck size={16} className="text-purple-400" />
                        default:
                          return <Truck size={16} className="text-gray-400" />
                      }
                    }
                    
                    return (
                      <tr key={d.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <User size={16} className="text-[color:var(--text-muted)]" />
                            <div>
                              <div className="font-medium text-[color:var(--text-primary)]">{d.fullName}</div>
                              <div className="text-xs text-[color:var(--text-muted)] mt-1">
                                ID: {d.govIdNumber || 'Not provided'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Phone size={14} className="text-[color:var(--text-muted)]" />
                              <span className="text-sm text-[color:var(--text-secondary)]">
                                {d.phone || '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail size={14} className="text-[color:var(--text-muted)]" />
                              <span className="text-sm text-[color:var(--text-secondary)]">
                                {d.email || '—'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-[color:var(--text-muted)]" />
                            <div className="text-sm text-[color:var(--text-secondary)]">
                              <div>{d.city || '—'}</div>
                              <div className="text-xs text-[color:var(--text-muted)]">{d.country || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {getVehicleIcon(d.vehicleType)}
                            <span className="text-sm font-medium text-[color:var(--text-primary)] capitalize">
                              {d.vehicleType || 'Not specified'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <button 
                            onClick={() => handleExportSinglePDF(d.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                            title="Download delivery details as PDF"
                          >
                            <FileText size={14} />
                            PDF
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button onClick={() => onEdit(d)} className="btn btn-secondary btn-sm">Edit</button>
                            <button 
                              onClick={() => onDelete(d)} 
                              className="btn btn-sm inline-flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all duration-200"
                            >
                              <Trash2 size={14}/> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Person Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={closeModal}></div>
          <div className="relative bg-[color:var(--surface)] rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden border border-[color:var(--surface-border)] animate-slide-up">
            {/* Header */}
            <div className="relative px-8 py-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-[color:var(--surface-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[color:var(--text-primary)] mb-1">
                    {editingId ? 'Edit Delivery Person' : 'Add Delivery Person'}
                  </h2>
                  <p className="text-[color:var(--text-muted)]">
                    {editingId ? 'Update delivery personnel information' : 'Add a new member to the delivery team'}
                  </p>
                </div>
                <button onClick={closeModal} className="p-3 hover:bg-[color:var(--surface-hover)] rounded-xl transition-all duration-200 hover:scale-110">
                  <X size={24} className="text-[color:var(--text-muted)]" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6 max-h-[calc(95vh-200px)] overflow-y-auto">
              <form onSubmit={onSubmit} className="space-y-8">
                {/* Personal Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <User size={16} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Personal Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Full Name *</label>
                      <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" value={form.fullName} onChange={e=>setForm(v=>({...v, fullName: e.target.value}))} placeholder="Enter full name" required />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Date of Birth</label>
                      <input type="date" className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" value={form.dob} onChange={e=>setForm(v=>({...v, dob: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Government ID Number</label>
                      <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" value={form.govIdNumber} onChange={e=>setForm(v=>({...v, govIdNumber: e.target.value}))} placeholder="ID number" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Vehicle Type</label>
                      <div className="space-y-2">
                        <select className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" value={form.vehicleType} onChange={e=>setForm(v=>({...v, vehicleType: e.target.value}))}>
                          <option value="bike">Bike</option>
                          <option value="bicycle">Bicycle</option>
                          <option value="motorbike">Motorbike</option>
                          <option value="car">Car</option>
                          <option value="van">Van</option>
                        </select>
                        <div className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
                          {form.vehicleType === 'bike' || form.vehicleType === 'motorbike' ? (
                            <>
                              <Zap size={14} className="text-orange-400" />
                              <span>Motorized two-wheeler</span>
                            </>
                          ) : form.vehicleType === 'bicycle' ? (
                            <>
                              <Bike size={14} className="text-green-400" />
                              <span>Eco-friendly bicycle</span>
                            </>
                          ) : form.vehicleType === 'car' ? (
                            <>
                              <Car size={14} className="text-blue-400" />
                              <span>Personal vehicle</span>
                            </>
                          ) : form.vehicleType === 'van' ? (
                            <>
                              <Truck size={14} className="text-purple-400" />
                              <span>Large capacity vehicle</span>
                            </>
                          ) : (
                            <>
                              <Truck size={14} className="text-gray-400" />
                              <span>Select a vehicle type</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <Phone size={16} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Contact Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Phone Number</label>
                      <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200" value={form.phone} onChange={e=>setForm(v=>({...v, phone: e.target.value}))} placeholder="Phone number" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Email Address</label>
                      <input type="email" className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200" value={form.email} onChange={e=>setForm(v=>({...v, email: e.target.value}))} placeholder="Email address" />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">
                        Password {editingId ? '(leave empty to keep current)' : '*'}
                      </label>
                      <input type="password" className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200" value={form.password} onChange={e=>setForm(v=>({...v, password: e.target.value}))} placeholder="Enter password" />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <MapPin size={16} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Address Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2 space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Address Line 1</label>
                      <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200" value={form.addressLine1} onChange={e=>setForm(v=>({...v, addressLine1: e.target.value}))} placeholder="Street address" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">City</label>
                      <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200" value={form.city} onChange={e=>setForm(v=>({...v, city: e.target.value}))} placeholder="City" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Country</label>
                      <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200" value={form.country} onChange={e=>setForm(v=>({...v, country: e.target.value}))} placeholder="Country" />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-[color:var(--surface-elevated)] border-t border-[color:var(--surface-border)]">
              <div className="flex flex-col sm:flex-row gap-4">
                <button type="button" onClick={closeModal} className="flex-1 px-6 py-3 bg-[color:var(--surface-hover)] hover:bg-[color:var(--surface-border)] text-[color:var(--text-secondary)] font-semibold rounded-xl transition-all duration-200 border border-[color:var(--surface-border)]">Cancel</button>
                <button disabled={saving} onClick={onSubmit} className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:opacity-50">
                  {saving ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  ) : (
                    editingId ? 'Save Changes' : 'Add Delivery Person'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
