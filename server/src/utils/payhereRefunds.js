import crypto from 'crypto'
import { env } from '../config/env.js'

/**
 * PayHere Refund Integration
 * Handles refund processing through PayHere payment gateway
 */

/**
 * Generate MD5 signature for PayHere API requests
 */
const generateMD5Signature = (data) => {
  return crypto.createHash('md5').update(data).digest('hex').toUpperCase()
}

/**
 * Process refund through PayHere gateway
 */
export const processPayhereRefund = async (refund, order) => {
  if (!env.PAYHERE_MERCHANT_ID || !env.PAYHERE_MERCHANT_SECRET) {
    throw new Error('PayHere credentials not configured')
  }

  // Only process card payments through PayHere
  if (refund.method !== 'CARD' || refund.gateway !== 'PAYHERE') {
    throw new Error('Invalid payment method for PayHere refund')
  }

  const refundData = {
    merchant_id: env.PAYHERE_MERCHANT_ID,
    order_id: String(order._id),
    payment_id: order.payment?.gatewayRef || String(order._id),
    amount: refund.amount.toFixed(2),
    currency: 'LKR',
    reason: refund.reason || 'Customer refund request'
  }

  // Generate signature for API authentication
  const signatureString = `${refundData.merchant_id}${refundData.order_id}${refundData.payment_id}${refundData.amount}${refundData.currency}${env.PAYHERE_MERCHANT_SECRET}`
  const signature = generateMD5Signature(signatureString)

  const requestPayload = {
    ...refundData,
    hash: signature
  }

  try {
    // In a real implementation, you would make an HTTP request to PayHere's refund API
    // For now, we'll simulate the response
    
    const isProduction = env.NODE_ENV === 'production'
    const apiUrl = isProduction 
      ? 'https://www.payhere.lk/pay/refund'
      : 'https://sandbox.payhere.lk/pay/refund'

    // Simulate API call (replace with actual HTTP request in production)
    const mockResponse = await simulatePayhereRefundAPI(requestPayload, apiUrl)
    
    return {
      success: mockResponse.status === 'success',
      gatewayRefundId: mockResponse.refund_id,
      gatewayResponse: mockResponse,
      message: mockResponse.message
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      gatewayResponse: { error: error.message }
    }
  }
}

/**
 * Simulate PayHere refund API response
 * Replace this with actual HTTP request to PayHere API
 */
const simulatePayhereRefundAPI = async (payload, apiUrl) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Simulate different response scenarios
  const scenarios = [
    { probability: 0.85, response: { status: 'success', refund_id: `REF_${Date.now()}`, message: 'Refund processed successfully' } },
    { probability: 0.10, response: { status: 'failed', message: 'Insufficient funds for refund' } },
    { probability: 0.05, response: { status: 'failed', message: 'Invalid payment reference' } }
  ]
  
  const random = Math.random()
  let cumulativeProbability = 0
  
  for (const scenario of scenarios) {
    cumulativeProbability += scenario.probability
    if (random <= cumulativeProbability) {
      return scenario.response
    }
  }
  
  // Fallback
  return { status: 'failed', message: 'Unknown error occurred' }
}

/**
 * Verify PayHere refund status
 */
export const verifyPayhereRefund = async (refundId) => {
  if (!env.PAYHERE_MERCHANT_ID || !env.PAYHERE_MERCHANT_SECRET) {
    throw new Error('PayHere credentials not configured')
  }

  try {
    // Simulate refund status check
    const mockStatus = await simulatePayhereStatusCheck(refundId)
    
    return {
      success: true,
      status: mockStatus.status,
      refundId: mockStatus.refund_id,
      amount: mockStatus.amount,
      processedAt: mockStatus.processed_at
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Simulate PayHere refund status check
 */
const simulatePayhereStatusCheck = async (refundId) => {
  await new Promise(resolve => setTimeout(resolve, 500))
  
  return {
    refund_id: refundId,
    status: 'completed',
    amount: '1500.00',
    currency: 'LKR',
    processed_at: new Date().toISOString()
  }
}

/**
 * Process bank transfer refund (manual process)
 */
export const processBankRefund = async (refund, order, bankDetails) => {
  // Bank refunds are typically processed manually
  // This function would integrate with your banking system or create manual processing records
  
  return {
    success: true,
    gatewayRefundId: `BANK_${Date.now()}`,
    gatewayResponse: {
      method: 'BANK_TRANSFER',
      accountName: bankDetails?.accountName,
      accountNumber: bankDetails?.accountNumber,
      bankName: bankDetails?.bankName,
      status: 'pending_manual_processing',
      message: 'Bank refund initiated - manual processing required'
    },
    message: 'Bank refund initiated successfully'
  }
}

/**
 * Process COD refund (store credit or manual)
 */
export const processCODRefund = async (refund, order) => {
  // COD refunds are typically handled as store credit or manual cash refunds
  
  return {
    success: true,
    gatewayRefundId: `COD_${Date.now()}`,
    gatewayResponse: {
      method: 'COD_REFUND',
      refundMethod: refund.refundMethod || 'STORE_CREDIT',
      status: 'processed',
      message: 'COD refund processed as store credit'
    },
    message: 'COD refund processed successfully'
  }
}

/**
 * Main refund processing function
 */
export const processRefundByMethod = async (refund, order, additionalData = {}) => {
  switch (refund.method) {
    case 'CARD':
      return await processPayhereRefund(refund, order)
    
    case 'BANK':
      return await processBankRefund(refund, order, additionalData.bankDetails)
    
    case 'COD':
      return await processCODRefund(refund, order)
    
    default:
      throw new Error(`Unsupported payment method for refund: ${refund.method}`)
  }
}
