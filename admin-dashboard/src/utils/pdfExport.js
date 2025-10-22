import jsPDF from 'jspdf'
import { formatOrderId } from './format'

const BRAND_NAME = 'D & G Enterprises'
function drawReportHeader(doc, title) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 14
  const right = 14
  doc.setFillColor(245, 248, 252)
  doc.rect(0, 0, pageWidth, 26, 'F')
  doc.setTextColor(20, 20, 20)
  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text(BRAND_NAME, left, 14)
  doc.setFontSize(8)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Clothing & Accessories', left, 20)
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(10)
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - right, 14, { align: 'right' })
  doc.setFontSize(16)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(33, 33, 33)
  doc.text(title, left, 34)
  doc.setDrawColor(220)
  doc.line(left, 36, pageWidth - right, 36)
  return 42
}

function drawReportFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    doc.text(`Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width - 30,
      doc.internal.pageSize.height - 10)
  }
}

function fmtCurrencyLKR(n, withSymbol = false) {
  try {
    const v = Number(n || 0)
    const s = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
    return withSymbol ? s : s.replace(/^([^\d]*)\s?/, '')
  } catch { return String(n ?? '0') }
}

function applyStatusColor(doc, u) {
  const s = String(u || '').toUpperCase()
  if (s.includes('DELIVERED')) { doc.setTextColor(34,197,94); return }
  if (s.includes('CANCEL') || s.includes('FAIL') || s.includes('RETURN')) { doc.setTextColor(220,38,38); return }
  if (s.includes('SHIP') || s.includes('OUT FOR DELIVERY') || s.includes('TRANSIT')) { doc.setTextColor(37,99,235); return }
  if (s.includes('CONFIRM') || s.includes('PACK')) { doc.setTextColor(245,158,11); return }
  doc.setTextColor(0,0,0)
}

export const exportCustomersPDF = (customers) => {
  console.log('Starting PDF export for customers:', customers)
  
  if (!customers || customers.length === 0) {
    alert('No customers data provided')
    return
  }
  
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const leftMargin = 14
  const rightMargin = 14
  const contentWidth = pageWidth - leftMargin - rightMargin
  
  // Add title
  doc.setFontSize(20)
  doc.setFont(undefined, 'bold')
  doc.text('Customer Report', 14, 22)
  
  // Add metadata
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)
  doc.text(`Total Customers: ${customers.length}`, 14, 35)
  
  // Create table manually
  let yPos = 50
  const lineHeight = 8
  const columnWidths = [contentWidth * 0.30, contentWidth * 0.40, contentWidth * 0.18, contentWidth * 0.12] // Name, Email, Username, Date
  const columnPositions = [
    leftMargin, 
    leftMargin + columnWidths[0], 
    leftMargin + columnWidths[0] + columnWidths[1], 
    leftMargin + columnWidths[0] + columnWidths[1] + columnWidths[2]
  ]
  
  // Draw header
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.setFillColor(41, 128, 185)
  doc.rect(leftMargin, yPos - 5, contentWidth, lineHeight, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text('Name', columnPositions[0], yPos)
  doc.text('Email', columnPositions[1], yPos)
  doc.text('Username', columnPositions[2], yPos)
  doc.text('Registration Date', columnPositions[3], yPos)
  yPos += lineHeight + 2
  
  // Draw data rows
  doc.setFont(undefined, 'normal')
  doc.setTextColor(0, 0, 0)
  
  customers.forEach((customer, index) => {
    // Alternate row background
    if (index % 2 === 1) {
      doc.setFillColor(245, 245, 245)
      doc.rect(leftMargin, yPos - 5, contentWidth, lineHeight, 'F')
    }
    
    // Customer data
    const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'N/A'
    const email = customer.email || 'N/A'
    const username = customer.username || 'N/A'
    const regDate = customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'
    
    // Truncate long text to fit columns
    doc.text(name.length > 20 ? name.substring(0, 17) + '...' : name, columnPositions[0], yPos)
    doc.text(email.length > 25 ? email.substring(0, 22) + '...' : email, columnPositions[1], yPos)
    doc.text(username.length > 15 ? username.substring(0, 12) + '...' : username, columnPositions[2], yPos)
    doc.text(regDate, columnPositions[3], yPos)
    
    yPos += lineHeight
    
    // Add new page if needed
    if (yPos > pageHeight - 20) {
      doc.addPage()
      yPos = 50
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.setFillColor(41, 128, 185)
      doc.rect(leftMargin, yPos - 5, contentWidth, lineHeight, 'F')
      doc.setTextColor(255, 255, 255)
      doc.text('Name', columnPositions[0], yPos)
      doc.text('Email', columnPositions[1], yPos)
      doc.text('Username', columnPositions[2], yPos)
      doc.text('Registration Date', columnPositions[3], yPos)
      yPos += lineHeight + 2
      doc.setFont(undefined, 'normal')
      doc.setTextColor(0, 0, 0)
    }
  })
  
  // Add footer with page numbers
  drawReportFooter(doc)
  
  // Save the PDF
  doc.save(`customers-report-${new Date().toISOString().split('T')[0]}.pdf`)
  console.log('PDF saved successfully')
}

export const exportSingleCustomerPDF = (customer) => {
  try {
    console.log('Starting single customer PDF export:', customer)
    
    if (!customer) {
      throw new Error('No customer data provided')
    }
    
    const doc = new jsPDF()
  
  // Add title
  doc.setFontSize(20)
  doc.setFont(undefined, 'bold')
  doc.text('Customer Details', 14, 22)
  
  // Add metadata
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)
  
  // Customer information section
  doc.setFontSize(14)
  doc.setFont(undefined, 'bold')
  doc.text('Personal Information', 14, 50)
  
  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  
  let yPos = 60
  const lineHeight = 8
  
  // Personal details
  doc.text(`Name: ${customer.firstName || ''} ${customer.lastName || ''}`.trim(), 14, yPos)
  yPos += lineHeight
  
  doc.text(`Email: ${customer.email || 'N/A'}`, 14, yPos)
  yPos += lineHeight
  
  doc.text(`Username: ${customer.username || 'N/A'}`, 14, yPos)
  yPos += lineHeight
  
  if (customer.mobile) {
    doc.text(`Mobile: ${customer.mobile}`, 14, yPos)
    yPos += lineHeight
  }
  
  if (customer.gender) {
    doc.text(`Gender: ${customer.gender}`, 14, yPos)
    yPos += lineHeight
  }
  
  if (customer.birthday) {
    doc.text(`Birthday: ${new Date(customer.birthday).toLocaleDateString()}`, 14, yPos)
    yPos += lineHeight
  }
  
  if (customer.country) {
    doc.text(`Country: ${customer.country}`, 14, yPos)
    yPos += lineHeight
  }
  
  // Account information
  yPos += 10
  doc.setFontSize(14)
  doc.setFont(undefined, 'bold')
  doc.text('Account Information', 14, yPos)
  yPos += 10
  
  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  
  doc.text(`Registration Date: ${customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}`, 14, yPos)
  yPos += lineHeight
  
  doc.text(`Last Updated: ${customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString() : 'N/A'}`, 14, yPos)
  yPos += lineHeight
  
  doc.text(`Email Verified: ${customer.emailVerified ? 'Yes' : 'No'}`, 14, yPos)
  yPos += lineHeight
  
  doc.text(`Roles: ${customer.roles ? customer.roles.join(', ') : 'user'}`, 14, yPos)
  yPos += lineHeight
  
  // Addresses section
  if (customer.addresses && customer.addresses.length > 0) {
    yPos += 10
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Addresses', 14, yPos)
    yPos += 10
    
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    
    customer.addresses.forEach((address, index) => {
      doc.text(`Address ${index + 1}:`, 14, yPos)
      yPos += lineHeight
      
      if (address.label) {
        doc.text(`  Label: ${address.label}`, 14, yPos)
        yPos += lineHeight
      }
      
      doc.text(`  ${address.line1}`, 14, yPos)
      yPos += lineHeight
      
      if (address.line2) {
        doc.text(`  ${address.line2}`, 14, yPos)
        yPos += lineHeight
      }
      
      doc.text(`  ${address.city}, ${address.region || ''} ${address.postalCode || ''}`, 14, yPos)
      yPos += lineHeight
      
      doc.text(`  ${address.country}`, 14, yPos)
      yPos += lineHeight
      
      if (address.phone) {
        doc.text(`  Phone: ${address.phone}`, 14, yPos)
        yPos += lineHeight
      }
      
      if (address.isDefault) {
        doc.text(`  (Default Address)`, 14, yPos)
        yPos += lineHeight
      }
      
      yPos += 5 // Space between addresses
    })
  }
  
  // Notification preferences
  if (customer.notifications) {
    yPos += 10
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Notification Preferences', 14, yPos)
    yPos += 10
    
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    
    doc.text(`Purchase Notifications: ${customer.notifications.purchases ? 'Enabled' : 'Disabled'}`, 14, yPos)
    yPos += lineHeight
    
    doc.text(`Account Notifications: ${customer.notifications.account ? 'Enabled' : 'Disabled'}`, 14, yPos)
    yPos += lineHeight
    
    doc.text(`Event Notifications: ${customer.notifications.events ? 'Enabled' : 'Disabled'}`, 14, yPos)
    yPos += lineHeight
  }
  
  // Add footer
  doc.setFontSize(8)
  doc.text(
    'Page 1 of 1',
    doc.internal.pageSize.width - 30,
    doc.internal.pageSize.height - 10
  )
  
  // Save the PDF
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.username || 'customer'
  doc.save(`customer-${customerName}-${new Date().toISOString().split('T')[0]}.pdf`)
  console.log('Single customer PDF saved successfully')
  } catch (error) {
    console.error('Error generating single customer PDF:', error)
    throw error
  }
}

export const exportProductsPDF = (products) => {
  console.log('Starting PDF export for products:', products)
  
  if (!products || products.length === 0) {
    alert('No products data provided')
    return
  }
  
  const doc = new jsPDF()
  
  // Add title
  doc.setFontSize(20)
  doc.setFont(undefined, 'bold')
  doc.text('Products Report', 14, 22)
  
  // Add metadata
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)
  doc.text(`Total Products: ${products.length}`, 14, 35)
  
  // Calculate summary statistics
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0)
  const lowStockCount = products.filter(p => p.stock <= (p.lowStockThreshold || 5)).length
  const outOfStockCount = products.filter(p => p.stock <= 0).length
  
  doc.text(`Total Inventory Value: LKR ${totalValue.toLocaleString()}`, 14, 40)
  doc.text(`Low Stock Items: ${lowStockCount}`, 14, 45)
  doc.text(`Out of Stock Items: ${outOfStockCount}`, 14, 50)
  
  const getPageHeight = () => doc.internal.pageSize.getHeight()
  const lineHeight = 8
  const leftMargin = 14
  const columnWidths = [60, 35, 25, 25, 25, 25] // Name, Category, Price, Stock, Value, Status
  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0)
  const columnPositions = [
    leftMargin, 
    leftMargin + columnWidths[0], 
    leftMargin + columnWidths[0] + columnWidths[1], 
    leftMargin + columnWidths[0] + columnWidths[1] + columnWidths[2],
    leftMargin + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3],
    leftMargin + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4]
  ]
  const drawTableHeader = (startY) => {
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.setFillColor(41, 128, 185)
    doc.rect(leftMargin, startY - 5, tableWidth, lineHeight, 'F')
    doc.setTextColor(255, 255, 255)
    doc.text('Product Name', columnPositions[0], startY)
    doc.text('Category', columnPositions[1], startY)
    doc.text('Price (LKR)', columnPositions[2], startY)
    doc.text('Stock', columnPositions[3], startY)
    doc.text('Value (LKR)', columnPositions[4], startY)
    doc.text('Status', columnPositions[5], startY)
    doc.setTextColor(0, 0, 0)
    doc.setFont(undefined, 'normal')
    return startY + lineHeight + 2
  }
  
  let yPos = drawTableHeader(65)
  
  products.forEach((product, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(245, 245, 245)
      doc.rect(leftMargin, yPos - 5, tableWidth, lineHeight, 'F')
    }
    
    const name = product.name || 'N/A'
    const category = product.category || 'N/A'
    const price = product.price || 0
    const stock = product.stock || 0
    const value = price * stock
    const status = stock <= 0 ? 'Out' : stock <= (product.lowStockThreshold || 5) ? 'Low' : 'OK'
    
    doc.text(name.length > 25 ? name.substring(0, 22) + '...' : name, columnPositions[0], yPos)
    doc.text(category.length > 12 ? category.substring(0, 9) + '...' : category, columnPositions[1], yPos)
    doc.text(price.toLocaleString(), columnPositions[2], yPos)
    doc.text(stock.toString(), columnPositions[3], yPos)
    doc.text(value.toLocaleString(), columnPositions[4], yPos)
    
    if (status === 'Out') {
      doc.setTextColor(220, 38, 38) // Red
    } else if (status === 'Low') {
      doc.setTextColor(245, 158, 11) // Orange
    } else {
      doc.setTextColor(34, 197, 94) // Green
    }
    doc.text(status, columnPositions[5], yPos)
    doc.setTextColor(0, 0, 0)
    
    yPos += lineHeight
    
    if (yPos > getPageHeight() - 20) {
      doc.addPage()
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('Products Report (continued)', leftMargin, 22)
      yPos = drawTableHeader(35)
    }
  })
  
  // Add footer
  drawReportFooter(doc)
  
  // Save the PDF
  doc.save(`products-report-${new Date().toISOString().split('T')[0]}.pdf`)
  console.log('Products PDF saved successfully')
}

export const exportSingleProductPDF = (product) => {
  try {
    console.log('Starting single product PDF export:', product)
    
    if (!product) {
      throw new Error('No product data provided')
    }
    
    const doc = new jsPDF()
  
    // Add title
    doc.setFontSize(20)
    doc.setFont(undefined, 'bold')
    doc.text('Product Details', 14, 22)
    
    // Add metadata
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)
    
    // Product information section
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Basic Information', 14, 50)
    
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    
    let yPos = 60
    const lineHeight = 8
    
    // Basic details
    doc.text(`Product Name: ${product.name || 'N/A'}`, 14, yPos)
    yPos += lineHeight
    
    doc.text(`SKU/Slug: ${product.slug || 'N/A'}`, 14, yPos)
    yPos += lineHeight
    
    if (product.color) {
      doc.text(`Color: ${product.color}`, 14, yPos)
      yPos += lineHeight
    }
    
    if (product.category) {
      doc.text(`Category: ${product.category}`, 14, yPos)
      yPos += lineHeight
    }
    
    if (product.description) {
      doc.text(`Description: ${product.description.length > 80 ? product.description.substring(0, 80) + '...' : product.description}`, 14, yPos)
      yPos += lineHeight
    }
    
    // Pricing section
    yPos += 10
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Pricing & Financial', 14, yPos)
    yPos += 10
    
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    
    doc.text(`Original Price: LKR ${(product.price || 0).toLocaleString()}`, 14, yPos)
    yPos += lineHeight
    
    if (product.discountPercent && product.discountPercent > 0) {
      doc.text(`Discount: ${product.discountPercent}%`, 14, yPos)
      yPos += lineHeight
      
      const finalPrice = product.finalPrice || (product.price * (1 - product.discountPercent / 100))
      doc.text(`Final Price: LKR ${finalPrice.toLocaleString()}`, 14, yPos)
      yPos += lineHeight
    }
    
    const totalValue = (product.price || 0) * (product.stock || 0)
    doc.text(`Total Inventory Value: LKR ${totalValue.toLocaleString()}`, 14, yPos)
    yPos += lineHeight
    
    // Inventory section
    yPos += 10
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Inventory Information', 14, yPos)
    yPos += 10
    
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    
    doc.text(`Stock Quantity: ${product.stock || 0}`, 14, yPos)
    yPos += lineHeight
    
    doc.text(`Low Stock Threshold: ${product.lowStockThreshold || 5}`, 14, yPos)
    yPos += lineHeight
    
    const stockStatus = (product.stock || 0) <= 0 ? 'Out of Stock' : 
                       (product.stock || 0) <= (product.lowStockThreshold || 5) ? 'Low Stock' : 'In Stock'
    
    // Stock status with color indication
    if (stockStatus === 'Out of Stock') {
      doc.setTextColor(220, 38, 38) // Red
    } else if (stockStatus === 'Low Stock') {
      doc.setTextColor(245, 158, 11) // Orange
    } else {
      doc.setTextColor(34, 197, 94) // Green
    }
    doc.text(`Stock Status: ${stockStatus}`, 14, yPos)
    doc.setTextColor(0, 0, 0) // Reset to black
    yPos += lineHeight
    
    // Tags and metadata section
    if (product.tags && product.tags.length > 0) {
      yPos += 10
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('Tags & Categories', 14, yPos)
      yPos += 10
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      
      doc.text(`Tags: ${product.tags.join(', ')}`, 14, yPos)
      yPos += lineHeight
    }
    
    if (product.mainTags && product.mainTags.length > 0) {
      doc.text(`Main Tags: ${product.mainTags.join(', ')}`, 14, yPos)
      yPos += lineHeight
    }
    
    // Performance metrics
    if (product.rating || product.reviewsCount) {
      yPos += 10
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('Performance Metrics', 14, yPos)
      yPos += 10
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      
      if (product.rating) {
        doc.text(`Average Rating: ${product.rating}/5`, 14, yPos)
        yPos += lineHeight
      }
      
      if (product.reviewsCount) {
        doc.text(`Total Reviews: ${product.reviewsCount}`, 14, yPos)
        yPos += lineHeight
      }
    }
    
    // SEO information
    if (product.metaTitle || product.metaDescription) {
      yPos += 10
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('SEO Information', 14, yPos)
      yPos += 10
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      
      if (product.metaTitle) {
        doc.text(`Meta Title: ${product.metaTitle}`, 14, yPos)
        yPos += lineHeight
      }
      
      if (product.metaDescription) {
        const metaDesc = product.metaDescription.length > 80 ? product.metaDescription.substring(0, 80) + '...' : product.metaDescription
        doc.text(`Meta Description: ${metaDesc}`, 14, yPos)
        yPos += lineHeight
      }
    }
    
    // System information
    yPos += 10
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('System Information', 14, yPos)
    yPos += 10
    
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    
    doc.text(`Created: ${product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}`, 14, yPos)
    yPos += lineHeight
    
    doc.text(`Last Updated: ${product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : 'N/A'}`, 14, yPos)
    yPos += lineHeight
    
    doc.text(`Product ID: ${product.id || 'N/A'}`, 14, yPos)
    yPos += lineHeight
    
    // Add footer
    drawReportFooter(doc)
    
    // Save the PDF
    const productName = product.name || product.slug || 'product'
    const fileName = productName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    doc.save(`product-${fileName}-${new Date().toISOString().split('T')[0]}.pdf`)
    console.log('Single product PDF saved successfully')
  } catch (error) {
    console.error('Error generating single product PDF:', error)
    throw error
  }
}

// ================================
// ORDERS PDF EXPORT FUNCTIONS
// ================================

export const exportOrdersPDF = (orders) => {
  console.log('Starting PDF export for orders:', orders)
  
  if (!orders || orders.length === 0) {
    alert('No orders data provided')
    return
  }
  
  const doc = new jsPDF()
  const topStart = drawReportHeader(doc, 'Orders Report')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const leftMargin = 14
  const rightMargin = 14
  const contentWidth = pageWidth - leftMargin - rightMargin
  
  // Calculate summary statistics (canonical)
  const upper = (s) => String(s || '').toUpperCase()
  const totalValue = orders.reduce((sum, o) => sum + Number(o.totals?.grandTotal ?? o.total ?? o.totalValue ?? 0), 0)
  const completedOrders = orders.filter(o => upper(o.orderState) === 'DELIVERED' || upper(o.deliveryState) === 'DELIVERED').length
  const pendingSet = new Set(['CREATED','CONFIRMED','PACKING','SHIPPED','OUT_FOR_DELIVERY'])
  const pendingOrders = orders.filter(o => pendingSet.has(upper(o.orderState))).length
  const cancelledOrders = orders.filter(o => upper(o.orderState) === 'CANCELLED').length
  const returnedOrders = orders.filter(o => upper(o.orderState) === 'RETURNED' || upper(o.deliveryState) === 'RETURNED_TO_WAREHOUSE').length
  
  let metaY = topStart
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text(`Total Orders: ${orders.length}`, 14, metaY); metaY += 5
  doc.text(`Total Order Value: ${fmtCurrencyLKR(totalValue, true)}`, 14, metaY); metaY += 5
  doc.text(`Completed Orders: ${completedOrders}`, 14, metaY); metaY += 5
  doc.text(`Pending Orders: ${pendingOrders}`, 14, metaY); metaY += 5
  doc.text(`Cancelled: ${cancelledOrders}   Returned: ${returnedOrders}`, 14, metaY); metaY += 8
  
  // Create table manually
  let yPos = metaY
  const lineHeight = 8
  // Responsive column widths based on page width
  const columnWidths = [
    contentWidth * 0.20, // Order ID
    contentWidth * 0.28, // Customer
    contentWidth * 0.14, // Total
    contentWidth * 0.20, // Status
    contentWidth * 0.06, // Items
    contentWidth * 0.12  // Date (wider to fit)
  ]
  const columnPositions = [
    leftMargin,
    leftMargin + columnWidths[0],
    leftMargin + columnWidths[0] + columnWidths[1],
    leftMargin + columnWidths[0] + columnWidths[1] + columnWidths[2],
    leftMargin + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3],
    leftMargin + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3] + columnWidths[4]
  ]
  
  // Draw header
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.setFillColor(41, 128, 185)
  doc.rect(leftMargin, yPos - 5, contentWidth, lineHeight, 'F')
  doc.setTextColor(255, 255, 255)
  const headerCenter = (i) => columnPositions[i] + columnWidths[i] / 2
  const rightOf = (i, pad=2) => columnPositions[i] + columnWidths[i] - pad
  doc.text('Order ID', columnPositions[0], yPos)
  doc.text('Customer', columnPositions[1], yPos)
  doc.text('Total (LKR)', rightOf(2), yPos, { align: 'right' })
  doc.text('Status', headerCenter(3), yPos, { align: 'center' })
  doc.text('Items', headerCenter(4), yPos, { align: 'center' })
  doc.text('Date', rightOf(5), yPos, { align: 'right' })
  yPos += lineHeight + 2
  
  // Draw data rows
  doc.setFont(undefined, 'normal')
  doc.setTextColor(0, 0, 0)
  
  orders.forEach((order, index) => {
    // Alternate row background
    if (index % 2 === 1) {
      doc.setFillColor(245, 245, 245)
      doc.rect(leftMargin, yPos - 5, contentWidth, lineHeight, 'F')
    }
    
    // Order data
    const orderId = formatOrderId(order?._id)
    const customerName = (order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : '')
      || order.customer?.name || order.customerName || order.user?.username || 'Guest'
    const totalNum = Number(order.totals?.grandTotal ?? order.total ?? order.totalValue ?? 0)
    const total = fmtCurrencyLKR(totalNum, false)
    const rawStatus = String(order.orderState || order.deliveryState || order.status || 'N/A')
    const status = rawStatus.toUpperCase().replace(/_/g, ' ')
    const itemCount = Number(order.items?.length ?? order.itemCount ?? 0)
    const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'
    
    // Truncate long text to fit columns
    const custMax = 32
    const statusMax = 24
    const totalRight = columnPositions[2] + columnWidths[2] - 2
    const itemsRight = columnPositions[4] + columnWidths[4] - 2
    const dateRight = columnPositions[5] + columnWidths[5] - 2
    doc.text(orderId, columnPositions[0], yPos)
    doc.text(customerName.length > custMax ? customerName.substring(0, custMax - 3) + '...' : customerName, columnPositions[1], yPos)
    doc.text(total, totalRight, yPos, { align: 'right' })
    if (status.includes('DELIVERED')) doc.setTextColor(34,197,94)
    else if (status.includes('CANCEL') || status.includes('FAIL') || status.includes('RETURN')) doc.setTextColor(220,38,38)
    else if (status.includes('SHIP') || status.includes('OUT FOR DELIVERY') || status.includes('TRANSIT')) doc.setTextColor(37,99,235)
    else if (status.includes('CONFIRM') || status.includes('PACK')) doc.setTextColor(245,158,11)
    doc.text(status.length > statusMax ? status.substring(0, statusMax - 3) + '...' : status, columnPositions[3], yPos)
    doc.setTextColor(0,0,0)
    doc.text(String(itemCount), itemsRight, yPos, { align: 'right' })
    doc.text(date, dateRight, yPos, { align: 'right' })
    
    yPos += lineHeight
    
    // Add new page if needed
    if (yPos > 270) {
      doc.addPage()
      yPos = 20
    }
  })
  
  // Add footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width - 30,
      doc.internal.pageSize.height - 10
    )
  }
  
  // Save the PDF
  doc.save(`orders-report-${new Date().toISOString().split('T')[0]}.pdf`)
  console.log('Orders PDF saved successfully')
}

export const exportSingleOrderPDF = (order) => {
  try {
    console.log('Starting single order PDF export:', order)
    
    if (!order) {
      throw new Error('No order data provided')
    }
    
    const doc = new jsPDF()
    const topStart = drawReportHeader(doc, 'Order Details')
    
    // Order information section
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Order Information', 14, topStart)
    
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    
    let yPos = topStart + 10
    const lineHeight = 8
    const pageWidth = doc.internal.pageSize.getWidth()
    const left = 14
    const right = 14
    const contentWidth = pageWidth - left - right
    // Summary chips: Status, Payment, Method
    const ordStatusChip = String(order.orderState || order.deliveryState || order.status || 'N/A').toUpperCase().replace(/_/g, ' ')
    const payMethodChip = order.payment?.method || order.paymentMethod || 'N/A'
    const payStatusChip = String(order.payment?.status || order.paymentStatus || 'N/A').toUpperCase()
    const chip = (label, value, x, y, color) => {
      const txt = `${label}: ${value}`
      const w = doc.getTextWidth(txt) + 8
      doc.setFillColor(color[0], color[1], color[2])
      doc.rect(x, y - 6, w, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.text(txt, x + 4, y)
      doc.setTextColor(0, 0, 0)
      return w + 6
    }
    let cx = left
    let cy = yPos
    let statusColor = [107,114,128]
    if (ordStatusChip.includes('DELIVERED')) statusColor = [34,197,94]
    else if (ordStatusChip.includes('CANCEL') || ordStatusChip.includes('FAIL') || ordStatusChip.includes('RETURN')) statusColor = [220,38,38]
    else if (ordStatusChip.includes('SHIP') || ordStatusChip.includes('OUT FOR DELIVERY') || ordStatusChip.includes('TRANSIT')) statusColor = [37,99,235]
    else if (ordStatusChip.includes('CONFIRM') || ordStatusChip.includes('PACK')) statusColor = [245,158,11]
    cx += chip('Status', ordStatusChip, cx, cy, statusColor)
    const payColor = payStatusChip === 'PAID' ? [34,197,94] : (payStatusChip === 'FAILED' ? [220,38,38] : [245,158,11])
    cx += chip('Payment', payStatusChip, cx, cy, payColor)
    cx += chip('Method', payMethodChip, cx, cy, [71,85,105])
    yPos += 12
    
    // Order details
    const custName = (order.customer?.name) || (`${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim()) || order.customerName || 'Guest'
    const custEmail = order.customer?.email || order.user?.email || order.customerEmail || 'N/A'
    const ordStatus = String(order.orderState || order.deliveryState || order.status || 'N/A').toUpperCase().replace(/_/g, ' ')
    doc.text(`Order ID: ${formatOrderId(order._id) || 'N/A'}`, 14, yPos)
    yPos += lineHeight
    
    doc.text(`Order Date: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}`, 14, yPos)
    yPos += lineHeight

    // Two-column panels: Customer and Shipping Address
    yPos += 6
    const colW = (contentWidth - 6) / 2
    const leftX = left
    const rightX = left + colW + 6
    const addrPanel = order.shippingAddress || order.address || {}
    const leftLines = [
      `Name: ${custName}`,
      `Email: ${custEmail}`,
      `Phone: ${addrPanel.phone || 'N/A'}`
    ]
    const rightLines = [
      addrPanel.line1 || '',
      addrPanel.line2 || '',
      `${addrPanel.city || ''}${addrPanel.region ? ', ' + addrPanel.region : ''} ${addrPanel.postalCode || ''}`.trim(),
      addrPanel.country || ''
    ].filter(Boolean)
    const panelLH = 6
    const leftH = 12 + leftLines.length * panelLH + 6
    const rightH = 12 + rightLines.length * panelLH + 6
    const panelH = Math.max(leftH, rightH)
    doc.setDrawColor(229)
    doc.setFillColor(248,250,252)
    doc.rect(leftX, yPos, colW, panelH, 'FD')
    doc.rect(rightX, yPos, colW, panelH, 'FD')
    doc.setFontSize(12); doc.setFont(undefined, 'bold')
    doc.text('Customer', leftX + 4, yPos + 8)
    doc.text('Shipping Address', rightX + 4, yPos + 8)
    doc.setFontSize(10); doc.setFont(undefined, 'normal')
    let ly = yPos + 16
    leftLines.forEach(line => { doc.text(line, leftX + 4, ly); ly += panelLH })
    ly = yPos + 16
    rightLines.forEach(line => { doc.text(line, rightX + 4, ly); ly += panelLH })
    yPos += panelH + 10
    
    // Payment section
    yPos += 10
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Payment Information', 14, yPos)
    yPos += 10
    
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    
    const payMethod = order.payment?.method || order.paymentMethod || 'N/A'
    const payStatus = order.payment?.status || order.paymentStatus || 'N/A'
    const totals = order.totals || {}
    const subTotalNum = Number(totals.subtotal ?? totals.subTotal ?? order.subtotal ?? 0)
    const shippingNum = Number(totals.shipping ?? order.shipping ?? 0)
    const taxNum = Number(totals.tax ?? order.tax ?? 0)
    const discountNum = Number(totals.discount ?? order.discount ?? 0)
    const grandNum = Number(totals.grandTotal ?? order.totalValue ?? order.total ?? 0)
    doc.text(`Payment Method: ${payMethod}`, 14, yPos)
    yPos += lineHeight
    
    doc.text(`Payment Status: ${payStatus}`, 14, yPos)
    yPos += lineHeight
    
    // Delivery information panel
    yPos += 10
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Delivery Information', 14, yPos)
    yPos += 10
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    {
      const d = order.assignedDelivery || {}
      const lines = []
      if (d.firstName || d.lastName || d.username) {
        const dn = `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.username
        lines.push(`Assigned To: ${dn}`)
      } else {
        lines.push('Assigned To: Unassigned')
      }
      if (d.phone) lines.push(`Phone: ${d.phone}`)
      const delState = String(order.deliveryState || order.orderState || 'N/A').toUpperCase().replace(/_/g,' ')
      lines.push(`Delivery State: ${delState}`)
      const pod = order.deliveryMeta?.evidence?.delivered || {}
      const podBits = []
      if (pod.otp) podBits.push('OTP')
      if (pod.podPhotoUrl) podBits.push('Photo')
      if (pod.signatureUrl) podBits.push('Signature')
      lines.push(`POD Evidence: ${podBits.length ? podBits.join(', ') : 'None'}`)

      const panelLH = 6
      const panelH = 12 + lines.length * panelLH + 6
      // Page break if not enough space
      if (yPos + panelH > 270) {
        doc.addPage()
        const newTop = drawReportHeader(doc, 'Order Details')
        yPos = newTop + 10
      }
      doc.setDrawColor(229)
      doc.setFillColor(248,250,252)
      const boxW = contentWidth
      doc.rect(14, yPos, boxW, panelH, 'FD')
      doc.setFontSize(12); doc.setFont(undefined, 'bold')
      doc.text('Courier', 18, yPos + 8)
      doc.setFontSize(10); doc.setFont(undefined, 'normal')
      let ty = yPos + 16
      lines.forEach(line => { doc.text(line, 18, ty); ty += panelLH })
      yPos += panelH
    }

    // Items section
    if (order.items && order.items.length > 0) {
      yPos += 10
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('Order Items', 14, yPos)
      yPos += 10
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      // Items table
      const tableLeft = 14
      const w = [90, 20, 35, 35] // Name, Qty, Price, Line Total
      const pos = [tableLeft, tableLeft + w[0], tableLeft + w[0] + w[1], tableLeft + w[0] + w[1] + w[2]]
      // header
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.setFillColor(41,128,185)
      doc.rect(tableLeft, yPos - 5, 195, lineHeight, 'F')
      doc.setTextColor(255,255,255)
      doc.text('Item', pos[0], yPos)
      doc.text('Qty', pos[1] + w[1] - 2, yPos, { align: 'right' })
      doc.text('Price', pos[2] + w[2] - 2, yPos, { align: 'right' })
      doc.text('Total', pos[3] + w[3] - 2, yPos, { align: 'right' })
      yPos += lineHeight + 2
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(0,0,0)

      order.items.forEach((item, index) => {
        // page break
        if (yPos > 270) {
          doc.addPage()
          const newTop = drawReportHeader(doc, 'Order Details')
          yPos = newTop + 10
          doc.setFontSize(10)
          doc.setFont(undefined, 'bold')
          doc.setFillColor(41,128,185)
          doc.rect(tableLeft, yPos - 5, 195, lineHeight, 'F')
          doc.setTextColor(255,255,255)
          doc.text('Item', pos[0], yPos)
          doc.text('Qty', pos[1] + w[1] - 2, yPos, { align: 'right' })
          doc.text('Price', pos[2] + w[2] - 2, yPos, { align: 'right' })
          doc.text('Total', pos[3] + w[3] - 2, yPos, { align: 'right' })
          yPos += lineHeight + 2
          doc.setFontSize(11)
          doc.setFont(undefined, 'normal')
          doc.setTextColor(0,0,0)
        }
        const name = item.name || item.slug || 'Item'
        const qty = Number(item.quantity || 1)
        const priceNum = Number(item.price ?? item.unitPrice ?? 0)
        const lineTotal = Number(item.total ?? priceNum * qty)
        const nameMax = 60
        const nameText = name.length > nameMax ? name.substring(0, nameMax - 3) + '...' : name
        doc.text(`${index + 1}. ${nameText}`, pos[0], yPos)
        doc.text(String(qty), pos[1] + w[1] - 2, yPos, { align: 'right' })
        doc.text(fmtCurrencyLKR(priceNum, false), pos[2] + w[2] - 2, yPos, { align: 'right' })
        doc.text(fmtCurrencyLKR(lineTotal, false), pos[3] + w[3] - 2, yPos, { align: 'right' })
        yPos += lineHeight
      })

      // Order summary box (right aligned)
      yPos += 6
      const sumW = 80
      const sumX = left + contentWidth - sumW
      const sumLines = [
        { k: 'Subtotal', v: subTotalNum },
        ...(shippingNum ? [{ k: 'Shipping', v: shippingNum }] : []),
        ...(taxNum ? [{ k: 'Tax', v: taxNum }] : []),
        ...(discountNum ? [{ k: 'Discount', v: -discountNum }] : []),
      ]
      const sumLH = 7
      const sumH = 12 + (sumLines.length + 2) * sumLH + 8
      if (yPos + sumH > 270) {
        doc.addPage()
        const newTop = drawReportHeader(doc, 'Order Details')
        yPos = newTop + 10
      }
      doc.setDrawColor(229)
      doc.setFillColor(248,250,252)
      doc.rect(sumX, yPos, sumW, sumH, 'FD')
      doc.setFontSize(12); doc.setFont(undefined, 'bold')
      doc.text('Order Summary', sumX + 6, yPos + 10)
      let sy = yPos + 18
      doc.setFontSize(10); doc.setFont(undefined, 'normal')
      sumLines.forEach(({k,v}) => {
        doc.text(k, sumX + 6, sy)
        doc.text(fmtCurrencyLKR(v, true), sumX + sumW - 6, sy, { align: 'right' })
        sy += sumLH
      })
      // Divider and grand total
      doc.setDrawColor(210)
      doc.line(sumX + 6, sy + 2, sumX + sumW - 6, sy + 2)
      sy += sumLH
      doc.setFontSize(11); doc.setFont(undefined, 'bold')
      doc.text('Total', sumX + 6, sy)
      doc.text(fmtCurrencyLKR(grandNum, true), sumX + sumW - 6, sy, { align: 'right' })
    }
    
    // Shipping address block removed (covered in panels above)
    
    // Add footer
    drawReportFooter(doc)
    
    // Save the PDF
    const orderIdShort = String(order._id || 'order').substring(0, 8)
    doc.save(`order-${orderIdShort}-${new Date().toISOString().split('T')[0]}.pdf`)
    console.log('Single order PDF saved successfully')
  } catch (error) {
    console.error('Error generating single order PDF:', error)
    throw error
  }
}

// PAYMENTS PDF EXPORT
export const exportPaymentsPDF = (payments) => {
  if (!payments?.length) { alert('No payments data'); return }
  const doc = new jsPDF()
  doc.setFontSize(20); doc.text('Payments Report', 14, 22)
  doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
  doc.text(`Total: ${payments.length}`, 14, 35)
  
  let yPos = 50; const lineHeight = 6
  doc.setFontSize(9)
  payments.forEach((p, i) => {
    const id = formatOrderId(p?._id)
    const method = p.payment?.method || 'N/A'
    const status = p.payment?.status || 'N/A'
    const amount = (p.totals?.grandTotal || 0).toLocaleString()
    doc.text(`${i+1}. ${id} ${method} LKR ${amount} (${status})`, 14, yPos)
    yPos += lineHeight; if (yPos > 270) { doc.addPage(); yPos = 20 }
  })
  doc.save(`payments-report-${new Date().toISOString().split('T')[0]}.pdf`)
}

export const exportSinglePaymentPDF = (payment) => {
  if (!payment) throw new Error('No payment data')
  const doc = new jsPDF()
  doc.setFontSize(16); doc.text('Payment Details', 14, 22)
  doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
  let yPos = 45; const lineHeight = 7
  doc.text(`Order: ${formatOrderId(payment._id) || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Customer: ${payment.customerName || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Method: ${payment.paymentMethod || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Status: ${payment.paymentStatus || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Amount: LKR ${(payment.totalValue || 0).toLocaleString()}`, 14, yPos)
  doc.save(`payment-${String(payment._id || 'pay').substring(0,8)}-${new Date().toISOString().split('T')[0]}.pdf`)
}

// REFUNDS PDF EXPORT
export const exportRefundsPDF = (refunds) => {
  if (!refunds?.length) { alert('No refunds data'); return }
  const doc = new jsPDF()
  doc.setFontSize(20); doc.text('Refunds Report', 14, 22)
  doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
  doc.text(`Total: ${refunds.length}`, 14, 35)
  
  let yPos = 50; const lineHeight = 6
  doc.setFontSize(9)
  refunds.forEach((r, i) => {
    const id = String(r._id || r.order?._id || '').substring(0, 8)
    const amountNum = Number((r.amount ?? r.totals?.grandTotal) || 0)
    const amount = amountNum.toLocaleString()
    const status = (r.status || r.returnRequest?.status || 'N/A')
    const method = (r.method || r.payment?.method || 'N/A')
    doc.text(`${i+1}. ${id}... ${method} • LKR ${amount} (${status})`, 14, yPos)
    yPos += lineHeight; if (yPos > 270) { doc.addPage(); yPos = 20 }
  })
  doc.save(`refunds-report-${new Date().toISOString().split('T')[0]}.pdf`)
}

export const exportSingleRefundPDF = (refund) => {
  if (!refund) throw new Error('No refund data')
  const doc = new jsPDF()
  doc.setFontSize(16); doc.text('Refund Details', 14, 22)
  let yPos = 35; const lineHeight = 7
  doc.setFontSize(10)
  doc.text(`Refund ID: ${refund._id || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Order: ${refund.orderId || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Customer: ${refund.customerName || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Amount: LKR ${(refund.refundAmount || 0).toLocaleString()}`, 14, yPos); yPos += lineHeight
  doc.text(`Status: ${refund.refundStatus || 'N/A'}`, 14, yPos)
  doc.save(`refund-${String(refund._id || 'ref').substring(0,8)}-${new Date().toISOString().split('T')[0]}.pdf`)
}

// RETURNS PDF EXPORT
export const exportReturnsPDF = (returns) => {
  if (!returns?.length) { alert('No returns data'); return }
  const doc = new jsPDF()
  doc.setFontSize(20); doc.text('Returns Report', 14, 22)
  doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
  doc.text(`Total: ${returns.length}`, 14, 35)
  
  let yPos = 50; const lineHeight = 6
  doc.setFontSize(9)
  returns.forEach((r, i) => {
    const id = formatOrderId(r?.order?._id || r?.orderId || r?.order || r?._id)
    const status = r.returnRequest?.status || 'N/A'
    doc.text(`${i+1}. Order ${id} Status: ${status}`, 14, yPos)
    yPos += lineHeight; if (yPos > 270) { doc.addPage(); yPos = 20 }
  })
  doc.save(`returns-report-${new Date().toISOString().split('T')[0]}.pdf`)
}

export const exportSingleReturnPDF = (returnDoc) => {
  if (!returnDoc) throw new Error('No return data')
  const doc = new jsPDF()
  doc.setFontSize(16); doc.text('Return Details', 14, 22)
  let yPos = 35; const lineHeight = 7
  doc.setFontSize(10)
  doc.text(`Return ID: ${returnDoc._id || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Order: ${returnDoc.orderId || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Customer: ${returnDoc.customerName || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Status: ${returnDoc.returnStatus || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Reason: ${returnDoc.returnReason || 'N/A'}`, 14, yPos)
  doc.save(`return-${String(returnDoc._id || 'ret').substring(0,8)}-${new Date().toISOString().split('T')[0]}.pdf`)
}

// REVIEWS PDF EXPORT
export const exportReviewsPDF = (reviews) => {
  if (!reviews?.length) { alert('No reviews data'); return }
  const doc = new jsPDF()
  doc.setFontSize(20); doc.text('Reviews Report', 14, 22)
  doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
  doc.text(`Total: ${reviews.length}`, 14, 35)
  const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
  doc.text(`Avg Rating: ${avgRating.toFixed(1)}/5`, 14, 40)
  
  let yPos = 50; const lineHeight = 6
  doc.setFontSize(9)
  reviews.forEach((r, i) => {
    const product = r.product?.name || 'N/A'
    const user = r.user?.name || r.user?.username || 'Anonymous'
    const rating = r.rating || 0
    doc.text(`${i+1}. ${product} - ${rating}/5 by ${user}`, 14, yPos)
    yPos += lineHeight; if (yPos > 270) { doc.addPage(); yPos = 20 }
  })
  doc.save(`reviews-report-${new Date().toISOString().split('T')[0]}.pdf`)
}

export const exportSingleReviewPDF = (review) => {
  if (!review) throw new Error('No review data')
  const doc = new jsPDF()
  doc.setFontSize(16); doc.text('Review Details', 14, 22)
  let yPos = 35; const lineHeight = 7
  doc.setFontSize(10)
  doc.text(`Review ID: ${review._id || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Product: ${review.productName || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Customer: ${review.customerName || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Rating: ${review.rating || 0}/5`, 14, yPos); yPos += lineHeight
  doc.text(`Comment: ${(review.comment || 'No comment').substring(0,80)}`, 14, yPos)
  doc.save(`review-${String(review._id || 'rev').substring(0,8)}-${new Date().toISOString().split('T')[0]}.pdf`)
}

// DELIVERIES PDF EXPORT
export const exportDeliveriesPDF = (deliveries) => {
  if (!deliveries?.length) { alert('No deliveries data'); return }
  const doc = new jsPDF()
  doc.setFontSize(20); doc.text('Delivery Personnel Report', 14, 22)
  doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
  doc.text(`Total: ${deliveries.length}`, 14, 35)
  const activeCount = deliveries.filter(d => d.active !== false).length
  doc.text(`Active: ${activeCount}`, 14, 40)
  
  let yPos = 50; const lineHeight = 6
  doc.setFontSize(9)
  deliveries.forEach((d, i) => {
    const name = `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'N/A'
    const phone = d.phone || 'N/A'
    const status = d.active !== false ? 'Active' : 'Inactive'
    doc.text(`${i+1}. ${name} - ${phone} (${status})`, 14, yPos)
    yPos += lineHeight; if (yPos > 270) { doc.addPage(); yPos = 20 }
  })
  doc.save(`deliveries-report-${new Date().toISOString().split('T')[0]}.pdf`)
}

export const exportSingleDeliveryPDF = (delivery) => {
  if (!delivery) throw new Error('No delivery data')
  const doc = new jsPDF()
  doc.setFontSize(16); doc.text('Delivery Personnel Details', 14, 22)
  let yPos = 35; const lineHeight = 7
  doc.setFontSize(10)
  doc.text(`ID: ${delivery._id || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Name: ${delivery.fullName || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Phone: ${delivery.phone || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Email: ${delivery.email || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Vehicle: ${delivery.vehicleType || 'N/A'}`, 14, yPos); yPos += lineHeight
  doc.text(`Status: ${delivery.isActive ? 'Active' : 'Inactive'}`, 14, yPos); yPos += lineHeight
  doc.text(`Address: ${delivery.addressLine1 || 'N/A'}, ${delivery.city || 'N/A'}`, 14, yPos)
  doc.save(`delivery-${String(delivery._id || 'del').substring(0,8)}-${new Date().toISOString().split('T')[0]}.pdf`)
}
