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