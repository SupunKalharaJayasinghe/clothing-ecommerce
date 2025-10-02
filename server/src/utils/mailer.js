import nodemailer from 'nodemailer'

const {
  SMTP_HOST = 'smtp.gmail.com',
  SMTP_PORT = '465',
  SMTP_SECURE = 'true',
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL
} = process.env

let transporter

export function getTransporter() {
  if (transporter) return transporter
  if (!SMTP_USER || !SMTP_PASS) {
    if (process.env.NODE_ENV !== 'production') {
      // Dev fallback: log emails instead of sending
      transporter = nodemailer.createTransport({ jsonTransport: true })
      return transporter
    }
    throw new Error('SMTP not configured: set SMTP_USER and SMTP_PASS in environment')
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  })
  return transporter
}

export async function sendMail({ to, subject, text, html, attachments }) {
  const t = getTransporter()
  const from = FROM_EMAIL || SMTP_USER
  const info = await t.sendMail({ from, to, subject, text, html, attachments })
  // In dev fallback (jsonTransport), print a helpful log so you can copy the OTP
  if (t.options && (t.options.jsonTransport || t.options.streamTransport)) {
    const raw = typeof info.message === 'string' ? info.message : info.message?.toString?.()
    console.log('[DEV EMAIL]', { to, subject, from })
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        // show short preview in logs
        console.log('[DEV EMAIL PREVIEW]', parsed?.text || parsed?.html || raw)
      } catch {
        console.log('[DEV EMAIL RAW]', raw)
      }
    }
  }
  return info
}

export async function sendVerificationCode({ to, code, purpose = 'verification' }) {
  const subject = `Your ${purpose} code: ${code}`
  const text = `Your ${purpose} code is ${code}. It expires in 10 minutes.`
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;">
      <h2>${purpose === 'login' ? 'Login verification' : 'Email verification'}</h2>
      <p>Your code is:</p>
      <div style="font-size:24px;font-weight:bold;letter-spacing:2px;">${code}</div>
      <p style="color:#666;">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
    </div>
  `
  // In development, log OTP to server console for easy testing
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEV OTP]', { to, code, purpose })
  }
  return sendMail({ to, subject, text, html })
}
