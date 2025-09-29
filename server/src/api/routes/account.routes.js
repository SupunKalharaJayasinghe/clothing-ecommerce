import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import {
  profileUpdateSchema, passwordChangeSchema, addressCreateSchema, addressUpdateSchema,
  notificationsUpdateSchema, paymentMethodCreateSchema, deletionRequestCreateSchema
} from '../validators/account.validator.js'
import {
  getProfile, updateProfile, changePassword,
  listAddresses, createAddress, updateAddress, deleteAddress,
  getNotifications, updateNotifications,
  listPaymentMethods, addPaymentMethod, removePaymentMethod,
  start2FASetup, verify2FASetup, disable2FA, regen2FACodes,
  getDeletionRequest, createDeletionRequest, cancelDeletionRequest
} from '../controllers/account.controller.js'

const router = Router()
router.use(requireAuth)

// profile
router.get('/profile', getProfile)
router.patch('/profile', validate(profileUpdateSchema), updateProfile)
router.patch('/password', validate(passwordChangeSchema), changePassword)

// addresses
router.get('/addresses', listAddresses)
router.post('/addresses', validate(addressCreateSchema), createAddress)
router.patch('/addresses/:id', validate(addressUpdateSchema), updateAddress)
router.delete('/addresses/:id', deleteAddress)

// notifications
router.get('/notifications', getNotifications)
router.patch('/notifications', validate(notificationsUpdateSchema), updateNotifications)

// payment methods (tokenized only)
router.get('/payment-methods', listPaymentMethods)
router.post('/payment-methods', validate(paymentMethodCreateSchema), addPaymentMethod)
router.delete('/payment-methods/:id', removePaymentMethod)

// 2FA
router.post('/security/2fa/start', start2FASetup)
router.post('/security/2fa/verify', verify2FASetup)
router.delete('/security/2fa', disable2FA)
router.post('/security/2fa/backup/regenerate', regen2FACodes)

// account deletion request
router.get('/deletion', getDeletionRequest)
router.post('/deletion', validate(deletionRequestCreateSchema), createDeletionRequest)
router.delete('/deletion', cancelDeletionRequest)

export default router
