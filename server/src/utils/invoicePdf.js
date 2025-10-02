import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

function formatLKR(v) {
  return `LKR ${Number(v || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Read optional logo file if exists; return path or null
function resolveLogoPath() {
  const candidates = [
    path.resolve(process.cwd(), 'server', 'src', 'assets', 'logo.png'),
    path.resolve(process.cwd(), 'server', 'src', 'assets', 'logo.jpg'),
    path.resolve(process.cwd(), 'src', 'assets', 'logo.png'),
  ]
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p } catch {}
  }
  return null
}

export async function buildInvoicePDFBuffer({ order, user, store = {} }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      const chunks = []
      doc.on('data', (c) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))

      // Header with logo and store info
      const logoPath = resolveLogoPath()
      if (logoPath) {
        try { doc.image(logoPath, 50, 40, { width: 120 }) } catch {}
      }

      const storeName = store.name || process.env.STORE_NAME || 'D&G Clothing'
      const storeEmail = store.email || process.env.STORE_SUPPORT_EMAIL || ''
      const storePhone = store.phone || process.env.STORE_PHONE || ''
      const storeAddress = store.address || process.env.STORE_ADDRESS || ''

      doc
        .fontSize(18).text(storeName, 50, 40, { align: 'right' })
        .fontSize(10).fillColor('#555')
        .text(storeAddress, { align: 'right' })
        .text(storeEmail, { align: 'right' })
        .text(storePhone, { align: 'right' })
        .fillColor('#111')

      doc.moveDown(2)

      // Invoice meta
      const idShort = String(order?._id || '').slice(-8)
      const issueDate = new Date(order?.createdAt || Date.now()).toISOString().slice(0,10)
      doc
        .fontSize(22).text(`INVOICE`, { align: 'left' })
        .moveDown(0.5)
        .fontSize(10)
        .text(`Invoice No: ${idShort}`)
        .text(`Invoice Date: ${issueDate}`)
        .text(`Payment Method: ${order?.payment?.method || 'N/A'}`)
        .text(`Payment Status: ${order?.payment?.status || 'N/A'}`)

      doc.moveDown(1)

      // Bill To
      const u = user || {}
      const fullName = ((u.firstName || u.name || '') + (u.lastName ? ' ' + u.lastName : '')).trim() || 'Customer'
      const addr = order?.address || {}

      doc
        .fontSize(12).text('Bill To', { underline: true })
        .fontSize(10)
        .text(fullName)
        .text(addr.line1 || '')
        .text([addr.city, addr.region, addr.country].filter(Boolean).join(', '))
        .text(`Email: ${u.email || 'N/A'}`)
        .text(`Phone: ${addr.phone || 'N/A'}`)

      doc.moveDown(1)

      // Items table header
      const items = Array.isArray(order?.items) ? order.items : []
      const tableTop = doc.y
      const rowHeight = 20
      const col = {
        item: 50,
        qty: 350,
        price: 410,
        total: 480
      }

      doc.fontSize(10)
      doc.text('Item', col.item, tableTop)
      doc.text('Qty', col.qty, tableTop, { width: 40, align: 'right' })
      doc.text('Price', col.price, tableTop, { width: 60, align: 'right' })
      doc.text('Total', col.total, tableTop, { width: 80, align: 'right' })
      doc.moveTo(50, tableTop + 14).lineTo(550, tableTop + 14).strokeColor('#ddd').stroke().strokeColor('#111')

      let y = tableTop + 18
      for (const it of items) {
        if (y > 700) { doc.addPage(); y = 60 }
        doc.text(it.name, col.item, y, { width: 280 })
        doc.text(String(it.quantity), col.qty, y, { width: 40, align: 'right' })
        doc.text(formatLKR(it.price), col.price, y, { width: 60, align: 'right' })
        doc.text(formatLKR((it.price || 0) * (it.quantity || 0)), col.total, y, { width: 80, align: 'right' })
        y += rowHeight
      }

      // Totals
      const totals = order?.totals || {}
      y += 10
      doc.moveTo(350, y).lineTo(550, y).strokeColor('#ddd').stroke().strokeColor('#111')
      y += 6
      const line = (label, val, bold=false) => {
        doc.fontSize(10).font(bold ? 'Helvetica-Bold' : 'Helvetica')
        doc.text(label, 350, y, { width: 120, align: 'right' })
        doc.text(formatLKR(val || 0), 480, y, { width: 100, align: 'right' })
        y += 16
      }
      line('Subtotal', totals.subtotal)
      line('Shipping', totals.shipping)
      line('Discount', totals.discount)
      line('Total', totals.grandTotal, true)
      doc.font('Helvetica')

      doc.moveDown(2)
      doc.fontSize(9).fillColor('#555').text('This is a computer-generated invoice and does not require a signature.', { align: 'left' })
      doc.fillColor('#111')

      doc.end()
    } catch (e) { reject(e) }
  })
}
