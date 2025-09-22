import { Router } from 'express'
import { requireAdminAuth } from '../../middlewares/adminAuth.js'
import { requireAnyRole, ROLES } from '../../middlewares/roles.js'
import { uploadDelivery } from '../../middlewares/upload.js'

const router = Router()
router.use(requireAdminAuth)
const canManage = requireAnyRole(ROLES.ADMIN, ROLES.ORDER_MANAGER)

// POST /api/admin/delivery/upload (multipart/form-data)
// fields: profile (image), license (image/pdf)
router.post('/upload', canManage, uploadDelivery.fields([{ name: 'profile', maxCount: 1 }, { name: 'license', maxCount: 1 }]), (req, res) => {
  const files = req.files || {}
  const mkUrl = (f) => (f ? `/files/delivery/${f.filename}` : undefined)
  res.json({ ok: true, profileUrl: mkUrl(files.profile?.[0]), licenseUrl: mkUrl(files.license?.[0]) })
})

export default router
