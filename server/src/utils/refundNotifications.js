import { sendMail } from './mailer.js'
import { env } from '../config/env.js'

/**
 * Send refund status notification email to customer
 */
export const sendRefundNotification = async (refund, order, type) => {
  if (!order?.user?.email || !env.SMTP_ENABLED) {
    return
  }

  const orderNumber = String(order._id).slice(-8)
  const refundNumber = String(refund._id).slice(-8)
  const amount = `LKR ${refund.amount.toFixed(2)}`

  let subject, html

  switch (type) {
    case 'CREATED':
      subject = `Refund Request Created - Order #${orderNumber}`
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Refund Request Created</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">We've received your refund request</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Refund Details</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <p><strong>Refund ID:</strong> #${refundNumber}</p>
              <p><strong>Order ID:</strong> #${orderNumber}</p>
              <p><strong>Amount:</strong> ${amount}</p>
              <p><strong>Method:</strong> ${refund.refundMethod === 'ORIGINAL_PAYMENT' ? 'Original Payment Method' : refund.refundMethod}</p>
              ${refund.reason ? `<p><strong>Reason:</strong> ${refund.reason}</p>` : ''}
            </div>
            
            <h3 style="color: #333;">What happens next?</h3>
            <ol style="color: #666;">
              <li>Our team will review your refund request</li>
              <li>You'll receive an email once it's approved or if we need more information</li>
              <li>Processing typically takes 3-5 business days after approval</li>
              <li>Refunds appear in your account within 5-10 business days</li>
            </ol>
            
            <div style="margin: 30px 0; padding: 20px; background: #e3f2fd; border-radius: 8px;">
              <p style="margin: 0; color: #1976d2;"><strong>💡 Tip:</strong> You can track your refund status in your account under "Returns & Refunds"</p>
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; background: #333; color: white;">
            <p style="margin: 0;">Need help? Contact our support team</p>
            <p style="margin: 5px 0 0 0; opacity: 0.8;">support@yourstore.com</p>
          </div>
        </div>
      `
      break

    case 'APPROVED':
      subject = `Refund Approved - Order #${orderNumber}`
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">✅ Refund Approved</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your refund has been approved and will be processed shortly</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Refund Details</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
              <p><strong>Refund ID:</strong> #${refundNumber}</p>
              <p><strong>Order ID:</strong> #${orderNumber}</p>
              <p><strong>Amount:</strong> ${amount}</p>
              <p><strong>Status:</strong> <span style="color: #4caf50; font-weight: bold;">APPROVED</span></p>
              <p><strong>Approved:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <h3 style="color: #333;">Next Steps</h3>
            <ul style="color: #666;">
              <li>Your refund is now being processed</li>
              <li>Processing typically takes 3-5 business days</li>
              <li>You'll receive another email when the refund is completed</li>
              <li>The refund will appear in your original payment method</li>
            </ul>
            
            <div style="margin: 30px 0; padding: 20px; background: #e8f5e8; border-radius: 8px;">
              <p style="margin: 0; color: #2e7d32;"><strong>🎉 Great news!</strong> Your refund has been approved and is being processed</p>
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; background: #333; color: white;">
            <p style="margin: 0;">Questions about your refund?</p>
            <p style="margin: 5px 0 0 0; opacity: 0.8;">support@yourstore.com</p>
          </div>
        </div>
      `
      break

    case 'PROCESSED':
      subject = `Refund Processed - Order #${orderNumber}`
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">💰 Refund Processed</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your refund has been successfully processed</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Refund Completed</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
              <p><strong>Refund ID:</strong> #${refundNumber}</p>
              <p><strong>Order ID:</strong> #${orderNumber}</p>
              <p><strong>Amount:</strong> <span style="color: #4caf50; font-weight: bold; font-size: 18px;">${amount}</span></p>
              <p><strong>Status:</strong> <span style="color: #4caf50; font-weight: bold;">PROCESSED</span></p>
              <p><strong>Processed:</strong> ${new Date().toLocaleDateString()}</p>
              ${refund.gatewayRefundId ? `<p><strong>Transaction ID:</strong> ${refund.gatewayRefundId}</p>` : ''}
            </div>
            
            <h3 style="color: #333;">Important Information</h3>
            <ul style="color: #666;">
              <li><strong>Processing Time:</strong> Please allow 5-10 business days for the refund to appear in your account</li>
              <li><strong>Payment Method:</strong> The refund will appear on your original payment method</li>
              <li><strong>Bank Processing:</strong> Your bank may take additional time to process the refund</li>
              <li><strong>Statement:</strong> The refund may appear as "REFUND - Your Store Name"</li>
            </ul>
            
            <div style="margin: 30px 0; padding: 20px; background: #e3f2fd; border-radius: 8px;">
              <p style="margin: 0; color: #1976d2;"><strong>📱 Keep this email</strong> as proof of your processed refund for your records</p>
            </div>
            
            <div style="margin: 30px 0; padding: 20px; background: #fff3e0; border-radius: 8px;">
              <p style="margin: 0; color: #f57c00;"><strong>⏰ Don't see your refund?</strong> Contact your bank if the refund doesn't appear within 10 business days</p>
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; background: #333; color: white;">
            <p style="margin: 0;">Thank you for shopping with us!</p>
            <p style="margin: 5px 0 0 0; opacity: 0.8;">support@yourstore.com</p>
          </div>
        </div>
      `
      break

    case 'REJECTED':
      subject = `Refund Request Update - Order #${orderNumber}`
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Refund Request Update</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">We've reviewed your refund request</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Refund Request Status</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
              <p><strong>Refund ID:</strong> #${refundNumber}</p>
              <p><strong>Order ID:</strong> #${orderNumber}</p>
              <p><strong>Amount:</strong> ${amount}</p>
              <p><strong>Status:</strong> <span style="color: #f44336; font-weight: bold;">NOT APPROVED</span></p>
              ${refund.reason ? `<p><strong>Reason:</strong> ${refund.reason}</p>` : ''}
            </div>
            
            <h3 style="color: #333;">What this means</h3>
            <p style="color: #666;">Unfortunately, we're unable to process your refund request at this time based on our return policy and the specific circumstances of your order.</p>
            
            <h3 style="color: #333;">Next Steps</h3>
            <ul style="color: #666;">
              <li>Review our return policy for more information</li>
              <li>Contact our customer service team if you have questions</li>
              <li>Consider alternative solutions like store credit or exchange</li>
            </ul>
            
            <div style="margin: 30px 0; padding: 20px; background: #ffebee; border-radius: 8px;">
              <p style="margin: 0; color: #c62828;"><strong>💬 Have questions?</strong> Our customer service team is here to help explain this decision and explore alternatives</p>
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; background: #333; color: white;">
            <p style="margin: 0;">Need assistance? We're here to help</p>
            <p style="margin: 5px 0 0 0; opacity: 0.8;">support@yourstore.com</p>
          </div>
        </div>
      `
      break

    default:
      return
  }

  try {
    await sendMail({
      to: order.user.email,
      subject,
      html
    })
  } catch (error) {
    console.error('Failed to send refund notification:', error)
  }
}

/**
 * Send internal notification to admin team
 */
export const sendAdminRefundNotification = async (refund, order, type) => {
  if (!env.ADMIN_NOTIFY_EMAIL || !env.SMTP_ENABLED) {
    return
  }

  const orderNumber = String(order._id).slice(-8)
  const refundNumber = String(refund._id).slice(-8)
  const amount = `LKR ${refund.amount.toFixed(2)}`

  let subject, html

  switch (type) {
    case 'NEW_REQUEST':
      subject = `🔔 New Refund Request - Order #${orderNumber}`
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>New Refund Request</h2>
          <p>A new refund request has been submitted and requires review.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Refund ID:</strong> #${refundNumber}</p>
            <p><strong>Order ID:</strong> #${orderNumber}</p>
            <p><strong>Customer:</strong> ${order.user?.email || 'N/A'}</p>
            <p><strong>Amount:</strong> ${amount}</p>
            <p><strong>Payment Method:</strong> ${refund.method}</p>
            ${refund.reason ? `<p><strong>Reason:</strong> ${refund.reason}</p>` : ''}
            <p><strong>Requested:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p><strong>Action Required:</strong> Please review this refund request in the admin dashboard.</p>
        </div>
      `
      break

    case 'HIGH_VALUE':
      subject = `⚠️ High Value Refund Request - Order #${orderNumber}`
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>High Value Refund Alert</h2>
          <p>A high-value refund request requires immediate attention.</p>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p><strong>⚠️ HIGH VALUE ALERT</strong></p>
            <p><strong>Refund ID:</strong> #${refundNumber}</p>
            <p><strong>Order ID:</strong> #${orderNumber}</p>
            <p><strong>Amount:</strong> <span style="color: #d63384; font-weight: bold; font-size: 18px;">${amount}</span></p>
            <p><strong>Customer:</strong> ${order.user?.email || 'N/A'}</p>
            ${refund.reason ? `<p><strong>Reason:</strong> ${refund.reason}</p>` : ''}
          </div>
          
          <p><strong>Priority Action Required:</strong> This refund exceeds the standard threshold and requires senior approval.</p>
        </div>
      `
      break

    default:
      return
  }

  try {
    await sendMail({
      to: env.ADMIN_NOTIFY_EMAIL,
      subject,
      html
    })
  } catch (error) {
    console.error('Failed to send admin refund notification:', error)
  }
}
