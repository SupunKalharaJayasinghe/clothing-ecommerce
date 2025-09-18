import { useEffect, useMemo, useState } from 'react'
import api from '../lib/axios'

const input = "w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"

function TabBtn({active, onClick, children}) {
  return (
    <button onClick={onClick}
      className={`px-3 py-2 rounded-lg border ${active ? 'bg-gray-50' : ''}`}>
      {children}
    </button>
  )
}

export default function Account() {
  const [tab, setTab] = useState('info')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

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
  const [twoFAErr, setTwoFAErr] = useState('')

  // load all
  useEffect(() => {
    (async () => {
      try {
        const [{ data: me }, { data: notif }, { data: pm }, { data: adr }] = await Promise.all([
          api.get('/account/profile'),
          api.get('/account/notifications'),
          api.get('/account/payment-methods'),
          api.get('/account/addresses')
        ])
        setUser(me.user)
        setProfile({
          firstName: me.user.firstName,
          lastName: me.user.lastName,
          username: me.user.username,
          email: me.user.email,
          mobile: me.user.mobile || '',
          gender: me.user.gender || 'prefer_not_to_say',
          birthday: me.user.birthday ? me.user.birthday.slice(0,10) : '',
          country: me.user.country || ''
        })
        setTwoFA(me.user.twoFA)
        setNoti(notif.notifications)
        setCards(pm.items || [])
        setAddresses(adr.items || [])
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

  if (loading) return <div className="p-6">Loading account…</div>
  if (err) return <div className="p-6 text-red-600">{err}</div>

  // actions
  async function saveProfile() {
    setSaving(true); setMsg(''); setErr('')
    try {
      const { data } = await api.patch('/account/profile', profile)
      setUser(data.user)
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
      setAddresses(prev => [...prev, data.address])
      setAddrMsg('Address added')
      setAddrForm({ label:'', line1:'', line2:'', city:'', region:'', postalCode:'', country:'', phone:'', isDefault:false })
    } catch (e) {
      setAddrErr(e.response?.data?.message || e.message)
    }
  }

  async function updateAddress(a) {
    const { data } = await api.patch(`/account/addresses/${a._id}`, a)
    setAddresses(prev => prev.map(x => x._id === a._id ? data.address : x))
  }

  async function deleteAddress(id) {
    await api.delete(`/account/addresses/${id}`)
    setAddresses(prev => prev.filter(x => x._id !== id))
  }

  async function saveNoti() {
    const { data } = await api.patch('/account/notifications', noti)
    setNoti(data.notifications)
    setNotiMsg('Notification preferences saved')
    setTimeout(() => setNotiMsg(''), 1500)
  }

  // Payment methods: tokenized via gateway (placeholder UX)
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
      setTwoFAMsg(`2FA enabled. Save these backup codes: ${data.backupCodes.join(', ')}`)
      setTwoFASetup({ qr: '', code: '' })
    } catch (e) {
      setTwoFAErr(e.response?.data?.message || e.message)
    }
  }
  async function disable2FA() {
    await api.delete('/account/security/2fa')
    setTwoFA({ enabled: false })
    setTwoFAMsg('2FA disabled')
  }
  async function regenCodes() {
    const { data } = await api.post('/account/security/2fa/backup/regenerate')
    setTwoFAMsg(`New backup codes: ${data.backupCodes.join(', ')}`)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">My Account</h1>

      <div className="mt-4 flex gap-2 flex-wrap">
        <TabBtn active={tab==='info'} onClick={() => setTab('info')}>Info</TabBtn>
        <TabBtn active={tab==='payment'} onClick={() => setTab('payment')}>Payment</TabBtn>
        <TabBtn active={tab==='addresses'} onClick={() => setTab('addresses')}>Address Book</TabBtn>
        <TabBtn active={tab==='security'} onClick={() => setTab('security')}>Security</TabBtn>
        <TabBtn active={tab==='notifications'} onClick={() => setTab('notifications')}>Notifications</TabBtn>
      </div>

      {tab === 'info' && (
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border p-5">
            <h2 className="font-semibold mb-3">Account information</h2>
            <div className="grid gap-3">
              <input className={input} placeholder="First name" value={profile.firstName} onChange={e=>setProfile({...profile, firstName:e.target.value})}/>
              <input className={input} placeholder="Last name" value={profile.lastName} onChange={e=>setProfile({...profile, lastName:e.target.value})}/>
              <input className={input} placeholder="Username" value={profile.username} onChange={e=>setProfile({...profile, username:e.target.value})}/>
              <input className={input} type="email" placeholder="Email" value={profile.email} onChange={e=>setProfile({...profile, email:e.target.value})}/>
              <input className={input} placeholder="Mobile number" value={profile.mobile} onChange={e=>setProfile({...profile, mobile:e.target.value})}/>
              <select className={input} value={profile.gender} onChange={e=>setProfile({...profile, gender:e.target.value})}>
                <option value="prefer_not_to_say">Prefer not to say</option>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
              <input className={input} type="date" value={profile.birthday} onChange={e=>setProfile({...profile, birthday:e.target.value})}/>
              <input className={input} placeholder="Country" value={profile.country} onChange={e=>setProfile({...profile, country:e.target.value})}/>
              {msg && <p className="text-green-600 text-sm">{msg}</p>}
              {err && <p className="text-red-600 text-sm">{err}</p>}
              <button disabled={saving} className="rounded-lg border py-2" onClick={saveProfile}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border p-5">
            <h2 className="font-semibold mb-3">Change password</h2>
            <input className={input} type="password" placeholder="Current password" value={pwd.currentPassword} onChange={e=>setPwd({...pwd, currentPassword:e.target.value})}/>
            <input className={input} type="password" placeholder="New password" value={pwd.newPassword} onChange={e=>setPwd({...pwd, newPassword:e.target.value})}/>
            <input className={input} type="password" placeholder="Confirm new password" value={pwd.confirmPassword} onChange={e=>setPwd({...pwd, confirmPassword:e.target.value})}/>
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
            <button className="mt-2 rounded-lg border py-2" onClick={changePassword}>Update password</button>
            <p className="text-xs opacity-70 mt-2">Password is stored hashed; on this page we just show it as ••••••••••</p>
          </div>
        </section>
      )}

      {tab === 'payment' && (
        <section className="mt-6 rounded-2xl border p-5">
          <h2 className="font-semibold mb-3">Payment methods</h2>
          <p className="text-sm opacity-80 mb-3">
            For security (PCI DSS), we don’t store card numbers. Cards are tokenized by PayHere.
            You’ll be able to add a card during checkout or from here in a future step.
          </p>
          {cardMsg && <p className="text-green-600 text-sm">{cardMsg}</p>}
          <div className="space-y-2">
            {cards.length === 0 && <div className="opacity-70">No saved cards.</div>}
            {cards.map(c => (
              <div key={c._id} className="flex items-center justify-between border rounded-lg p-3">
                <div>{c.label || `${c.brand || 'Card'} •••• ${c.last4 || ''}`} {c.expMonth && c.expYear ? `(${c.expMonth}/${c.expYear})` : ''}</div>
                <button className="rounded-lg border px-3 py-1" onClick={() => removeCard(c._id)}>Remove</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'addresses' && (
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border p-5">
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
              <button className="rounded-lg border py-2" onClick={addAddress}>Save address</button>
            </div>
          </div>

          <div className="rounded-2xl border p-5">
            <h2 className="font-semibold mb-3">Your addresses</h2>
            <div className="space-y-2">
              {addresses.length === 0 && <div className="opacity-70">No addresses yet.</div>}
              {addresses.map(a => (
                <div key={a._id} className="border rounded-lg p-3">
                  <div className="font-medium">{a.label || 'Address'}</div>
                  <div className="text-sm opacity-80">
                    {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}{a.region ? `, ${a.region}` : ''}, {a.postalCode ? `${a.postalCode}, ` : ''}{a.country}
                    {a.phone ? ` — ${a.phone}` : ''}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {!a.isDefault && <button className="rounded-lg border px-3 py-1" onClick={() => updateAddress({...a, isDefault:true})}>Make default</button>}
                    <button className="rounded-lg border px-3 py-1" onClick={() => deleteAddress(a._id)}>Delete</button>
                  </div>
                  {a.isDefault && <div className="text-xs mt-1">Default</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === 'security' && (
        <section className="mt-6 rounded-2xl border p-5 space-y-3">
          <h2 className="font-semibold">Two-step verification (TOTP)</h2>
          {twoFA.enabled ? (
            <>
              <p className="text-sm">2FA is enabled for your account.</p>
              <div className="flex gap-2">
                <button className="rounded-lg border px-3 py-1" onClick={regenCodes}>Regenerate backup codes</button>
                <button className="rounded-lg border px-3 py-1" onClick={disable2FA}>Disable 2FA</button>
              </div>
              {twoFAMsg && <p className="text-green-600 text-sm">{twoFAMsg}</p>}
            </>
          ) : (
            <>
              <p className="text-sm">Use Google Authenticator or any TOTP app.</p>
              {!twoFASetup.qr ? (
                <button className="rounded-lg border px-3 py-1" onClick={start2FA}>Start setup</button>
              ) : (
                <div className="mt-3 space-y-2">
                  <img src={twoFASetup.qr} alt="Scan QR" className="w-40 h-40 border rounded-lg" />
                  <input className={input} placeholder="Enter 6-digit code" value={twoFASetup.code} onChange={e=>setTwoFASetup({...twoFASetup, code:e.target.value})}/>
                  <button className="rounded-lg border px-3 py-1" onClick={verify2FA}>Verify & enable</button>
                </div>
              )}
              {twoFAMsg && <p className="text-green-600 text-sm">{twoFAMsg}</p>}
              {twoFAErr && <p className="text-red-600 text-sm">{twoFAErr}</p>}
            </>
          )}
        </section>
      )}

      {tab === 'notifications' && (
        <section className="mt-6 rounded-2xl border p-5">
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
            <button className="rounded-lg border px-3 py-1" onClick={saveNoti}>Save</button>
            {notiMsg && <span className="text-green-600 text-sm">{notiMsg}</span>}
          </div>
        </section>
      )}
    </div>
  )
}
