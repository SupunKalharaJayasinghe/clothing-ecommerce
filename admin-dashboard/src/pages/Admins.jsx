import React, { useEffect, useMemo, useState } from 'react'
import ConfirmLogout from '../ui/ConfirmLogout'
import { api } from '../utils/http'
import { Trash2, Search, Plus, X } from 'lucide-react'

const roleLabels = {
  admin: 'Main Admin',
  user_manager: 'User manager',
  product_manager: 'Product manager',
  order_manager: 'Order manager',
  payment_manager: 'Payment manager',
  refund_manager: 'Refund manager',
  return_manager: 'Return manager',
  review_manager: 'Review manager',
  delivery_agent: 'Delivery agent',
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
  const [showModal, setShowModal] = useState(false)
  const [createStep, setCreateStep] = useState('form') // 'form' | 'verify'
  const [creationTmpToken, setCreationTmpToken] = useState('')
  const [verificationCode, setVerificationCode] = useState('')

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
        setForm({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user_manager'] })
        setEditingId('')
        setShowModal(false)
        await load()
      } else {
        // Step 1: initiate OTP (sent to main admin email)
        const res = await api.post('/admin/admins/create/initiate')
        setCreationTmpToken(res.data.tmpToken)
        setCreateStep('verify')
      }
    } catch (e) {
      alert(e.response?.data?.message || e.message)
    } finally {
      setSaving(false)
    }
  }

  const onVerifyCreate = async (e) => {
    e.preventDefault()
    if (!creationTmpToken || !verificationCode.trim()) {
      alert('Enter verification code')
      return
    }
    setSaving(true)
    try {
      await api.post('/admin/admins/create/verify', { tmpToken: creationTmpToken, code: verificationCode.trim(), ...form })
      // reset
      setForm({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user_manager'] })
      setVerificationCode('')
      setCreationTmpToken('')
      setCreateStep('form')
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
    setDeleteId(id)
    setOpenDelete(true)
  }
  const onConfirmDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/admin/admins/${deleteId}`)
      setOpenDelete(false)
      setDeleteId('')
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
    setShowModal(true)
  }

  const openCreateModal = () => {
    setEditingId('')
    setForm({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user_manager'] })
    setVerificationCode('')
    setCreationTmpToken('')
    setCreateStep('form')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId('')
    setForm({ firstName: '', lastName: '', email: '', username: '', password: '', roles: ['user_manager'] })
    setVerificationCode('')
    setCreationTmpToken('')
    setCreateStep('form')
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
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text-primary)] mb-2">Admins</h1>
          <p className="text-[color:var(--text-muted)] text-sm">Manage admin users and their permissions</p>
        </div>
        <div className="filters-compact">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input 
              placeholder="Search admins..." 
              value={q} 
              onChange={e=>setQ(e.target.value)} 
              className="input min-w-[200px]"
            />
          </div>
          <select value={role} onChange={e=>setRole(e.target.value)} className="input">
            <option value="">All roles</option>
            {allRoles.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
          </select>
          <button onClick={load} className="btn btn-secondary whitespace-nowrap">Filter</button>
          <button 
            onClick={openCreateModal} 
            className="btn btn-primary inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={18} />
            Create Admin
          </button>
        </div>
      </div>

      {error && <div className="card card-body text-red-400 text-sm mb-6 border-red-500/20 bg-red-500/5">{error}</div>}

      <div className="w-full">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Admin Users</h2>
              <p className="text-sm text-[color:var(--text-muted)] mt-1">Manage system administrators</p>
            </div>
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Username</th>
                      <th>Roles</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8">
                          <div className="text-[color:var(--text-muted)]">Loading...</div>
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8">
                          <div className="text-[color:var(--text-muted)]">No admins found</div>
                        </td>
                      </tr>
                    ) : items.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className="font-medium text-[color:var(--text-primary)]">
                            {u.firstName} {u.lastName}
                            {u.isPrimaryAdmin && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Primary
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="text-[color:var(--text-secondary)]">{u.email}</div>
                        </td>
                        <td>
                          <div className="font-mono text-sm text-[color:var(--text-secondary)]">{u.username}</div>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map(r => (
                              <span key={r} className="badge badge-success text-xs">
                                {roleLabels[r] || r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          {!u.isPrimaryAdmin && (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => onEdit(u)} 
                                className="btn btn-secondary btn-sm"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => onDeleteClick(u.id)} 
                                className="btn btn-sm inline-flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                              >
                                <Trash2 size={14}/> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      {/* Enhanced Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={closeModal}></div>
          <div className="relative bg-[color:var(--surface)] rounded-3xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden border border-[color:var(--surface-border)] animate-slide-up">
            {/* Modal Header */}
            <div className="relative px-8 py-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-[color:var(--surface-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[color:var(--text-primary)] mb-1">
                    {editingId ? 'Edit Admin' : 'Create Admin'}
                  </h2>
                  <p className="text-[color:var(--text-muted)]">
                    {editingId ? 'Update admin information and permissions' : 'Add a new admin user to the system'}
                  </p>
                </div>
                <button 
                  onClick={closeModal}
                  className="p-3 hover:bg-[color:var(--surface-hover)] rounded-xl transition-all duration-200 hover:scale-110"
                >
                  <X size={24} className="text-[color:var(--text-muted)]" />
                </button>
              </div>
            </div>
            {/* Modal Body */}
            <div className="px-8 py-6 max-h-[calc(95vh-200px)] overflow-y-auto">
              {(editingId || createStep === 'form') ? (
                <form onSubmit={onSubmit} className="space-y-8">
                  {/* Personal Information Section */}
                  <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">1</span>
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Personal Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">
                        First name *
                      </label>
                      <input 
                        className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" 
                        value={form.firstName} 
                        onChange={e=>setForm(v=>({...v, firstName: e.target.value}))}
                        placeholder="Enter first name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">
                        Last name *
                      </label>
                      <input 
                        className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" 
                        value={form.lastName} 
                        onChange={e=>setForm(v=>({...v, lastName: e.target.value}))}
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[color:var(--text-primary)]">
                      Email address *
                    </label>
                    <input 
                      type="email"
                      className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" 
                      value={form.email} 
                      onChange={e=>setForm(v=>({...v, email: e.target.value}))}
                      placeholder="admin@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Account Credentials Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Account Credentials</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">
                        Username *
                      </label>
                      <input 
                        className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 font-mono" 
                        value={form.username} 
                        onChange={e=>setForm(v=>({...v, username: e.target.value}))}
                        placeholder="username"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[color:var(--text-primary)]">
                        Password {editingId ? <span className="text-[color:var(--text-muted)] font-normal text-xs">(leave blank to keep current)</span> : '*'}
                      </label>
                      <input 
                        type="password" 
                        className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl text-[color:var(--text-primary)] placeholder-[color:var(--text-muted)] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200" 
                        value={form.password} 
                        onChange={e=>setForm(v=>({...v, password: e.target.value}))}
                        placeholder={editingId ? "Leave blank to keep current" : "Enter secure password"}
                        required={!editingId}
                      />
                    </div>
                  </div>
                </div>

                {/* Roles & Permissions Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">3</span>
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Roles & Permissions</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {allRoles.map(r => (
                      <button 
                        type="button" 
                        key={r} 
                        className={`group relative p-4 rounded-2xl border-2 text-left transition-all duration-300 transform hover:scale-105 ${
                          form.roles.includes(r) 
                            ? 'bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 border-blue-400/60 shadow-lg shadow-blue-500/25' 
                            : 'bg-[color:var(--surface-elevated)] border-[color:var(--surface-border)] hover:border-blue-400/50 hover:shadow-md'
                        }`}
                        onClick={()=>toggleRoleInForm(r)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`font-semibold text-sm mb-1 ${
                              form.roles.includes(r) ? 'text-[color:var(--text-primary)]' : 'text-[color:var(--text-secondary)]'
                            }`}>
                              {roleLabels[r]}
                            </div>
                            <div className="text-xs text-[color:var(--text-muted)]">
                              {form.roles.includes(r) ? '✓ Selected' : 'Click to select'}
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                            form.roles.includes(r) 
                              ? 'bg-blue-500 border-blue-500' 
                              : 'border-[color:var(--surface-border)] group-hover:border-blue-400'
                          }`}>
                            {form.roles.includes(r) && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                </form>
              ) : (
                <form onSubmit={onVerifyCreate} className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                    <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">Verify Creation</h3>
                  </div>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    A 6-digit code has been sent to the main admin email. Enter it below to approve creating this admin.
                  </p>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[color:var(--text-primary)]">Verification code</label>
                    <input
                      className="w-full px-4 py-3 bg-[color:var(--surface-elevated)] border border-[color:var(--surface-border)] rounded-xl"
                      value={verificationCode}
                      onChange={e=> setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0,6))}
                      placeholder="123456"
                      inputMode="numeric"
                      pattern="\d{6}"
                      minLength={6}
                      maxLength={6}
                      required
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 bg-[color:var(--surface-elevated)] border-t border-[color:var(--surface-border)]">
              {(!editingId && createStep === 'verify') ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    type="button" 
                    className="flex-1 px-6 py-3 bg-[color:var(--surface-hover)] hover:bg-[color:var(--surface-border)] text-[color:var(--text-secondary)] font-semibold rounded-xl transition-all duration-200 border border-[color:var(--surface-border)]" 
                    onClick={() => setCreateStep('form')}
                  >
                    Back
                  </button>
                  <div className="flex-1 flex gap-2">
                    <button
                      type="button"
                      className="flex-1 px-6 py-3 bg-[color:var(--surface-hover)] hover:bg-[color:var(--surface-border)] text-[color:var(--text-secondary)] font-semibold rounded-xl transition-all duration-200 border border-[color:var(--surface-border)]"
                      onClick={async ()=>{ try { const r = await api.post('/admin/admins/create/initiate'); setCreationTmpToken(r.data.tmpToken); alert('A new code has been sent to the main admin email.') } catch(e){ alert(e.response?.data?.message || e.message) } }}
                    >
                      Resend code
                    </button>
                    <button 
                      disabled={saving} 
                      onClick={onVerifyCreate}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Verifying...
                        </div>
                      ) : (
                        'Verify & Create'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    type="button" 
                    className="flex-1 px-6 py-3 bg-[color:var(--surface-hover)] hover:bg-[color:var(--surface-border)] text-[color:var(--text-secondary)] font-semibold rounded-xl transition-all duration-200 border border-[color:var(--surface-border)]" 
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={saving} 
                    onClick={onSubmit}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Saving...
                      </div>
                    ) : (
                      editingId ? 'Save Changes' : 'Create Admin'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <ConfirmLogout
        open={openDelete}
        onClose={() => { setOpenDelete(false); setDeleteId('') }}
        onConfirm={onConfirmDelete}
        title="Are you sure, Do you want to delete this admin?"
        confirmLabel="Delete"
      />
    </div>
  )
}
