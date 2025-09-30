import jsPDF from 'jspdf'

export const exportCustomersPDF = (customers) => {
  console.log('Starting PDF export for customers:', customers)
  
  if (!customers || customers.length === 0) {
    alert('No customers data provided')
    return
  }
  
  const doc = new jsPDF()
  
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
  const leftMargin = 14
  const columnWidths = [50, 70, 50, 40] // Name, Email, Username, Date
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
  doc.rect(leftMargin, yPos - 5, 210, lineHeight, 'F')
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
      doc.rect(leftMargin, yPos - 5, 210, lineHeight, 'F')
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
  
  // Create table manually
  let yPos = 65
  const lineHeight = 8
  const leftMargin = 14
  const columnWidths = [60, 35, 25, 25, 25, 25] // Name, Category, Price, Stock, Status
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
  doc.rect(leftMargin, yPos - 5, 195, lineHeight, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text('Product Name', columnPositions[0], yPos)
  doc.text('Category', columnPositions[1], yPos)
  doc.text('Price (LKR)', columnPositions[2], yPos)
  doc.text('Stock', columnPositions[3], yPos)
  doc.text('Value (LKR)', columnPositions[4], yPos)
  doc.text('Status', columnPositions[5], yPos)
  yPos += lineHeight + 2
  
  // Draw data rows
  doc.setFont(undefined, 'normal')
  doc.setTextColor(0, 0, 0)
  
  products.forEach((product, index) => {
    // Alternate row background
    if (index % 2 === 1) {
      doc.setFillColor(245, 245, 245)
      doc.rect(leftMargin, yPos - 5, 195, lineHeight, 'F')
    }
    
    // Product data
    const name = product.name || 'N/A'
    const category = product.category || 'N/A'
    const price = product.price || 0
    const stock = product.stock || 0
    const value = price * stock
    const status = stock <= 0 ? 'Out' : stock <= (product.lowStockThreshold || 5) ? 'Low' : 'OK'
    
    // Truncate long text to fit columns
    doc.text(name.length > 25 ? name.substring(0, 22) + '...' : name, columnPositions[0], yPos)
    doc.text(category.length > 12 ? category.substring(0, 9) + '...' : category, columnPositions[1], yPos)
    doc.text(price.toLocaleString(), columnPositions[2], yPos)
    doc.text(stock.toString(), columnPositions[3], yPos)
    doc.text(value.toLocaleString(), columnPositions[4], yPos)
    
    // Status with color
    if (status === 'Out') {
      doc.setTextColor(220, 38, 38) // Red
    } else if (status === 'Low') {
      doc.setTextColor(245, 158, 11) // Orange
    } else {
      doc.setTextColor(34, 197, 94) // Green
    }
    doc.text(status, columnPositions[5], yPos)
    doc.setTextColor(0, 0, 0) // Reset to black
    
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
    doc.setFontSize(8)
    doc.text(
      'Page 1 of 1',
      doc.internal.pageSize.width - 30,
      doc.internal.pageSize.height - 10
    )
    
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
