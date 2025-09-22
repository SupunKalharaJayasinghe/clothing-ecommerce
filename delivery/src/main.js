import { api } from './api.js'

const root = document.getElementById('app-root')

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

function showError(err) {
  alert(err?.message || 'Something went wrong')
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
  root.innerHTML = ''
  const form = el('form', { class: 'card login', id: 'loginForm' },
    el('div', { class: 'title' }, 'Delivery Panel · COD'),
    el('div', { class: 'hint' }, 'Sign in with your delivery account (role: Delivery agent).'),
    el('div', { class: 'row' },
      el('input', { class: 'input', type: 'text', placeholder: 'Email or username', name: 'identifier', required: true, style: 'flex:1' })
    ),
    el('div', { class: 'row', style: 'margin-top:8px' },
      el('input', { class: 'input', type: 'password', placeholder: 'Password', name: 'password', required: true, style: 'flex:1' })
    ),
    el('div', { class: 'row', style: 'margin-top:12px; justify-content: flex-end' },
      el('button', { type: 'submit', class: 'btn btn-primary' }, 'Sign in')
    )
  )
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(form)
    try {
      await api.login(fd.get('identifier'), fd.get('password'))
      await renderApp()
    } catch (err) {
      showError(err)
    }
  })
  root.append(form)
}

function orderRow(o, refresh) {
  const paymentBadge = el('span', { class: 'badge ' + ((o.payment?.status === 'PAID') ? 'badge-info' : 'badge-warn') }, `${o.payment?.method || '-'} · ${o.payment?.status || '-'}`)
  const actionButtons = []
  // Build map URL from address
  const mapQuery = encodeURIComponent(`${o.address?.line1 || ''} ${o.address?.city || ''} ${o.address?.country || ''}`.trim())
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`

  // Actions
  actionButtons.push(
    el('button', { class: 'btn btn-outline', onclick: () => { try { window.open(mapUrl, '_blank', 'noopener'); } catch (e) { showError(e) } } }, 'See location'),
    el('button', { class: 'btn btn-outline', onclick: async () => {
      try {
        if (!confirm('Mark this order as Delivered?')) return
        const pod = prompt('Enter OTP code or photo/signature URL (optional). Leave blank to continue without evidence:') || ''
        let payload = undefined
        const trimmed = pod.trim()
        if (trimmed) {
          if (/^\d{4,6}$/.test(trimmed)) {
            payload = { evidence: { otp: trimmed } }
          } else if (/^https?:\/\//i.test(trimmed)) {
            payload = { evidence: { podPhotoUrl: trimmed } }
          } else {
            // unrecognized input: proceed without attaching evidence
            payload = undefined
          }
        }
        await api.setOrderStatus(o.id, 'DELIVERED', payload)
        await refresh()
      } catch (e) { showError(e) }
    } }, 'Delivered')
  )

  // COD: Confirm paid button when still UNPAID
  const inDelivery = ['OUT_FOR_DELIVERY','DELIVERED','DELIVERY_FAILED','RTO_INITIATED','RETURNED_TO_WAREHOUSE','SHIPPED'].includes(String(o.deliveryState)) || String(o.orderState) === 'SHIPPED'
  if (o.payment?.method === 'COD' && (inDelivery) && o.payment?.status === 'UNPAID') {
    actionButtons.push(
      el('button', { class: 'btn btn-success', onclick: async () => { verifyBlocked() } }, 'Confirm paid')
    )
  }

  // Return (RTO)
  actionButtons.push(
    el('button', { class: 'btn btn-danger', onclick: async () => { verifyBlocked() } }, 'Return')
  )
  
  // Title: first item name (+N more)
  const firstItem = (o.items && o.items[0]) ? o.items[0] : null
  const moreCount = (o.items?.length || 0) - 1
  const title = firstItem ? `${firstItem.name}${moreCount > 0 ? ` (+${moreCount} more)` : ''}` : `Order ${o.id}`

  return el('div', { class: 'order' },
    el('div', {},
      el('div', { class: 'title' }, title),
      el('div', { class: 'meta' }, (o.customer?.name ? `${o.customer.name}` : '-') + (o.address?.phone ? ` · ${o.address.phone}` : '')),
      el('div', { class: 'meta' }, (o.address?.city || '-') + ' · ' + (o.address?.line1 || '-'))
    ),
    el('div', { class: 'actions' },
      el('button', { class: 'btn btn-outline', onclick: () => refresh() }, 'Refresh'),
      ...actionButtons,
      paymentBadge,
    )
  )
}

async function renderApp() {
  // Check session
  try { await api.me() } catch { renderLogin(); return }

  root.innerHTML = ''
  let currentStatus = ''

  const header = el('div', { class: 'header' },
    el('div', { class: 'h1' }, 'Delivery Panel'),
    el('div', { class: 'row' },
      el('select', { class: 'select', id: 'statusSelect' },
        el('option', { value: '' }, 'All statuses'),
        el('option', { value: 'SHIPPED' }, 'Dispatched'),
        el('option', { value: 'OUT_FOR_DELIVERY' }, 'Out for delivery'),
        el('option', { value: 'DELIVERED' }, 'Delivered'),
        el('option', { value: 'DELIVERY_FAILED' }, 'Failed/Attempted'),
        el('option', { value: 'RTO_INITIATED' }, 'Return to sender'),
        el('option', { value: 'RETURNED_TO_WAREHOUSE' }, 'Returned'),
      ),
      el('select', { class: 'select', id: 'methodSelect', style: 'margin-left:8px' },
        el('option', { value: '' }, 'All methods'),
        el('option', { value: 'COD' }, 'COD'),
        el('option', { value: 'CARD' }, 'Card'),
        el('option', { value: 'BANK' }, 'Slip upload'),
      ),
      el('button', { class: 'btn btn-primary', onclick: () => load() }, 'Refresh'),
      el('div', { class: 'spacer' }),
      el('button', { class: 'btn btn-outline', onclick: async () => { try { await api.logout(); renderLogin() } catch (e) { showError(e) } } }, 'Logout')
    )
  )

  const list = el('div', { class: 'card' }, el('div', {}, 'Loading...'))
  root.append(el('div', { class: 'card' }, header), list)

  async function load() {
    const sel = document.getElementById('statusSelect')
    const msel = document.getElementById('methodSelect')
    currentStatus = sel?.value || ''
    const method = msel?.value || ''
    list.innerHTML = ''
    try {
      const res = await api.listOrders(currentStatus, method)
      const refresh = () => load()
      if (!res.items?.length) {
        list.append(el('div', { class: 'meta' }, 'No orders'))
        return
      }
      res.items.forEach(o => list.append(orderRow(o, refresh)))
    } catch (e) {
      list.append(el('div', { class: 'meta' }, e.message || 'Failed to load orders'))
    }
  }

  await load()
}

// boot
renderApp()
