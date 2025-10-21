import { api } from './api.js'

const root = document.getElementById('app-root')

// Enhanced element creation with animations
function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag)
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') n.className = v
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.substring(2).toLowerCase(), v)
    else if (v !== undefined && v !== null) n.setAttribute(k, v)
  })
  children.flat().forEach(c => n.append(c instanceof Node ? c : document.createTextNode(String(c))))
  return n
}

function formatCurrencyLKR(n) {
  try {
    const v = Number(n || 0)
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
  } catch {
    const v = Number(n || 0)
    return `LKR ${v.toFixed(2)}`
  }
}

// Modern notification system
function showNotification(message, type = 'info', title = '') {
  const notification = el('div', { class: `notification ${type}` },
    title ? el('div', { class: 'title' }, title) : '',
    el('div', { class: 'message' }, message)
  )
  
  document.body.appendChild(notification)
  
  // Trigger animation
  setTimeout(() => notification.classList.add('show'), 100)
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show')
    setTimeout(() => notification.remove(), 300)
  }, 5000)
  
  return notification
}

function showError(err) {
  const message = err?.message || 'Something went wrong'
  showNotification(message, 'error', 'Error')
}

function showSuccess(message, title = 'Success') {
  showNotification(message, 'success', title)
}

function formatOrderId(id) {
  try {
    const s = String(id || '')
    if (!s) return '#'
    return '#' + s.slice(-8)
  } catch (e) {
    return '#'
  }
}

function resolveImageSrc(src) {
  try {
    const s = String(src || '')
    if (!s) return ''
    if (/^(https?:)?\/\//i.test(s) || /^data:/i.test(s)) return s
    const base = String(window.DELIVERY_API_BASE || '').replace(/\/?api$/i, '')
    if (s.startsWith('/')) return base + s
    return base ? `${base.replace(/\/$/, '')}/${s.replace(/^\//, '')}` : s
  } catch { return '' }
}

function badge(text, variant) {
  return el('span', { class: `badge badge-${variant}`, style: 'font-size:12px; padding:6px 10px; text-transform: uppercase;' }, text)
}

function mapDeliveryVariant(s) {
  const v = String(s || '').toUpperCase()
  if (v === 'DELIVERED') return 'success'
  if (['OUT_FOR_DELIVERY','SHIPPED','IN_TRANSIT'].includes(v)) return 'warn'
  if (['DELIVERY_FAILED','RTO_INITIATED','RETURNED_TO_WAREHOUSE'].includes(v)) return 'danger'
  return 'info'
}

function mapPaymentVariant(s) {
  const v = String(s || '').toUpperCase()
  if (['PAID','AUTHORIZED','REFUNDED'].includes(v)) return 'success'
  if (['UNPAID','FAILED'].includes(v)) return 'danger'
  if (['PENDING','REFUND_PENDING','REFUND_PENDING'].includes(v)) return 'warn'
  return 'info'
}

// Loading state management
function setLoading(element, isLoading) {
  if (isLoading) {
    element.classList.add('loading')
    element.disabled = true
  } else {
    element.classList.remove('loading')
    element.disabled = false
  }
}

// Helper function to create Lucide icons
function createIcon(iconName, size = 16) {
  const iconElement = document.createElement('i')
  iconElement.setAttribute('data-lucide', iconName)
  iconElement.style.width = `${size}px`
  iconElement.style.height = `${size}px`
  iconElement.style.display = 'inline-block'
  
  // Initialize the icon if Lucide is available
  if (window.lucide && window.lucide.createIcons) {
    setTimeout(() => window.lucide.createIcons(), 0)
  }
  
  return iconElement
}

// Modern icon system using Lucide Icons
const icons = {
  location: () => createIcon('map-pin'),
  delivered: () => createIcon('check-circle'),
  paid: () => createIcon('dollar-sign'),
  return: () => createIcon('arrow-left'),
  refresh: () => createIcon('refresh-cw'),
  logout: () => createIcon('log-out'),
  login: () => createIcon('log-in'),
  map: () => createIcon('map'),
  phone: () => createIcon('phone'),
  package: () => createIcon('package'),
  truck: () => createIcon('truck'),
  warning: () => createIcon('alert-triangle'),
  success: () => createIcon('check-circle'),
  pending: () => createIcon('clock'),
  failed: () => createIcon('x-circle'),
  user: () => createIcon('user'),
  card: () => createIcon('credit-card'),
  bank: () => createIcon('building'),
  copy: () => createIcon('copy')
}

// Enhanced animations
function animateIn(element) {
  element.classList.add('slide-in')
  return element
}

// Status indicator helper
function getStatusIndicator(status) {
  const statusMap = {
    'SHIPPED': { class: 'status-shipped', icon: icons.truck },
    'OUT_FOR_DELIVERY': { class: 'status-shipped', icon: icons.truck },
    'DELIVERED': { class: 'status-delivered', icon: icons.delivered },
    'DELIVERY_FAILED': { class: 'status-failed', icon: icons.failed },
    'RTO_INITIATED': { class: 'status-failed', icon: icons.return },
    'RETURNED_TO_WAREHOUSE': { class: 'status-failed', icon: icons.return }
  }
  
  const statusInfo = statusMap[status] || { class: 'status-pending', icon: icons.pending }
  const indicator = el('span', { 
    class: `status-indicator ${statusInfo.class}`, 
    title: status,
    style: 'display: inline-flex; align-items: center; margin-right: 8px;'
  })
  indicator.appendChild(statusInfo.icon())
  return indicator
}

// View-only verification: always block changes
function verifyBlocked() {
  try {
    const msg = 'Verification required. The Delivery Panel is now view-only. No changes will be made.'
    // Prompt the user so they explicitly acknowledge
    alert(msg)
  } catch {}
  return false
}

function renderLogin() {
  // Prime CSRF cookie by calling a safe GET endpoint
  api.health().catch(() => {})
  root.innerHTML = ''
  
  // Create title with icon
  const titleContainer = el('div', { class: 'title', style: 'display: flex; align-items: center; justify-content: center; gap: 12px;' })
  titleContainer.appendChild(icons.package())
  titleContainer.appendChild(document.createTextNode('Delivery Panel'))
  
  // Create login button with icon
  const loginButton = el('button', { 
    type: 'submit', 
    class: 'btn btn-primary',
    style: 'min-width: 200px; display: flex; align-items: center; justify-content: center; gap: 8px;'
  })
  loginButton.appendChild(icons.login())
  loginButton.appendChild(document.createTextNode('Sign in'))
  
  const form = el('form', { class: 'login', id: 'loginForm' },
    animateIn(el('div', { class: 'card' },
      titleContainer,
      el('div', { class: 'hint' }, 'Sign in with your delivery account to manage orders and deliveries.'),
      el('div', { class: 'row' },
        el('input', { 
          class: 'input', 
          type: 'text', 
          placeholder: 'Email or username', 
          name: 'identifier', 
          required: true, 
          style: 'flex:1',
          autocomplete: 'username'
        })
      ),
      el('div', { class: 'row', style: 'margin-top:16px' },
        el('input', { 
          class: 'input', 
          type: 'password', 
          placeholder: 'Password', 
          name: 'password', 
          required: true, 
          style: 'flex:1',
          autocomplete: 'current-password'
        })
      ),
      el('div', { class: 'row', style: 'margin-top:24px; justify-content: center' },
        loginButton
      )
    ))
  )
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const submitBtn = form.querySelector('button[type="submit"]')
    setLoading(submitBtn, true)
    
    const fd = new FormData(form)
    try {
      const data = await api.login(fd.get('identifier'), fd.get('password'))
      if (data?.emailLoginRequired && data?.tmpToken) {
        showSuccess('We sent a 6-digit code to your email. Please verify to continue.', 'Check your email')
        renderVerifyEmail(data.tmpToken)
      } else {
        showSuccess('Login successful! Loading your dashboard...')
        setTimeout(() => renderApp(), 500)
      }
    } catch (err) {
      showError(err)
    } finally {
      setLoading(submitBtn, false)
    }
  })
  
  root.append(form)
}

function orderRow(o, refresh) {
  // Enhanced payment badge with better styling
  const paymentStatus = o.payment?.status === 'PAID' ? 'success' : 'warn'
  const paymentBadge = el('span', { 
    class: `badge badge-${paymentStatus}`,
    style: 'display: flex; align-items: center; gap: 6px;'
  })
  paymentBadge.appendChild(icons.paid())
  paymentBadge.appendChild(document.createTextNode(`${o.payment?.method || 'Unknown'} · ${o.payment?.status || 'Pending'}`))
  
  const actionButtons = []
  
  // Build map URL from address
  const mapQuery = encodeURIComponent(`${o.address?.line1 || ''} ${o.address?.city || ''} ${o.address?.country || ''}`.trim())
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`

  // Enhanced actions with loading states
  const locationBtn = el('button', { 
    class: 'btn btn-outline',
    style: 'display: flex; align-items: center; gap: 6px;',
    onclick: () => { 
      try { 
        window.open(mapUrl, '_blank', 'noopener')
        showSuccess('Opening location in maps...', 'Navigation')
      } catch (e) { 
        showError(e) 
      } 
    } 
  })
  locationBtn.appendChild(icons.map())
  locationBtn.appendChild(document.createTextNode('Location'))
  //-------
  const canStartDelivery = ['SHIPPED','IN_TRANSIT'].includes(String(o.deliveryState)) || String(o.orderState) === 'SHIPPED'
  const canMarkDelivered = ['OUT_FOR_DELIVERY','SHIPPED','IN_TRANSIT'].includes(String(o.deliveryState)) || String(o.orderState) === 'SHIPPED'

  if (canStartDelivery && String(o.deliveryState) !== 'OUT_FOR_DELIVERY') {
    const startBtn = el('button', {
      class: 'btn btn-outline',
      style: 'display: flex; align-items: center; gap: 6px;',
      onclick: async (e) => {
        const btn = e.target
        try {
          setLoading(btn, true)
          await api.setOrderStatus(o.id, 'OUT_FOR_DELIVERY')
          showSuccess('Marked as out for delivery', 'Delivery')
          await refresh()
        } catch (e) { showError(e) } finally { setLoading(btn, false) }
      }
    })
    startBtn.appendChild(icons.truck())
    startBtn.appendChild(document.createTextNode('Start Delivery'))
    actionButtons.push(startBtn)
  }

  const deliveredBtn = el('button', { 
    class: 'btn btn-outline',
    style: 'display: flex; align-items: center; gap: 6px;',
    ...(canMarkDelivered ? { onclick: async (e) => {
      const btn = e.target
      try {
        setLoading(btn, true)
        await api.setOrderStatus(o.id, 'DELIVERED')
        showSuccess('Order marked as delivered successfully!', 'Delivery Complete')
        await refresh()
      } catch (e) { 
        showError(e) 
      } finally {
        setLoading(btn, false)
      }
    } } : {})
  })
  deliveredBtn.appendChild(icons.delivered())
  deliveredBtn.appendChild(document.createTextNode('Delivered'))
  if (!canMarkDelivered) {
    deliveredBtn.setAttribute('disabled', 'true')
    deliveredBtn.title = 'Available after handover/out for delivery'
  }
  
  actionButtons.push(locationBtn, deliveredBtn)

  // COD: Confirm paid button when still UNPAID
  const inDelivery = ['OUT_FOR_DELIVERY','DELIVERED','DELIVERY_FAILED','RTO_INITIATED','RETURNED_TO_WAREHOUSE','SHIPPED'].includes(String(o.deliveryState)) || String(o.orderState) === 'SHIPPED'
  if (o.payment?.method === 'COD' && (inDelivery) && o.payment?.status === 'UNPAID') {
    const confirmPaymentBtn = el('button', { 
      class: 'btn btn-success',
      style: 'display: flex; align-items: center; gap: 6px;',
      onclick: async (e) => {
        const btn = e.target
        try {
          if (!confirm('Confirm cash has been collected? This will mark payment as PAID.')) return
          
          setLoading(btn, true)
          await api.setCodPayment(o.id, 'paid')
          showSuccess('Payment confirmed successfully!', 'Payment Received')
          await refresh()
        } catch (e) { 
          showError(e) 
        } finally {
          setLoading(btn, false)
        }
      } 
    })
    confirmPaymentBtn.appendChild(icons.paid())
    confirmPaymentBtn.appendChild(document.createTextNode('Confirm Payment'))
    actionButtons.push(confirmPaymentBtn)
  }

  // Return (RTO) - with verification
  const returnBtn = el('button', { 
    class: 'btn btn-danger',
    style: 'display: flex; align-items: center; gap: 6px;',
    onclick: () => { 
      showNotification('Return to Origin feature is currently disabled for verification.', 'warning', 'Feature Disabled')
      verifyBlocked() 
    } 
  })
  returnBtn.appendChild(icons.return())
  returnBtn.appendChild(document.createTextNode('Return'))
  actionButtons.push(returnBtn)
  
  // Enhanced title with status indicator
  const firstItem = (o.items && o.items[0]) ? o.items[0] : null
  const moreCount = (o.items?.length || 0) - 1
  const orderIdShort = formatOrderId(o.id)
  const itemTitle = firstItem ? `${firstItem.name}${moreCount > 0 ? ` (+${moreCount} more)` : ''}` : ''
  const titleText = `${orderIdShort}`

  // Get delivery status for visual indicator
  const deliveryStatus = o.deliveryState || o.orderState || 'PENDING'
  const statusIndicator = getStatusIndicator(deliveryStatus)

  // Create meta elements with icons
  const customerNameMeta = el('div', { class: 'meta', style: 'display: flex; align-items: center; gap: 6px;' })
  customerNameMeta.appendChild(icons.user())
  customerNameMeta.appendChild(document.createTextNode(`${o.customer?.name || 'Unknown Customer'}`))

  const addressMeta = el('div', { class: 'meta', style: 'display: flex; align-items: center; gap: 6px;' })
  addressMeta.appendChild(icons.location())
  addressMeta.appendChild(document.createTextNode(`${o.address?.city || 'Unknown City'} · ${o.address?.line1 || 'Address not provided'}`))

  const phoneMeta = el('div', { class: 'meta', style: 'display: flex; align-items: center; gap: 6px;' })
  phoneMeta.appendChild(icons.phone())
  phoneMeta.appendChild(document.createTextNode(`${o.address?.phone || 'N/A'}`))

  const orderNameMeta = firstItem ? el('div', { class: 'meta', style: 'display: flex; align-items: center; gap: 6px; font-weight: 600; color: var(--ink);' }, itemTitle) : null

  const totalMeta = el('div', { class: 'meta', style: 'display: flex; align-items: center; gap: 6px;' })
  totalMeta.appendChild(icons.paid())
  totalMeta.appendChild(document.createTextNode('Total: '))
  totalMeta.appendChild(el('span', { style: 'color: var(--ink); font-weight: 600;' }, formatCurrencyLKR(o.total)))

  const orderStatusRow = el('div', { class: 'meta', style: 'margin-top: 8px; display: flex; align-items: center; gap: 8px;' },
    el('span', { style: 'color: var(--muted);' }, 'Order status:'),
    badge(deliveryStatus.replace(/_/g, ' '), mapDeliveryVariant(deliveryStatus))
  )

  const paymentStatusRow = el('div', { class: 'meta', style: 'display: flex; align-items: center; gap: 8px;' },
    el('span', { style: 'color: var(--muted);' }, 'Payment status:'),
    badge(String(o.payment?.status || 'UNKNOWN'), mapPaymentVariant(o.payment?.status))
  )

  const divider = el('div', { style: 'height:1px; background: var(--border); margin: 8px 0;' })

  const images = (o.items || []).map(it => resolveImageSrc(it.image)).filter(Boolean)
  let thumbsRow = null
  if (images.length) {
    const maxThumbs = 4
    thumbsRow = el('div', { class: 'meta', style: 'margin-top: 6px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;' })
    images.slice(0, maxThumbs).forEach((src, idx) => {
      const wrapper = el('div', { style: 'width:48px;height:48px;border-radius:10px;overflow:hidden;border:1px solid var(--border);background: var(--surface-hover);' })
      const img = el('img', { src, alt: `Item ${idx+1}`, loading: 'lazy', style: 'width:100%;height:100%;object-fit:cover;display:block;', onerror: () => { wrapper.style.display = 'none' } })
      wrapper.appendChild(img)
      thumbsRow.appendChild(wrapper)
    })
    const more = images.length - maxThumbs
    if (more > 0) {
      thumbsRow.appendChild(el('span', { class: 'badge', style: 'font-size:11px; padding:4px 8px; opacity:0.9;' }, `+${more} more`))
    }
  }

  const refreshBtn = el('button', { 
    class: 'btn btn-ghost',
    style: 'display: flex; align-items: center; gap: 6px;',
    onclick: async (e) => {
      const btn = e.target
      setLoading(btn, true)
      try {
        await refresh()
        showSuccess('Order data refreshed', 'Updated')
      } finally {
        setLoading(btn, false)
      }
    } 
  })
  refreshBtn.appendChild(icons.refresh())
  refreshBtn.appendChild(document.createTextNode('Refresh'))

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(String(o.id || ''))
      showSuccess(`Copied ${titleText}`, 'Copied')
    } catch {}
  }

  const orderIdEl = el('span', { style: 'font-size: 20px; font-weight: 800; cursor: pointer;' }, titleText)
  orderIdEl.addEventListener('click', copyOrderId)
  const copyIconEl = icons.copy()
  copyIconEl.style.cursor = 'pointer'
  copyIconEl.addEventListener('click', copyOrderId)

  return animateIn(el('div', { class: 'order' },
    el('div', {},
      el('div', { class: 'title', style: 'display: flex; align-items: center; gap: 8px;' }, 
        statusIndicator,
        orderIdEl,
        copyIconEl
      ),
      thumbsRow || '',
      orderNameMeta || '',
      customerNameMeta,
      addressMeta,
      phoneMeta,
      totalMeta,
      divider,
      orderStatusRow,
      paymentStatusRow
    ),
    el('div', { class: 'actions' },
      refreshBtn,
      ...actionButtons,
      paymentBadge,
    )
  ))
}

function renderVerifyEmail(tmpToken) {
  root.innerHTML = ''
  const form = el('form', { class: 'login', id: 'verifyForm' },
    animateIn(el('div', { class: 'card' },
      el('div', { class: 'title' }, 'Email Verification'),
      el('div', { class: 'hint' }, 'Enter the 6-digit code we sent to your email to continue.'),
      el('div', { class: 'row' },
        el('input', {
          class: 'input',
          type: 'text',
          placeholder: '123456',
          name: 'code',
          required: true,
          minlength: 4,
          maxlength: 8,
          style: 'flex:1'
        })
      ),
      el('div', { class: 'row', style: 'margin-top:16px; justify-content: space-between' },
        el('button', { type: 'button', class: 'btn btn-outline', onclick: () => renderLogin() }, 'Back'),
        el('button', { type: 'submit', class: 'btn btn-primary' }, 'Verify')
      ),
      el('div', { class: 'row', style: 'margin-top:8px; justify-content:flex-end' },
        el('button', { type: 'button', class: 'btn btn-ghost', onclick: async () => {
          try {
            const r = await api.login(document.querySelector('input[name="identifier"]')?.value || '', document.querySelector('input[name="password"]')?.value || '')
            if (r?.tmpToken) showSuccess('A new code was sent to your email.')
          } catch (e) { showError(e) }
        } }, 'Resend code')
      )
    ))
  )

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const submitBtn = form.querySelector('button[type="submit"]')
    setLoading(submitBtn, true)
    const fd = new FormData(form)
    try {
      await api.verifyEmailLogin(tmpToken, String(fd.get('code') || '').trim())
      showSuccess('Verified! Loading your dashboard...')
      setTimeout(() => renderApp(), 500)
    } catch (err) {
      showError(err)
    } finally {
      setLoading(submitBtn, false)
    }
  })

  root.append(form)
}

async function renderApp() {
  // Check session with loading state
  try { 
    await api.me() 
  } catch { 
    renderLogin()
    return 
  }

  root.innerHTML = ''
  let currentStatus = ''
  let orderCount = 0

  // Enhanced header with modern styling and stats
  const headerTitle = el('div', { class: 'h1', style: 'display: flex; align-items: center; gap: 12px;' })
  headerTitle.appendChild(icons.truck())
  headerTitle.appendChild(document.createTextNode('Delivery Dashboard'))

  const refreshButton = el('button', { 
    class: 'btn btn-primary', 
    id: 'refreshBtn',
    style: 'display: flex; align-items: center; gap: 6px;',
    onclick: async (e) => {
      const btn = e.target
      setLoading(btn, true)
      try {
        await load()
        showSuccess('Orders refreshed successfully', 'Updated')
      } finally {
        setLoading(btn, false)
      }
    }
  })
  refreshButton.appendChild(icons.refresh())
  refreshButton.appendChild(document.createTextNode('Refresh'))

  const logoutButton = el('button', { 
    class: 'btn btn-outline',
    style: 'display: flex; align-items: center; gap: 6px;'
  })
  logoutButton.appendChild(icons.logout())
  logoutButton.appendChild(document.createTextNode('Logout'))

  // Wrap to anchor the dropdown confirmation
  const logoutWrap = el('div', { style: 'position: relative; display: inline-block;' }, logoutButton)

  // Logout confirmation with 5s countdown before enabling actions
  function showLogoutConfirm() {
    // Remove existing if present
    const existing = document.querySelector('.dropdown-panel')
    if (existing) existing.remove()

    const panel = el('div', { class: 'dropdown-panel card slide-in' })
    panel.style.position = 'fixed'
    const rect = logoutButton.getBoundingClientRect()
    panel.style.top = `${Math.round(rect.bottom + 8)}px`
    const panelWidth = 300
    const left = Math.max(10, Math.round(rect.right - panelWidth))
    panel.style.left = `${left}px`
    panel.style.minWidth = '300px'
    panel.style.zIndex = '99999'

    const title = el('div', { class: 'title', style: 'margin-bottom: 8px; font-weight: 700;' }, 'Are you want to loggout?')
    const desc = el('div', { class: 'hint', style: 'margin-bottom: 8px;' }, 'Please wait 5 seconds before you can confirm.')
    const countdownEl = el('div', { style: 'font-weight: 600; margin-bottom: 12px; text-align: center;' }, '5')

    const actions = el('div', { class: 'row', style: 'justify-content: flex-end; gap: 8px; display: none;' },
      el('button', { class: 'btn btn-outline', type: 'button', onclick: () => { panel.remove(); /* also remove outside click listener */ document.removeEventListener('click', onDocClick, true) } }, 'Cancel'),
      el('button', { class: 'btn btn-primary', type: 'button', onclick: async (e) => {
        const btn = e.target
        try {
          setLoading(btn, true)
          await api.logout()
          showSuccess('Logged out successfully', 'Goodbye')
          setTimeout(() => renderLogin(), 500)
        } catch (err) {
          showError(err)
        } finally {
          setLoading(btn, false)
          panel.remove()
          document.removeEventListener('click', onDocClick, true)
        }
      } }, 'Logout')
    )

    panel.append(title, desc, countdownEl, actions)
    document.body.append(panel)

    // Close when clicking outside
    const onDocClick = (ev) => {
      if (!panel.contains(ev.target) && ev.target !== logoutButton) {
        panel.remove()
        document.removeEventListener('click', onDocClick, true)
      }
    }
    setTimeout(() => document.addEventListener('click', onDocClick, true), 0)

    let remaining = 5
    const timer = setInterval(() => {
      remaining -= 1
      countdownEl.textContent = String(remaining)
      if (remaining <= 0) {
        clearInterval(timer)
        desc.textContent = 'You can now cancel or logout.'
        countdownEl.style.display = 'none'
        actions.style.display = 'flex'
      }
    }, 1000)
  }

  logoutButton.addEventListener('click', (e) => {
    e.preventDefault()
    showLogoutConfirm()
  })

  // Create enhanced dropdown options with icons
  function createSelectWithIcons(id, title, options) {
    const select = el('select', { 
      class: 'select', 
      id: id,
      title: title
    })
    
    options.forEach(option => {
      const optionEl = el('option', { value: option.value }, option.text)
      select.appendChild(optionEl)
    })
    
    return select
  }

  const statusOptions = [
    { value: '', text: 'All Statuses' },
    { value: 'SHIPPED', text: 'Dispatched' },
    { value: 'OUT_FOR_DELIVERY', text: 'Out for Delivery' },
    { value: 'DELIVERED', text: 'Delivered' },
    { value: 'DELIVERY_FAILED', text: 'Failed/Attempted' },
    { value: 'RTO_INITIATED', text: 'Return to Sender' },
    { value: 'RETURNED_TO_WAREHOUSE', text: 'Returned' }
  ]

  const methodOptions = [
    { value: '', text: 'All Methods' },
    { value: 'COD', text: 'Cash on Delivery' },
    { value: 'CARD', text: 'Card Payment' },
    { value: 'BANK', text: 'Bank Transfer' }
  ]

  // Create custom dropdown containers with icons
  const statusDropdown = el('div', { class: 'select-container' })
  const statusIcon = icons.package()
  const statusSelect = createSelectWithIcons('statusSelect', 'Filter by delivery status', statusOptions)
  statusDropdown.appendChild(statusIcon)
  statusDropdown.appendChild(statusSelect)

  const methodDropdown = el('div', { class: 'select-container' })
  const methodIcon = icons.paid()
  const methodSelect = createSelectWithIcons('methodSelect', 'Filter by payment method', methodOptions)
  methodDropdown.appendChild(methodIcon)
  methodDropdown.appendChild(methodSelect)

  const header = el('div', { class: 'header' },
    el('div', {},
      headerTitle,
      el('div', { class: 'meta', id: 'orderStats', style: 'margin-top: 8px; font-size: 14px; color: var(--muted)' }, 
        'Loading orders...'
      )
    ),
    el('div', { class: 'row' },
      statusDropdown,
      methodDropdown,
      refreshButton,
      el('div', { class: 'spacer' }),
      logoutWrap
    )
  )

  // Enhanced loading state
  const list = el('div', { class: 'card' }, 
    el('div', { class: 'loading', style: 'text-align: center; padding: 40px;' }, 
      'Loading your delivery orders...'
    )
  )
  
  root.append(animateIn(el('div', { class: 'card' }, header)), list)

  // Auto-refresh functionality
  let autoRefreshInterval
  
  async function load() {
    const sel = document.getElementById('statusSelect')
    const msel = document.getElementById('methodSelect')
    const statsEl = document.getElementById('orderStats')
    
    currentStatus = sel?.value || ''
    const method = msel?.value || ''
    
    list.innerHTML = ''
    list.append(el('div', { class: 'loading', style: 'text-align: center; padding: 20px;' }, 
      'Loading orders...'
    ))
    
    try {
      const res = await api.listOrders(currentStatus, method)
      const refresh = () => load()
      
      list.innerHTML = ''
      
      if (!res.items?.length) {
        list.append(
          el('div', { 
            style: 'text-align: center; padding: 60px 20px; color: var(--muted);' 
          },
            el('div', { style: 'font-size: 48px; margin-bottom: 16px;' }, icons.package),
            el('div', { style: 'font-size: 18px; font-weight: 600; margin-bottom: 8px;' }, 'No Orders Found'),
            el('div', { style: 'font-size: 14px;' }, 'Try adjusting your filters or check back later.')
          )
        )
        orderCount = 0
      } else {
        orderCount = res.items.length
        res.items.forEach((o, index) => {
          // Stagger animations for a cool effect
          setTimeout(() => {
            list.append(orderRow(o, refresh))
          }, index * 50)
        })
      }
      
      // Update stats
      const statusText = currentStatus ? ` (${currentStatus.replace(/_/g, ' ').toLowerCase()})` : ''
      const methodText = method ? ` • ${method}` : ''
      statsEl.textContent = `${orderCount} order${orderCount !== 1 ? 's' : ''} found${statusText}${methodText}`
      
    } catch (e) {
      list.innerHTML = ''
      list.append(
        el('div', { 
          style: 'text-align: center; padding: 60px 20px; color: var(--danger-solid);' 
        },
          el('div', { style: 'font-size: 48px; margin-bottom: 16px;' }, icons.failed),
          el('div', { style: 'font-size: 18px; font-weight: 600; margin-bottom: 8px;' }, 'Failed to Load Orders'),
          el('div', { style: 'font-size: 14px; margin-bottom: 20px;' }, e.message || 'Something went wrong'),
          el('button', { 
            class: 'btn btn-primary',
            onclick: () => load()
          }, `${icons.refresh} Try Again`)
        )
      )
      showError(e)
    }
  }

  // Add event listeners for filters
  document.getElementById('statusSelect').addEventListener('change', load)
  document.getElementById('methodSelect').addEventListener('change', load)
  
  await load()
}

// Boot the application
renderApp()
