# PayHere Gateway Setup Guide

This guide explains how to integrate PayHere onsite checkout using the JavaScript SDK (payhere.js) with your React + Express stack.

## ✅ What's Been Implemented

### Backend (Express)
- **New endpoint**: `POST /api/payments/payhere/create`
  - Generates secure hash server-side using `PAYHERE_MERCHANT_ID` and `PAYHERE_MERCHANT_SECRET`
  - Returns payment payload for payhere.js
  - Requires authentication (`requireAuth` middleware)
  
- **Updated webhook**: `POST /api/payments/payhere/webhook`
  - Already existed; now properly validates `md5sig` using `PAYHERE_MERCHANT_SECRET`
  - Updates order status and decrements stock on successful payment
  - Logs all payment transactions

### Frontend (React)
- **PayHere SDK**: Script included in `client/index.html`
- **Checkout flow**: Updated `client/src/pages/Checkout.jsx`
  - For CARD payments, calls backend `/api/payments/payhere/create` with `orderId`
  - Opens PayHere popup using `window.payhere.startPayment()`
  - Handles `onCompleted`, `onDismissed`, `onError` events

### Environment Variables
- Added `PAYHERE_MERCHANT_SECRET` to `server/.env.example`
- All PayHere credentials stored in `.env` only (never exposed to client)

---

## 🔧 Configuration Steps

### 1. Get PayHere Credentials

1. **Merchant ID**: Find in PayHere Dashboard → Side Menu → Integrations
2. **Merchant Secret**: 
   - Go to Side Menu → Integrations
   - Click "Add Domain/App"
   - Enter your domain (e.g., `localhost` for dev, `yourdomain.com` for prod)
   - Click "Request to Allow"
   - Wait for approval (up to 24 hours)
   - Copy the Merchant Secret shown for your domain

### 2. Update Server `.env`

Create or update `server/.env` with:

```env
# PayHere Configuration
PAYHERE_MERCHANT_ID=YOUR_MERCHANT_ID
PAYHERE_MERCHANT_SECRET=YOUR_MERCHANT_SECRET
PAYHERE_RETURN_URL=http://localhost:5173/orders
PAYHERE_CANCEL_URL=http://localhost:5173/checkout
PAYHERE_NOTIFY_URL=http://localhost:4000/api/payments/payhere/webhook
```

**Important Notes:**
- `PAYHERE_NOTIFY_URL` must be a **publicly accessible URL** (not `localhost`) for production
- For local testing, use a tunneling service like ngrok:
  ```bash
  ngrok http 4000
  # Then set PAYHERE_NOTIFY_URL=https://your-ngrok-url.ngrok.io/api/payments/payhere/webhook
  ```

### 3. Sandbox vs Production

**Sandbox (Testing):**
- Use sandbox merchant credentials from PayHere
- The frontend passes `sandbox: true` to `payhere.startPayment()`
- PayHere URL: `https://sandbox.payhere.lk/pay/checkout`

**Production:**
- Use production merchant credentials
- Change `sandbox: true` to `sandbox: false` in `Checkout.jsx` (lines 101, 142)
- PayHere URL: `https://www.payhere.lk/pay/checkout`

---

## 🚀 Testing the Integration

### 1. Start the Backend
```bash
cd server
npm install
npm run dev
```

### 2. Start the Frontend
```bash
cd client
npm install
npm run dev
```

### 3. Place a CARD Order
1. Add items to cart
2. Go to Checkout (`/checkout`)
3. Select **CARD** as payment method
4. Fill delivery address
5. Click "Place order"
6. PayHere popup will appear
7. Use sandbox test card:
   - **Card Number**: `5555555555554444` (Mastercard test)
   - **CVV**: `123`
   - **Expiry**: Any future date (e.g., `12/25`)
   - **Name**: Any name

### 4. Verify Payment Flow
- **On success**: PayHere calls your `notify_url` webhook
- **Backend**: Validates `md5sig`, updates order status to `PAID`, decrements stock
- **Frontend**: User redirected to `return_url` (e.g., `/orders`)

---

## 🔍 How It Works

### High-Level Flow

```
1. User clicks "Place order" (CARD method)
   ↓
2. Frontend → POST /api/orders
   ↓
3. Backend creates order (status: PENDING, no stock decrement yet)
   ↓
4. Backend returns orderId
   ↓
5. Frontend → POST /api/payments/payhere/create { orderId }
   ↓
6. Backend generates hash using:
   hash = MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret))
   ↓
7. Backend returns payment payload { merchant_id, hash, amount, ... }
   ↓
8. Frontend calls window.payhere.startPayment(payload)
   ↓
9. PayHere popup opens, user enters card details
   ↓
10. PayHere processes payment
   ↓
11. PayHere → POST /api/payments/payhere/webhook (server-to-server)
   ↓
12. Backend validates md5sig, updates order, decrements stock
   ↓
13. PayHere redirects user to return_url
```

### Security Features
- ✅ Hash generated server-side (merchant secret never exposed)
- ✅ Webhook validates `md5sig` to prevent tampering
- ✅ Amount/currency determined by backend (not client)
- ✅ Stock decremented only after successful payment
- ✅ CSRF protection on `/api/payments/payhere/create`

---

## 📝 Event Handlers

The frontend sets up three event handlers:

```javascript
window.payhere.onCompleted = function (orderId) {
  console.log('✅ Payment completed:', orderId)
  // Note: Payment can be successful OR failed
  // Always verify status from backend
}

window.payhere.onDismissed = function () {
  console.log('⚠️ Payment dismissed')
  // User closed popup before completing payment
}

window.payhere.onError = function (error) {
  console.log('❌ Error:', error)
  // Invalid parameters or technical error
}
```

**Important**: `onCompleted` fires when checkout completes, but payment may have failed. Always verify the actual payment status from your backend by fetching the order details.

---

## 🐛 Troubleshooting

### Issue: "PayHere is not configured on the server"
- **Cause**: Missing `PAYHERE_MERCHANT_ID` or `PAYHERE_MERCHANT_SECRET` in `.env`
- **Fix**: Add both variables to `server/.env`

### Issue: Webhook not called
- **Cause**: `PAYHERE_NOTIFY_URL` is `localhost` (not publicly accessible)
- **Fix**: Use ngrok or deploy to a public server

### Issue: "Invalid signature" in webhook
- **Cause**: Incorrect `PAYHERE_MERCHANT_SECRET` or amount mismatch
- **Fix**: 
  - Verify merchant secret matches your domain in PayHere dashboard
  - Ensure amount is formatted as `X.XX` (2 decimal places)

### Issue: Stock not decremented
- **Cause**: Webhook validation failed or order already processed
- **Fix**: Check server logs for webhook errors

### Issue: CSRF token error
- **Cause**: Frontend not sending `x-csrf-token` header
- **Fix**: Ensure your axios instance includes CSRF token (already configured in `client/src/lib/axios.js`)

---

## 📚 Additional Resources

- [PayHere JavaScript SDK Documentation](https://support.payhere.lk/api-&-mobile-sdk/payhere-checkout)
- [PayHere Sandbox Test Cards](https://support.payhere.lk/faq/test-payment-cards)
- [PayHere Webhook Documentation](https://support.payhere.lk/api-&-mobile-sdk/payment-notification)

---

## 🎯 Next Steps

1. **Test in sandbox** with test cards
2. **Set up ngrok** for local webhook testing
3. **Apply for production credentials** from PayHere
4. **Update `sandbox: false`** in production build
5. **Monitor webhook logs** in production

---

## 📄 Files Modified

- ✅ `server/src/api/controllers/payment.controller.js` - Added `payhereCreate` controller
- ✅ `server/src/api/routes/payment.routes.js` - Added `/payhere/create` route
- ✅ `server/.env.example` - Added `PAYHERE_MERCHANT_SECRET`
- ✅ `client/index.html` - Included PayHere SDK script
- ✅ `client/src/pages/Checkout.jsx` - Integrated onsite popup flow

---

**Need help?** Check the PayHere support docs or review the implementation in the files above.
