import crypto from "crypto";

const ACTIONS = {
  sandbox: "https://sandbox.payhere.lk/pay/checkout",
  live: "https://www.payhere.lk/pay/checkout",
};

export function buildRequestHash({ merchantId, merchantSecret, orderId, amount, currency }) {
  const secretHash = crypto.createHash("md5").update(merchantSecret).digest("hex").toUpperCase();
  const raw = merchantId + orderId + Number(amount).toFixed(2) + currency + secretHash;
  return crypto.createHash("md5").update(raw).digest("hex").toUpperCase();
}

export function verifyWebhookSig({ merchantSecret, merchantId, orderId, payhereAmount, payhereCurrency, statusCode, md5sig }) {
  const secretHash = crypto.createHash("md5").update(merchantSecret).digest("hex").toUpperCase();
  const raw = merchantId + orderId + String(payhereAmount ?? "") + String(payhereCurrency ?? "") + String(statusCode) + secretHash;
  const local = crypto.createHash("md5").update(raw).digest("hex").toUpperCase();
  return String(md5sig || "").toUpperCase() === local;
}

export function checkoutAction(isLive = false) {
  return isLive ? ACTIONS.live : ACTIONS.sandbox;
}
