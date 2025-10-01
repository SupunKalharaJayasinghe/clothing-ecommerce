import React, { useEffect, useState } from 'react'
import { api } from '../utils/http'
import { useAuth } from '../state/auth'
import { Search, Plus, X, Trash2, Download, FileText } from 'lucide-react'
import ConfirmLogout from '../ui/ConfirmLogout'
import { exportCustomersPDF, exportSingleCustomerPDF } from '../utils/pdfExport'

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
  const [showModal, setShowModal] = useState(false)

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
      setShowModal(false)
      await load()
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    } finally {
      setSaving(false)
    }
  }

  const [openDelete, setOpenDelete] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const onDeleteClick = (id) => {
    if (!canManage) { alert('Only the primary admin can delete customers.'); return }
    setDeleteId(id)
    setOpenDelete(true)
  }
  const onConfirmDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/admin/customers/${deleteId}`)
      setOpenDelete(false)
      setDeleteId('')
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
    setShowModal(true)
  }

  const openCreateModal = () => {
    if (!canManage) return
    setEditingId('')
    setForm({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user'] })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId('')
    setForm({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user'] })
  }

  // PDF export functions
  const handleExportAllPDF = () => {
    console.log('Export all PDF clicked')
    console.log('Items:', items)
    
    if (items.length === 0) {
      alert('No customers to export')
      return
    }
    
    exportCustomersPDF(items)
  }

  const handleExportSinglePDF = async (customerId) => {
    try {
      const res = await api.get(`/admin/customers/${customerId}/details`)
      exportSingleCustomerPDF(res.data.user)
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to export customer details')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text-primary)] mb-2">Customers</h1>
          <p className="text-[color:var(--text-muted)] text-sm">Manage store customers</p>
        </div>
        <div className="filters-compact">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              placeholder="Search customers..."
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
          {canManage && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
            >
              <Plus size={20} />
              Create Customer
            </button>
          )}
        </div>
      </div>

      {error && <div className="card card-body text-red-400 text-sm mb-6 border-red-500/20 bg-red-500/5">{error}</div>}

      <div className="w-full">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Customer List</h2>
            <p className="text-sm text-[color:var(--text-muted)] mt-1">View and manage customers</p>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Export</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={canManage ? 5 : 4} className="text-center py-8">
                        <div className="text-[color:var(--text-muted)]">Loading...</div>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 5 : 4} className="text-center py-8">
                        <div className="text-[color:var(--text-muted)]">No customers found</div>
                      </td>
                    </tr>
                  ) : items.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="font-medium text-[color:var(--text-primary)]">{u.firstName} {u.lastName}</div>
                      </td>
                      <td>
                        <div className="text-[color:var(--text-secondary)]">{u.email}</div>
                      </td>
                      <td>
                        <div className="font-mono text-sm text-[color:var(--text-secondary)]">{u.username}</div>
                      </td>
                      <td>
                        <button 
                          onClick={() => handleExportSinglePDF(u.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                          title="Download customer details as PDF"
                        >
                          <FileText size={14} />
                          PDF
                        </button>
                      </td>
                      {canManage && (
                        <td>
                          <div className="flex items-center gap-2">
                            <button onClick={() => onEdit(u)} className="btn btn-secondary btn-sm">Edit</button>
                            <button onClick={() => onDeleteClick(u.id)} className="btn btn-sm inline-flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30">
                              <Trash2 size={14}/> Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmLogout
        open={openDelete}
        onClose={() => { setOpenDelete(false); setDeleteId('') }}
        onConfirm={onConfirmDelete}
        title="Are you sure, Do you want to delete this User?"
        confirmLabel="Delete"
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={closeModal}></div>
          <div className="relative bg-[color:var(--surface)] rounded-3xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden border border-[color:var(--surface-border)] animate-slide-up">
            {/* Header */}
            <div className="relative px-8 py-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-[color:var(--surface-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[color:var(--text-primary)] mb-1">{editingId ? 'Edit Customer' : 'Create Customer'}</h2>
                  <p className="text-[color:var(--text-muted)]">{editingId ? 'Update customer information' : 'Add a new customer to the store'}</p>
                </div>
                <button onClick={closeModal} className="p-3 hover:bg-[color:var(--surface-hover)] rounded-xl transition-all duration-200 hover:scale-110">
                  <X size={24} className="text-[color:var(--text-muted)]" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6 max-h-[calc(95vh-200px)] overflow-y-auto">
              <form onSubmit={onSubmit} className="space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">1</span>
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Personal Information</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">First name *</label>
                      <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" value={form.firstName} onChange={e=>setForm(v=>({...v, firstName: e.target.value}))} placeholder="Enter first name" required/>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Last name *</label>
                      <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" value={form.lastName} onChange={e=>setForm(v=>({...v, lastName: e.target.value}))} placeholder="Enter last name" required/>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Email address *</label>
                    <input type="email" className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" value={form.email} onChange={e=>setForm(v=>({...v, email: e.target.value}))} placeholder="customer@example.com" required/>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Account Credentials</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Username *</label>
                      <input className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 font-mono" value={form.username} onChange={e=>setForm(v=>({...v, username: e.target.value}))} placeholder="username" required/>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Password {editingId ? <span className="text-[color:var(--text-muted)] font-normal text-xs">(leave blank to keep current)</span> : '*'}</label>
                      <input type="password" className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200" value={form.password} onChange={e=>setForm(v=>({...v, password: e.target.value}))} placeholder={editingId ? "Leave blank to keep current" : "Enter secure password"} required={!editingId}/>
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
                    editingId ? 'Save Changes' : 'Create Customer'
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
