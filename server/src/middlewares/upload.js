// server/src/middlewares/upload.js
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Save uploads to: server/src/files/receipts
const receiptsDir = path.resolve(__dirname, '..', 'files', 'receipts')
fs.mkdirSync(receiptsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, receiptsDir),
  filename: (_req, file, cb) => {
    const original = file.originalname || 'receipt'
    const ext = (path.extname(original) || '').toLowerCase()
    const safeBase =
      path
        .basename(original, ext)
        .replace(/[^a-z0-9_-]/gi, '')
        .slice(0, 40) || 'receipt'
    const rand = Math.random().toString(36).slice(2, 8)
    cb(null, `${Date.now()}-${rand}-${safeBase}${ext || '.jpg'}`)
  }
})

function fileFilter(_req, file, cb) {
  const ok =
    /^(image\/(png|jpe?g|webp|gif)|application\/pdf)$/i.test(file.mimetype)
  cb(ok ? null : new Error('Unsupported file type'), ok)
}

export const uploadReceipt = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
})

// (optional) export path if you need it elsewhere
export { receiptsDir }
