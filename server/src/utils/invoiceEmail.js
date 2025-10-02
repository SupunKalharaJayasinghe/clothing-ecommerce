import User from '../api/models/User.js'

function formatLKR(v) {
  return `Rs. ${Number(v || 0).toLocaleString('en-LK')}`
}

export function buildInvoiceEmail({ order, user }) {
  const u = user || {}
  const name = (u.firstName || u.name || '') + (u.lastName ? ' ' + u.lastName : '')
  const idShort = String(order?._id || '').slice(-8)
  const items = Array.isArray(order?.items) ? order.items : []
  const totals = order?.totals || {}
  const address = order?.address || {}
  const payMethod = order?.payment?.method || 'N/A'
  const payStatus = order?.payment?.status || 'N/A'

  const subject = `Invoice for Order #${idShort}`
  const textLines = []
  textLines.push(`Dear ${name || 'Customer'},`)
  textLines.push(`Thank you for your order #${order._id}.`)
  textLines.push('')
  textLines.push('Items:')
  for (const it of items) {
    textLines.push(` - ${it.name} x ${it.quantity} = ${formatLKR(it.price * it.quantity)}`)
  }
  textLines.push('')
  textLines.push(`Subtotal: ${formatLKR(totals.subtotal)}`)
  textLines.push(`Shipping: ${formatLKR(totals.shipping)}`)
  textLines.push(`Discount: ${formatLKR(totals.discount)}`)
  textLines.push(`Total: ${formatLKR(totals.grandTotal)}`)
  textLines.push('')
  textLines.push(`Payment Method: ${payMethod}`)
  textLines.push(`Payment Status: ${payStatus}`)
  textLines.push('')
  textLines.push('Delivery Address:')
  textLines.push(`${address.line1 || ''}, ${address.city || ''}, ${address.country || ''}`)
  if (address.phone) textLines.push(`Phone: ${address.phone}`)
  const text = textLines.join('\n')

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
    <h2 style="margin:0 0 6px">Invoice for Order <span style="font-family:monospace">#${idShort}</span></h2>
    <p style="margin:0 0 10px;color:#555">Hi ${name || 'there'}, thanks for your purchase!</p>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left;border-bottom:1px solid #ddd;padding:8px 4px">Item</th>
          <th style="text-align:right;border-bottom:1px solid #ddd;padding:8px 4px">Qty</th>
          <th style="text-align:right;border-bottom:1px solid #ddd;padding:8px 4px">Price</th>
          <th style="text-align:right;border-bottom:1px solid #ddd;padding:8px 4px">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(it => `
          <tr>
            <td style="padding:6px 4px">${it.name}</td>
            <td style="padding:6px 4px;text-align:right">${it.quantity}</td>
            <td style="padding:6px 4px;text-align:right">${formatLKR(it.price)}</td>
            <td style="padding:6px 4px;text-align:right">${formatLKR(it.price * it.quantity)}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:6px 4px;text-align:right;color:#555">Subtotal</td>
          <td style="padding:6px 4px;text-align:right">${formatLKR(totals.subtotal)}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:6px 4px;text-align:right;color:#555">Shipping</td>
          <td style="padding:6px 4px;text-align:right">${formatLKR(totals.shipping)}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:6px 4px;text-align:right;color:#555">Discount</td>
          <td style="padding:6px 4px;text-align:right">${formatLKR(totals.discount)}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:6px 4px;text-align:right;font-weight:bold">Total</td>
          <td style="padding:6px 4px;text-align:right;font-weight:bold">${formatLKR(totals.grandTotal)}</td>
        </tr>
      </tfoot>
    </table>
    <p style="margin:16px 0 6px">
      <strong>Payment:</strong> ${payMethod} — <span style="color:${String(payStatus).toUpperCase()==='PAID' ? '#0a7a2e' : '#b45309'}">${payStatus}</span>
    </p>
    <p style="margin:0 0 2px"><strong>Deliver to:</strong> ${address.line1 || ''}, ${address.city || ''}, ${address.country || ''}</p>
    ${address.phone ? `<p style="margin:0;color:#555">Phone: ${address.phone}</p>` : ''}
  </div>
  `

  return { subject, text, html }
}
export async function sendInvoiceEmail({ order, fetchUserIfMissing = true, user }) {
  let u = user
  if (!u && fetchUserIfMissing && order?.user) {
    u = await User.findById(order.user).select('email firstName lastName name').lean()
  }
  if (!u?.email) return
  const { sendMail } = await import('./mailer.js')
  const { subject, text, html } = buildInvoiceEmail({ order, user: u })
  await sendMail({ to: u.email, subject, text, html })
}
