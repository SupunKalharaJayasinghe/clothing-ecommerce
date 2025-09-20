import { useEffect, useMemo, useState } from 'react'
import api from '../lib/axios'

const input = "input"

function TabBtn({active, onClick, children}) {
  return (
    <button onClick={onClick}
      className={`btn ${active ? 'btn-primary' : 'btn-outline'}`}>
      {children}
    </button>
  )
}

export default function Account() {
  const [tab, setTab] = useState('info')
  const [loading, setLoading] = useState(true)
  // Note: remove unused local user state to satisfy lint rules

  // profile form
  const [profile, setProfile] = useState({
    firstName: '', lastName: '', username: '', email: '',
    mobile: '', gender: 'prefer_not_to_say', birthday: '', country: ''
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // password form
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwdMsg, setPwdMsg] = useState('')
  const [pwdErr, setPwdErr] = useState('')

  // addresses
  const [addresses, setAddresses] = useState([])
  const [addrForm, setAddrForm] = useState({ label:'', line1:'', line2:'', city:'', region:'', postalCode:'', country:'', phone:'', isDefault:false })
  const [addrMsg, setAddrMsg] = useState('')
  const [addrErr, setAddrErr] = useState('')

  // notifications
  const [noti, setNoti] = useState({ purchases: true, account: true, events: true })
  const [notiMsg, setNotiMsg] = useState('')

  // payment methods
  const [cards, setCards] = useState([])
  const [cardMsg, setCardMsg] = useState('')

  // 2FA
  const [twoFA, setTwoFA] = useState({ enabled: false })
  const [twoFASetup, setTwoFASetup] = useState({ qr: '', code: '' })
  const [twoFAMsg, setTwoFAMsg] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [twoFAErr, setTwoFAErr] = useState('')

  // Deletion request
  const [del, setDel] = useState({ status: null, requestedAt: null, reason: '' })
  const [delMsg, setDelMsg] = useState('')
  const [delErr, setDelErr] = useState('')
  const [delConfirm, setDelConfirm] = useState(false)

  async function reloadAddresses() {
    try {
      const { data } = await api.get('/account/addresses')
      const list = Array.isArray(data.items) ? data.items.slice() : []
      list.sort((a,b) => (b.isDefault === true) - (a.isDefault === true))
      setAddresses(list)
    } catch (e) {
      // ignore; page will show previous state
    }
  }

  // load all
  useEffect(() => {
    (async () => {
      try {
        const [me, notif, pm, adr, delr] = await Promise.all([
          api.get('/account/profile'),
          api.get('/account/notifications'),
          api.get('/account/payment-methods'),
          api.get('/account/addresses'),
          api.get('/account/deletion')
        ])
        setProfile({
          firstName: me.data.user.firstName,
          lastName: me.data.user.lastName,
          username: me.data.user.username,
          email: me.data.user.email,
          mobile: me.data.user.mobile || '',
          gender: me.data.user.gender || 'prefer_not_to_say',
          birthday: me.data.user.birthday ? me.data.user.birthday.slice(0,10) : '',
          country: me.data.user.country || ''
        })
        setTwoFA(me.data.user.twoFA)
        setNoti(notif.data.notifications)
        setCards(pm.data.items || [])
        const list = Array.isArray(adr.data.items) ? adr.data.items.slice() : []
        list.sort((a,b) => (b.isDefault === true) - (a.isDefault === true))
        setAddresses(list)
        const dr = delr.data.deletionRequest
        setDel({
          status: dr?.status || null,
          requestedAt: dr?.requestedAt || null,
          reason: dr?.reason || ''
        })
      } catch (e) {
        setErr(e.response?.data?.message || e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const pwdStrong = useMemo(() => ({
    len: pwd.newPassword.length >= 8,
    lower: /[a-z]/.test(pwd.newPassword),
    upper: /[A-Z]/.test(pwd.newPassword),
    num: /[0-9]/.test(pwd.newPassword),
    sym: /[^\w\s]/.test(pwd.newPassword),
    nospace: !/\s/.test(pwd.newPassword)
  }), [pwd.newPassword])

  if (loading) return <div className="container-app section">Loading account…</div>
  if (err) return <div className="container-app section text-red-600">{err}</div>

  // actions
  async function saveProfile() {
    setSaving(true); setMsg(''); setErr('')
    try {
      await api.patch('/account/profile', profile)
      setMsg('Profile saved')
    } catch (e) {
      setErr(e.response?.data?.message || e.message)
    } finally { setSaving(false) }
  }

  async function changePassword() {
    setPwdMsg(''); setPwdErr('')
    try {
      await api.patch('/account/password', pwd)
      setPwdMsg('Password updated')
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e) {
      setPwdErr(e.response?.data?.message || e.message)
    }
  }

  async function addAddress() {
    setAddrMsg(''); setAddrErr('')
    try {
      const { data } = await api.post('/account/addresses', addrForm)
      await reloadAddresses()
      setAddrMsg('Address added')
      setAddrForm({ label:'', line1:'', line2:'', city:'', region:'', postalCode:'', country:'', phone:'', isDefault:false })
    } catch (e) {
      setAddrErr(e.response?.data?.message || e.message)
    }
  }

  async function updateAddress(a) {
    const { data } = await api.patch(`/account/addresses/${a._id}`, a)
    await reloadAddresses()
  }

  async function deleteAddress(id) {
    await api.delete(`/account/addresses/${id}`)
    await reloadAddresses()
  }

  async function saveNoti() {
    const { data } = await api.patch('/account/notifications', noti)
    setNoti(data.notifications)
    setNotiMsg('Notification preferences saved')
    setTimeout(() => setNotiMsg(''), 1500)
  }

  // Payment methods
  async function removeCard(id) {
    await api.delete(`/account/payment-methods/${id}`)
    setCards(prev => prev.filter(c => c._id !== id))
    setCardMsg('Removed')
    setTimeout(() => setCardMsg(''), 1200)
  }

  // 2FA
  async function start2FA() {
    setTwoFAErr(''); setTwoFAMsg('')
    const { data } = await api.post('/account/security/2fa/start')
    setTwoFASetup({ qr: data.qrDataUrl, code: '' })
  }
  async function verify2FA() {
    try {
      const { data } = await api.post('/account/security/2fa/verify', { token: twoFASetup.code })
      setTwoFA({ enabled: true })
      setTwoFAMsg('2FA enabled. Save these backup codes:')
      setBackupCodes(data.backupCodes || [])
      setTwoFASetup({ qr: '', code: '' })
    } catch (e) {
      setTwoFAErr(e.response?.data?.message || e.message)
    }
  }
  async function disable2FA() {
    await api.delete('/account/security/2fa')
    setTwoFA({ enabled: false })
    setTwoFAMsg('2FA disabled')
    setBackupCodes([])
  }
  async function regenCodes() {
    const { data } = await api.post('/account/security/2fa/backup/regenerate')
    setTwoFAMsg('New backup codes generated:')
    setBackupCodes(data.backupCodes || [])
  }

  // Deletion request
  async function requestDeletion() {
    setDelErr(''); setDelMsg('')
    if (!delConfirm) { setDelErr('Please confirm you understand this request.'); return }
    try {
      const { data } = await api.post('/account/deletion', { reason: del.reason })
      setDel({
        status: data.deletionRequest.status,
        reason: data.deletionRequest.reason || '',
        requestedAt: data.deletionRequest.requestedAt
      })
      setDelMsg('Deletion request submitted. Our team will review it.')
    } catch (e) {
      setDelErr(e.response?.data?.message || e.message)
    }
  }

  async function cancelDeletion() {
    const { data } = await api.delete('/account/deletion')
    if (data.deletionRequest?.status === 'cancelled') {
      setDel(prev => ({ ...prev, status: 'cancelled' }))
      setDelMsg('Deletion request cancelled.')
    } else {
      // if backend returns null when none existed
      setDel({ status: null, requestedAt: null, reason: '' })
      setDelMsg('No active deletion request.')
    }
  }

  return (
    <div className="container-app section max-w-5xl">
      <h1 className="section-title">My Account</h1>

      <div className="mt-6 flex gap-3 flex-wrap">
        <TabBtn active={tab==='info'} onClick={() => setTab('info')}>Info</TabBtn>
        <TabBtn active={tab==='payment'} onClick={() => setTab('payment')}>Payment</TabBtn>
        <TabBtn active={tab==='addresses'} onClick={() => setTab('addresses')}>Address Book</TabBtn>
        <TabBtn active={tab==='security'} onClick={() => setTab('security')}>Security</TabBtn>
        <TabBtn active={tab==='notifications'} onClick={() => setTab('notifications')}>Notifications</TabBtn>
      </div>

      {tab === 'info' && (
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Account info */}
          <div className="card">
            <div className="card-body">
            <h2 className="font-semibold mb-3">Account information</h2>
            <div className="grid gap-4">
              <input className={input} placeholder="First name" value={profile.firstName} onChange={e=>setProfile({...profile, firstName:e.target.value})}/>
              <input className={input} placeholder="Last name" value={profile.lastName} onChange={e=>setProfile({...profile, lastName:e.target.value})}/>
              <input className={input} placeholder="Username" value={profile.username} onChange={e=>setProfile({...profile, username:e.target.value})}/>
              <input className={input} type="email" placeholder="Email" value={profile.email} onChange={e=>setProfile({...profile, email:e.target.value})}/>
              <input className={input} placeholder="Mobile number" value={profile.mobile} onChange={e=>setProfile({...profile, mobile:e.target.value})}/>
              <select className="select" value={profile.gender} onChange={e=>setProfile({...profile, gender:e.target.value})}>
                <option value="prefer_not_to_say">Prefer not to say</option>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
              <input className={input} type="date" value={profile.birthday} onChange={e=>setProfile({...profile, birthday:e.target.value})}/>
              <input className={input} placeholder="Country" value={profile.country} onChange={e=>setProfile({...profile, country:e.target.value})}/>
              {msg && <p className="text-green-600 text-sm">{msg}</p>}
              {err && <p className="text-red-600 text-sm">{err}</p>}
              <button disabled={saving} className="btn btn-primary" onClick={saveProfile}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
            </div>
          </div>

          {/* Password + Deletion request */}
          <div className="space-y-6">
            <div className="card">
              <div className="card-body">
              <h2 className="font-semibold mb-3">Change password</h2>
              <div className="grid gap-4">
                <input className={input} type="password" placeholder="Current password" value={pwd.currentPassword} onChange={e=>setPwd({...pwd, currentPassword:e.target.value})}/>
                <input className={input} type="password" placeholder="New password" value={pwd.newPassword} onChange={e=>setPwd({...pwd, newPassword:e.target.value})}/>
                <input className={input} type="password" placeholder="Confirm new password" value={pwd.confirmPassword} onChange={e=>setPwd({...pwd, confirmPassword:e.target.value})}/>
              </div>
              <ul className="mt-2 text-xs space-y-1">
                <li className={pwdStrong.len ? 'text-green-600':'opacity-70'}>• ≥ 8 chars</li>
                <li className={pwdStrong.lower ? 'text-green-600':'opacity-70'}>• lowercase</li>
                <li className={pwdStrong.upper ? 'text-green-600':'opacity-70'}>• uppercase</li>
                <li className={pwdStrong.num ? 'text-green-600':'opacity-70'}>• number</li>
                <li className={pwdStrong.sym ? 'text-green-600':'opacity-70'}>• symbol</li>
                <li className={pwdStrong.nospace ? 'text-green-600':'opacity-70'}>• no spaces</li>
              </ul>
              {pwdMsg && <p className="text-green-600 text-sm mt-2">{pwdMsg}</p>}
              {pwdErr && <p className="text-red-600 text-sm mt-2">{pwdErr}</p>}
              <button className="mt-2 btn btn-outline" onClick={changePassword}>Update password</button>
              <p className="text-xs opacity-70 mt-2">Password is stored hashed; on this page we just show it as ••••••••••</p>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
              <h2 className="font-semibold mb-2">Request account deletion</h2>
              {del.status === 'pending' ? (
                <>
                  <p className="text-sm">
                    Your deletion request is <span className="font-medium">pending</span>
                    {del.requestedAt && <> (since {new Date(del.requestedAt).toLocaleString()})</>}
                    . We’ll review it and contact you by email.
                  </p>
                  {del.reason && <p className="text-sm mt-1 opacity-80">Reason: {del.reason}</p>}
                  <div className="mt-3 flex items-center gap-2">
                    <button className="btn btn-outline" onClick={cancelDeletion}>Cancel request</button>
                    {delMsg && <span className="text-green-600 text-sm">{delMsg}</span>}
                  </div>
                </>
              ) : del.status === 'cancelled' ? (
                <p className="text-sm">Your previous deletion request was <span className="font-medium">cancelled</span>. You can submit a new request below.</p>
              ) : (
                <>
                  <p className="text-sm opacity-80">You can request your account to be deleted. This will be reviewed by our team. You will not be able to use your account after deletion.</p>
                  <textarea
                    className={`textarea mt-3 h-28`}
                    placeholder="Reason (optional, but helps us understand)"
                    value={del.reason}
                    onChange={e=>setDel({...del, reason:e.target.value})}
                  />
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={delConfirm} onChange={e=>setDelConfirm(e.target.checked)} />
                    I understand that this action will permanently delete my account data once approved.
                  </label>
                  {delErr && <p className="text-red-600 text-sm mt-1">{delErr}</p>}
                  {delMsg && <p className="text-green-600 text-sm mt-1">{delMsg}</p>}
                  <button className="mt-2 btn btn-danger" onClick={requestDeletion}>Submit deletion request</button>
                </>
              )}
              </div>
            </div>
          </div>
        </section>
      )}

      {tab === 'payment' && (
        <section className="mt-6 card">
          <div className="card-body">
          <h2 className="font-semibold mb-3">Payment methods</h2>
          <p className="text-sm opacity-80 mb-3">
            For security (PCI DSS), we don’t store card numbers. Cards are tokenized by PayHere.
            You’ll be able to add a card during checkout or from here in a future step.
          </p>
          {cardMsg && <p className="text-green-600 text-sm">{cardMsg}</p>}
          <div className="space-y-2">
            {cards.length === 0 && <div className="opacity-70">No saved cards.</div>}
            {cards.map(c => (
              <div key={c._id} className="flex items-center justify-between card p-3">
                <div>{c.label || `${c.brand || 'Card'} •••• ${c.last4 || ''}`} {c.expMonth && c.expYear ? `(${c.expMonth}/${c.expYear})` : ''}</div>
                <button className="btn btn-outline btn-sm" onClick={() => removeCard(c._id)}>Remove</button>
              </div>
            ))}
          </div>
          </div>
        </section>
      )}

      {tab === 'addresses' && (
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="card">
            <div className="card-body">
            <h2 className="font-semibold mb-3">Add address</h2>
            <div className="grid gap-2">
              {['label','line1','line2','city','region','postalCode','country','phone'].map(k=>(
                <input key={k} className={input} placeholder={k} value={addrForm[k]||''} onChange={e=>setAddrForm({...addrForm,[k]:e.target.value})}/>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={addrForm.isDefault} onChange={e=>setAddrForm({...addrForm,isDefault:e.target.checked})}/>
                Set as default
              </label>
              {addrMsg && <p className="text-green-600 text-sm">{addrMsg}</p>}
              {addrErr && <p className="text-red-600 text-sm">{addrErr}</p>}
              <button className="btn btn-primary" onClick={addAddress}>Save address</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
            <h2 className="font-semibold mb-3">Your addresses</h2>
            <div className="space-y-3">
              {addresses.length === 0 && <div className="opacity-70">No addresses yet.</div>}
              {addresses.map(a => (
                <div key={a._id} className="card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{a.label || 'Address'}</div>
                      <div className="text-sm opacity-80 mt-0.5">
                        {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}{a.region ? `, ${a.region}` : ''}, {a.postalCode ? `${a.postalCode}, ` : ''}{a.country}
                        {a.phone ? ` — ${a.phone}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.isDefault ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-[--color-bg-soft]">Default</span>
                      ) : (
                        <button className="btn btn-outline btn-sm" onClick={() => updateAddress({...a, isDefault:true})}>Make default</button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => deleteAddress(a._id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        </section>
      )}

      {tab === 'security' && (
        <section className="mt-6 card space-y-3">
          <div className="card-body">
          <h2 className="font-semibold">Two-step verification (TOTP)</h2>
          {twoFA.enabled ? (
            <>
              <p className="text-sm">2FA is enabled for your account.</p>
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm" onClick={regenCodes}>Regenerate backup codes</button>
                <button className="btn btn-danger btn-sm" onClick={disable2FA}>Disable 2FA</button>
              </div>
              {twoFAMsg && <p className="text-green-600 text-sm mt-2">{twoFAMsg}</p>}
              {backupCodes.length > 0 && (
                <div className="mt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {backupCodes.map(code => (
                      <div key={code} className="rounded-lg border bg-[--color-bg-soft] px-3 py-2 font-mono text-sm tracking-wider">
                        {code}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button className="btn btn-outline btn-sm" onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}>Copy all</button>
                    <span className="text-xs opacity-70">Each code can be used once. Store them securely.</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm">Use Google Authenticator or any TOTP app.</p>
              {!twoFASetup.qr ? (
                <button className="btn btn-primary px-3 py-1" onClick={start2FA}>Start setup</button>
              ) : (
                <div className="mt-3 space-y-2">
                  <img src={twoFASetup.qr} alt="Scan QR" className="w-40 h-40 border rounded-lg" />
                  <input className={input} placeholder="Enter 6-digit code" value={twoFASetup.code} onChange={e=>setTwoFASetup({...twoFASetup, code:e.target.value})}/>
                  <button className="btn btn-outline btn-sm" onClick={verify2FA}>Verify & enable</button>
                </div>
              )}
              {twoFAMsg && <p className="text-green-600 text-sm">{twoFAMsg}</p>}
              {twoFAErr && <p className="text-red-600 text-sm">{twoFAErr}</p>}
            </>
          )}
          </div>
        </section>
      )}

      {tab === 'notifications' && (
        <section className="mt-6 card">
          <div className="card-body">
          <h2 className="font-semibold mb-3">Email notifications</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={noti.purchases} onChange={e=>setNoti({...noti, purchases:e.target.checked})}/>
              Purchases & receipts
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={noti.account} onChange={e=>setNoti({...noti, account:e.target.checked})}/>
              Account changes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={noti.events} onChange={e=>setNoti({...noti, events:e.target.checked})}/>
              Product & store events
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button className="btn btn-primary px-3 py-1" onClick={saveNoti}>Save</button>
            {notiMsg && <span className="text-green-600 text-sm">{notiMsg}</span>}
          </div>
          </div>
        </section>
      )}
    </div>
  )
}
